/* ==========================================================================
   Jot - Cute & Colorful Note-Taking App JavaScript Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // CENTRAL STATE
  let notes = []
  let credentials = []
  let currentMode = 'notes' // 'notes' or 'vault'
  let currentView = 'active' // 'active' or 'archived'
  let currentLayoutView = localStorage.getItem('jot_layout_view') || 'thumbnail' // 'thumbnail' or 'list'
  let isFormPinned = false // whether the note-in-creation is pinned
  let focusedNoteId = null
  let focusedCredentialId = null
  let spreadsheetDraft = []
  let vaultUnlocked = false
  let vaultSetupMode = false
  let currentVaultFilter = 'all' // 'all', 'login', 'payment', 'secure-note'
  const reminderTimers = new Map()
  const VAULT_HASH_KEY = 'jot_vault_master_hash'

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
  const noteFocusPanel = document.getElementById('note-focus-panel')
  const noteFocusContent = document.getElementById('note-focus-content')
  const noteFocusClose = document.getElementById('note-focus-close')

  // Stats dashboard selectors
  const statTotalNotes = document.getElementById('stat-total-notes')
  const statPinnedNotes = document.getElementById('stat-pinned-notes')
  const statArchivedNotes = document.getElementById('stat-archived-notes')

  // Note Creator UI elements
  const creatorCollapsed = document.getElementById('creator-collapsed')
  const creatorExpanded = document.getElementById('creator-expanded')
  const btnExpandCreator = document.getElementById('btn-expand-creator')
  const btnCloseCreator = document.getElementById('btn-close-creator')

  // Mode navigation elements
  const btnNavNotes = document.getElementById('nav-notes')
  const btnNavVault = document.getElementById('nav-vault')
  const notesMode = document.getElementById('notes-mode')
  const vaultMode = document.getElementById('vault-mode')

  // Credential / Vault UI elements
  const vaultCreatorCollapsed = document.getElementById('vault-creator-collapsed')
  const btnExpandVaultCreator = document.getElementById('btn-expand-vault-creator')
  const credentialModalBackdrop = document.getElementById('credential-modal-backdrop')
  const credentialModalPanel = document.getElementById('credential-modal-panel')
  const btnCloseCredentialModal = document.getElementById('btn-close-credential-modal')
  const btnCancelCredentialModal = document.getElementById('btn-cancel-credential-modal')
  const credentialForm = document.getElementById('credential-form')
  const credentialIdInput = document.getElementById('credential-id')
  const credentialSiteInput = document.getElementById('credential-site')
  const credentialUsernameInput = document.getElementById('credential-username')
  const credentialPasswordInput = document.getElementById('credential-password')
  const credentialNotesInput = document.getElementById('credential-notes')
  const credentialEditorTitle = document.getElementById('credential-editor-title')
  const btnSaveCredential = document.getElementById('btn-save-credential')
  const btnToggleFormPassword = document.getElementById('btn-toggle-form-password')
  const credentialsGrid = document.getElementById('credentials-grid')
  const credentialsTableWrap = document.getElementById('credentials-table-wrap')
  const vaultEmptyState = document.getElementById('vault-empty-state')
  const statTotalCredentials = document.getElementById('stat-total-credentials')
  const btnLockVault = document.getElementById('btn-lock-vault')
  const vaultContent = document.getElementById('vault-content')
  const vaultLockedState = document.getElementById('vault-locked-state')
  const vaultLockedTitle = document.getElementById('vault-locked-title')
  const vaultLockedHint = document.getElementById('vault-locked-hint')
  const vaultUnlockForm = document.getElementById('vault-unlock-form')
  const vaultUnlockPasswordInput = document.getElementById('vault-unlock-password')
  const vaultUnlockConfirmInput = document.getElementById('vault-unlock-confirm')
  const vaultConfirmWrap = document.getElementById('vault-confirm-wrap')
  const vaultUnlockError = document.getElementById('vault-unlock-error')
  const btnToggleUnlockPassword = document.getElementById('btn-toggle-unlock-password')
  const btnVaultUnlock = document.getElementById('btn-vault-unlock')

  // Popover selectors
  const btnTypePopup = document.getElementById('btn-type-popup')
  const typePopover = document.getElementById('type-popover')
  const typeIconDisplay = document.getElementById('type-icon-display')
  const typeLabelDisplay = document.getElementById('type-label-display')
  const btnColorPopup = document.getElementById('btn-color-popup')
  const colorPopover = document.getElementById('color-popover')
  const colorSwatchDisplay = document.getElementById('color-swatch-display')

  const btnCredTypePopup = document.getElementById('btn-cred-type-popup')
  const credTypePopover = document.getElementById('cred-type-popover')
  const credTypeIconDisplay = document.getElementById('cred-type-icon-display')
  const credTypeLabelDisplay = document.getElementById('cred-type-label-display')
  const credentialTypeSelect = document.getElementById('credential-type')
  const btnCredColorPopup = document.getElementById('btn-cred-color-popup')
  const credColorPopover = document.getElementById('cred-color-popover')
  const credColorSwatchDisplay = document.getElementById('cred-color-swatch-display')
  const credentialColorOptionsContainer = document.getElementById('credential-color-options')

  // INITIALIZATION
  function init() {
    initSpreadsheetDraft(3, 3)
    setupEventListeners()
    fetchNotes()
    fetchCredentials()
    updateLayoutToggleButton()
    updateTypeSpecificFields()
    updateCredentialTypeSpecificFields('login')
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

  async function fetchCredentials() {
    try {
      const res = await fetch('/api/credentials')
      if (!res.ok) throw new Error('Failed to fetch credentials')
      const fetchedCredentials = await res.json()
      credentials = Array.isArray(fetchedCredentials)
        ? fetchedCredentials.map(cred => normalizeCredential(cred))
        : []
    } catch (err) {
      console.error('Error fetching credentials from cloud:', err)
      const savedCredentials = localStorage.getItem('jot_credentials')
      credentials = savedCredentials
        ? JSON.parse(savedCredentials).map(cred => normalizeCredential(cred))
        : []
    }
  }

  function normalizeCredential(cred) {
    const merged = cred || {}
    return {
      id: merged.id || 'cred-' + Date.now(),
      site: merged.site || '',
      username: merged.username || '',
      password: merged.password || '',
      notes: merged.notes || '',
      createdAt: merged.createdAt || new Date().toISOString()
    }
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
    // Auto-expanding content textareas
    const autoExpand = (el) => {
      if (!el) return
      el.style.height = 'auto'
      el.style.height = Math.max(el.scrollHeight, 70) + 'px'
    }
    if (noteContentInput) {
      noteContentInput.addEventListener('input', () => autoExpand(noteContentInput))
    }
    if (credentialNotesInput) {
      credentialNotesInput.addEventListener('input', () => autoExpand(credentialNotesInput))
    }

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

    // Color option picker radio click animations & swatch sync
    colorOptionsContainer.addEventListener('change', (e) => {
      if (e.target.name === 'note-color') {
        document.querySelectorAll('#color-options .color-option-label').forEach(label => {
          label.classList.remove('current')
        })
        const selectedLabel = e.target.closest('.color-option-label')
        if (selectedLabel) {
          selectedLabel.classList.add('current')
          editorCard.style.borderColor = e.target.value
          if (colorSwatchDisplay) colorSwatchDisplay.style.backgroundColor = e.target.value
        }
      }
    })

    if (credentialColorOptionsContainer) {
      credentialColorOptionsContainer.addEventListener('change', (e) => {
        if (e.target.name === 'credential-color') {
          document.querySelectorAll('#credential-color-options .color-option-label').forEach(label => {
            label.classList.remove('current')
          })
          const selectedLabel = e.target.closest('.color-option-label')
          if (selectedLabel) {
            selectedLabel.classList.add('current')
            if (credentialModalPanel) credentialModalPanel.style.borderColor = e.target.value
            if (credColorSwatchDisplay) credColorSwatchDisplay.style.backgroundColor = e.target.value
          }
        }
      })
    }

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

    // Vault category filter toggles
    document.querySelectorAll('input[name="vault-filter"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        currentVaultFilter = e.target.value
        document.querySelectorAll('input[name="vault-filter"]').forEach(r => {
          r.closest('.status-option')?.classList.toggle('active', r.checked)
        })
        render()
      })
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
      updateTypePopoverUI(noteTypeSelect.value)
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
    noteFocusClose.addEventListener('click', closeFocusedNote)
    noteFocusContent.addEventListener('click', handleFocusNoteActions)
    noteFocusContent.addEventListener('click', handleFocusCredentialActions)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeFocusedNote()
        closeCredentialModal()
      }
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

    // Collapse on click outside & close popovers
    document.addEventListener('click', (e) => {
      // Close popovers if clicked outside popover-wrapper
      if (!e.target.closest('.popover-wrapper')) {
        closeAllPopovers()
      }

      if (editorCard && !editorCard.contains(e.target) && !e.target.closest('#btn-expand-creator')) {
        if (editorCard.classList.contains('active')) {
          if (noteTitleInput.value.trim() === '' && noteContentInput.value.trim() === '') { resetForm() }
          else { noteForm.requestSubmit() }
        }
      }
    })

    // Popover Trigger Click Handlers
    const togglePopover = (btn, popover) => {
      if (!btn || !popover) return
      const isOpen = popover.classList.contains('open')
      closeAllPopovers()
      if (!isOpen) {
        popover.classList.add('open')
        btn.classList.add('active')
        btn.setAttribute('aria-expanded', 'true')
      }
    }

    if (btnTypePopup) btnTypePopup.addEventListener('click', (e) => { e.stopPropagation(); togglePopover(btnTypePopup, typePopover) })
    if (btnColorPopup) btnColorPopup.addEventListener('click', (e) => { e.stopPropagation(); togglePopover(btnColorPopup, colorPopover) })
    if (btnCredTypePopup) btnCredTypePopup.addEventListener('click', (e) => { e.stopPropagation(); togglePopover(btnCredTypePopup, credTypePopover) })
    if (btnCredColorPopup) btnCredColorPopup.addEventListener('click', (e) => { e.stopPropagation(); togglePopover(btnCredColorPopup, credColorPopover) })

    // Popover item clicks
    if (typePopover) {
      typePopover.addEventListener('click', (e) => {
        const item = e.target.closest('.popover-item')
        if (!item) return
        const type = item.getAttribute('data-type')
        if (type && noteTypeSelect) {
          noteTypeSelect.value = type
          updateTypeSpecificFields()
          updateTypePopoverUI(type)
          closeAllPopovers()
        }
      })
    }

    if (credTypePopover) {
      credTypePopover.addEventListener('click', (e) => {
        const item = e.target.closest('.popover-item')
        if (!item) return
        const type = item.getAttribute('data-type')
        if (type && credentialTypeSelect) {
          credentialTypeSelect.value = type
          updateCredentialTypeSpecificFields(type)
          updateCredTypePopoverUI(type)
          closeAllPopovers()
        }
      })
    }

    // MODE NAVIGATION (Notes <-> Vault)
    btnNavNotes.addEventListener('click', () => switchMode('notes'))
    btnNavVault.addEventListener('click', () => switchMode('vault'))

    // VAULT LOCK / UNLOCK / SETUP
    vaultUnlockForm.addEventListener('submit', handleVaultUnlockFormSubmit)
    btnToggleUnlockPassword.addEventListener('click', () => {
      togglePasswordVisibility(vaultUnlockPasswordInput, btnToggleUnlockPassword)
    })
    btnLockVault.addEventListener('click', lockVault)

    // Credential form password reveal toggle
    btnToggleFormPassword.addEventListener('click', () => {
      togglePasswordVisibility(credentialPasswordInput, btnToggleFormPassword)
    })

    // Credential creator modal openers and closers
    if (btnExpandVaultCreator) {
      btnExpandVaultCreator.addEventListener('click', (e) => {
        e.stopPropagation()
        openCredentialModal()
      })
    }
    if (vaultCreatorCollapsed) {
      vaultCreatorCollapsed.addEventListener('click', () => {
        openCredentialModal()
      })
    }
    if (btnCloseCredentialModal) {
      btnCloseCredentialModal.addEventListener('click', closeCredentialModal)
    }
    if (btnCancelCredentialModal) {
      btnCancelCredentialModal.addEventListener('click', closeCredentialModal)
    }
    if (credentialModalBackdrop) {
      credentialModalBackdrop.addEventListener('click', closeCredentialModal)
    }

    // Credential form submit
    credentialForm.addEventListener('submit', handleCredentialFormSubmit)

    // Credential card action delegation
    credentialsGrid.addEventListener('click', handleCredentialCardActions)
  }

  function closeAllPopovers() {
    document.querySelectorAll('.popover-menu.open').forEach(p => p.classList.remove('open'))
    document.querySelectorAll('.btn-popover-trigger.active').forEach(b => {
      b.classList.remove('active')
      b.setAttribute('aria-expanded', 'false')
    })
  }

  function updateTypePopoverUI(type) {
    const iconMap = { standard: '📝', dev: '💻', reminder: '⏰', spreadsheet: '📊' }
    const labelMap = { standard: 'Standard', dev: 'Dev', reminder: 'Reminder', spreadsheet: 'Sheet' }
    if (typeIconDisplay) typeIconDisplay.textContent = iconMap[type] || '📝'
    if (typeLabelDisplay) typeLabelDisplay.textContent = labelMap[type] || 'Standard'
    if (typePopover) {
      typePopover.querySelectorAll('.popover-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-type') === type)
      })
    }
  }

  function updateCredTypePopoverUI(type) {
    const iconMap = { login: '🔑', payment: '💳', 'secure-note': '🔒' }
    const labelMap = { login: 'Login', payment: 'Payment', 'secure-note': 'Secure Note' }
    if (credTypeIconDisplay) credTypeIconDisplay.textContent = iconMap[type] || '🔑'
    if (credTypeLabelDisplay) credTypeLabelDisplay.textContent = labelMap[type] || 'Login'
    if (credTypePopover) {
      credTypePopover.querySelectorAll('.popover-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-type') === type)
      })
    }
  }

  function updateCredentialTypeSpecificFields(type) {
    if (!type) type = credentialTypeSelect ? credentialTypeSelect.value : 'login'

    if (type === 'secure-note') {
      credentialUsernameInput.required = false
      credentialPasswordInput.required = false
      credentialUsernameInput.placeholder = 'Identifier / Tag (optional)'
      credentialPasswordInput.placeholder = 'Secret key / Password (optional)'
      credentialNotesInput.placeholder = 'Write your confidential secret note here...'
      credentialNotesInput.required = true
    } else if (type === 'payment') {
      credentialUsernameInput.required = true
      credentialPasswordInput.required = true
      credentialUsernameInput.placeholder = 'Cardholder name'
      credentialPasswordInput.placeholder = 'Card number / Expiry / CVV'
      credentialNotesInput.placeholder = 'Billing address or notes (optional)'
      credentialNotesInput.required = false
    } else {
      credentialUsernameInput.required = true
      credentialPasswordInput.required = true
      credentialUsernameInput.placeholder = 'Username or email'
      credentialPasswordInput.placeholder = 'Password'
      credentialNotesInput.placeholder = 'Notes (optional)'
      credentialNotesInput.required = false
    }
  }

  // MODE SWITCHING
  function switchMode(mode) {
    if (currentMode === mode) return
    currentMode = mode
    closeFocusedNote()

    btnNavNotes.classList.toggle('active', mode === 'notes')
    btnNavVault.classList.toggle('active', mode === 'vault')
    notesMode.classList.toggle('hidden', mode !== 'notes')
    vaultMode.classList.toggle('hidden', mode !== 'vault')

    if (mode === 'vault') {
      enterVaultMode()
    } else {
      render()
    }
  }

  function enterVaultMode() {
    if (!vaultUnlocked) {
      showVaultLockedState()
      return
    }
    render()
  }

  function showVaultLockedState() {
    vaultSetupMode = !localStorage.getItem(VAULT_HASH_KEY)
    vaultUnlockError.textContent = ''
    vaultUnlockPasswordInput.value = ''
    vaultUnlockConfirmInput.value = ''

    if (vaultSetupMode) {
      vaultLockedTitle.textContent = 'Create a Master Password'
      vaultLockedHint.textContent = 'This locks your vault. It is stored only on this device (hashed) and cannot be recovered if forgotten.'
      vaultConfirmWrap.style.display = 'flex'
      btnVaultUnlock.innerHTML = 'Create Vault ✨'
    } else {
      vaultLockedTitle.textContent = 'Vault is locked'
      vaultLockedHint.textContent = 'Enter your master password to see your saved credentials.'
      vaultConfirmWrap.style.display = 'none'
      btnVaultUnlock.innerHTML = 'Unlock Vault'
    }

    vaultLockedState.classList.remove('hidden')
    vaultContent.classList.add('hidden')
    vaultUnlockPasswordInput.focus()
  }

  async function handleVaultUnlockFormSubmit(e) {
    e.preventDefault()
    vaultUnlockError.textContent = ''

    const password = vaultUnlockPasswordInput.value
    if (!password) {
      vaultUnlockError.textContent = 'Please enter a master password 😿'
      return
    }

    if (vaultSetupMode) {
      const confirm = vaultUnlockConfirmInput.value
      if (password.length < 4) {
        vaultUnlockError.textContent = 'Master password should be at least 4 characters 🌸'
        return
      }
      if (password !== confirm) {
        vaultUnlockError.textContent = 'Passwords do not match 😿'
        return
      }
      const hash = await hashPassword(password)
      localStorage.setItem(VAULT_HASH_KEY, hash)
      vaultUnlocked = true
      showToast('Vault created! 🔐')
    } else {
      const hash = await hashPassword(password)
      if (hash === localStorage.getItem(VAULT_HASH_KEY)) {
        vaultUnlocked = true
        showToast('Vault unlocked! 🔓')
      } else {
        vaultUnlockError.textContent = 'Wrong master password 😿'
      }
    }

    vaultUnlockPasswordInput.value = ''
    vaultUnlockConfirmInput.value = ''
    if (vaultUnlocked) render()
  }

  function lockVault() {
    vaultUnlocked = false
    closeFocusedNote()
    credentialsGrid.innerHTML = ''
    vaultEmptyState.style.display = 'none'
    vaultSetupMode = false
    showVaultLockedState()
    showToast('Vault locked 🔒')
  }

  async function hashPassword(password) {
    if (window.crypto && crypto.subtle) {
      try {
        const data = new TextEncoder().encode(password)
        const digest = await crypto.subtle.digest('SHA-256', data)
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
      } catch (err) {
        console.error('crypto.subtle unavailable, using fallback hash:', err)
      }
    }
    let h1 = 0xdeadbeef
    let h2 = 0x41c6ce57
    for (let i = 0; i < password.length; i++) {
      const ch = password.charCodeAt(i)
      h1 = Math.imul(h1 ^ ch, 2654435761)
      h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
  }

  function togglePasswordVisibility(input, toggleBtn) {
    const showing = input.type === 'text'
    input.type = showing ? 'password' : 'text'
    toggleBtn.title = showing ? 'Show password' : 'Hide password'
    toggleBtn.classList.toggle('revealed', !showing)
  }

  // CREDENTIAL CREATOR MODAL UI
  function openCredentialModal() {
    closeFocusedNote()
    if (credentialModalBackdrop) credentialModalBackdrop.classList.add('active')
    if (credentialModalPanel) credentialModalPanel.classList.add('active')
    document.body.classList.add('note-focus-open')
    setTimeout(() => {
      if (credentialSiteInput) credentialSiteInput.focus()
    }, 50)
  }

  function closeCredentialModal() {
    closeAllPopovers()
    if (credentialModalBackdrop) credentialModalBackdrop.classList.remove('active')
    if (credentialModalPanel) credentialModalPanel.classList.remove('active')
    document.body.classList.remove('note-focus-open')
    resetCredentialForm()
  }

  function resetCredentialForm() {
    closeAllPopovers()
    credentialForm.reset()
    credentialIdInput.value = ''
    if (credentialTypeSelect) {
      credentialTypeSelect.value = 'login'
      updateCredTypePopoverUI('login')
      updateCredentialTypeSpecificFields('login')
    }
    const pinkRadio = document.querySelector('input[name="credential-color"][value="#ffd1d9"]')
    if (pinkRadio) {
      pinkRadio.checked = true
      document.querySelectorAll('#credential-color-options .color-option-label').forEach(label => label.classList.remove('current'))
      pinkRadio.closest('.color-option-label')?.classList.add('current')
      if (credColorSwatchDisplay) credColorSwatchDisplay.style.backgroundColor = '#ffd1d9'
    }
    if (credentialModalPanel) credentialModalPanel.style.borderColor = 'var(--border-color)'
    credentialPasswordInput.type = 'password'
    btnToggleFormPassword.classList.remove('revealed')
    btnToggleFormPassword.title = 'Show password'
    credentialEditorTitle.textContent = 'Add a New Credential'
    btnSaveCredential.querySelector('.btn-text').textContent = 'Save Credential'
  }

  async function handleCredentialFormSubmit(e) {
    e.preventDefault()

    const id = credentialIdInput.value
    const selectedColorRadio = document.querySelector('input[name="credential-color"]:checked')
    const color = selectedColorRadio ? selectedColorRadio.value : '#ffd1d9'
    const credentialData = {
      site: credentialSiteInput.value.trim(),
      username: credentialUsernameInput.value.trim(),
      password: credentialPasswordInput.value,
      notes: credentialNotesInput.value.trim(),
      type: credentialTypeSelect ? credentialTypeSelect.value : 'login',
      color
    }

    if (id) {
      try {
        const res = await fetch(`/api/credentials/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentialData)
        })
        if (!res.ok) throw new Error('Cloud update failed')
        const updated = await res.json()
        credentials = credentials.map(c => c.id === id ? normalizeCredential({ ...c, ...updated }) : c)
        showToast('Credential updated! 🔏')
      } catch (err) {
        console.error(err)
        credentials = credentials.map(c => c.id === id ? normalizeCredential({ ...c, ...credentialData }) : c)
        showToast('Updated locally ⚠️', 'warn')
      }
    } else {
      try {
        const res = await fetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentialData)
        })
        if (!res.ok) throw new Error('Cloud save failed')
        const saved = await res.json()
        credentials.unshift(normalizeCredential(saved))
        showToast('Credential saved! 🔐')
      } catch (err) {
        console.error(err)
        credentials.unshift(normalizeCredential({ ...credentialData, id: 'cred-' + Date.now() }))
        showToast('Saved locally ⚠️', 'warn')
      }
    }

    localStorage.setItem('jot_credentials', JSON.stringify(credentials))
    closeCredentialModal()
    render()
  }

  function populateCredentialForm(cred) {
    credentialIdInput.value = cred.id
    credentialSiteInput.value = cred.site
    credentialUsernameInput.value = cred.username
    credentialPasswordInput.value = cred.password
    credentialNotesInput.value = cred.notes
    if (credentialTypeSelect) {
      credentialTypeSelect.value = cred.type || 'login'
      updateCredTypePopoverUI(cred.type || 'login')
      updateCredentialTypeSpecificFields(cred.type || 'login')
    }

    const credColor = cred.color || '#ffd1d9'
    const radioToSelect = document.querySelector(`input[name="credential-color"][value="${credColor}"]`)
    if (radioToSelect) {
      radioToSelect.checked = true
      document.querySelectorAll('#credential-color-options .color-option-label').forEach(label => label.classList.remove('current'))
      radioToSelect.closest('.color-option-label')?.classList.add('current')
      if (credColorSwatchDisplay) credColorSwatchDisplay.style.backgroundColor = credColor
      if (credentialModalPanel) credentialModalPanel.style.borderColor = credColor
    }

    credentialEditorTitle.textContent = 'Edit Credential'
    btnSaveCredential.querySelector('.btn-text').textContent = 'Save Changes'
    openCredentialModal()
  }

  // CREDENTIAL CARD ACTIONS
  function handleCredentialCardActions(e) {
    const target = e.target
    const card = target.closest('.credential-row')
    if (!card) return

    const credId = card.getAttribute('data-id')
    const cred = credentials.find(c => c.id === credId)
    if (!cred) return

    if (target.closest('.credential-reveal')) {
      const valueEl = card.querySelector('.credential-password')
      const revealed = card.classList.toggle('revealed')
      valueEl.textContent = revealed ? cred.password : '••••••••••'
      return
    }

    if (target.closest('.credential-copy')) {
      const what = target.closest('.credential-copy').getAttribute('data-copy')
      copyToClipboard(what === 'password' ? cred.password : cred.username, what)
      return
    }

    if (target.closest('.action-edit')) {
      closeFocusedNote()
      populateCredentialForm(cred)
      return
    }

    if (target.closest('.action-delete')) {
      card.classList.add('card-poof')
      setTimeout(async () => {
        credentials = credentials.filter(c => c.id !== credId)
        if (credentialIdInput.value === credId) resetCredentialForm()
        localStorage.setItem('jot_credentials', JSON.stringify(credentials))
        render()
        try {
          const res = await fetch(`/api/credentials/${credId}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Cloud delete failed')
          showToast('Credential deleted permanently! 🗑️')
        } catch (err) {
          console.error(err)
          showToast('Deleted locally ⚠️', 'warn')
        }
      }, 300)
      return
    }

    openFocusedCredential(credId)
  }

  // Inline editing of the focused credential (vault) + reveal / save / close
  function handleFocusCredentialActions(e) {
    const target = e.target
    const article = target.closest('.credential-focus-article')
    if (!article) return
    const credId = article.getAttribute('data-id')
    const cred = credentials.find(c => c.id === credId)
    if (!cred) return

    // Show / hide password
    if (target.closest('.focus-password-toggle')) {
      const input = article.querySelector('.focus-password-input')
      if (!input) return
      const reveal = input.type === 'password'
      input.type = reveal ? 'text' : 'password'
      target.classList.toggle('revealed', reveal)
      target.title = reveal ? 'Hide password' : 'Show password'
      return
    }

    // Close the focus panel
    if (target.closest('#cred-focus-action-close')) {
      closeFocusedNote()
      return
    }

    // Save the edited credential
    if (target.closest('#cred-focus-action-save')) {
      const site = article.querySelector('[data-field="site"]').value.trim()
      const username = article.querySelector('[data-field="username"]').value.trim()
      const password = article.querySelector('[data-field="password"]').value
      const notes = article.querySelector('[data-field="notes"]').value.trim()

      if (!site) {
        showToast('A site name is needed 😿', 'warn')
        return
      }

      const credentialData = { site, username, password, notes }
      saveCredentialFromFocus(cred, credentialData)
    }
  }

  async function saveCredentialFromFocus(cred, data) {
    try {
      const res = await fetch(`/api/credentials/${cred.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Cloud update failed')
      const updated = await res.json()
      credentials = credentials.map(c => c.id === cred.id ? normalizeCredential({ ...c, ...updated }) : c)
      showToast('Credential updated! 🔏')
    } catch (err) {
      console.error(err)
      credentials = credentials.map(c => c.id === cred.id ? normalizeCredential({ ...c, ...data }) : c)
      showToast('Updated locally ⚠️', 'warn')
    }
    localStorage.setItem('jot_credentials', JSON.stringify(credentials))
    render()
    // Keep the focus editor open, refreshed with the saved values
    applyFocusedNoteState()
  }

  async function copyToClipboard(text, label) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      showToast(`${label} copied to clipboard! 📋`)
    } catch (err) {
      console.error(err)
      showToast('Copy failed ⚠️', 'warn')
    }
  }

  function openFocusedCredential(credId) {
    focusedCredentialId = focusedCredentialId === credId ? null : credId
    applyFocusedNoteState()
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
    closeAllPopovers()
    collapseCreator()
    noteIdInput.value = ''
    noteForm.reset()
    noteTypeSelect.value = 'standard'
    updateTypePopoverUI('standard')
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
      document.querySelectorAll('#color-options .color-option-label').forEach(label => {
        label.classList.remove('current')
      })
      pinkRadio.closest('.color-option-label')?.classList.add('current')
      if (colorSwatchDisplay) colorSwatchDisplay.style.backgroundColor = '#ffd1dc'
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

    // 3. DELETE ACTION
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
    if (currentMode === 'vault') { renderVault() } else { renderNotes() }
  }

  function renderVault() {
    if (!vaultUnlocked) {
      showVaultLockedState()
      return
    }

    // Show vault content, hide locked state
    vaultLockedState.classList.add('hidden')
    vaultContent.classList.remove('hidden')

    // 1. Filter credentials based on currentVaultFilter
    let filteredCredentials = credentials
    if (currentVaultFilter !== 'all') {
      filteredCredentials = credentials.filter(c => (c.type || 'login') === currentVaultFilter)
    }

    // 2. Update vault stats
    statTotalCredentials.textContent = credentials.length

    // 3. Handle empty state display
    if (filteredCredentials.length === 0) {
      credentialsTableWrap.style.display = 'none'
      vaultEmptyState.style.display = 'flex'
      const emptyTitle = vaultEmptyState.querySelector('h3')
      const emptyPara = vaultEmptyState.querySelector('p')
      if (emptyTitle && emptyPara) {
        if (currentVaultFilter !== 'all') {
          const typeNames = { login: 'logins', payment: 'payments', 'secure-note': 'secure notes' }
          emptyTitle.textContent = `No ${typeNames[currentVaultFilter] || 'items'} found`
          emptyPara.textContent = 'Add a new credential or switch filter back to "All" to view your saved credentials.'
        } else {
          emptyTitle.textContent = 'Your vault is empty'
          emptyPara.textContent = 'Add your first password, API key, or login so it is always one cute tap away!'
        }
      }
    } else {
      credentialsTableWrap.style.display = 'block'
      vaultEmptyState.style.display = 'none'
      credentialsGrid.innerHTML = filteredCredentials.map(cred => renderCredentialRowHTML(cred)).join('')
    }

    applyFocusedNoteState()
  }

  function renderNotes() {
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
    focusedNoteId = null
    focusedCredentialId = null
    applyFocusedNoteState()
  }

  function applyFocusedNoteState() {
    const focusedNote = notes.find(note => note.id === focusedNoteId)
    const focusedCredential = credentials.find(cred => cred.id === focusedCredentialId)
    const hasFocused = !!focusedNote || !!focusedCredential

    noteFocusBackdrop.classList.toggle('active', hasFocused)
    noteFocusPanel.classList.toggle('active', hasFocused)
    noteFocusPanel.setAttribute('aria-hidden', hasFocused ? 'false' : 'true')
    document.body.classList.toggle('note-focus-open', hasFocused)

    if (focusedNote) noteFocusContent.innerHTML = renderFocusedNotePanelHTML(focusedNote)
    else if (focusedCredential) noteFocusContent.innerHTML = renderFocusedCredentialPanelHTML(focusedCredential)
    else noteFocusContent.innerHTML = ''

    if (focusedNote) noteFocusContent.querySelector('.note-focus-title-input')?.focus()
  }

  // Inline editing of the focused note + save / close actions
  function handleFocusNoteActions(e) {
    const target = e.target
    const article = target.closest('.note-focus-article')
    if (!article) return
    const noteId = article.getAttribute('data-id')
    const note = notes.find(n => n.id === noteId)
    if (!note) return

    if (target.closest('#focus-action-close')) {
      closeFocusedNote()
      return
    }

    if (target.closest('#focus-action-save')) {
      const titleInput = article.querySelector('.note-focus-title-input')
      const bodyInput = article.querySelector('.note-focus-body-input')
      const nextTitle = titleInput ? titleInput.value.trim() : note.title
      const nextContent = bodyInput ? bodyInput.value : note.content

      if (nextTitle.trim() === '' && nextContent.trim() === '') {
        showToast('A jot needs a little something 😿', 'warn')
        return
      }

      const updatedFields = {
        title: nextTitle,
        content: nextContent,
        color: note.color,
        pinned: note.pinned,
        type: note.type || 'standard',
        reminderAt: note.reminderAt || null,
        spreadsheetData: note.spreadsheetData || null
      }
      saveNoteFromFocus(note, updatedFields)
    }
  }

  async function saveNoteFromFocus(note, fields) {
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      })
      if (!res.ok) throw new Error('Cloud update failed')
      const updatedNote = await res.json()
      notes = notes.map(n => n.id === note.id ? normalizeNote(updatedNote, fields) : n)
      showToast('Jot updated! ✏️')
    } catch (err) {
      console.error(err)
      notes = notes.map(n => n.id === note.id ? normalizeNote({ ...n, ...fields }) : n)
      showToast('Updated locally ⚠️', 'warn')
    }
    saveNotesToStorage()
    render()
    // Keep the focus editor open, refreshed with the saved values
    applyFocusedNoteState()
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
    const spreadsheetMarkup = noteType === 'spreadsheet'
      ? renderSpreadsheetPreview(note.spreadsheetData)
      : ''
    const typeLabel = typeLabelMap[noteType] || 'Standard'

    return `
      <article class="note-focus-article" style="--note-color: ${note.color};" data-id="${note.id}">
        <div class="note-focus-meta-row">
          <span class="note-type-badge type-${noteType}">${typeLabel}</span>
          <span class="note-focus-meta">${escapeHTML(formatDate(note.createdAt))}</span>
        </div>
        ${reminderText}
        <input type="text" class="note-focus-title-input" value="${escapedTitle}"
          placeholder="Note title" maxlength="200" aria-label="Note title">
        <textarea class="note-focus-body-input" rows="6" placeholder="Write your note here..."
          aria-label="Note content">${escapedContent}</textarea>
        ${spreadsheetMarkup}
        <div class="note-focus-actions">
          <button type="button" class="btn btn-secondary" id="focus-action-close">Close</button>
          <button type="button" class="btn btn-primary" id="focus-action-save">
            <span class="btn-sparkle">💾</span> Save Changes
          </button>
        </div>
      </article>
    `
  }

  function renderCredentialRowHTML(cred) {
    const escSite = escapeHTML(cred.site)
    const escUsername = escapeHTML(cred.username)

    return `
      <tr class="credential-row" data-id="${cred.id}">
        <td class="col-site">
          <span class="credential-site-cell">
            <span class="credential-site-icon" aria-hidden="true">🔑</span>
            <span class="credential-site" title="${escSite}">${escSite}</span>
          </span>
        </td>
        <td class="col-username">
          <span class="credential-username-cell">
            <span class="credential-username" title="${escUsername}">${escUsername}</span>
            <button type="button" class="btn-icon credential-cell-btn credential-copy" data-copy="username" title="Copy username">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </span>
        </td>
        <td class="col-password">
          <span class="credential-password-cell">
            <span class="credential-password">••••••••••</span>
            <button type="button" class="btn-icon credential-cell-btn credential-reveal" title="Show password">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button type="button" class="btn-icon credential-cell-btn credential-copy" data-copy="password" title="Copy password">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </span>
        </td>
        <td class="col-actions">
          <span class="credential-row-actions">
            <button type="button" class="btn-icon action-edit" title="Edit Credential">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
            </button>
            <button type="button" class="btn-icon action-delete" title="Delete Credential Permanently">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </span>
        </td>
      </tr>
    `
  }

  function renderFocusedCredentialPanelHTML(cred) {
    const escSite = escapeHTML(cred.site)
    const escUsername = escapeHTML(cred.username)
    const escPassword = escapeHTML(cred.password)
    const escNotes = escapeHTML(cred.notes || '')

    return `
      <article class="note-focus-article credential-focus-article" data-id="${cred.id}">
        <div class="note-focus-meta-row">
          <span class="note-type-badge">Credential</span>
          <span class="note-focus-meta">${escapeHTML(formatDate(cred.createdAt))}</span>
        </div>

        <label class="note-focus-field">
          <span class="note-focus-field-label">Site</span>
          <input type="text" class="note-focus-body-input note-focus-field-input" data-field="site"
            value="${escSite}" placeholder="Site / app name" maxlength="120"
            autocomplete="off" aria-label="Site">
        </label>

        <label class="note-focus-field">
          <span class="note-focus-field-label">Username</span>
          <input type="text" class="note-focus-body-input note-focus-field-input" data-field="username"
            value="${escUsername}" placeholder="Username / email" maxlength="120"
            autocomplete="off" aria-label="Username">
        </label>

        <label class="note-focus-field">
          <span class="note-focus-field-label">Password</span>
          <div class="credential-password-wrap">
            <input type="password" class="note-focus-body-input note-focus-field-input focus-password-input"
              data-field="password" value="${escPassword}" placeholder="••••••••••"
              autocomplete="new-password" aria-label="Password">
            <button type="button" class="btn-icon focus-password-toggle" title="Show password">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"
                stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </label>

        <label class="note-focus-field">
          <span class="note-focus-field-label">Notes</span>
          <textarea class="note-focus-body-input" data-field="notes" rows="3" placeholder="Notes (optional)"
            aria-label="Notes">${escNotes}</textarea>
        </label>

        <div class="note-focus-actions">
          <button type="button" class="btn btn-secondary" id="cred-focus-action-close">Close</button>
          <button type="button" class="btn btn-primary" id="cred-focus-action-save">
            <span class="btn-sparkle">💾</span> Save Changes
          </button>
        </div>
      </article>
    `
  }

  // Keep layout toggle icon and style in sync with current mode
  function updateLayoutToggleButton() {
    if (!btnLayoutToggle) return

    const isListView = currentLayoutView === 'list'
    const nextViewLabel = isListView ? 'thumbnail' : 'list'

    // Icons represent the current view mode (grid = thumbnail, rows = list)
    const gridIcon = `
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
      </svg>`
    const listIcon = `
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>`

    const iconEl = btnLayoutToggle.querySelector('.layout-icon')
    if (iconEl) {
      iconEl.innerHTML = isListView ? listIcon : gridIcon
    }

    btnLayoutToggle.title = `${isListView ? 'List' : 'Thumbnail'} view`
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
    const pinActionSVG = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="${note.pinned ? 'var(--color-primary)' : 'none'}" stroke-linecap="round" stroke-linejoin="round" class="svg-pin ${note.pinned ? 'is-pinned' : ''}"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"></path></svg>`

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
