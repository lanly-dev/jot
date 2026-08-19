/* ==========================================================================
   Jot - Cute & Colorful Note-Taking App Express Server
   ========================================================================== */

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
// const nodeCrypto = require('crypto')
// const crytpo = require('crypto')

const app = express()
const PORT = process.env.PORT || 3000

// Enable CORS and JSON parsing
app.use(cors())
app.use(express.json())

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

// Serve static frontend files from the root directory
app.use(express.static(path.join(__dirname)))

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
const SENSITIVE_FIELDS = ['password', 'notes']
let credentialKey = null

function loadEncryptionKey() {
  if (credentialKey) return credentialKey
  if (process.env.JOT_SECRET_KEY) {
    credentialKey = new Uint8Array(Buffer.from(process.env.JOT_SECRET_KEY, 'base64'))
  } else if (fs.existsSync(SECRET_FILE)) {
    credentialKey = new Uint8Array(Buffer.from(fs.readFileSync(SECRET_FILE, 'utf-8').trim(), 'base64'))
  } else {
    credentialKey = new Uint8Array(32)
    crypto.randomFillSync(credentialKey)
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
  if (str.startsWith(ENC_PREFIX)) return str
  try {
    const key = await importAESKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, Buffer.from(str, 'utf-8'))
    return ENC_PREFIX + Buffer.concat([Buffer.from(iv), Buffer.from(encrypted)]).toString('base64')
  } catch (err) {
    console.error('Credential encryption failed:', err)
    return str
  }
}

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
  const allowedTypes = ['standard', 'dev', 'reminder', 'spreadsheet']
  return allowedTypes.includes(type) ? type : 'standard'
}

function normalizeSpreadsheetData(spreadsheetData) {
  if (!Array.isArray(spreadsheetData)) return null
  return spreadsheetData.slice(0, 12).map(row => {
    if (!Array.isArray(row)) return []
    return row.slice(0, 8).map(cell => String(cell || ''))
  })
}

function normalizeCredential(cred) {
  const allowedTypes = ['login', 'payment', 'secure-note']
  return {
    id: cred.id,
    site: String(cred.site || ''),
    username: String(cred.username || ''),
    password: String(cred.password || ''),
    notes: String(cred.notes || ''),
    type: allowedTypes.includes(cred.type) ? cred.type : 'login',
    color: String(cred.color || '#ffd1d9'),
    createdAt: cred.createdAt || new Date().toISOString()
  }
}

// Default sample notes seed
const SAMPLE_NOTES = [
  {
    id: 'sample-1',
    title: 'Welcome to Jot! ✨',
    content: 'Hello! This is your cute, colorful space to jot down sweet thoughts, ideas, plans, or doodles.\n\nHere are some quick tips:\n🌸 Choose custom colors for each card!\n📌 Pin your most important notes so they stay at the top.\n📦 Archive old notes to keep your board tidy!\n🏷️ Add tags (separated by commas) to easily organize your jots.',
    color: '#ffd1dc', // strawberry pink
    tags: ['welcome', 'tips', 'sweet'],
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
    content: 'Must try the lavender honey and strawberry waffle cones next weekend with friends! They also have adorable kitty-shaped sprinkles.',
    color: '#e6e6fa', // lavender
    tags: ['fun', 'food', 'weekend'],
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
    content: 'Had a dream where I was floating in a pastel balloon ride above clouds made of cotton candy. A giant soft cat was the pilot! Must write a story about this.',
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

// Helper to read notes
function readNotes() {
  try {
    initializeDatabase()
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Error reading notes database:', err)
    return []
  }
}

// Helper to write notes
function writeNotes(notes) {
  try {
    initializeDatabase()
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing to notes database:', err)
  }
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
  try {
    initializeCredentialsDatabase()
    const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    const list = Array.isArray(parsed) ? parsed : []
    return await Promise.all(list.map(async cred => {
      const out = { ...cred }
      for (const field of SENSITIVE_FIELDS) out[field] = await decryptCredentialValue(out[field])
      return out
    }))
  } catch (err) {
    console.error('Error reading credentials database:', err)
    return []
  }
}

// Helper to encrypt & write credentials
async function writeCredentials(credentials) {
  try {
    initializeCredentialsDatabase()
    const encrypted = await Promise.all(credentials.map(async cred => {
      const out = { ...cred }
      for (const field of SENSITIVE_FIELDS) out[field] = await encryptCredentialValue(out[field])
      return out
    }))
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(encrypted, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing to credentials database:', err)
  }
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
    id: req.body.id || 'note-' + Date.now(),
    title: req.body.title || '',
    content: req.body.content || '',
    color: req.body.color || '#ffd1dc',
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    pinned: !!req.body.pinned,
    archived: !!req.body.archived,
    type: normalizeNoteType(req.body.type),
    reminderAt: req.body.reminderAt || null,
    spreadsheetData: normalizeSpreadsheetData(req.body.spreadsheetData),
    createdAt: req.body.createdAt || new Date().toISOString()
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
    color: req.body.color !== undefined ? req.body.color : notes[noteIndex].color,
    tags: Array.isArray(req.body.tags) ? req.body.tags : notes[noteIndex].tags,
    pinned: req.body.pinned !== undefined ? !!req.body.pinned : notes[noteIndex].pinned,
    archived: req.body.archived !== undefined ? !!req.body.archived : notes[noteIndex].archived,
    type: req.body.type !== undefined ? normalizeNoteType(req.body.type) : (notes[noteIndex].type || 'standard'),
    reminderAt: req.body.reminderAt !== undefined ? (req.body.reminderAt || null) : (notes[noteIndex].reminderAt || null),
    spreadsheetData: req.body.spreadsheetData !== undefined
      ? normalizeSpreadsheetData(req.body.spreadsheetData)
      : (notes[noteIndex].spreadsheetData || null)
  }

  notes[noteIndex] = updatedNote
  writeNotes(notes)
  console.log(`Note updated: "${updatedNote.title}" (${id}) ✏️`)
  res.json(updatedNote)
})

// DELETE: Remove a note permanently
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params
  let notes = readNotes()
  const noteExists = notes.some(n => n.id === id)

  if (!noteExists)
  {return res.status(404).json({ error: 'Note not found 😿' })}


  notes = notes.filter(n => n.id !== id)
  writeNotes(notes)
  console.log(`Note deleted permanently: (${id}) 🗑️`)
  res.json({ success: true, message: 'Note deleted permanently 🌸' })
})

// GET: Retrieve all credentials (sensitive fields decrypted)
app.get('/api/credentials', async (req, res) => {
  res.json(await readCredentials())
})

// POST: Add a new credential
app.post('/api/credentials', async (req, res) => {
  const credentials = await readCredentials()
  const newCredential = normalizeCredential({
    id: req.body.id || 'cred-' + Date.now(),
    site: req.body.site,
    username: req.body.username,
    password: req.body.password,
    notes: req.body.notes,
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
    type: req.body.type !== undefined ? req.body.type : credentials[credIndex].type,
    color: req.body.color !== undefined ? req.body.color : credentials[credIndex].color
  })

  credentials[credIndex] = updatedCredential
  await writeCredentials(credentials)
  console.log(`Credential updated: "${updatedCredential.site}" (${id}) 🔏`)
  res.json(updatedCredential)
})

// DELETE: Remove a credential permanently
app.delete('/api/credentials/:id', async (req, res) => {
  const { id } = req.params
  const credentials = await readCredentials()
  const credExists = credentials.some(c => c.id === id)

  if (!credExists)
  {return res.status(404).json({ error: 'Credential not found 😿' })}

  const remaining = credentials.filter(c => c.id !== id)
  await writeCredentials(remaining)
  console.log(`Credential deleted permanently: (${id}) 🗑️`)
  res.json({ success: true, message: 'Credential deleted permanently 🔐' })
})

// Start the Express server
app.listen(PORT, async () => {
  // Encrypt any pre-existing plaintext credentials on boot
  await secureExistingCredentials()
  console.log(`==================================================`)
  console.log(`  Jot backend server running at:                  `)
  console.log(`  👉 http://localhost:${PORT}                    `)
  console.log(`==================================================`)
})
