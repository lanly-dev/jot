/**
 * Jot Chrome/Edge Extension - Background Service Worker
 * Handles communication with the local or self-hosted Jot backend server.
 */

const DEFAULT_SERVER_URL = 'http://localhost:3000'

// Get configured settings from storage
async function getSettings() {
  const result = await chrome.storage.local.get(['jotServerUrl', 'jotApiToken'])
  return {
    serverUrl: (result.jotServerUrl || DEFAULT_SERVER_URL).replace(/\/+$/, ''),
    apiToken: result.jotApiToken || ''
  }
}

// Test connection to Jot server
async function checkConnection(customUrl, customToken) {
  const settings = await getSettings()
  const targetUrl = (customUrl || settings.serverUrl).replace(/\/+$/, '')
  const token = customToken !== undefined ? customToken : settings.apiToken

  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(`${targetUrl}/api/extension/status`, {
      method: 'GET',
      headers,
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: true, serverVersion: data.version || '1.0', url: targetUrl }
    }

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'Authorization required. Check your API token.' }
    }

    return { success: false, error: `Server responded with status ${res.status}` }
  } catch (err) {
    return { success: false, error: `Could not connect to Jot at ${targetUrl}: ${err.message}` }
  }
}

// Save captured credential to Jot
async function saveCredential(payload) {
  const { serverUrl, apiToken } = await getSettings()
  const endpoint = `${serverUrl}/api/credentials`

  const headers = {
    'Content-Type': 'application/json'
  }
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`
  }

  const credentialBody = {
    category: 'login',
    name: payload.name || payload.domain || 'Saved Login',
    url: payload.url || '',
    username: payload.username || '',
    password: payload.password || '',
    notes: payload.notes || `Saved automatically via Jot browser extension on ${new Date().toLocaleDateString()}`
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(credentialBody)
    })

    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: `Save failed (HTTP ${res.status}): ${errText}` }
    }

    const saved = await res.json()
    return { success: true, credential: saved }
  } catch (err) {
    return { success: false, error: `Network error connecting to Jot: ${err.message}` }
  }
}

// Handle runtime messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'check_connection') {
    checkConnection(request.serverUrl, request.apiToken).then(sendResponse)
    return true
  }

  if (request.action === 'save_credential') {
    saveCredential(request.credential).then(sendResponse)
    return true
  }

  if (request.action === 'get_settings') {
    getSettings().then(sendResponse)
    return true
  }

  if (request.action === 'save_settings') {
    chrome.storage.local.set({
      jotServerUrl: request.serverUrl || DEFAULT_SERVER_URL,
      jotApiToken: request.apiToken || ''
    }).then(() => {
      sendResponse({ success: true })
    })
    return true
  }

  return false
})
