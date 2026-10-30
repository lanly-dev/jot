/**
 * Jot Chrome/Edge Extension - Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('server-url')
  const apiTokenInput = document.getElementById('api-token')
  const saveBtn = document.getElementById('save-btn')
  const openJotBtn = document.getElementById('open-jot-btn')
  const statusBadge = document.getElementById('status-badge')
  const statusText = document.getElementById('status-text')
  const msgDiv = document.getElementById('msg')

  // Load current settings
  chrome.runtime.sendMessage({ action: 'get_settings' }, settings => {
    if (settings) {
      serverUrlInput.value = settings.serverUrl || 'http://localhost:3000'
      apiTokenInput.value = settings.apiToken || ''
      openJotBtn.href = settings.serverUrl || 'http://localhost:3000'
    }
    testConnection()
  })

  function updateStatus(isConnected, message) {
    statusBadge.className = isConnected ? 'status-badge connected' : 'status-badge disconnected'
    statusText.textContent = message
  }

  function testConnection() {
    statusBadge.className = 'status-badge'
    statusText.textContent = 'Checking connection...'

    const targetUrl = serverUrlInput.value.trim() || 'http://localhost:3000'
    const targetToken = apiTokenInput.value.trim()

    chrome.runtime.sendMessage({
      action: 'check_connection',
      serverUrl: targetUrl,
      apiToken: targetToken
    }, res => {
      if (res && res.success) {
        updateStatus(true, `Connected to Jot (${res.serverVersion})`)
        openJotBtn.href = targetUrl
      } else {
        updateStatus(false, (res && res.error) || 'Disconnected')
      }
    })
  }

  saveBtn.addEventListener('click', () => {
    saveBtn.disabled = true
    saveBtn.textContent = 'Saving...'
    msgDiv.className = 'status-msg'
    msgDiv.textContent = ''

    const serverUrl = serverUrlInput.value.trim() || 'http://localhost:3000'
    const apiToken = apiTokenInput.value.trim()

    chrome.runtime.sendMessage({
      action: 'save_settings',
      serverUrl,
      apiToken
    }, () => {
      saveBtn.disabled = false
      saveBtn.textContent = 'Save & Connect'
      msgDiv.className = 'status-msg success'
      msgDiv.textContent = 'Settings saved!'

      testConnection()

      setTimeout(() => {
        msgDiv.textContent = ''
      }, 2500)
    })
  })
})
