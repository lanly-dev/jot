/* ==========================================================================
   Jot - Cute & Colorful Note-Taking App JavaScript Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // CENTRAL STATE
  let notes = []
  let currentView = 'active' // 'active' or 'archived'
  let currentLayoutView = localStorage.getItem('jot_layout_view') || 'thumbnail' // 'thumbnail' or 'list'
  let isFormPinned = false // whether the note-in-creation is pinned
  let focusedNoteId = null
  let spreadsheetDraft = []
  const reminderTimers = new Map()

  // DEFAULT SAMPLES (Loaded only on first visit to make it feel rich and welcoming!)
  const SAMPLE_NOTES = [
    {
      id: 'sample-1',
      title: 'Welcome to Jot! ✨',
      content: 'Hello! This is your cute, colorful space to jot down sweet thoughts, ideas, plans, or doodles.\n\nHere are some quick tips:\n🌸 Choose custom colors for each card!\n📌 Pin your most important notes so they stay at the top.\n📦 Archive old notes to keep your board tidy!',
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

  // DOM ELEMENTS SELECTORS
  const noteForm = document.getElementById('note-form')
  const noteIdInput = document.getElementById('note-id')
  const noteTitleInput = document.getElementById('note-title')
  const noteContentInput = document.getElementById('note-content')
  const noteTypeSelect = document.getElementById('note-type')
  const noteReminderAtInput = document.getElementById('note-reminder-at')
  const reminderConfig = document.getElementById('reminder-config')
  const devNoteHint = document.getElementById('devnote-hint')
  const spreadsheetConfig = document.getElementById('spreadsheet-config')
  const spreadsheetGrid = document.getElementById('spreadsheet-grid')
  const sheetRowsInput = document.getElementById('sheet-rows')
  const sheetColsInput = document.getElementById('sheet-cols')
  const editorCard = document.getElementById('editor-card')
  const editorTitleHeading = document.getElementById('editor-title-heading')
  const editorPinBtn = document.getElementById('editor-pin-btn')
  const btnClearForm = document.getElementById('btn-clear-form')
  const btnSaveNote = document.getElementById('btn-save-note')
  const colorOptionsContainer = document.getElementById('color-options')

  const btnFilterActive = document.getElementById('status-active')
  const btnFilterArchived = document.getElementById('status-archived')
  const btnLayoutToggle = document.getElementById('btn-layout-toggle')

  const notesGrid = document.getElementById('notes-grid')
  const emptyState = document.getElementById('empty-state')
  const noteFocusBackdrop = document.getElementById('note-focus-backdrop')
  const notePreviewPanel = document.getElementById('note-preview-panel')
  const notePreviewContent = document.getElementById('note-preview-content')
  const notePreviewClose = document.getElementById('note-preview-close')

  // Stats dashboard selectors
  const statTotalNotes = document.getElementById('stat-total-notes')
  const statPinnedNotes = document.getElementById('stat-pinned-notes')
  const statArchivedNotes = document.getElementById('stat-archived-notes')

  // Note Creator UI elements
  const creatorCollapsed = document.getElementById('creator-collapsed')
  const creatorExpanded = document.getElementById('creator-expanded')
  const btnExpandCreator = document.getElementById('btn-expand-creator')
  const btnCloseCreator = document.getElementById('btn-close-creator')

  // INITIALIZATION
  function init() {
    initSpreadsheetDraft(3, 3)
    setupEventListeners()
    fetchNotes()
    updateLayoutToggleButton()
    updateTypeSpecificFields()
  }

  async function fetchNotes() {
    try {
      const res = await fetch('/api/notes')
      if (!res.ok) throw new Error('Failed to fetch notes')
      const fetchedNotes = await res.json()
      notes = Array.isArray(fetchedNotes)
        ? fetchedNotes.map(note => normalizeNote(note))
        : []
      saveNotesToStorage() // update offline backup
    } catch (err) {
      console.error('Error fetching notes from cloud:', err)
      // Fallback to local storage
      const savedNotes = localStorage.getItem('jot_notes')
      if (savedNotes) {
        const parsedNotes = JSON.parse(savedNotes)
        notes = Array.isArray(parsedNotes)
          ? parsedNotes.map(note => normalizeNote(note))
          : []
      } else {
        notes = [...SAMPLE_NOTES].map(note => normalizeNote(note))
        saveNotesToStorage()
      }
      showToast('Running in local offline mode ⚠️', 'warn')
    }
    render()
  }

  // STATE SAVING (Offline/Backup storage)
  function saveNotesToStorage() {
    localStorage.setItem('jot_notes', JSON.stringify(notes))
  }

  // Dynamic Toast Notification UI
  function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'toast-container'
      container.className = 'toast-container'
      document.body.appendChild(container)
    }

    const toast = document.createElement('div')
    toast.className = `toast-message toast-${type}`
    toast.innerHTML = `<span>${message}</span>`
    container.appendChild(toast)

    setTimeout(() => {
      toast.classList.add('toast-fade-out')
      setTimeout(() => {
        toast.remove()
      }, 400)
    }, 3000)
  }

  // SETUP EVENT LISTENERS
  function setupEventListeners() {
    // Form submission (Save Note)
    noteForm.addEventListener('submit', handleFormSubmit)

    // Cancel editing button
    btnClearForm.addEventListener('click', resetForm)

    // Editor Pin toggle
    editorPinBtn.addEventListener('click', () => {
      isFormPinned = !isFormPinned
      editorPinBtn.classList.toggle('pinned', isFormPinned)
      editorPinBtn.title = isFormPinned ? 'Unpin Note' : 'Pin Note to Top'
    })

    // Color option picker radio click animations
    colorOptionsContainer.addEventListener('change', (e) => {
      if (e.target.name === 'note-color') {
        document.querySelectorAll('.color-option-label').forEach(label => {
          label.classList.remove('current')
        })
        const selectedLabel = e.target.closest('.color-option-label')
        if (selectedLabel) {
          selectedLabel.classList.add('current')
          // Style editor border or soft glow based on selected color
          editorCard.style.borderColor = e.target.value
        }
      }
    })

    // Active vs. Archived View filter toggles (radio style with icons)
    btnFilterActive.addEventListener('change', () => {
      currentView = 'active'
      btnFilterActive.closest('.status-option').classList.add('active')
      btnFilterArchived.closest('.status-option').classList.remove('active')
      render()
    })

    btnFilterArchived.addEventListener('change', () => {
      currentView = 'archived'
      btnFilterArchived.closest('.status-option').classList.add('active')
      btnFilterActive.closest('.status-option').classList.remove('active')
      render()
    })

    // Thumbnail/List layout toggle
    btnLayoutToggle.addEventListener('click', () => {
      currentLayoutView = currentLayoutView === 'thumbnail' ? 'list' : 'thumbnail'
      localStorage.setItem('jot_layout_view', currentLayoutView)
      updateLayoutToggleButton()
      render()
    })

    // Note type and type-specific editors
    noteTypeSelect.addEventListener('change', () => {
      updateTypeSpecificFields()
    })

    const resizeSheet = () => {
      const rows = clampNumber(sheetRowsInput.value, 1, 12, 3)
      const cols = clampNumber(sheetColsInput.value, 1, 8, 3)
      resizeSpreadsheetDraft(rows, cols)
      renderSpreadsheetGrid()
    }

    sheetRowsInput.addEventListener('input', resizeSheet)
    sheetColsInput.addEventListener('input', resizeSheet)

    spreadsheetGrid.addEventListener('input', (e) => {
      const cell = e.target.closest('input[data-row][data-col]')
      if (!cell) return
      const row = Number(cell.getAttribute('data-row'))
      const col = Number(cell.getAttribute('data-col'))
      if (!spreadsheetDraft[row]) return
      spreadsheetDraft[row][col] = cell.value
    })

    // Card Action Delegations (Pin, Edit, Archive, Delete, Tag-Filter Click inside Card)
    notesGrid.addEventListener('click', handleCardActions)

    // Focus mode exit handlers
    noteFocusBackdrop.addEventListener('click', closeFocusedNote)
    notePreviewClose.addEventListener('click', closeFocusedNote)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeFocusedNote() }

    })

    // Google Keep-Style Note Creator Listeners
    if (btnExpandCreator) {
      btnExpandCreator.addEventListener('click', (e) => {
        e.stopPropagation()
        if (editorCard.classList.contains('active')) {
          if (noteTitleInput.value.trim() === '' && noteContentInput.value.trim() === '') { resetForm() }
          else { noteForm.requestSubmit() }

        } else { expandCreator() }

      })
    }

    if (creatorCollapsed) {
      creatorCollapsed.addEventListener('click', (e) => {
        if (e.target.closest('#btn-expand-creator')) return
        if (!editorCard.classList.contains('active')) { expandCreator() }

      })
    }

    if (btnCloseCreator) {
      btnCloseCreator.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (noteTitleInput.value.trim() === '' && noteContentInput.value.trim() === '') { resetForm() }
        else { noteForm.requestSubmit() }

      })
    }

    // Expand on focus
    noteTitleInput.addEventListener('focus', expandCreator)
    noteContentInput.addEventListener('focus', expandCreator)

    // Collapse on click outside
    document.addEventListener('click', (e) => {
      if (editorCard && !editorCard.contains(e.target) && !e.target.closest('#btn-expand-creator')) {
        if (editorCard.classList.contains('active')) {
          if (noteTitleInput.value.trim() === '' && noteContentInput.value.trim() === '') { resetForm() }
          else { noteForm.requestSubmit() }

        }
      }
    })
  }

  // CREATE OR UPDATE NOTE FORM HANDLER
  async function handleFormSubmit(e) {
    e.preventDefault()

    const id = noteIdInput.value
    const title = noteTitleInput.value.trim()
    const content = noteContentInput.value.trim()
    const noteType = noteTypeSelect.value
    const reminderAt = noteType === 'reminder' ? noteReminderAtInput.value || null : null
    const spreadsheetData = noteType === 'spreadsheet' ? spreadsheetDraft.map(row => row.map(cell => cell.trim())) : null

    ensureNotificationPermissionIfNeeded(noteType)

    const colorRadio = document.querySelector('input[name="note-color"]:checked')
    const color = colorRadio ? colorRadio.value : '#ffd1dc'

    if (id) {
      // EDITING EXISTING NOTE
      const updatedFields = {
        title,
        content,
        color,
        pinned: isFormPinned,
        type: noteType,
        reminderAt,
        spreadsheetData
      }

      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFields)
        })
        if (!res.ok) throw new Error('Cloud update failed')
        const updatedNote = await res.json()
        notes = notes.map(n => n.id === id ? normalizeNote(updatedNote, updatedFields) : n)
        showToast('Jot updated! ✏️')
      } catch (err) {
        console.error(err)
        notes = notes.map(n => n.id === id ? normalizeNote({ ...n, ...updatedFields }) : n)
        showToast('Updated locally ⚠️', 'warn')
      }
    } else {
      // NEW NOTE CREATION
      const newNote = {
        title,
        content,
        color,
        pinned: isFormPinned,
        type: noteType,
        reminderAt,
        spreadsheetData,
        archived: false,
        createdAt: new Date().toISOString()
      }

      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newNote)
        })
        if (!res.ok) throw new Error('Cloud save failed')
        const savedNote = await res.json()
        notes.unshift(normalizeNote(savedNote, newNote))
        showToast('Jot saved successfully! ✨')
      } catch (err) {
        console.error(err)
        const localNote = {
          ...newNote,
          id: 'note-' + Date.now()
        }
        notes.unshift(normalizeNote(localNote))
        showToast('Saved locally ⚠️', 'warn')
      }
    }

    saveNotesToStorage()
    resetForm()
    render()
    scheduleReminderNotifications()

    window.scrollTo({ top: notesGrid.offsetTop - 100, behavior: 'smooth' })
  }

  // POPULATE FORM FOR EDITING
  function populateFormForEditing(note) {
    noteIdInput.value = note.id
    noteTitleInput.value = note.title
    noteContentInput.value = note.content
    noteTypeSelect.value = note.type || 'standard'
    noteReminderAtInput.value = note.reminderAt ? note.reminderAt.slice(0, 16) : ''

    const sheetData = Array.isArray(note.spreadsheetData) && note.spreadsheetData.length > 0
      ? note.spreadsheetData
      : [['', '', ''], ['', '', ''], ['', '', '']]
    const rows = Math.min(Math.max(sheetData.length, 1), 12)
    const cols = Math.min(Math.max((sheetData[0] || []).length, 1), 8)
    sheetRowsInput.value = rows
    sheetColsInput.value = cols
    initSpreadsheetDraft(rows, cols)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        spreadsheetDraft[r][c] = (sheetData[r] && sheetData[r][c]) ? String(sheetData[r][c]) : ''
      }
    }
    updateTypeSpecificFields()
    renderSpreadsheetGrid()

    // Select color radio in form
    const radioToSelect = document.querySelector(`input[name="note-color"][value="${note.color}"]`)
    if (radioToSelect) {
      radioToSelect.checked = true
      document.querySelectorAll('.color-option-label').forEach(label => {
        label.classList.remove('current')
      })
      const parentLabel = radioToSelect.closest('.color-option-label')
      if (parentLabel) {
        parentLabel.classList.add('current')
        editorCard.style.borderColor = note.color
      }
    }

    // Pin button state
    isFormPinned = note.pinned
    editorPinBtn.classList.toggle('pinned', isFormPinned)
    editorPinBtn.title = isFormPinned ? 'Unpin Note' : 'Pin Note to Top'

    // Heading & buttons update
    editorTitleHeading.textContent = 'Edit Your Jot'
    btnClearForm.style.display = 'inline-flex'
    btnSaveNote.querySelector('.btn-text').textContent = 'Save Changes'

    // Expand creator card so input elements are visible/focusable
    expandCreator()

    // Smooth scroll to editor form so user can see it instantly
    window.scrollTo({ top: editorCard.offsetTop - 50, behavior: 'smooth' })
    noteTitleInput.focus()
  }

  // Note Creator UI Behaviors
  function expandCreator() {
    if (editorCard.classList.contains('active')) return
    editorCard.classList.add('active')

    // Toggle visibility of collapsed vs expanded states
    if (creatorCollapsed) creatorCollapsed.style.display = 'none'
    if (creatorExpanded) creatorExpanded.style.display = 'block'

    noteTitleInput.focus()
  }

  function collapseCreator() {
    if (!editorCard.classList.contains('active')) return
    editorCard.classList.remove('active')

    // Toggle visibility of collapsed vs expanded states
    if (creatorCollapsed) creatorCollapsed.style.display = 'flex'
    if (creatorExpanded) creatorExpanded.style.display = 'none'
  }

  // RESET FORM TO CREATE STATE
  function resetForm() {
    collapseCreator()
    noteIdInput.value = ''
    noteForm.reset()
    noteTypeSelect.value = 'standard'
    noteReminderAtInput.value = ''
    sheetRowsInput.value = 3
    sheetColsInput.value = 3
    initSpreadsheetDraft(3, 3)
    updateTypeSpecificFields()
    renderSpreadsheetGrid()

    // Reset color selector to first pink choice
    const pinkRadio = document.querySelector('input[name="note-color"][value="#ffd1dc"]')
    if (pinkRadio) {
      pinkRadio.checked = true
      document.querySelectorAll('.color-option-label').forEach(label => {
        label.classList.remove('current')
      })
      pinkRadio.closest('.color-option-label').classList.add('current')
    }
    editorCard.style.borderColor = 'var(--border-color)'

    // Reset pin state
    isFormPinned = false
    editorPinBtn.classList.remove('pinned')
    editorPinBtn.title = 'Pin Note to Top'

    // Reset buttons to Create state
    editorTitleHeading.textContent = 'Create a New Jot'
    btnClearForm.style.display = 'none'
    btnSaveNote.querySelector('.btn-text').textContent = 'Save Note'
  }

  // Helper to sync minor updates silently
  async function updateNoteOnServerSilent(id, fields) {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      })
      if (!res.ok) throw new Error('Cloud sync failed')
      const updatedNote = await res.json()
      notes = notes.map(n => n.id === id ? normalizeNote(updatedNote, fields) : n)
      saveNotesToStorage()
    } catch (err) {
      console.error('Silent update sync failed:', err)
      saveNotesToStorage()
    }
  }

  function normalizeNote(note, fallback = {}) {
    const merged = { ...fallback, ...(note || {}) }
    return {
      ...merged,
      type: merged.type || 'standard',
      reminderAt: merged.reminderAt || null,
      spreadsheetData: Array.isArray(merged.spreadsheetData) ? merged.spreadsheetData : null,
      tags: Array.isArray(merged.tags) ? merged.tags : []
    }
  }

  // HANDLE NOTE CARD ACTION CLICKS (DELEGATED)
  function handleCardActions(e) {
    const target = e.target
    const card = target.closest('.note-card')
    if (!card) return

    const noteId = card.getAttribute('data-id')
    const note = notes.find(n => n.id === noteId)
    if (!note) return

    // 1. PIN TOGGLE ACTION (Click on pin badge or header pin indicator)
    if (target.closest('.action-pin') || target.closest('.pin-badge')) {
      const nextPinned = !note.pinned
      note.pinned = nextPinned
      render()
      updateNoteOnServerSilent(note.id, { pinned: nextPinned })
      return
    }

    // 2. ARCHIVE TOGGLE ACTION
    if (target.closest('.action-archive')) {
      const nextArchived = !note.archived
      const nextPinned = nextArchived ? false : note.pinned
      note.archived = nextArchived
      if (nextArchived) note.pinned = false

      render()
      updateNoteOnServerSilent(note.id, { archived: nextArchived, pinned: nextPinned })
      return
    }

    // 3. EDIT ACTION
    if (target.closest('.action-edit')) {
      closeFocusedNote()
      populateFormForEditing(note)
      return
    }

    // 4. DELETE ACTION
    if (target.closest('.action-delete')) {
      card.classList.add('card-poof')

      setTimeout(async () => {
        notes = notes.filter(n => n.id !== noteId)
        if (noteIdInput.value === noteId) resetForm()
        render()

        try {
          const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Cloud delete failed')
          saveNotesToStorage()
          showToast('Jot deleted permanently! 🗑️')
        } catch (err) {
          console.error(err)
          saveNotesToStorage()
          showToast('Deleted locally ⚠️', 'warn')
        }
      }, 300)
      return
    }

    // 5. CLICK CARD TO FOCUS/EXPAND
    openFocusedNote(noteId)
  }

  // UPDATE STATS DASHBOARD VALUES
  function updateStatsDashboard() {
    const totalActive = notes.filter(n => !n.archived).length
    const totalPinned = notes.filter(n => n.pinned && !n.archived).length
    const totalArchived = notes.filter(n => n.archived).length

    // Populate with nice numeric animations if values changed
    animateValue(statTotalNotes, parseInt(statTotalNotes.textContent) || 0, totalActive, 400)
    animateValue(statPinnedNotes, parseInt(statPinnedNotes.textContent) || 0, totalPinned, 400)
    animateValue(statArchivedNotes, parseInt(statArchivedNotes.textContent) || 0, totalArchived, 400)
  }

  // Sweet numeric sliding ticker animation helper
  function animateValue(obj, start, end, duration) {
    if (start === end) return
    let startTimestamp = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      obj.innerHTML = Math.floor(progress * (end - start) + start)
      if (progress < 1) { window.requestAnimationFrame(step) }
      else obj.innerHTML = end

    }
    window.requestAnimationFrame(step)
  }

  // MAIN RENDER CONTROLLER
  function render() {
    notesGrid.classList.toggle('list-view', currentLayoutView === 'list')

    // 1. Update stats dashboard
    updateStatsDashboard()

    // 2. Filter notes based on active state
    let filteredNotes = notes.filter(note => {
      return note.archived === (currentView === 'archived')
    })

    // 3. Sort notes: Pinned notes bubble to top, then sorted by createdAt descending
    filteredNotes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    // If focused note is no longer visible due to filters/view, exit focus mode.
    if (focusedNoteId && !filteredNotes.some(note => note.id === focusedNoteId)) focusedNoteId = null

    // 4. Handle empty state display
    if (filteredNotes.length === 0) {
      notesGrid.style.display = 'none'
      emptyState.style.display = 'flex'

      // Update empty state text based on view
      const emptyTitle = emptyState.querySelector('h3')
      const emptyPara = emptyState.querySelector('p')
      const emptyMascot = emptyState.querySelector('.empty-mascot')

      if (currentView === 'archived') {
        emptyMascot.textContent = '📦'
        emptyTitle.textContent = 'Your archive is empty'
        emptyPara.textContent = 'When you have a jot that you are finished with, tap its Archive box to tuck it away here!'
      } else {
        emptyMascot.textContent = '✨'
        emptyTitle.textContent = 'Your Jot board is looking quiet...'
        emptyPara.textContent = 'Write your first sweet note in the panel on the left to start filling your board with color and joy!'
      }
    } else {
      notesGrid.style.display = currentLayoutView === 'list' ? 'flex' : 'grid'
      emptyState.style.display = 'none'

      // Render card templates
      notesGrid.innerHTML = filteredNotes.map(note => renderNoteCardHTML(note)).join('')
    }

    applyFocusedNoteState()
    scheduleReminderNotifications()
  }

  function openFocusedNote(noteId) {
    focusedNoteId = focusedNoteId === noteId ? null : noteId
    applyFocusedNoteState()
  }

  function closeFocusedNote() {
    if (!focusedNoteId) return
    focusedNoteId = null
    applyFocusedNoteState()
  }

  function applyFocusedNoteState() {
    const focusedNote = notes.find(note => note.id === focusedNoteId)
    const hasFocusedNote = !!focusedNote

    noteFocusBackdrop.classList.toggle('active', hasFocusedNote)
    notePreviewPanel.classList.toggle('active', hasFocusedNote)
    notePreviewPanel.setAttribute('aria-hidden', hasFocusedNote ? 'false' : 'true')
    document.body.classList.toggle('note-focus-open', hasFocusedNote)

    if (hasFocusedNote) notePreviewContent.innerHTML = renderFocusedNotePanelHTML(focusedNote)
    else notePreviewContent.innerHTML = ''

  }

  function renderFocusedNotePanelHTML(note) {
    const noteType = note.type || 'standard'
    const typeLabelMap = {
      standard: 'Standard',
      dev: 'Dev',
      reminder: 'Reminder',
      spreadsheet: 'Sheet'
    }

    const escapedTitle = escapeHTML(note.title)
    const escapedContent = escapeHTML(note.content)
    const reminderText = noteType === 'reminder' && note.reminderAt
      ? `<div class="reminder-chip">⏰ ${escapeHTML(formatReminder(note.reminderAt))}</div>`
      : ''
    const markdownMarkup = noteType === 'dev'
      ? `<div class="note-body-markdown">${renderMarkdown(note.content || '')}</div>`
      : ''
    const spreadsheetMarkup = noteType === 'spreadsheet'
      ? renderSpreadsheetPreview(note.spreadsheetData)
      : ''
    const standardBodyMarkup = noteType === 'standard' || noteType === 'reminder'
      ? `<p class="note-body">${escapedContent}</p>`
      : ''

    return `
      <article class="note-preview-article" style="--note-color: ${note.color};">
        <div class="note-header">
          <span class="note-type-badge type-${noteType}">${typeLabelMap[noteType] || 'Standard'}</span>
          <h2 class="note-preview-title">${escapedTitle}</h2>
          <p class="note-preview-meta">${escapeHTML(formatDate(note.createdAt))}</p>
        </div>
        ${reminderText}
        ${standardBodyMarkup}
        ${markdownMarkup}
        ${spreadsheetMarkup}
      </article>
    `
  }

  // Keep layout toggle label and style in sync with current mode
  function updateLayoutToggleButton() {
    if (!btnLayoutToggle) return

    const isListView = currentLayoutView === 'list'
    const currentViewLabel = isListView ? 'List' : 'Thumbnail'
    const nextViewLabel = isListView ? 'thumbnail' : 'list'

    btnLayoutToggle.classList.toggle('active', isListView)
    btnLayoutToggle.textContent = currentViewLabel
    btnLayoutToggle.title = `Switch to ${nextViewLabel} view`
    btnLayoutToggle.setAttribute('aria-label', `Switch to ${nextViewLabel} view`)
  }

  function clampNumber(value, min, max, fallback) {
    const num = Number(value)
    if (Number.isNaN(num)) return fallback
    return Math.min(Math.max(num, min), max)
  }

  function initSpreadsheetDraft(rows, cols) {
    spreadsheetDraft = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => '')
    )
  }

  function resizeSpreadsheetDraft(rows, cols) {
    const next = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (spreadsheetDraft[r] && spreadsheetDraft[r][c]) ? spreadsheetDraft[r][c] : '')
    )
    spreadsheetDraft = next
    sheetRowsInput.value = rows
    sheetColsInput.value = cols
  }

  function renderSpreadsheetGrid() {
    const rows = clampNumber(sheetRowsInput.value, 1, 12, 3)
    const cols = clampNumber(sheetColsInput.value, 1, 8, 3)

    let html = '<table><tbody>'
    for (let r = 0; r < rows; r++) {
      html += '<tr>'
      for (let c = 0; c < cols; c++) {
        const cellValue = (spreadsheetDraft[r] && spreadsheetDraft[r][c]) ? escapeHTML(spreadsheetDraft[r][c]) : ''
        html += `<td><input type="text" data-row="${r}" data-col="${c}" value="${cellValue}" placeholder="Cell"></td>`
      }
      html += '</tr>'
    }
    html += '</tbody></table>'
    spreadsheetGrid.innerHTML = html
  }

  function updateTypeSpecificFields() {
    const type = noteTypeSelect.value
    devNoteHint.style.display = type === 'dev' ? 'block' : 'none'
    reminderConfig.style.display = type === 'reminder' ? 'block' : 'none'
    spreadsheetConfig.style.display = type === 'spreadsheet' ? 'block' : 'none'

    if (type === 'spreadsheet') {
      noteContentInput.required = false
      noteContentInput.placeholder = 'Optional summary for this table...'
      renderSpreadsheetGrid()
    } else if (type === 'dev') {
      noteContentInput.required = true
      noteContentInput.placeholder = 'Write markdown like # Heading, **bold**, `code`, and lists...'
    } else {
      noteContentInput.required = true
      noteContentInput.placeholder = 'Write your thoughts down here... Feel free to be creative!'
    }
  }

  function clearReminderTimers() {
    reminderTimers.forEach(timerId => clearTimeout(timerId))
    reminderTimers.clear()
  }

  function scheduleReminderNotifications() {
    clearReminderTimers()
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    notes
      .filter(n => !n.archived && (n.type === 'reminder') && n.reminderAt)
      .forEach(note => {
        const msUntilReminder = new Date(note.reminderAt).getTime() - Date.now()
        if (msUntilReminder <= 0 || Number.isNaN(msUntilReminder)) return

        const timerId = setTimeout(() => {
          showReminderNotification(note)
          reminderTimers.delete(note.id)
        }, msUntilReminder)

        reminderTimers.set(note.id, timerId)
      })
  }

  function showReminderNotification(note) {
    try {
      const body = note.content && note.content.trim().length > 0
        ? note.content
        : 'You have a reminder note due now.'
      new Notification(`Reminder: ${note.title || 'Untitled Note'}`, { body })
      showToast(`Reminder: ${note.title || 'Untitled Note'} ⏰`, 'success')
    } catch (err) {
      console.error('Reminder notification failed:', err)
    }
  }

  function ensureNotificationPermissionIfNeeded(noteType) {
    if (noteType !== 'reminder' || typeof Notification === 'undefined') return
    if (Notification.permission === 'default') Notification.requestPermission().catch(() => { })
  }

  function renderMarkdown(markdownText) {
    if (!markdownText) return ''

    let html = escapeHTML(markdownText)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    html = html.replace(/^### (.*)$/gm, '<h4>$1</h4>')
    html = html.replace(/^## (.*)$/gm, '<h3>$1</h3>')
    html = html.replace(/^# (.*)$/gm, '<h2>$1</h2>')
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    html = html.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    html = html.replace(/^- (.*)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    html = html.replace(/\n/g, '<br>')
    return html
  }

  function renderSpreadsheetPreview(spreadsheetData) {
    if (!Array.isArray(spreadsheetData) || spreadsheetData.length === 0) return ''

    const previewRows = spreadsheetData.slice(0, 5)
    const rowsMarkup = previewRows.map(row => {
      const cells = Array.isArray(row) ? row : []
      return `<tr>${cells.slice(0, 6).map(cell => `<td>${escapeHTML(String(cell || ''))}</td>`).join('')}</tr>`
    }).join('')

    return `<div class="spreadsheet-preview"><table><tbody>${rowsMarkup}</tbody></table></div>`
  }

  function formatReminder(reminderAt) {
    if (!reminderAt) return ''
    const reminderDate = new Date(reminderAt)
    if (Number.isNaN(reminderDate.getTime())) return ''
    return reminderDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  // HTML CARD RENDER TEMPLATE
  function renderNoteCardHTML(note) {
    const noteType = note.type || 'standard'

    const typeLabelMap = {
      standard: 'Standard',
      dev: 'Dev',
      reminder: 'Reminder',
      spreadsheet: 'Sheet'
    }
    const typeBadgeMarkup = `<span class="note-type-badge type-${noteType}">${typeLabelMap[noteType] || 'Standard'}</span>`

    // Pin badge conditional class and marker
    const pinBadgeMarkup = note.pinned
      ? `<div class="pin-badge" title="Pinned to Top">📌</div>`
      : ''

    // Formatted timestamp text (e.g. "Just now", "2 mins ago", or neat date)
    const dateText = formatDate(note.createdAt)

    // Archive button icon conditional based on state
    const archiveTitle = note.archived ? 'Send back to Active Jots' : 'Archive Note'
    const archiveIconSVG = note.archived
      ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>` // unarchive symbol
      : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"></path><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>` // box symbol

    // Pin action button inside card footer
    const pinActionTitle = note.pinned ? 'Unpin Note' : 'Pin Note'
    const pinActionSVG = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="${note.pinned ? 'fill:var(--color-primary); color:var(--color-primary);' : ''}"><line x1="18" y1="8" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="6"></line><path d="M12 6H8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4"></path><line x1="12" y1="17" x2="12" y2="22"></line></svg>`

    // Title and Content escaping to avoid XSS injections while maintaining layout spacing
    const escapedTitle = escapeHTML(note.title)
    const escapedContent = escapeHTML(note.content)
    const markdownMarkup = noteType === 'dev'
      ? `<div class="note-body-markdown">${renderMarkdown(note.content || '')}</div>`
      : ''
    const spreadsheetMarkup = noteType === 'spreadsheet'
      ? renderSpreadsheetPreview(note.spreadsheetData)
      : ''
    const reminderText = noteType === 'reminder' && note.reminderAt
      ? `<div class="reminder-chip">⏰ ${escapeHTML(formatReminder(note.reminderAt))}</div>`
      : ''
    const standardBodyMarkup = noteType === 'standard' || noteType === 'reminder'
      ? `<p class="note-body">${escapedContent}</p>`
      : ''

    return `
      <article class="note-card ${note.pinned ? 'pinned-card' : ''}" data-id="${note.id}" style="--note-color: ${note.color};">
        ${pinBadgeMarkup}

        <div class="note-header">
          ${typeBadgeMarkup}
          <h3 class="note-title">${escapedTitle}</h3>
        </div>

        ${reminderText}
        ${standardBodyMarkup}
        ${markdownMarkup}
        ${spreadsheetMarkup}

        <div class="note-actions">
          <span style="margin-right: auto; align-self: center; font-size: 0.72rem; font-weight: 700; color: rgba(45, 43, 42, 0.45);">${dateText}</span>

          <!-- Pin Note Action -->
          <button type="button" class="btn-icon action-pin" title="${pinActionTitle}">
            ${pinActionSVG}
          </button>

          <!-- Edit Note Action -->
          <button type="button" class="btn-icon action-edit" title="Edit Note Details">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
          </button>

          <!-- Archive Note Action -->
          <button type="button" class="btn-icon action-archive" title="${archiveTitle}">
            ${archiveIconSVG}
          </button>

          <!-- Delete Note Action -->
          <button type="button" class="btn-icon action-delete" title="Delete Note Permanently">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </article>
    `
  }

  // ESCAPE HTML STRINGS TO PREVENT XSS
  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // CUTE DATE FORMATTER HELPER
  function formatDate(isoString) {
    const date = new Date(isoString)
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now 🌟'
    if (diffMins === 1) return '1 min ago'
    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`

    // Return structured pretty date
    const options = { month: 'short', day: 'numeric' }
    return date.toLocaleDateString(undefined, options)
  }

  // RUN THE INITIALIZER
  init()
})
