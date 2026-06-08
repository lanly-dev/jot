/* ==========================================================================
   Jot - Cute & Colorful Note-Taking App JavaScript Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // CENTRAL STATE
  let notes = []
  let currentFilterTag = 'all'
  let currentSearchQuery = ''
  let currentView = 'active' // 'active' or 'archived'
  let currentLayoutView = localStorage.getItem('jot_layout_view') || 'thumbnail' // 'thumbnail' or 'list'
  let isFormPinned = false // whether the note-in-creation is pinned

  // DEFAULT SAMPLES (Loaded only on first visit to make it feel rich and welcoming!)
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

  // DOM ELEMENTS SELECTORS
  const noteForm = document.getElementById('note-form')
  const noteIdInput = document.getElementById('note-id')
  const noteTitleInput = document.getElementById('note-title')
  const noteContentInput = document.getElementById('note-content')
  const noteTagsInput = document.getElementById('note-tags')
  const editorCard = document.getElementById('editor-card')
  const editorTitleHeading = document.getElementById('editor-title-heading')
  const editorPinBtn = document.getElementById('editor-pin-btn')
  const btnClearForm = document.getElementById('btn-clear-form')
  const btnSaveNote = document.getElementById('btn-save-note')
  const colorOptionsContainer = document.getElementById('color-options')
  
  const searchInput = document.getElementById('search-input')
  const clearSearchBtn = document.getElementById('clear-search-btn')
  
  const btnFilterActive = document.getElementById('btn-filter-active')
  const btnFilterArchived = document.getElementById('btn-filter-archived')
  const btnLayoutToggle = document.getElementById('btn-layout-toggle')
  const tagsListContainer = document.getElementById('tags-list')
  
  const notesGrid = document.getElementById('notes-grid')
  const emptyState = document.getElementById('empty-state')
  
  // Stats dashboard selectors
  const statTotalNotes = document.getElementById('stat-total-notes')
  const statPinnedNotes = document.getElementById('stat-pinned-notes')
  const statArchivedNotes = document.getElementById('stat-archived-notes')

  // INITIALIZATION
  function init() {
    setupEventListeners()
    fetchNotes()
    updateLayoutToggleButton()
  }

  async function fetchNotes() {
    try {
      const res = await fetch('/api/notes')
      if (!res.ok) throw new Error('Failed to fetch notes')
      notes = await res.json()
      saveNotesToStorage() // update offline backup
    } catch (err) {
      console.error('Error fetching notes from cloud:', err)
      // Fallback to local storage
      const savedNotes = localStorage.getItem('jot_notes')
      if (savedNotes) {
        notes = JSON.parse(savedNotes)
      } else {
        notes = [...SAMPLE_NOTES]
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

    // Live real-time search
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim()
      clearSearchBtn.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none'
      render()
    })

    // Clear search query
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = ''
      currentSearchQuery = ''
      clearSearchBtn.style.display = 'none'
      searchInput.focus()
      render()
    })

    // Active vs. Archived View filter toggles
    btnFilterActive.addEventListener('click', () => {
      currentView = 'active'
      btnFilterActive.classList.add('active')
      btnFilterArchived.classList.remove('active')
      render()
    })

    btnFilterArchived.addEventListener('click', () => {
      currentView = 'archived'
      btnFilterArchived.classList.add('active')
      btnFilterActive.classList.remove('active')
      render()
    })

    // Thumbnail/List layout toggle
    btnLayoutToggle.addEventListener('click', () => {
      currentLayoutView = currentLayoutView === 'thumbnail' ? 'list' : 'thumbnail'
      localStorage.setItem('jot_layout_view', currentLayoutView)
      updateLayoutToggleButton()
      render()
    })

    // Tag filter list click delegation
    tagsListContainer.addEventListener('click', (e) => {
      const clickedTag = e.target.closest('.tag-pill')
      if (clickedTag) {
        document.querySelectorAll('.tag-pill').forEach(pill => {
          pill.classList.remove('active')
        })
        clickedTag.classList.add('active')
        currentFilterTag = clickedTag.getAttribute('data-tag')
        render()
      }
    })

    // Card Action Delegations (Pin, Edit, Archive, Delete, Tag-Filter Click inside Card)
    notesGrid.addEventListener('click', handleCardActions)
  }

  // CREATE OR UPDATE NOTE FORM HANDLER
  async function handleFormSubmit(e) {
    e.preventDefault()

    const id = noteIdInput.value
    const title = noteTitleInput.value.trim()
    const content = noteContentInput.value.trim()
    const tagsString = noteTagsInput.value.trim()
    
    const colorRadio = document.querySelector('input[name="note-color"]:checked')
    const color = colorRadio ? colorRadio.value : '#ffd1dc'

    const tags = tagsString
      ? tagsString.split(',').map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0)
      : []

    if (id) {
      // EDITING EXISTING NOTE
      const updatedFields = { title, content, color, tags, pinned: isFormPinned }
      
      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFields)
        })
        if (!res.ok) throw new Error('Cloud update failed')
        const updatedNote = await res.json()
        notes = notes.map(n => n.id === id ? updatedNote : n)
        showToast('Jot updated! ✏️')
      } catch (err) {
        console.error(err)
        notes = notes.map(n => n.id === id ? { ...n, ...updatedFields } : n)
        showToast('Updated locally ⚠️', 'warn')
      }
    } else {
      // NEW NOTE CREATION
      const newNote = {
        title,
        content,
        color,
        tags,
        pinned: isFormPinned,
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
        notes.unshift(savedNote)
        showToast('Jot saved successfully! ✨')
      } catch (err) {
        console.error(err)
        const localNote = {
          ...newNote,
          id: 'note-' + Date.now()
        }
        notes.unshift(localNote)
        showToast('Saved locally ⚠️', 'warn')
      }
    }

    saveNotesToStorage()
    resetForm()
    render()

    window.scrollTo({ top: notesGrid.offsetTop - 100, behavior: 'smooth' })
  }

  // POPULATE FORM FOR EDITING
  function populateFormForEditing(note) {
    noteIdInput.value = note.id
    noteTitleInput.value = note.title
    noteContentInput.value = note.content
    noteTagsInput.value = note.tags.join(', ')
    
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
    
    // Smooth scroll to editor form so user can see it instantly
    window.scrollTo({ top: editorCard.offsetTop - 50, behavior: 'smooth' })
    noteTitleInput.focus()
  }

  // RESET FORM TO CREATE STATE
  function resetForm() {
    noteIdInput.value = ''
    noteForm.reset()
    
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
      notes = notes.map(n => n.id === id ? updatedNote : n)
      saveNotesToStorage()
    } catch (err) {
      console.error('Silent update sync failed:', err)
      saveNotesToStorage()
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
      if (nextArchived) {
        note.pinned = false
      }
      render()
      updateNoteOnServerSilent(note.id, { archived: nextArchived, pinned: nextPinned })
      return
    }

    // 3. EDIT ACTION
    if (target.closest('.action-edit')) {
      populateFormForEditing(note)
      return
    }

    // 4. DELETE ACTION
    if (target.closest('.action-delete')) {
      card.classList.add('card-poof')
      
      setTimeout(async () => {
        notes = notes.filter(n => n.id !== noteId)
        if (noteIdInput.value === noteId) {
          resetForm()
        }
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

    // 5. TAG PILL CLICK INSIDE CARD (Instantly filters by that tag!)
    if (target.classList.contains('note-card-tag')) {
      const clickedTag = target.getAttribute('data-tag')
      currentFilterTag = clickedTag
      render()
      return
    }
  }

  // RE-GENERATE DYNAMIC TAG LIST BAR
  function renderTagFilterList() {
    // Collect all tags from non-archived notes (or archived based on current view)
    const relevantNotes = notes.filter(n => n.archived === (currentView === 'archived'))
    const allTags = []
    
    relevantNotes.forEach(note => {
      note.tags.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag)
        }
      })
    })

    // Build list: "All Tags" is always there
    let html = `<button class="tag-pill ${currentFilterTag === 'all' ? 'active' : ''}" data-tag="all">All Tags</button>`
    
    allTags.sort().forEach(tag => {
      html += `<button class="tag-pill ${currentFilterTag === tag ? 'active' : ''}" data-tag="${tag}">#${tag}</button>`
    })

    tagsListContainer.innerHTML = html

    // If the current filtered tag no longer exists in any of the notes, fallback to 'all'
    if (currentFilterTag !== 'all' && !allTags.includes(currentFilterTag)) {
      currentFilterTag = 'all'
      // Slight delayed recursion to correctly render active class
      setTimeout(render, 0)
    }
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
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        obj.innerHTML = end
      }
    }
    window.requestAnimationFrame(step)
  }

  // MAIN RENDER CONTROLLER
  function render() {
    notesGrid.classList.toggle('list-view', currentLayoutView === 'list')

    // 1. Update stats dashboard
    updateStatsDashboard()

    // 2. Refresh dynamic Tag list filters
    renderTagFilterList()

    // 3. Filter notes based on active states
    let filteredNotes = notes.filter(note => {
      // View: Active vs. Archived
      const matchesView = note.archived === (currentView === 'archived')
      
      // Tag Filter
      const matchesTag = currentFilterTag === 'all' || note.tags.includes(currentFilterTag)
      
      // Search Query
      const matchesSearch = !currentSearchQuery || 
        note.title.toLowerCase().includes(currentSearchQuery) || 
        note.content.toLowerCase().includes(currentSearchQuery) ||
        note.tags.some(tag => tag.toLowerCase().includes(currentSearchQuery))

      return matchesView && matchesTag && matchesSearch
    })

    // 4. Sort notes: Pinned notes bubble to top, then sorted by createdAt descending
    filteredNotes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    // 5. Handle empty state display
    if (filteredNotes.length === 0) {
      notesGrid.style.display = 'none'
      emptyState.style.display = 'flex'
      
      // Update empty state text based on search or view
      const emptyTitle = emptyState.querySelector('h3')
      const emptyPara = emptyState.querySelector('p')
      const emptyMascot = emptyState.querySelector('.empty-mascot')

      if (currentSearchQuery) {
        emptyMascot.textContent = '🔍'
        emptyTitle.textContent = 'No matching jots found'
        emptyPara.textContent = 'Try adjusting your keywords or clearing the search to find your notes!'
      } else if (currentFilterTag !== 'all') {
        emptyMascot.textContent = '🏷️'
        emptyTitle.textContent = `No jots tagged #${currentFilterTag}`
        emptyPara.textContent = `None of your current jots in this view have the tag #${currentFilterTag}.`
      } else if (currentView === 'archived') {
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
  }

  // Keep layout toggle label and style in sync with current mode
  function updateLayoutToggleButton() {
    if (!btnLayoutToggle) return

    const isListView = currentLayoutView === 'list'
    const nextViewLabel = isListView ? 'thumbnail' : 'list'
    const listIcon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
    const gridIcon = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`

    btnLayoutToggle.classList.toggle('active', isListView)
    btnLayoutToggle.innerHTML = `${isListView ? gridIcon : listIcon}<span class="sr-only">Switch to ${nextViewLabel} view</span>`
    btnLayoutToggle.title = `Switch to ${nextViewLabel} view`
    btnLayoutToggle.setAttribute('aria-label', `Switch to ${nextViewLabel} view`)
  }

  // HTML CARD RENDER TEMPLATE
  function renderNoteCardHTML(note) {
    // Tag badges markup
    const tagsMarkup = note.tags.map(tag => 
      `<span class="note-card-tag" data-tag="${tag}">#${tag}</span>`
    ).join('')

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

    return `
      <article class="note-card ${note.pinned ? 'pinned-card' : ''}" data-id="${note.id}" style="--note-color: ${note.color};">
        ${pinBadgeMarkup}
        
        <div class="note-header">
          <h3 class="note-title">${escapedTitle}</h3>
        </div>
        
        <p class="note-body">${escapedContent}</p>
        
        <div class="note-card-tags">
          ${tagsMarkup}
        </div>
        
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
    return str
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
