/**
 * Jot Chrome/Edge Extension - Background Service Worker
 * Handles communication with the local or self-hosted Jot backend server.
 */

const DEFAULT_SERVER_URL = 'http://localhost:8000'

// Get configured settings from storage
async function getSettings() {
  const result = await chrome.storage.local.get(['jotServerUrl', 'jotApiToken'])
  return {
    serverUrl: (result.jotServerUrl || DEFAULT_SERVER_URL).replace(/\/+$/, ''),
    apiToken: result.jotApiToken || ''
  }
}

// Numeric dotted-version compare: is `a` an older version than `b`?
function isOlderVersion(a, b) {
  if (!a || !b) return false
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) < (pb[i] || 0)) return true
    if ((pa[i] || 0) > (pb[i] || 0)) return false
  }
  return false
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
      const installedVersion = chrome.runtime.getManifest().version
      const servedVersion = data.extensionVersion || null
      return {
        success: true,
        serverVersion: data.version || '1.0',
        url: targetUrl,
        installedVersion,
        servedVersion,
        updateAvailable: isOlderVersion(installedVersion, servedVersion)
      }
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
// Pick the value stored as the credential's `site`. For a normal public
// domain the bare domain is the cleanest label, and the vault turns it
// into a link. For localhost, IPs, and other single-label hosts the bare
// hostname is meaningless (it drops the port, and the vault can't link
// it), so keep the full page URL the content script captured instead.
function siteForPayload(payload) {
  const domain = (payload.domain || '').trim()
  const isPublicDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(domain)
  if (isPublicDomain) return domain
  return payload.url || payload.domain || 'Saved Login'
}

async function saveCredential(payload) {
  const { serverUrl, apiToken } = await getSettings()
  const endpoint = `${serverUrl}/api/credentials`

  const headers = {
    'Content-Type': 'application/json'
  }
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`
  }

  // Match the server's /api/credentials contract (see normalizeCredential in
  // server.js): the POST handler only reads site/username/password/notes/
  // type/color — the old category/name/url fields were silently dropped,
  // which stored entries with an empty site.
  const credentialBody = {
    site: siteForPayload(payload),
    username: payload.username || '',
    password: payload.password || '',
    notes: payload.notes || `Saved automatically via Jot browser extension on ${new Date().toISOString()}`,
    type: 'login',
    color: '#ffd1d9'
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
