/* ==========================================================================
   Jot - Cute & Colorful Note-Taking App JavaScript Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // CENTRAL STATE
  let notes = []
  let credentials = []
  let currentMode = 'notes' // 'notes' or 'vault'
  let currentView = 'active' // 'active', 'archived' or 'trash'
  let currentLayoutView = localStorage.getItem('jot_layout_view') || 'thumbnail' // 'thumbnail' or 'list'
  let isFormPinned = false // whether the note-in-creation is pinned
  let focusedNoteId = null
  let spreadsheetDraft = []
  let vaultUnlocked = false
  let vaultSetupMode = false
  let currentVaultFilter = 'all' // 'all', 'login', 'payment', 'secure-note'
  let creatorDraftTags = []
  let currentTagFilter = null
  let currentSearchQuery = ''
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
  const btnSaveNote = document.getElementById('btn-save-note')
  const colorOptionsContainer = document.getElementById('color-options')

  const btnFilterActive = document.getElementById('status-active')
  const btnFilterArchived = document.getElementById('status-archived')
  const btnFilterTrash = document.getElementById('status-trash')
  const btnEmptyTrash = document.getElementById('btn-empty-trash')
  const btnLayoutToggle = document.getElementById('btn-layout-toggle')
  const notesSearchInput = document.getElementById('notes-search-input')

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

  // Update / self-update UI elements
  const updateModalBackdrop = document.getElementById('update-modal-backdrop')
  const updateModalPanel = document.getElementById('update-modal-panel')
  const updateModalBody = document.getElementById('update-modal-body')
  const btnOpenUpdate = document.getElementById('btn-open-update')
  const btnCloseUpdateModal = document.getElementById('btn-close-update-modal')
  const btnUpdateClose = document.getElementById('btn-update-close')
  const btnUpdateCheck = document.getElementById('btn-update-check')
  const btnDoUpdate = document.getElementById('btn-do-update')

  // Dropdown elements
  const footerDropdown = document.querySelector('.app-footer-dropdown')
  const btnFooterDropdownToggle = document.getElementById('btn-footer-dropdown-toggle')
  const footerDropdownMenu = document.getElementById('footer-dropdown-menu')
  const btnExportData = document.getElementById('btn-export-data')
  const btnImportData = document.getElementById('btn-import-data')
  const importFileInput = document.getElementById('import-file-input')

  // Popover selectors
  const btnTypePopup = document.getElementById('btn-type-popup')
  const typePopover = document.getElementById('type-popover')
  const typeIconDisplay = document.getElementById('type-icon-display')
  const typeLabelDisplay = document.getElementById('type-label-display')
  const btnColorPopup = document.getElementById('btn-color-popup')
  const colorPopover = document.getElementById('color-popover')
  const colorSwatchDisplay = document.getElementById('color-swatch-display')

  // Tags selectors
  const btnTagsPopup = document.getElementById('btn-tags-popup')
  const tagsPopover = document.getElementById('tags-popover')
  const tagsLabelDisplay = document.getElementById('tags-label-display')
  const noteTagInput = document.getElementById('note-tag-input')
  const btnAddTagInline = document.getElementById('btn-add-tag-inline')
  const creatorTagsChips = document.getElementById('creator-tags-chips')
  const creatorActiveTagsBar = document.getElementById('creator-active-tags-bar')
  const tagsSuggestionsChips = document.getElementById('tags-suggestions-chips')
  const activeTagFilterWrap = document.getElementById('active-tag-filter-wrap')
  const activeTagText = document.getElementById('active-tag-text')
  const btnClearTagFilter = document.getElementById('btn-clear-tag-filter')

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
    setSyncStatus('saving', 'Connecting...')
    try {
      const res = await fetch('/api/notes')
      if (!res.ok) throw new Error('Failed to fetch notes')
      const fetchedNotes = await res.json()
      notes = Array.isArray(fetchedNotes)
        ? fetchedNotes.map(note => normalizeNote(note))
        : []
      setSyncStatus('saved', 'Connected · synced')
    } catch (err) {
      console.error('Error fetching notes from cloud:', err)
      notes = [...SAMPLE_NOTES].map(note => normalizeNote(note))
      setSyncStatus('error', 'Server offline')
      showToast('Cannot reach server — changes won\'t be saved ⚠️', 'warn')
    }
    renderCreatorTagsUI()
    render()
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
      credentials = []
      setSyncStatus('error', 'Server offline')
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

  // SAVE / SYNC STATUS INDICATOR
  // Reflects whether the note was actually saved/synced with the server.
  // States: 'saving' | 'saved' | 'error'
  const syncIcons = {
    saving: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>',
    saved: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error: '<svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path><path d="m22 22-2-2"></path></svg>'
  }
  function setSyncStatus(state, message) {
    const el = document.getElementById('sync-status')
    if (!el) return
    el.setAttribute('data-state', state)
    const iconEl = el.querySelector('.sync-icon')
    const textEl = el.querySelector('.sync-text')
    if (iconEl) iconEl.innerHTML = syncIcons[state] || ''
    if (textEl) textEl.textContent = message || ''

    // Show the indicator. For the connected/synced state, treat it as a
    // notification: pop in after the action, then auto-hide shortly after.
    // Saving and error states stay visible so users always see pending or
    // failed sync / connection problems.
    el.classList.add('sync-show')
    if (el._syncHideTimer) clearTimeout(el._syncHideTimer)
    if (state === 'saved') {
      el._syncHideTimer = setTimeout(() => el.classList.remove('sync-show'), 2600)
    } else {
      el._syncHideTimer = undefined
    }
  }

  // ---------------------------------------------------------------------------
  // Self-update panel helpers
  // ---------------------------------------------------------------------------
  function setUpdateBody(html) {
    if (updateModalBody) updateModalBody.innerHTML = html
  }

  function setUpdateButtons(checkEnabled, doEnabled) {
    if (btnUpdateCheck) btnUpdateCheck.disabled = !checkEnabled
    if (btnDoUpdate) btnDoUpdate.disabled = !doEnabled
  }

  function openUpdatePanel() {
    if (updateModalBackdrop) updateModalBackdrop.classList.add('active')
    if (updateModalPanel) {
      updateModalPanel.classList.add('active')
      updateModalPanel.setAttribute('aria-hidden', 'false')
    }
    if (updateModalBackdrop) updateModalBackdrop.setAttribute('aria-hidden', 'false')
    refreshUpdateStatus()
  }

  function closeUpdatePanel() {
    if (updateModalBackdrop) {
      updateModalBackdrop.classList.remove('active')
      updateModalBackdrop.setAttribute('aria-hidden', 'true')
    }
    if (updateModalPanel) {
      updateModalPanel.classList.remove('active')
      updateModalPanel.setAttribute('aria-hidden', 'true')
    }
  }

  // Lightweight status check: is this install capable of in-app updates?
  async function refreshUpdateStatus() {
    if (!updateModalBody) return
    setUpdateBody('<p class="update-status-hint">Checking your installation…</p>')
    try {
      const res = await fetch('/api/update/status')
      const data = await res.json()
      if (!data.supported) {
        setUpdateBody(`
          <p class="update-notice">This deployment doesn't support in-app updates. 🛠️</p>
          <p class="update-note">In-app updates require a git-based install (available via the Proxmox LXC helper, which keeps a clone at <code>/opt/jot</code>). For this build, please update using the <code>update-jot.sh</code> helper on the Proxmox host shell.</p>
        `)
        setUpdateButtons(false, false)
        return
      }
      setUpdateBody(`
        <div class="update-version-row"><span>Current version</span><span class="update-badge">${escapeHTML(data.current || 'unknown')}</span></div>
        <p class="update-note">Press “Check for updates” to compare against the latest release.</p>
      `)
      setUpdateButtons(true, false)
    } catch (err) {
      console.error('Update status check failed:', err)
      setUpdateBody('<p class="update-notice">Couldn\'t check for updates — server unreachable. ⚠️</p>')
      setUpdateButtons(false, false)
    }
  }

  async function handleCheckForUpdates() {
    if (!updateModalBody) return
    if (btnUpdateCheck) {
      btnUpdateCheck.disabled = true
      btnUpdateCheck.textContent = 'Checking…'
    }
    setUpdateBody('<p class="update-status-hint">Checking for updates…</p>')
    try {
      const res = await fetch('/api/update/check', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data) {
        setUpdateBody(`<p class="update-notice">${escapeHTML((data && data.error) || 'Could not check for updates.')} ⚠️</p>`)
        setUpdateButtons(true, false)
        return
      }
      if (data.upToDate) {
        setUpdateBody(`
          <div class="update-version-row"><span>Current version</span><span class="update-badge">${escapeHTML(data.current)}</span></div>
          <div class="update-version-row"><span>Latest version</span><span class="update-badge">${escapeHTML(data.latest)}</span></div>
          <p class="update-note">You're fully up to date — nothing to do! 🎉</p>
        `)
        setUpdateButtons(true, false)
      } else {
        setUpdateBody(`
          <div class="update-version-row"><span>Current version</span><span class="update-badge">${escapeHTML(data.current)}</span></div>
          <div class="update-version-row"><span>Latest version</span><span class="update-badge">${escapeHTML(data.latest)}</span></div>
          <p class="update-note">A newer version is available. Updating pulls the latest code, reinstalls dependencies, and restarts the app briefly. Your notes, credentials, and settings are safe. 🌸</p>
        `)
        setUpdateButtons(true, true)
      }
    } catch (err) {
      console.error('Update check failed:', err)
      setUpdateBody('<p class="update-notice">Couldn\'t reach the update service. ⚠️</p>')
      setUpdateButtons(true, false)
    } finally {
      if (btnUpdateCheck) {
        btnUpdateCheck.disabled = false
        btnUpdateCheck.textContent = 'Check for updates'
      }
    }
  }

  // Poll the server until it is back up after the self-restart, then reload.
  function reloadWhenReady(attempts) {
    fetch('/api/update/status')
      .then((r) => {
        if (r.ok) {
          window.location.reload()
        } else if (attempts > 0) {
          setTimeout(() => reloadWhenReady(attempts - 1), 1500)
        }
      })
      .catch(() => {
        if (attempts > 0) setTimeout(() => reloadWhenReady(attempts - 1), 1500)
      })
  }

  async function handleDoUpdate() {
    if (!btnDoUpdate || btnDoUpdate.disabled) return
    btnDoUpdate.disabled = true
    const originalLabel = btnDoUpdate.textContent
    btnDoUpdate.textContent = 'Updating…'
    if (btnUpdateCheck) btnUpdateCheck.disabled = true
    setUpdateBody('<p class="update-status-hint">Pulling the latest code and installing dependencies…</p>')
    try {
      const res = await fetch('/api/update', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setUpdateBody(`<p class="update-notice">${escapeHTML((data && data.error) || 'Update failed.')} ⚠️</p>`)
        btnDoUpdate.textContent = originalLabel
        setUpdateButtons(true, false)
        return
      }
      setUpdateBody('<p class="update-status-hint">✅ Update applied — restarting the app…</p>')
      if (btnUpdateCheck) btnUpdateCheck.disabled = true
      reloadWhenReady(30)
    } catch (err) {
      console.error('Update failed:', err)
      setUpdateBody('<p class="update-notice">Update request failed. ⚠️</p>')
      btnDoUpdate.textContent = originalLabel
      setUpdateButtons(true, false)
    }
  }

  // FOOTER DROPDOWN
  function toggleFooterDropdown() {
    if (!footerDropdown) return
    const isOpen = footerDropdown.classList.contains('open')
    if (isOpen) {
      closeFooterDropdown()
    } else {
      openFooterDropdown()
    }
  }

  function openFooterDropdown() {
    if (!footerDropdown) return
    footerDropdown.classList.add('open')
    if (btnFooterDropdownToggle) btnFooterDropdownToggle.setAttribute('aria-expanded', 'true')
  }

  function closeFooterDropdown() {
    if (!footerDropdown) return
    footerDropdown.classList.remove('open')
    if (btnFooterDropdownToggle) btnFooterDropdownToggle.setAttribute('aria-expanded', 'false')
  }

  // EXPORT DATA
  function handleExportData() {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      notes: notes,
      credentials: credentials.length > 0 ? credentials : []
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jot-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showToast(`Exported ${notes.length} notes successfully! 📦`, 'success')
  }

  // IMPORT DATA - Smart merge with comparison
  function handleImportFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importData = JSON.parse(event.target.result)
        showImportPreview(importData)
      } catch (err) {
        console.error('Import parse error:', err)
        showToast('Invalid file format — please select a valid Jot backup file ⚠️', 'error')
      }
    }
    reader.readAsText(file)

    // Reset file input so same file can be selected again
    e.target.value = ''
  }

  function showImportPreview(importData) {
    const importNotes = Array.isArray(importData.notes) ? importData.notes : []
    const importCreds = Array.isArray(importData.credentials) ? importData.credentials : []

    // Compare notes by ID
    const existingIds = new Set(notes.map(n => n.id))
    const duplicateIds = new Set()

    // Check for duplicates by content similarity (title + content)
    const existingSignatures = new Set(
      notes.map(n => `${n.title?.toLowerCase().trim()}|${n.content?.toLowerCase().trim()}`)
    )

    let newCount = 0
    let duplicateCount = 0
    let updatedCount = 0

    importNotes.forEach(importNote => {
      const signature = `${importNote.title?.toLowerCase().trim()}|${importNote.content?.toLowerCase().trim()}`

      if (existingIds.has(importNote.id)) {
        // Same ID - check if content changed
        const existingNote = notes.find(n => n.id === importNote.id)
        const existingSignature = `${existingNote?.title?.toLowerCase().trim()}|${existingNote?.content?.toLowerCase().trim()}`
        if (existingSignature !== signature) {
          updatedCount++
        } else {
          duplicateCount++
        }
        duplicateIds.add(importNote.id)
      } else if (existingSignatures.has(signature)) {
        duplicateCount++
      } else {
        newCount++
      }
    })

    // Count new credentials
    const existingCredIds = new Set(credentials.map(c => c.id))
    const newCreds = importCreds.filter(c => !existingCredIds.has(c.id))

    // Build preview modal
    showImportConfirmModal(importData, {
      newCount,
      duplicateCount,
      updatedCount,
      newCreds: newCreds.length,
      totalImport: importNotes.length
    })
  }

  function showImportConfirmModal(importData, stats) {
    // Remove any existing modal
    const existingModal = document.getElementById('import-confirm-modal')
    if (existingModal) existingModal.remove()

    const modal = document.createElement('div')
    modal.id = 'import-confirm-modal'
    modal.className = 'import-confirm-modal'
    modal.innerHTML = `
      <div class="import-confirm-backdrop"></div>
      <div class="import-confirm-panel">
        <div class="import-confirm-header">
          <span class="import-confirm-icon">📥</span>
          <h3>Import Notes</h3>
        </div>
        <div class="import-confirm-body">
          <p class="import-confirm-summary">We found the following in your backup file:</p>
          <div class="import-stats">
            <div class="import-stat import-stat-new">
              <span class="import-stat-number">${stats.newCount}</span>
              <span class="import-stat-label">New notes</span>
            </div>
            <div class="import-stat import-stat-update">
              <span class="import-stat-number">${stats.updatedCount}</span>
              <span class="import-stat-label">Updated notes</span>
            </div>
            <div class="import-stat import-stat-duplicate">
              <span class="import-stat-number">${stats.duplicateCount}</span>
              <span class="import-stat-label">Duplicates (skip)</span>
            </div>
          </div>
          ${stats.newCreds > 0 ? `<p class="import-confirm-creds">Plus ${stats.newCreds} credential(s) will be added.</p>` : ''}
          <p class="import-confirm-warning">Existing notes won't be removed. This action cannot be undone.</p>
        </div>
        <div class="import-confirm-footer">
          <button type="button" class="btn-secondary" id="btn-import-cancel">Cancel</button>
          <button type="button" class="btn-primary" id="btn-import-confirm">Import ${stats.newCount + stats.updatedCount} notes</button>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('active')
    })

    // Event handlers
    const backdrop = modal.querySelector('.import-confirm-backdrop')
    const cancelBtn = modal.querySelector('#btn-import-cancel')
    const confirmBtn = modal.querySelector('#btn-import-confirm')

    function closeModal() {
      modal.classList.remove('active')
      setTimeout(() => modal.remove(), 250)
    }

    backdrop.addEventListener('click', closeModal)
    cancelBtn.addEventListener('click', closeModal)
    confirmBtn.addEventListener('click', () => {
      closeModal()
      performImport(importData)
    })
  }

  function performImport(importData) {
    const importNotes = Array.isArray(importData.notes) ? importData.notes : []
    const importCreds = Array.isArray(importData.credentials) ? importData.credentials : []

    const existingIds = new Set(notes.map(n => n.id))
    const existingSignatures = new Set(
      notes.map(n => `${n.title?.toLowerCase().trim()}|${n.content?.toLowerCase().trim()}`)
    )
    const existingCredIds = new Set(credentials.map(c => c.id))

    let addedCount = 0
    let updatedCount = 0

    // Merge notes
    importNotes.forEach(importNote => {
      const signature = `${importNote.title?.toLowerCase().trim()}|${importNote.content?.toLowerCase().trim()}`
      const normalizedNote = normalizeNote(importNote)

      if (existingIds.has(importNote.id)) {
        // Same ID - check if content changed
        const existingNote = notes.find(n => n.id === importNote.id)
        const existingSignature = `${existingNote?.title?.toLowerCase().trim()}|${existingNote?.content?.toLowerCase().trim()}`
        if (existingSignature !== signature) {
          // Update existing note
          const index = notes.findIndex(n => n.id === importNote.id)
          if (index !== -1) {
            notes[index] = normalizedNote
            updatedCount++
          }
        }
      } else if (!existingSignatures.has(signature)) {
        // New note - add it
        notes.push(normalizedNote)
        addedCount++
        // Update tracking sets
        existingSignatures.add(signature)
      }
    })

    // Merge credentials
    let credsAdded = 0
    importCreds.forEach(cred => {
      if (!existingCredIds.has(cred.id)) {
        credentials.push(cred)
        credsAdded++
      }
    })

    // Re-render
    render()

    // Show success stats
    const messages = []
    if (addedCount > 0) messages.push(`${addedCount} new note${addedCount !== 1 ? 's' : ''}`)
    if (updatedCount > 0) messages.push(`${updatedCount} updated`)
    if (credsAdded > 0) messages.push(`${credsAdded} credential${credsAdded !== 1 ? 's' : ''}`)

    if (messages.length > 0) {
      showToast(`Import complete: ${messages.join(', ')} added! 📥`, 'success')
    } else {
      showToast('No new notes to import — everything was already up to date! ✓', 'success')
    }
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

    // Self-update panel
    if (btnOpenUpdate) btnOpenUpdate.addEventListener('click', () => {
      closeFooterDropdown()
      openUpdatePanel()
    })
    if (btnCloseUpdateModal) btnCloseUpdateModal.addEventListener('click', closeUpdatePanel)
    if (btnUpdateClose) btnUpdateClose.addEventListener('click', closeUpdatePanel)
    if (btnUpdateCheck) btnUpdateCheck.addEventListener('click', handleCheckForUpdates)
    if (btnDoUpdate) btnDoUpdate.addEventListener('click', handleDoUpdate)
    if (updateModalBackdrop) {
      updateModalBackdrop.addEventListener('click', (e) => {
        if (e.target === updateModalBackdrop) closeUpdatePanel()
      })
    }

    // Footer dropdown toggle
    if (btnFooterDropdownToggle) {
      btnFooterDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleFooterDropdown()
      })
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (footerDropdown && !footerDropdown.contains(e.target)) {
        closeFooterDropdown()
      }
    })

    // Export data button
    if (btnExportData) {
      btnExportData.addEventListener('click', () => {
        closeFooterDropdown()
        handleExportData()
      })
    }

    // Import data button
    if (btnImportData) {
      btnImportData.addEventListener('click', () => {
        closeFooterDropdown()
        if (importFileInput) importFileInput.click()
      })
    }

    // File input change handler
    if (importFileInput) {
      importFileInput.addEventListener('change', handleImportFileSelect)
    }

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

    // Active / Archived / Trash view filter toggles (radio style with icons)
    const noteStatusRadios = [btnFilterActive, btnFilterArchived, btnFilterTrash]
    function setNoteView() {
      const checked = noteStatusRadios.find(r => r && r.checked)
      if (checked) currentView = checked.value
      noteStatusRadios.forEach(r => {
        if (r) r.closest('.status-option')?.classList.toggle('active', r.checked)
      })
      if (currentView !== 'trash') {
        currentTagFilter = null
      }
      render()
    }
    noteStatusRadios.forEach(r => {
      if (r) r.addEventListener('change', setNoteView)
    })

    // Empty trash (permanent delete of all trashed notes)
    if (btnEmptyTrash) {
      btnEmptyTrash.addEventListener('click', handleEmptyTrash)
    }

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

    // Re-run the masonry when the window is resized so cards re-flow into the
    // correct number of columns (debounced to avoid heavy work while dragging).
    let masonryResizeTimer = null
    window.addEventListener('resize', () => {
      if (masonryResizeTimer) clearTimeout(masonryResizeTimer)
      masonryResizeTimer = setTimeout(() => {
        if (currentLayoutView === 'list' || focusedNoteId) return
        applyMasonryLayout()
      }, 120)
    })

    // Search input handler
    if (notesSearchInput) {
      notesSearchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase()
        const container = notesSearchInput.closest('.search-option')
        if (container) {
          container.classList.toggle('active', currentSearchQuery.length > 0)
        }
        renderNotes()
      })
    }

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

    // Tag filter clear button
    if (btnClearTagFilter) {
      btnClearTagFilter.addEventListener('click', () => {
        currentTagFilter = null
        render()
      })
    }

    // Tags Popover input and chips events
    if (noteTagInput) {
      noteTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault()
          addCreatorTag(noteTagInput.value)
          noteTagInput.value = ''
        }
      })
    }
    if (btnAddTagInline) {
      btnAddTagInline.addEventListener('click', (e) => {
        e.preventDefault()
        addCreatorTag(noteTagInput.value)
        noteTagInput.value = ''
      })
    }
    if (creatorTagsChips) {
      creatorTagsChips.addEventListener('click', (e) => {
        const tag = e.target.closest('.btn-tag-remove')?.getAttribute('data-tag')
        if (tag) removeCreatorTag(tag)
      })
    }
    if (creatorActiveTagsBar) {
      creatorActiveTagsBar.addEventListener('click', (e) => {
        const tag = e.target.closest('.btn-tag-remove')?.getAttribute('data-tag')
        if (tag) removeCreatorTag(tag)
      })
    }
    if (tagsSuggestionsChips) {
      tagsSuggestionsChips.addEventListener('click', (e) => {
        const pill = e.target.closest('.tag-suggestion-pill')
        if (pill) {
          addCreatorTag(pill.getAttribute('data-tag'))
        }
      })
    }

    // Focus mode exit handlers
    noteFocusBackdrop.addEventListener('click', closeFocusedNote)
    noteFocusClose.addEventListener('click', closeFocusedNote)
    noteFocusContent.addEventListener('click', handleFocusNoteActions)
    noteFocusContent.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'focus-tag-input') {
        e.preventDefault()
        const input = e.target
        const newTag = input.value.trim().replace(/^#/, '').toLowerCase()
        if (newTag) {
          const list = noteFocusContent.querySelector('#focus-tags-list')
          if (list) {
            const existing = Array.from(list.querySelectorAll('.note-tag-chip')).map(c => c.getAttribute('data-tag'))
            if (!existing.includes(newTag)) {
              const chip = document.createElement('span')
              chip.className = 'note-tag-chip active-chip'
              chip.setAttribute('data-tag', newTag)
              chip.innerHTML = `#${escapeHTML(newTag)} <button type="button" class="btn-tag-remove" data-tag="${escapeHTML(newTag)}">×</button>`
              list.appendChild(chip)
            }
            input.value = ''
          }
        }
      }
    })
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
    if (btnTagsPopup) btnTagsPopup.addEventListener('click', (e) => { e.stopPropagation(); togglePopover(btnTagsPopup, tagsPopover) })
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

  // Shared SVG icon for each note type (Lucide-style, matches thumbnail/list toggle)
  function getTypeIconSVG(type) {
    const icons = {
      standard: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>',
      dev: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></svg>',
      reminder: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"></path><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path></svg>',
      spreadsheet: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path></svg>'
    }
    return icons[type] || icons.standard
  }

  function updateTypePopoverUI(type) {
    const labelMap = { standard: 'Standard', dev: 'Dev', reminder: 'Reminder', spreadsheet: 'Sheet' }
    if (typeIconDisplay) typeIconDisplay.innerHTML = getTypeIconSVG(type)
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

  // TAGS SYSTEM HELPERS
  function addCreatorTag(tag) {
    if (!tag) return
    const cleanTag = tag.trim().replace(/^#/, '').toLowerCase()
    if (!cleanTag) return
    if (!creatorDraftTags.includes(cleanTag)) {
      creatorDraftTags.push(cleanTag)
      renderCreatorTagsUI()
    }
  }

  function removeCreatorTag(tag) {
    creatorDraftTags = creatorDraftTags.filter(t => t !== tag)
    renderCreatorTagsUI()
  }

  function getAllExistingTags() {
    const set = new Set()
    notes.forEach(n => {
      if (Array.isArray(n.tags)) {
        n.tags.forEach(t => {
          if (t && typeof t === 'string') set.add(t.trim().replace(/^#/, '').toLowerCase())
        })
      }
    })
    return Array.from(set)
  }

  function renderCreatorTagsUI() {
    if (tagsLabelDisplay) {
      tagsLabelDisplay.textContent = creatorDraftTags.length > 0 ? `Tags (${creatorDraftTags.length})` : 'Tags'
    }

    if (creatorActiveTagsBar) {
      if (creatorDraftTags.length > 0) {
        creatorActiveTagsBar.style.display = 'flex'
        creatorActiveTagsBar.innerHTML = creatorDraftTags.map(t =>
          `<span class="note-tag-chip active-chip">#${escapeHTML(t)} <button type="button" class="btn-tag-remove" data-tag="${escapeHTML(t)}" title="Remove tag">×</button></span>`
        ).join('')
      } else {
        creatorActiveTagsBar.style.display = 'none'
        creatorActiveTagsBar.innerHTML = ''
      }
    }

    if (creatorTagsChips) {
      creatorTagsChips.innerHTML = creatorDraftTags.map(t =>
        `<span class="note-tag-chip active-chip">#${escapeHTML(t)} <button type="button" class="btn-tag-remove" data-tag="${escapeHTML(t)}" title="Remove tag">×</button></span>`
      ).join('')
    }

    if (tagsSuggestionsChips) {
      const allTags = getAllExistingTags().filter(t => !creatorDraftTags.includes(t))
      if (allTags.length > 0) {
        tagsSuggestionsChips.innerHTML = allTags.slice(0, 6).map(t =>
          `<button type="button" class="tag-suggestion-pill" data-tag="${escapeHTML(t)}">+ #${escapeHTML(t)}</button>`
        ).join('')
        const box = document.getElementById('tags-suggestions-box')
        if (box) box.style.display = 'block'
      } else {
        const box = document.getElementById('tags-suggestions-box')
        if (box) box.style.display = 'none'
      }
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

  // CREDENTIAL CREATOR UI (inline, note-style)
  function openCredentialModal() {
    closeFocusedNote()

    const creator = document.getElementById('vault-credential-creator')
    const expanded = document.getElementById('vault-creator-expanded')
    if (creator) creator.classList.add('active')
    if (expanded) expanded.style.display = 'block'
    if (vaultCreatorCollapsed) vaultCreatorCollapsed.style.display = 'none'

    setTimeout(() => {
      if (credentialSiteInput) credentialSiteInput.focus()
    }, 50)
  }

  function closeCredentialModal() {
    closeAllPopovers()

    const creator = document.getElementById('vault-credential-creator')
    const expanded = document.getElementById('vault-creator-expanded')
    if (creator) creator.classList.remove('active')
    if (expanded) expanded.style.display = 'none'
    if (vaultCreatorCollapsed) vaultCreatorCollapsed.style.display = 'flex'

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
    const creator = document.getElementById('vault-credential-creator')
    if (creator) creator.style.borderColor = 'var(--border-color)'
    credentialPasswordInput.type = 'password'
    if (btnToggleFormPassword) {
      btnToggleFormPassword.classList.remove('revealed')
      btnToggleFormPassword.title = 'Show password'
    }
    const heading = document.getElementById('credential-editor-title')
    if (heading) heading.textContent = 'Add a New Credential'
    const saveLabel = btnSaveCredential?.querySelector('.btn-text')
    if (saveLabel) saveLabel.textContent = 'Save Credential'
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
      setSyncStatus('saving', 'Saving...')
      try {
        const res = await fetch(`/api/credentials/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentialData)
        })
        if (!res.ok) throw new Error('Cloud update failed')
        const updated = await res.json()
        credentials = credentials.map(c => c.id === id ? normalizeCredential({ ...c, ...updated }) : c)
        setSyncStatus('saved', 'Changes synced')
        showToast('Credential updated! 🔏')
      } catch (err) {
        console.error(err)
        setSyncStatus('error', 'Not synced — offline')
        showToast('Could not save — server offline ⚠️', 'warn')
      }
    } else {
      setSyncStatus('saving', 'Saving...')
      try {
        const res = await fetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentialData)
        })
        if (!res.ok) throw new Error('Cloud save failed')
        const saved = await res.json()
        credentials.unshift(normalizeCredential(saved))
        setSyncStatus('saved', 'Changes synced')
        showToast('Credential saved! 🔐')
      } catch (err) {
        console.error(err)
        setSyncStatus('error', 'Not saved — offline')
        showToast('Could not save — server offline ⚠️', 'warn')
      }
    }

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
      const creator = document.getElementById('vault-credential-creator')
    if (creator) creator.style.borderColor = credColor
    }

    const heading = document.getElementById('credential-editor-title')
    if (heading) heading.textContent = 'Edit Credential'
    const saveLabel = btnSaveCredential?.querySelector('.btn-text')
    if (saveLabel) saveLabel.textContent = 'Save Changes'
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
        const removedCred = credentials.find(c => c.id === credId)
        credentials = credentials.filter(c => c.id !== credId)
        if (credentialIdInput.value === credId) resetCredentialForm()
        render()
        try {
          const res = await fetch(`/api/credentials/${credId}`, { method: 'DELETE' })
          if (!res.ok) throw new Error('Cloud delete failed')
          setSyncStatus('saved', 'Changes synced')
          showToast('Credential deleted permanently! 🗑️')
        } catch (err) {
          console.error(err)
          if (removedCred) credentials.push(removedCred)
          render()
          setSyncStatus('error', 'Delete failed — offline')
          showToast('Could not delete — server offline ⚠️', 'warn')
        }
      }, 300)
      return
    }

    populateCredentialForm(cred)
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

      setSyncStatus('saving', 'Saving...')
      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFields)
        })
        if (!res.ok) throw new Error('Cloud update failed')
        const updatedNote = await res.json()
        notes = notes.map(n => n.id === id ? normalizeNote(updatedNote, updatedFields) : n)
        setSyncStatus('saved', 'Changes synced')
        showToast('Jot updated! ✏️')
      } catch (err) {
        console.error(err)
        setSyncStatus('error', 'Not synced — offline')
        showToast('Could not save — server offline ⚠️', 'warn')
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
        tags: [...creatorDraftTags],
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      setSyncStatus('saving', 'Saving...')
      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newNote)
        })
        if (!res.ok) throw new Error('Cloud save failed')
        const savedNote = await res.json()
        notes.unshift(normalizeNote(savedNote, newNote))
        clearActiveFilters() // make sure the new note is not hidden by a stale tag/search filter
        setSyncStatus('saved', 'Saved · synced')
        showToast('Jot saved successfully! ✨')
      } catch (err) {
        console.error(err)
        setSyncStatus('error', 'Not saved — offline')
        showToast('Could not save — server offline ⚠️', 'warn')
      }
    }

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

  // Clear any active tag/search filters so that a newly created note is always
  // visible on the board. The search input UI is kept in sync (value + highlight).
  function clearActiveFilters() {
    currentTagFilter = null
    currentSearchQuery = ''
    if (notesSearchInput) {
      notesSearchInput.value = ''
      const container = notesSearchInput.closest('.search-option')
      if (container) container.classList.remove('active')
    }
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

    // Reset tags
    creatorDraftTags = []
    renderCreatorTagsUI()

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
    if (editorTitleHeading) editorTitleHeading.textContent = 'Create a New Jot'
    const saveLabel = btnSaveNote?.querySelector('.btn-text')
    if (saveLabel) saveLabel.textContent = 'Save Note'
  }

  // Helper to sync minor updates silently
  async function updateNoteOnServerSilent(id, fields, onFail) {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      })
      if (!res.ok) throw new Error('Cloud sync failed')
      const updatedNote = await res.json()
      notes = notes.map(n => n.id === id ? normalizeNote(updatedNote, fields) : n)
      setSyncStatus('saved', 'Changes synced')
    } catch (err) {
      console.error('Silent update sync failed:', err)
      setSyncStatus('error', 'Not synced — offline')
      showToast('Could not sync change — server offline ⚠️', 'warn')
      if (typeof onFail === 'function') onFail()
    }
  }

  // Restore a note from the trash
  async function restoreNote(id) {
    try {
      const res = await fetch(`/api/notes/${id}/restore`, { method: 'POST' })
      if (!res.ok) throw new Error('Cloud restore failed')
      notes = notes.map(n => n.id === id ? { ...n, deleted: false, deletedAt: null } : n)
      setSyncStatus('saved', 'Changes synced')
      showToast('Jot restored! 🌱')
      render()
    } catch (err) {
      console.error(err)
      setSyncStatus('error', 'Restore failed — offline')
      showToast('Could not restore — server offline ⚠️', 'warn')
    }
  }

  // Move a note to the trash (soft delete). Throws on failure so the caller can revert.
  async function moveNoteToTrash(id) {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Cloud delete failed')
    setSyncStatus('saved', 'Changes synced')
    showToast('Jot moved to trash 🗑️')
  }

  // Permanently delete a single note. Throws on failure so the caller can revert.
  async function deleteNotePermanently(id) {
    const res = await fetch(`/api/notes/${id}?permanent=1`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Cloud delete failed')
    setSyncStatus('saved', 'Changes synced')
    showToast('Jot deleted permanently! 🗑️')
  }

  // Empty the trash (permanently delete all trashed notes)
  async function handleEmptyTrash() {
    const confirmed = window.confirm('Permanently delete ALL notes in the trash? This cannot be undone.')
    if (!confirmed) return
    const trashedCount = notes.filter(n => n.deleted).length
    try {
      const res = await fetch('/api/notes/trash', { method: 'DELETE' })
      if (!res.ok) throw new Error('Empty trash failed')
      notes = notes.filter(n => !n.deleted)
      render()
      setSyncStatus('saved', 'Changes synced')
      showToast(`Trash emptied! Removed ${trashedCount} jot(s) 🗑️`)
    } catch (err) {
      console.error(err)
      setSyncStatus('error', 'Empty trash failed')
      showToast('Could not empty trash — server offline ⚠️', 'warn')
    }
  }

  function normalizeNote(note, fallback = {}) {
    const merged = { ...fallback, ...(note || {}) }
    return {
      ...merged,
      type: merged.type || 'standard',
      reminderAt: merged.reminderAt || null,
      spreadsheetData: Array.isArray(merged.spreadsheetData) ? merged.spreadsheetData : null,
      tags: Array.isArray(merged.tags) ? merged.tags : [],
      deleted: !!merged.deleted,
      deletedAt: merged.deletedAt || null,
      updatedAt: merged.updatedAt || merged.createdAt || new Date().toISOString()
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

    // 1. PIN TOGGLE ACTION (Click on the pin action button)
    if (target.closest('.action-pin')) {
      const prevPinned = note.pinned
      const nextPinned = !prevPinned
      note.pinned = nextPinned
      render()
      updateNoteOnServerSilent(note.id, { pinned: nextPinned }, () => { note.pinned = prevPinned; render() })
      return
    }

    // 2. ARCHIVE TOGGLE ACTION
    if (target.closest('.action-archive')) {
      const prevArchived = note.archived
      const prevPinned = note.pinned
      const nextArchived = !prevArchived
      const nextPinned = nextArchived ? false : prevPinned
      note.archived = nextArchived
      if (nextArchived) note.pinned = false

      render()
      updateNoteOnServerSilent(note.id, { archived: nextArchived, pinned: nextPinned }, () => {
        note.archived = prevArchived
        note.pinned = prevPinned
        render()
      })
      return
    }

    // 2.5 RESTORE ACTION (only for trashed notes)
    if (target.closest('.action-restore')) {
      restoreNote(noteId)
      return
    }

    // 3. DELETE ACTION (move to trash, or permanently delete if in trash view)
    if (target.closest('.action-delete')) {
      const isTrashView = currentView === 'trash'
      card.classList.add('card-poof')

      setTimeout(async () => {
        const removedNoteRef = notes.find(n => n.id === noteId)
        if (isTrashView) {
          notes = notes.filter(n => n.id !== noteId)
        } else {
          note.deleted = true
          note.deletedAt = new Date().toISOString()
        }
        if (noteIdInput.value === noteId) resetForm()
        render()

        try {
          if (isTrashView) {
            await deleteNotePermanently(noteId)
          } else {
            await moveNoteToTrash(noteId)
          }
        } catch (err) {
          console.error(err)
          if (isTrashView) {
            if (removedNoteRef) notes.unshift(removedNoteRef)
          } else {
            note.deleted = false
            note.deletedAt = null
          }
          render()
          setSyncStatus('error', 'Delete failed — offline')
          showToast('Could not delete — server offline ⚠️', 'warn')
        }
      }, 300)
      return
    }

    // 4. CLICK TAG TO FILTER
    if (target.closest('.note-tag-chip')) {
      const tag = target.closest('.note-tag-chip').getAttribute('data-tag')
      if (tag) {
        currentTagFilter = currentTagFilter === tag ? null : tag
        render()
        return
      }
    }

    // 5. CLICK CARD TO FOCUS/EXPAND
    openFocusedNote(noteId)
  }

  // UPDATE STATS DASHBOARD VALUES
  function updateStatsDashboard() {
    const totalActive = notes.filter(n => !n.archived && !n.deleted).length
    const totalPinned = notes.filter(n => n.pinned && !n.archived && !n.deleted).length
    const totalArchived = notes.filter(n => n.archived && !n.deleted).length

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

    // 2. Filter notes based on active/archived/trash state, tag and search
    const isTrashView = currentView === 'trash'
    let filteredNotes = notes.filter(note => {
      const deletedMatch = !!note.deleted === isTrashView
      const statusMatch = isTrashView || note.archived === (currentView === 'archived')
      const tagMatch = isTrashView || !currentTagFilter ||
        (Array.isArray(note.tags) && note.tags.map(t => t.toLowerCase()).includes(currentTagFilter.toLowerCase()))
      const searchMatch = !currentSearchQuery || 
        (note.title && note.title.toLowerCase().includes(currentSearchQuery)) || 
        (note.content && note.content.toLowerCase().includes(currentSearchQuery))
      return deletedMatch && statusMatch && tagMatch && searchMatch
    })

    // Update active tag filter chip display
    if (activeTagFilterWrap && activeTagText) {
      if (currentTagFilter) {
        activeTagFilterWrap.style.display = 'inline-flex'
        activeTagText.textContent = `🏷️ #${currentTagFilter}`
      } else {
        activeTagFilterWrap.style.display = 'none'
      }
    }

    // Toggle the "Empty trash" button: only in trash view when something is there
    if (btnEmptyTrash) {
      const hasTrash = notes.some(n => n.deleted)
      btnEmptyTrash.style.display = isTrashView && hasTrash ? 'inline-flex' : 'none'
    }

    // 3. Sort notes: trashed by deletion time; otherwise pinned bubble to top,
    //    then sorted by last-modified time descending (most recently created
    //    or edited notes float to the top)
    filteredNotes.sort((a, b) => {
      if (isTrashView) {
        return new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0)
      }
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return bTime - aTime
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

      if (currentView === 'trash') {
        emptyMascot.textContent = '🗑️'
        emptyTitle.textContent = 'Trash is empty'
        emptyPara.textContent = 'Deleted jots land here so you can restore them. They are only gone for good when you empty the trash.'
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
      const isListView = currentLayoutView === 'list'
      notesGrid.style.display = isListView ? 'flex' : 'block'
      emptyState.style.display = 'none'

      // Render card templates
      notesGrid.innerHTML = filteredNotes.map(note => renderNoteCardHTML(note)).join('')
      if (!isListView) {
        applyMasonryLayout()
      } else {
        // Clear the masonry-set height so the flex list view can size naturally
        notesGrid.style.height = ''
      }
    }

    applyFocusedNoteState()
    scheduleReminderNotifications()
  }

  // ---------------------------------------------------------------------------
  // Masonry layout (thumbnail view only)
  // Measures each card's natural height at the current column width, then packs
  // every card into the shortest column so there is no empty space left beside
  // a taller card. Used because a plain grid forces every card in a row to the
  // same height, leaving gaps under shorter cards.
  // ---------------------------------------------------------------------------
  function applyMasonryLayout() {
    if (currentLayoutView === 'list' || focusedNoteId) return
    const cards = Array.from(notesGrid.querySelectorAll('.note-card'))
    if (cards.length === 0) return

    const containerW = notesGrid.getBoundingClientRect().width
    notesGrid.style.width = '100%'
    if (!containerW || containerW <= 0) return

    // Responsive column count based on the current container width. On narrow
    // (mobile) screens we force 2 columns so the board shows two compact cards
    // side-by-side, matching the app's existing 600px breakpoint.
    const GAP = 16
    const CARD_WIDTH = 260
    const isNarrow = window.innerWidth <= 600
    const cols = isNarrow ? 2 : Math.max(1, Math.floor((containerW + GAP) / (CARD_WIDTH + GAP)))
    const colW = (containerW - GAP * (cols - 1)) / cols

    // 1) Measure every card at the target column width (normal flow, hidden).
    // Use offsetHeight (layout size, ignores transform) instead of
    // getBoundingClientRect().height because the card's `pop-in` animation
    // scales it below 1 during measurement, which would under-measure long
    // notes and cause the next card in the column to overlap them.
    cards.forEach(card => {
      card.style.position = ''
      card.style.left = ''
      card.style.top = ''
      card.style.width = colW + 'px'
      card.style.visibility = 'hidden'
    })
    const heights = cards.map(card => card.offsetHeight)

    // 2) Pack each card into the currently shortest column (keeps DOM reading order)
    const tops = new Array(cols).fill(0)
    cards.forEach((card, i) => {
      const col = tops.indexOf(Math.min(...tops))
      card.style.position = 'absolute'
      card.style.left = (col * (colW + GAP)) + 'px'
      card.style.top = tops[col] + 'px'
      card.style.visibility = 'visible'
      tops[col] += heights[i] + GAP
    })

    // Keep the container tall enough so cards don't overflow the board
    notesGrid.style.height = Math.max(...tops) + 'px'
  }

  // Remove masonry inline positioning (used when opening the focus panel so the
  // focused card's own `position: fixed` styling wins).
  function clearMasonryLayout() {
    notesGrid.style.height = ''
    notesGrid.querySelectorAll('.note-card').forEach(card => {
      card.style.position = ''
      card.style.left = ''
      card.style.top = ''
      card.style.width = ''
      card.style.visibility = ''
    })
  }

  function openFocusedNote(noteId) {
    focusedNoteId = focusedNoteId === noteId ? null : noteId
    if (focusedNoteId) {
      clearMasonryLayout()
      applyFocusedNoteState()
    } else {
      render()
    }
  }

  function closeFocusedNote() {
    focusedNoteId = null
    applyFocusedNoteState()
    render()
  }

  function applyFocusedNoteState() {
    const focusedNote = notes.find(note => note.id === focusedNoteId)
    const isOpen = Boolean(focusedNote)

    noteFocusBackdrop.classList.toggle('active', isOpen)
    noteFocusPanel.classList.toggle('active', isOpen)
    noteFocusPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true')
    document.body.classList.toggle('note-focus-open', isOpen)

    if (focusedNote) {
      noteFocusContent.innerHTML = renderFocusedNotePanelHTML(focusedNote)
      noteFocusContent.querySelector('.note-focus-title-input')?.focus()
    } else {
      noteFocusContent.innerHTML = ''
    }
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

    if (target.closest('#btn-add-focus-tag')) {
      const input = article.querySelector('#focus-tag-input')
      if (input) {
        const newTag = input.value.trim().replace(/^#/, '').toLowerCase()
        if (newTag) {
          const list = article.querySelector('#focus-tags-list')
          if (list) {
            const existing = Array.from(list.querySelectorAll('.note-tag-chip')).map(c => c.getAttribute('data-tag'))
            if (!existing.includes(newTag)) {
              const chip = document.createElement('span')
              chip.className = 'note-tag-chip active-chip'
              chip.setAttribute('data-tag', newTag)
              chip.innerHTML = `#${escapeHTML(newTag)} <button type="button" class="btn-tag-remove" data-tag="${escapeHTML(newTag)}">×</button>`
              list.appendChild(chip)
            }
            input.value = ''
          }
        }
      }
      return
    }

    if (target.closest('.btn-tag-remove')) {
      target.closest('.note-tag-chip')?.remove()
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

      const tags = Array.from(article.querySelectorAll('#focus-tags-list .note-tag-chip'))
        .map(c => c.getAttribute('data-tag'))
        .filter(Boolean)

      const updatedFields = {
        title: nextTitle,
        content: nextContent,
        color: note.color,
        pinned: note.pinned,
        type: note.type || 'standard',
        tags,
        reminderAt: note.reminderAt || null,
        spreadsheetData: note.spreadsheetData || null
      }
      saveNoteFromFocus(note, updatedFields)
    }
  }

  async function saveNoteFromFocus(note, fields) {
    setSyncStatus('saving', 'Saving...')
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      })
      if (!res.ok) throw new Error('Cloud update failed')
      const updatedNote = await res.json()
      notes = notes.map(n => n.id === note.id ? normalizeNote(updatedNote, fields) : n)
      setSyncStatus('saved', 'Changes synced')
      showToast('Jot updated! ✏️')
    } catch (err) {
      console.error(err)
      setSyncStatus('error', 'Not synced — offline')
      showToast('Could not save — server offline ⚠️', 'warn')
    }
    render()
    // Dismiss the focus editor modal
    closeFocusedNote()
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
      ? `<div class="reminder-chip"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"></path><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path></svg> ${escapeHTML(formatReminder(note.reminderAt))}</div>`
      : ''
    const spreadsheetMarkup = noteType === 'spreadsheet'
      ? renderSpreadsheetPreview(note.spreadsheetData)
      : ''
    const typeLabel = typeLabelMap[noteType] || 'Standard'

    return `
      <article class="note-focus-article" style="--note-color: ${note.color};" data-id="${note.id}">
        <div class="note-focus-meta-row">
          <span class="note-type-badge type-${noteType}">${typeLabel}</span>
          <span class="note-focus-meta">${escapeHTML(formatDate(note.updatedAt || note.createdAt))}</span>
        </div>
        ${reminderText}
        <input type="text" class="note-focus-title-input" value="${escapedTitle}"
          placeholder="Note title" maxlength="200" aria-label="Note title">
        <textarea class="note-focus-body-input" rows="6" placeholder="Write your note here..."
          aria-label="Note content">${escapedContent}</textarea>
        ${spreadsheetMarkup}

        <div class="note-focus-tags-section">
          <div class="note-focus-tags-header">
            <span>Tags 🏷️</span>
            <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 500;">Type tag & press Enter</span>
          </div>
          <div class="note-focus-tags-input-wrap">
            <input type="text" class="note-focus-tag-input" id="focus-tag-input" placeholder="Add tag..." maxlength="25">
            <button type="button" class="btn btn-secondary btn-add-focus-tag" id="btn-add-focus-tag" style="padding: 0.2rem 0.6rem; font-weight: 700;">+</button>
          </div>
          <div class="note-focus-tags-list" id="focus-tags-list">
            ${(note.tags || []).map(t => `<span class="note-tag-chip active-chip" data-tag="${escapeHTML(t)}">#${escapeHTML(t)} <button type="button" class="btn-tag-remove" data-tag="${escapeHTML(t)}">×</button></span>`).join('')}
          </div>
        </div>

        <div class="note-focus-actions">
          <button type="button" class="btn btn-secondary" id="focus-action-close">Close</button>
          <button type="button" class="btn btn-primary" id="focus-action-save">Save Changes</button>
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
    const typeIconMarkup = `<button type="button" class="btn-icon action-type type-${noteType}" title="${typeLabelMap[noteType] || 'Standard'} Note">${getTypeIconSVG(noteType)}</button>`

    // Formatted timestamp text (e.g. "Just now", "2 mins ago", or neat date).
    // Prefer updatedAt so the card reflects the last edit, falling back to
    // createdAt for notes created before the field existed.
    const dateText = formatDate(note.updatedAt || note.createdAt)

    // Archive button icon conditional based on state
    const archiveTitle = note.archived ? 'Send back to Active Jots' : 'Archive Note'
    const archiveIconSVG = note.archived
      ? `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>` // unarchive symbol
      : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"></path><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>` // box symbol

    // Pin action button inside card footer
    const pinActionTitle = note.pinned ? 'Unpin Note' : 'Pin Note'
    const pinActionSVG = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="${note.pinned ? 'var(--color-primary)' : 'none'}" stroke-linecap="round" stroke-linejoin="round" class="svg-pin ${note.pinned ? 'is-pinned' : ''}"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"></path></svg>`

    // Trash-specific actions (only for notes that have been deleted)
    const isTrashNote = !!note.deleted
    const restoreMarkup = isTrashNote
      ? `<button type="button" class="btn-icon action-restore" title="Restore note">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
        </button>`
      : ''
    const deleteIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`
    const deleteTitle = isTrashNote ? 'Delete Permanently' : 'Move to Trash'
    const deleteMarkup = `<button type="button" class="btn-icon action-delete ${isTrashNote ? 'action-delete-permanent' : ''}" title="${deleteTitle}">${deleteIconSVG}</button>`

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
      ? `<div class="reminder-chip"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.268 21a2 2 0 0 0 3.464 0"></path><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path></svg> ${escapeHTML(formatReminder(note.reminderAt))}</div>`
      : ''
    const standardBodyMarkup = noteType === 'standard' || noteType === 'reminder'
      ? `<p class="note-body">${escapedContent}</p>`
      : ''

    const tagsMarkup = Array.isArray(note.tags) && note.tags.length > 0
      ? `<div class="note-tags-row">${note.tags.map(t => `<button type="button" class="note-tag-chip" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</button>`).join('')}</div>`
      : ''

    return `
      <article class="note-card ${note.pinned ? 'pinned-card' : ''} ${isTrashNote ? 'trashed-note' : ''}" data-id="${note.id}" style="--note-color: ${note.color};">

        <div class="note-header">
          <h3 class="note-title">${escapedTitle}</h3>
        </div>

        ${reminderText}
        ${standardBodyMarkup}
        ${markdownMarkup}
        ${spreadsheetMarkup}
        ${tagsMarkup}

        <div class="note-actions">
          <span style="margin-right: auto; align-self: center; font-size: 0.72rem; font-weight: 700; color: rgba(45, 43, 42, 0.45);">${dateText}</span>

          ${isTrashNote ? '' : `<!-- Note Type Icon -->
          ${typeIconMarkup}

          <!-- Pin Note Action -->
          <button type="button" class="btn-icon action-pin" title="${pinActionTitle}">
            ${pinActionSVG}
          </button>

          <!-- Archive Note Action -->
          <button type="button" class="btn-icon action-archive" title="${archiveTitle}">
            ${archiveIconSVG}
          </button>`}

          <!-- Restore Note Action (trash only) -->
          ${restoreMarkup}

          <!-- Delete Note Action -->
          ${deleteMarkup}
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
