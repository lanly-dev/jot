/* ==========================================================================
   Jot - Cute & Colorful Note-Taking App Express Server
   ========================================================================== */

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')

const app = express()
const PORT = process.env.PORT || 3000

// Enable CORS and JSON parsing
app.use(cors())
app.use(express.json())

// Basic security headers. (No Content-Security-Policy: the UI relies on
// inline style attributes, so a strict style-src would break rendering;
// these three are the ones that matter for a LAN-served app.)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})

// Unique ids that can't collide on rapid double-submits (Date.now() can
// repeat within the same millisecond).
function newId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

function normalizeColor(color, fallback = '#ffd1dc') {
  const c = String(color || '')
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c) ? c : fallback
}

// Live reload for development
if (process.env.NODE_ENV !== 'production') {
  const livereload = require('livereload')
  const connectLiveReload = require('connect-livereload')

  const liveReloadServer = livereload.createServer({
    exts: ['html', 'css', 'js'],
    exclusions: [/data\//, /node_modules\//]
  })
  liveReloadServer.watch(__dirname)

  // Auto-refresh the browser after nodemon restarts the server
  liveReloadServer.server.once('connection', () => {
    setTimeout(() => {
      liveReloadServer.refresh('/')
    }, 100)
  })

  app.use(connectLiveReload())
}

// Serve static frontend files from public/ only. The project root (server.js,
// data/, .env, package.json, …) is never exposed over HTTP.
app.use(express.static(path.join(__dirname, 'public')))

// ---------------------------------------------------------------------------
// API authentication
// Every /api route requires a bearer token when JOT_API_TOKEN is set. Without
// it the vault (including decrypted credentials) is open to anyone who can
// reach the port, so the server logs a loud warning and keeps working — set
// the token in production deployments (see .env.example).
// ---------------------------------------------------------------------------
const API_TOKEN = process.env.JOT_API_TOKEN || ''

function requireApiToken(req, res, next) {
  if (!API_TOKEN) return next()
  const auth = req.headers.authorization || ''
  if (auth === `Bearer ${API_TOKEN}`) return next()
  return res.status(401).json({ error: 'Unauthorized — a valid API token is required 🔒' })
}

app.use('/api', requireApiToken)

// File path for database storage
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'notes.json')
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json')

// ---------------------------------------------------------------------------
// Credential encryption at rest
// Sensitive fields (password, notes) are encrypted with AES-256-GCM before they
// are written to disk and decrypted transparently when read, so the JSON file
// never contains plaintext secrets. Override the key via the JOT_SECRET_KEY
// environment variable (base64, 32 bytes); otherwise a random key is generated
// on first run and stored in a git-ignored file.
// ---------------------------------------------------------------------------
const SECRET_FILE = path.join(DATA_DIR, '.jot-secret.key')
const ENC_PREFIX = 'ENC:'
// Payment credentials store card data in cardNumber/expiry/cvv, so those must
// be encrypted at rest alongside the password and notes.
const SENSITIVE_FIELDS = ['password', 'notes', 'cardNumber', 'expiry', 'cvv']
let credentialKey = null

function loadEncryptionKey() {
  if (credentialKey) return credentialKey
  if (process.env.JOT_SECRET_KEY) {
    credentialKey = new Uint8Array(Buffer.from(process.env.JOT_SECRET_KEY, 'base64'))
    if (credentialKey.length !== 32) {
      // Fail fast: a misconfigured key must never silently fall back to
      // storing plaintext (see encryptCredentialValue).
      throw new Error(
        `JOT_SECRET_KEY must decode to exactly 32 bytes (got ${credentialKey.length}). ` +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
      )
    }
  } else if (fs.existsSync(SECRET_FILE)) {
    credentialKey = new Uint8Array(Buffer.from(fs.readFileSync(SECRET_FILE, 'utf-8').trim(), 'base64'))
  } else {
    credentialKey = new Uint8Array(32)
    crypto.getRandomValues(credentialKey)
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(SECRET_FILE, Buffer.from(credentialKey).toString('base64'), 'utf-8')
    console.log('Generated credential encryption key 🔑')
  }
  return credentialKey
}

async function importAESKey() {
  return crypto.subtle.importKey('raw', loadEncryptionKey(), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encryptCredentialValue(value) {
  if (value === undefined || value === null || value === '') return value
  const str = String(value)
  try {
    const key = await importAESKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, Buffer.from(str, 'utf-8'))
    return ENC_PREFIX + Buffer.concat([Buffer.from(iv), Buffer.from(encrypted)]).toString('base64')
  } catch (err) {
    // Fail closed: never write the plaintext when encryption breaks. Callers
    // (writeCredentials) propagate the throw so the API answers 500 instead of
    // persisting an unencrypted secret.
    console.error('Credential encryption failed:', err)
    throw new Error('Credential encryption failed — refusing to store plaintext', { cause: err })
  }
}
// Note: no "already starts with ENC:, skip" shortcut here. Every value is
// encrypted unconditionally — a literal password starting with "ENC:" is just
// a string like any other, and no code path ever hands an already-encrypted
// blob back to this function (reads decrypt first).

async function decryptCredentialValue(value) {
  if (typeof value !== 'string' || !value.startsWith(ENC_PREFIX)) return value
  try {
    const raw = Buffer.from(value.slice(ENC_PREFIX.length), 'base64')
    const iv = raw.subarray(0, 12)
    const ciphertext = raw.subarray(12)
    const key = await importAESKey()
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch (err) {
    console.error('Credential decryption failed:', err)
    return value
  }
}

function normalizeNoteType(type) {
  const allowedTypes = ['standard', 'dev', 'reminder', 'spreadsheet', 'checkbox']
  return allowedTypes.includes(type) ? type : 'standard'
}

function normalizeSpreadsheetData(spreadsheetData) {
  if (!Array.isArray(spreadsheetData)) return null
  return spreadsheetData.slice(0, 12).map(row => {
    if (!Array.isArray(row)) return []
    return row.slice(0, 8).map(cell => String(cell || ''))
  })
}

function extractHashtagsServer(text) {
  const found = String(text || '').match(/(?:^|\s)#([A-Za-z0-9_-]{1,40})/g) || []
  const seen = new Set()
  const out = []
  found.forEach(m => {
    const t = m.trim().slice(1).toLowerCase()
    if (t && !seen.has(t)) { seen.add(t); out.push(t) }
  })
  return out
}

function normalizeCredential(cred) {
  const allowedTypes = ['login', 'payment', 'secure-note']
  const createdAt = cred.createdAt || new Date().toISOString()
  return {
    id: cred.id,
    site: String(cred.site || ''),
    username: String(cred.username || ''),
    password: String(cred.password || ''),
    notes: String(cred.notes || ''),
    cardNumber: String(cred.cardNumber || ''),
    expiry: String(cred.expiry || ''),
    cvv: String(cred.cvv || ''),
    type: allowedTypes.includes(cred.type) ? cred.type : 'login',
    color: normalizeColor(cred.color, '#ffd1d9'),
    deleted: !!cred.deleted,
    deletedAt: cred.deletedAt || null,
    createdAt,
    updatedAt: cred.updatedAt || createdAt
  }
}

// Default sample notes seed
const SAMPLE_NOTES = [
  {
    id: 'sample-1',
    title: 'Welcome to Jot! ✨',
    content: 'Hello! This is your cute, colorful space to jot down sweet thoughts, ideas, plans, or doodles. #welcome\n\nHere are some quick tips:\n🌸 Choose custom colors for each card!\n📌 Pin your most important notes so they stay at the top.\n📦 Archive old notes to keep your board tidy!\n🏷️ Just type #tags anywhere in your note to organize your jots.',
    color: '#ffd1dc', // strawberry pink
    tags: ['welcome', 'tags'],
    pinned: true,
    archived: false,
    type: 'standard',
    reminderAt: null,
    spreadsheetData: null,
    createdAt: new Date(Date.now() - 60000).toISOString()
  },
  {
    id: 'sample-2',
    title: 'Cute Ice Cream Shop 🍦',
    content: 'Must try the lavender honey and strawberry waffle cones next weekend with friends! They also have adorable kitty-shaped sprinkles. #food #weekend',
    color: '#e6e6fa', // lavender
    tags: ['food', 'weekend'],
    pinned: false,
    archived: false,
    type: 'standard',
    reminderAt: null,
    spreadsheetData: null,
    createdAt: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: 'sample-3',
    title: 'Dream Journal 🌙',
    content: 'Had a dream where I was floating in a pastel balloon ride above clouds made of cotton candy. A giant soft cat was the pilot! Must write a story about this. #dream #story',
    color: '#bfe3f3', // sky blue
    tags: ['dream', 'story'],
    pinned: false,
    archived: false,
    type: 'standard',
    reminderAt: null,
    spreadsheetData: null,
    createdAt: new Date(Date.now() - 180000).toISOString()
  }
]

// Helper to ensure database file exists
function initializeDatabase() {
  if (!fs.existsSync(DATA_DIR))
  {fs.mkdirSync(DATA_DIR, { recursive: true })}

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SAMPLE_NOTES, null, 2), 'utf-8')
    console.log('Database initialized with sample notes! 🌸')
  }
}

// ---------------------------------------------------------------------------
// Storage primitives
// Reads never silently swallow corruption and writes are atomic, so a crash
// or a corrupt file can never snowball into silent total data loss.
// ---------------------------------------------------------------------------

// Read a JSON data file. If the file exists but is not valid JSON, it is
// quarantined aside (renamed, never deleted) and the error propagates so
// routes answer 500 — the caller must NOT fall back to [] and let a later
// write overwrite the corrupt file with fresh data.
function readJsonFile(file, initialize) {
  initialize()
  let raw
  try {
    raw = fs.readFileSync(file, 'utf-8')
  } catch (err) {
    console.error(`Error reading ${file}:`, err)
    throw err
  }
  try {
    return JSON.parse(raw)
  } catch (err) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backup = `${file}.corrupt-${stamp}`
    try {
      fs.renameSync(file, backup)
      console.error(`Corrupt data file quarantined to ${backup}`)
    } catch (renameErr) {
      console.error(`Could not quarantine corrupt ${file}:`, renameErr)
    }
    throw new Error(
      `${path.basename(file)} is corrupt and was quarantined to ${path.basename(backup)}. ` +
      'Restore it from the backup, or delete the backup to start fresh.',
      { cause: err }
    )
  }
}

// Write a JSON data file atomically: serialize to a temp file, then rename.
// On POSIX the rename is atomic, so a crash mid-write can never leave a
// truncated file behind. Throws on failure so routes answer 500 instead of
// reporting success without persisting.
function writeJsonFile(file, value, initialize) {
  initialize()
  const tmp = `${file}.tmp-${process.pid}`
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf-8')
    fs.renameSync(tmp, file)
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }) } catch { /* best effort cleanup */ }
    console.error(`Error writing ${file}:`, err)
    throw err
  }
}

// Helper to read notes
function readNotes() {
  return readJsonFile(DATA_FILE, initializeDatabase)
}

// Helper to write notes
function writeNotes(notes) {
  writeJsonFile(DATA_FILE, notes, initializeDatabase)
}

// Helper to ensure credentials database file exists
function initializeCredentialsDatabase() {
  if (!fs.existsSync(DATA_DIR))
  {fs.mkdirSync(DATA_DIR, { recursive: true })}

  if (!fs.existsSync(CREDENTIALS_FILE)) {
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify([], null, 2), 'utf-8')
    console.log('Credentials database initialized! 🔐')
  }
}

// Helper to read & decrypt credentials
async function readCredentials() {
  const parsed = readJsonFile(CREDENTIALS_FILE, initializeCredentialsDatabase)
  const list = Array.isArray(parsed) ? parsed : []
  return await Promise.all(list.map(async cred => {
    const out = { ...cred }
    for (const field of SENSITIVE_FIELDS) out[field] = await decryptCredentialValue(out[field])
    return out
  }))
}

// Helper to encrypt & write credentials
async function writeCredentials(credentials) {
  const encrypted = await Promise.all(credentials.map(async cred => {
    const out = { ...cred }
    for (const field of SENSITIVE_FIELDS) out[field] = await encryptCredentialValue(out[field])
    return out
  }))
  writeJsonFile(CREDENTIALS_FILE, encrypted, initializeCredentialsDatabase)
}

// Encrypt any credentials that were saved as plaintext before encryption existed
async function secureExistingCredentials() {
  try {
    initializeCredentialsDatabase()
    if (!fs.existsSync(CREDENTIALS_FILE)) return
    const parsed = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'))
    if (!Array.isArray(parsed)) return
    const needsEncryption = parsed.some(cred =>
      SENSITIVE_FIELDS.some(field => typeof cred[field] === 'string' && !cred[field].startsWith(ENC_PREFIX))
    )
    if (needsEncryption) {
      await writeCredentials(await readCredentials())
      console.log('Existing credentials encrypted at rest 🔒')
    }
  } catch (err) {
    console.error('Could not secure existing credentials:', err)
  }
}

/* ==========================================================================
   REST API ENDPOINTS
   ========================================================================== */

// GET: Retrieve all notes
app.get('/api/notes', (req, res) => {
  const notes = readNotes()
  res.json(notes)
})

// POST: Add a new note
app.post('/api/notes', (req, res) => {
  const notes = readNotes()
  const newNote = {
    id: req.body.id || newId('note'),
    title: req.body.title || '',
    content: req.body.content || '',
    color: normalizeColor(req.body.color),
    tags: extractHashtagsServer((req.body.title || '') + ' ' + (req.body.content || '')),
    pinned: !!req.body.pinned,
    archived: !!req.body.archived,
    deleted: false,
    deletedAt: null,
    type: normalizeNoteType(req.body.type),
    reminderAt: req.body.reminderAt || null,
    spreadsheetData: normalizeSpreadsheetData(req.body.spreadsheetData),
    createdAt: req.body.createdAt || new Date().toISOString(),
    updatedAt: req.body.updatedAt || req.body.createdAt || new Date().toISOString()
  }

  notes.unshift(newNote)
  writeNotes(notes)
  console.log(`Note created: "${newNote.title}" (${newNote.id}) ✨`)
  res.status(201).json(newNote)
})

// PUT: Update an existing note
app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params
  let notes = readNotes()
  const noteIndex = notes.findIndex(n => n.id === id)

  if (noteIndex === -1)
  {return res.status(404).json({ error: 'Note not found 😿' })}


  // Merge new updates
  const updatedNote = {
    ...notes[noteIndex],
    title: req.body.title !== undefined ? req.body.title : notes[noteIndex].title,
    content: req.body.content !== undefined ? req.body.content : notes[noteIndex].content,
    color: req.body.color !== undefined
      ? normalizeColor(req.body.color, notes[noteIndex].color || '#ffd1dc')
      : notes[noteIndex].color,
    ...(req.body.title !== undefined || req.body.content !== undefined
      ? { tags: extractHashtagsServer(((req.body.title !== undefined ? req.body.title : notes[noteIndex].title) || '') + ' ' + ((req.body.content !== undefined ? req.body.content : notes[noteIndex].content) || '')) }
      : {}),
    pinned: req.body.pinned !== undefined ? !!req.body.pinned : notes[noteIndex].pinned,
    archived: req.body.archived !== undefined ? !!req.body.archived : notes[noteIndex].archived,
    type: req.body.type !== undefined ? normalizeNoteType(req.body.type) : (notes[noteIndex].type || 'standard'),
    reminderAt: req.body.reminderAt !== undefined
      ? (req.body.reminderAt || null)
      : (notes[noteIndex].reminderAt || null),
    spreadsheetData: req.body.spreadsheetData !== undefined
      ? normalizeSpreadsheetData(req.body.spreadsheetData)
      : (notes[noteIndex].spreadsheetData || null),
    updatedAt: new Date().toISOString()
  }

  notes[noteIndex] = updatedNote
  writeNotes(notes)
  console.log(`Note updated: "${updatedNote.title}" (${id}) ✏️`)
  res.json(updatedNote)
})

// DELETE: Empty the trash (permanently remove all deleted notes). Declared
// before the :id route so "trash" is not matched as a note id.
app.delete('/api/notes/trash', (req, res) => {
  let notes = readNotes()
  const kept = notes.filter(n => !n.deleted)
  const removedCount = notes.length - kept.length
  writeNotes(kept)
  console.log(`Trash emptied: removed ${removedCount} note(s) 🗑️`)
  res.json({ success: true, message: 'Trash emptied 🌸', removed: removedCount })
})

// DELETE: Move a note to the trash (soft delete). Pass ?permanent=1 to remove
// it for good instead.
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params
  const permanent = req.query.permanent === '1'
  let notes = readNotes()
  const noteIndex = notes.findIndex(n => n.id === id)

  if (noteIndex === -1)
  {return res.status(404).json({ error: 'Note not found 😿' })}

  if (permanent) {
    notes = notes.filter(n => n.id !== id)
    writeNotes(notes)
    console.log(`Note deleted permanently: (${id}) 🗑️`)
    return res.json({ success: true, message: 'Note deleted permanently 🌸' })
  }

  notes[noteIndex] = {
    ...notes[noteIndex],
    deleted: true,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  writeNotes(notes)
  console.log(`Note moved to trash: (${id}) 🗑️`)
  res.json({ success: true, message: 'Note moved to trash 🌸' })
})

// POST: Restore a note from the trash
app.post('/api/notes/:id/restore', (req, res) => {
  const { id } = req.params
  let notes = readNotes()
  const noteIndex = notes.findIndex(n => n.id === id)

  if (noteIndex === -1)
  {return res.status(404).json({ error: 'Note not found 😿' })}

  notes[noteIndex] = { ...notes[noteIndex], deleted: false, deletedAt: null, updatedAt: new Date().toISOString() }
  try {
    writeNotes(notes)
  } catch {
    return res.status(500).json({
      error: 'Could not save changes — check that data/notes.json is writable (see README)'
    })
  }
  console.log(`Note restored: (${id}) 🌱`)
  res.json(notes[noteIndex])
})

// GET: Retrieve all credentials (sensitive fields decrypted)
app.get('/api/credentials', async (req, res) => {
  res.json(await readCredentials())
})

// POST: Add a new credential
app.post('/api/credentials', async (req, res) => {
  const credentials = await readCredentials()
  const newCredential = normalizeCredential({
    id: req.body.id || newId('cred'),
    site: req.body.site,
    username: req.body.username,
    password: req.body.password,
    notes: req.body.notes,
    cardNumber: req.body.cardNumber,
    expiry: req.body.expiry,
    cvv: req.body.cvv,
    type: req.body.type,
    color: req.body.color,
    createdAt: req.body.createdAt || new Date().toISOString()
  })

  credentials.unshift(newCredential)
  await writeCredentials(credentials)
  console.log(`Credential created: "${newCredential.site}" (${newCredential.id}) 🔐`)
  res.status(201).json(newCredential)
})

// PUT: Update an existing credential
app.put('/api/credentials/:id', async (req, res) => {
  const { id } = req.params
  const credentials = await readCredentials()
  const credIndex = credentials.findIndex(c => c.id === id)

  if (credIndex === -1)
  {return res.status(404).json({ error: 'Credential not found 😿' })}

  const updatedCredential = normalizeCredential({
    ...credentials[credIndex],
    site: req.body.site !== undefined ? req.body.site : credentials[credIndex].site,
    username: req.body.username !== undefined ? req.body.username : credentials[credIndex].username,
    password: req.body.password !== undefined ? req.body.password : credentials[credIndex].password,
    notes: req.body.notes !== undefined ? req.body.notes : credentials[credIndex].notes,
    cardNumber: req.body.cardNumber !== undefined ? req.body.cardNumber : credentials[credIndex].cardNumber,
    expiry: req.body.expiry !== undefined ? req.body.expiry : credentials[credIndex].expiry,
    cvv: req.body.cvv !== undefined ? req.body.cvv : credentials[credIndex].cvv,
    type: req.body.type !== undefined ? req.body.type : credentials[credIndex].type,
    color: req.body.color !== undefined ? req.body.color : credentials[credIndex].color,
    updatedAt: new Date().toISOString()
  })

  credentials[credIndex] = updatedCredential
  await writeCredentials(credentials)
  console.log(`Credential updated: "${updatedCredential.site}" (${id}) 🔏`)
  res.json(updatedCredential)
})

// DELETE: Empty the credential trash (permanently remove all deleted
// credentials). Declared before the :id route so "trash" is not matched as a
// credential id.
app.delete('/api/credentials/trash', async (req, res) => {
  const credentials = await readCredentials()
  const kept = credentials.filter(c => !c.deleted)
  const removedCount = credentials.length - kept.length
  await writeCredentials(kept)
  console.log(`Credential trash emptied: removed ${removedCount} credential(s) 🗑️`)
  res.json({ success: true, message: 'Credential trash emptied 🔐', removed: removedCount })
})

// DELETE: Move a credential to the trash (soft delete). Pass ?permanent=1 to
// remove it for good instead.
app.delete('/api/credentials/:id', async (req, res) => {
  const { id } = req.params
  const permanent = req.query.permanent === '1'
  const credentials = await readCredentials()
  const credIndex = credentials.findIndex(c => c.id === id)

  if (credIndex === -1)
  {return res.status(404).json({ error: 'Credential not found 😿' })}

  if (permanent) {
    const remaining = credentials.filter(c => c.id !== id)
    await writeCredentials(remaining)
    console.log(`Credential deleted permanently: (${id}) 🗑️`)
    return res.json({ success: true, message: 'Credential deleted permanently 🔐' })
  }

  credentials[credIndex] = {
    ...credentials[credIndex],
    deleted: true,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await writeCredentials(credentials)
  console.log(`Credential moved to trash: (${id}) 🗑️`)
  res.json({ success: true, message: 'Credential moved to trash 🔐' })
})

// POST: Restore a credential from the trash
app.post('/api/credentials/:id/restore', async (req, res) => {
  const { id } = req.params
  const credentials = await readCredentials()
  const credIndex = credentials.findIndex(c => c.id === id)

  if (credIndex === -1)
  {return res.status(404).json({ error: 'Credential not found 😿' })}

  credentials[credIndex] = {
    ...credentials[credIndex],
    deleted: false,
    deletedAt: null,
    updatedAt: new Date().toISOString()
  }
  try {
    await writeCredentials(credentials)
  } catch {
    return res.status(500).json({
      error: 'Could not save changes — check that data/credentials.json is writable (see README)'
    })
  }
  console.log(`Credential restored: (${id}) 🌱`)
  res.json(credentials[credIndex])
})

// ---------------------------------------------------------------------------
// BACKUP & IMPORT
// ---------------------------------------------------------------------------

function normalizeNoteServer(note) {
  const title = String(note.title || '')
  const content = String(note.content || '')
  const createdAt = note.createdAt || new Date().toISOString()
  const rawTags = Array.isArray(note.tags) && note.tags.length > 0
    ? note.tags
    : extractHashtagsServer(title + ' ' + content)
  return {
    id: note.id || newId('note'),
    title,
    content,
    color: normalizeColor(note.color),
    tags: rawTags,
    pinned: !!note.pinned,
    archived: !!note.archived,
    deleted: !!note.deleted,
    deletedAt: note.deletedAt || null,
    type: normalizeNoteType(note.type),
    reminderAt: note.reminderAt || null,
    spreadsheetData: normalizeSpreadsheetData(note.spreadsheetData),
    createdAt,
    updatedAt: note.updatedAt || createdAt
  }
}

// POST: Batch import notes and credentials
app.post('/api/import', async (req, res) => {
  try {
    const importNotes = Array.isArray(req.body.notes) ? req.body.notes : []
    const importCreds = Array.isArray(req.body.credentials) ? req.body.credentials : []

    let notesAdded = 0
    let notesUpdated = 0
    let credentialsAdded = 0
    let credentialsUpdated = 0

    if (importNotes.length > 0) {
      const existingNotes = readNotes()
      const existingIds = new Map()
      const existingSignatures = new Map()

      existingNotes.forEach((note, index) => {
        existingIds.set(note.id, index)
        const sig = `${(note.title || '').trim().toLowerCase()}|${(note.content || '').trim().toLowerCase()}`
        existingSignatures.set(sig, index)
      })

      importNotes.forEach(rawNote => {
        const normalized = normalizeNoteServer(rawNote)
        const sig = `${normalized.title.trim().toLowerCase()}|${normalized.content.trim().toLowerCase()}`

        if (existingIds.has(normalized.id)) {
          const idx = existingIds.get(normalized.id)
          existingNotes[idx] = { ...existingNotes[idx], ...normalized }
          notesUpdated++
        } else if (existingSignatures.has(sig)) {
          // Duplicate note content signature — keep existing
        } else {
          existingNotes.push(normalized)
          existingIds.set(normalized.id, existingNotes.length - 1)
          existingSignatures.set(sig, existingNotes.length - 1)
          notesAdded++
        }
      })

      writeNotes(existingNotes)
    }

    if (importCreds.length > 0) {
      const existingCreds = await readCredentials()
      const existingCredIds = new Map()

      existingCreds.forEach((cred, index) => {
        existingCredIds.set(cred.id, index)
      })

      importCreds.forEach(rawCred => {
        const normalized = normalizeCredential({
          ...rawCred,
          id: rawCred.id || newId('cred')
        })

        if (existingCredIds.has(normalized.id)) {
          const idx = existingCredIds.get(normalized.id)
          existingCreds[idx] = { ...existingCreds[idx], ...normalized }
          credentialsUpdated++
        } else {
          existingCreds.push(normalized)
          existingCredIds.set(normalized.id, existingCreds.length - 1)
          credentialsAdded++
        }
      })

      await writeCredentials(existingCreds)
    }

    console.log(
      `Import complete: ${notesAdded} notes added, ${notesUpdated} notes updated, ` +
      `${credentialsAdded} creds added, ${credentialsUpdated} creds updated 📥`
    )

    res.json({
      success: true,
      notesAdded,
      notesUpdated,
      credentialsAdded,
      credentialsUpdated
    })
  } catch (err) {
    console.error('Batch import failed:', err)
    res.status(500).json({ error: 'Failed to import backup data 😿' })
  }
})

// GET: Export full backup data
app.get('/api/export', async (req, res) => {
  try {
    const notes = readNotes()
    const includeCredentials = req.query.includeCredentials === 'true'
    let credentials = []
    if (includeCredentials) {
      credentials = await readCredentials()
    }
    res.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      notes,
      credentials
    })
  } catch (err) {
    console.error('Export failed:', err)
    res.status(500).json({ error: 'Failed to export backup data 😿' })
  }
})


/* ==========================================================================
   SELF-UPDATE (UI-triggered)
   Fetches the latest Jot code from git and reinstalls production dependencies,
   then restarts the service so systemd (Restart=always) brings it back up with
   the new code. Only available when the app was installed from a git clone
   (e.g. the Proxmox LXC helper, which keeps a shallow clone at /opt/jot).
   Docker / release installs have no .git dir and report `supported: false`.
   ========================================================================== */
const APP_DIR = __dirname
let updateInProgress = false

function isGitRepo() {
  return fs.existsSync(path.join(APP_DIR, '.git'))
}

// Run a git command inside the app checkout. `safe.directory` is passed inline
// so this works regardless of HOME/global git config for the runtime user.
function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      ['-C', APP_DIR, '-c', `safe.directory=${APP_DIR}`, ...args],
      { timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) reject(new Error((stderr || '').trim() || err.message))
        else resolve(String(stdout).trim())
      }
    )
  })
}

function runNpm(args) {
  return new Promise((resolve, reject) => {
    execFile(
      'npm',
      args,
      { cwd: APP_DIR, timeout: 300000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) reject(new Error((stderr || '').trim() || err.message))
        else resolve(String(stdout).trim())
      }
    )
  })
}

function appShortHash() {
  return runGit(['rev-parse', '--short', 'HEAD']).catch(() => '')
}

// The app runs as a non-root service user (`jot` in the Proxmox LXC deployment).
// git only needs read access to check the commit, but `fetch`/`reset` must write
// to the .git directory. If any .git files are owned by root (a host-side
// `update-jot.sh` runs `git fetch`/`git reset` as root), that write fails with "Permission
// denied". Detect that and return actionable guidance instead of the raw error.
function friendlyGitError(rawError) {
  const msg = String((rawError && rawError.message) || rawError)
  if (/permission denied|cannot open|read-only|EACCES/i.test(msg)) {
    return 'The app user cannot write to the container’s git directory (.git). ' +
      'This usually happens after a host-side `update-jot.sh` leaves root-owned files. ' +
      'Fix it from the Proxmox host shell with: ' +
      'pct enter <CTID> -- chown -R jot:jot /opt/jot'
  }
  if (/not possible to fast-forward/i.test(msg)) {
    return 'Git cannot fast-forward the local branch to the remote (the Proxmox ' +
      'LXC install uses a shallow clone, which can confuse ancestry checks). ' +
      'This has been fixed in the update logic (it now uses fetch + reset --hard). ' +
      'If you still see this, reset the checkout manually: ' +
      'pct enter <CTID> -- su -s /bin/sh jot -c "cd /opt/jot && git fetch && git reset --hard origin/main"'
  }
  return msg
}

// Kill-switch for the self-updater: set JOT_ALLOW_SELF_UPDATE=0 to disable the
// /api/update/* endpoints entirely (they run git + npm install as the service
// user, so some deployments may prefer updates to happen only from the host).
const ALLOW_SELF_UPDATE = process.env.JOT_ALLOW_SELF_UPDATE !== '0'

function requireSelfUpdate(req, res, next) {
  if (!ALLOW_SELF_UPDATE) {
    return res.status(403).json({ error: 'Self-update is disabled on this deployment (JOT_ALLOW_SELF_UPDATE=0).' })
  }
  next()
}

// GET: lightweight update availability (no network). Used to decide whether the
// UI should offer in-app updates at all.
app.get('/api/update/status', requireSelfUpdate, async (req, res) => {
  if (!isGitRepo()) {
    return res.json({ supported: false })
  }
  try {
    const current = await appShortHash()
    res.json({ supported: true, running: updateInProgress, current })
  } catch {
    res.json({ supported: false })
  }
})

// POST: fetch remote refs and compare them against the local checkout.
app.post('/api/update/check', requireSelfUpdate, async (req, res) => {
  if (!isGitRepo()) {
    return res.status(400).json({ error: 'This deployment was not installed from git, so it cannot self-update.' })
  }
  if (updateInProgress) {
    return res.status(409).json({ error: 'An update is already running — please wait.' })
  }
  try {
    await runGit(['fetch', '--depth', '1', 'origin', 'main'])
    const current = await appShortHash()
    const latest = await runGit(['rev-parse', '--short', 'FETCH_HEAD'])
    res.json({ current, latest, upToDate: current === latest, available: current !== latest })
  } catch (err) {
    res.status(502).json({ error: 'Could not reach the git remote. ' + friendlyGitError(err) })
  }
})

// POST: pull the latest code, reinstall dependencies, then restart the service.
app.post('/api/update', requireSelfUpdate, async (req, res) => {
  if (!isGitRepo()) {
    return res.status(400).json({ error: 'This deployment was not installed from git, so it cannot self-update.' })
  }
  if (updateInProgress) {
    return res.status(409).json({ error: 'An update is already running — please wait.' })
  }
  updateInProgress = true
  try {
    // Use 'fetch + reset --hard' instead of 'pull --ff-only':
    // --ff-only aborts on shallow clones (the Proxmox LXC install uses
    // 'git clone --depth 1') when git cannot prove ancestry, producing
    // "Not possible to fast-forward, aborting". For a deployment update we
    // want the working tree to match the remote exactly regardless of any
    // local divergence, and .env/data/ are gitignored so reset --hard is safe.
    // Fetch with --depth 1 (matching /api/update/check) so shallow clones
    // never need ancestry proof, and reset to FETCH_HEAD which the fetch
    // just wrote — no dependence on origin/main being resolvable locally.
    try {
      await runGit(['fetch', '--depth', '1', 'origin', 'main'])
    } catch {
      // A corrupted/shallow repo can reject even a depth-1 fetch (e.g. a
      // stale shallow boundary). Re-clone the git metadata in place as a
      // last resort: wipe .git and re-init from the remote. .env and data/
      // live outside git so they are untouched.
      const remoteUrl = await runGit(['remote', 'get-url', 'origin'])
      const rimraf = (p) => fs.rmSync(p, { recursive: true, force: true })
      rimraf(path.join(APP_DIR, '.git'))
      await runGit(['init'])
      await runGit(['remote', 'add', 'origin', remoteUrl])
      await runGit(['fetch', '--depth', '1', 'origin', 'main'])
    }
    await runGit(['reset', '--hard', 'FETCH_HEAD'])
    await runNpm(['install', '--omit=dev', '--no-audit', '--no-fund'])
    // Send the response before killing the process so the client is aware.
    res.json({ success: true, message: 'Update applied.' })
    scheduleServiceRestart()
  } catch (err) {
    updateInProgress = false
    res.status(500).json({ error: 'Update failed. ' + friendlyGitError(err) })
  }
})

function scheduleServiceRestart() {
  // Under systemd (the Proxmox LXC deployment): just exit and let
  // Restart=always relaunch with the freshly pulled code.
  if (fs.existsSync('/run/systemd/system')) {
    console.log('Self-update applied — restarting service via systemd (Restart=always)…')
    setTimeout(() => process.exit(0), 800)
    return
  }
  // Otherwise (local dev, plain node): don't kill ourselves; tell the operator
  // to restart manually so we never leave the app silently down.
  console.warn('Self-update applied — not running under systemd; restart the process to load the new code.')
  setTimeout(() => { updateInProgress = false }, 1000)
}

// API errors as JSON (Express' default error page is HTML, which breaks
// clients that call res.json() on error responses).
// Registered after all routes; only handles errors passed via throw/next(err).
app.use('/api', (err, req, res, _next) => {
  console.error('API error:', err.message)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error 😿' })
})

// Start the Express server
app.listen(PORT, async () => {
  if (!API_TOKEN) {
    console.warn('⚠️  JOT_API_TOKEN is not set — the API is running WITHOUT authentication.')
    console.warn('   Anyone who can reach this port can read and modify your vault.')
    console.warn('   Set JOT_API_TOKEN to a long random value (see .env.example).')
  }
  // Encrypt any pre-existing plaintext credentials on boot
  await secureExistingCredentials()
  console.log(`==================================================`)
  console.log(`  Jot backend server running at:                  `)
  console.log(`  👉 http://localhost:${PORT}                    `)
  console.log(`==================================================`)
})
