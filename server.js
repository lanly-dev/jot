/* ==========================================================================
   Jot - Cute & Colorful Note-Taking App Express Server
   ========================================================================== */

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// Enable CORS and JSON parsing
app.use(cors())
app.use(express.json())

// Serve static frontend files from the root directory
app.use(express.static(path.join(__dirname)))

// File path for database storage
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'notes.json')

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
    createdAt: new Date(Date.now() - 180000).toISOString()
  }
]

// Helper to ensure database file exists
function initializeDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
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

  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found 😿' })
  }

  // Merge new updates
  const updatedNote = {
    ...notes[noteIndex],
    title: req.body.title !== undefined ? req.body.title : notes[noteIndex].title,
    content: req.body.content !== undefined ? req.body.content : notes[noteIndex].content,
    color: req.body.color !== undefined ? req.body.color : notes[noteIndex].color,
    tags: Array.isArray(req.body.tags) ? req.body.tags : notes[noteIndex].tags,
    pinned: req.body.pinned !== undefined ? !!req.body.pinned : notes[noteIndex].pinned,
    archived: req.body.archived !== undefined ? !!req.body.archived : notes[noteIndex].archived,
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

  if (!noteExists) {
    return res.status(404).json({ error: 'Note not found 😿' })
  }

  notes = notes.filter(n => n.id !== id)
  writeNotes(notes)
  console.log(`Note deleted permanently: (${id}) 🗑️`)
  res.json({ success: true, message: 'Note deleted permanently 🌸' })
})

// Start the Express server
app.listen(PORT, () => {
  console.log(`==================================================`)
  console.log(`  Jot backend server running at:                  `)
  console.log(`  👉 http://localhost:${PORT}                    `)
  console.log(`==================================================`)
})
