/**
 * Jot Chrome/Edge Extension - Content Script
 * Detects login form submissions and renders a secure Shadow DOM prompt to save credentials to Jot.
 */

(() => {
  // Do not run inside Jot's own interface or on chrome:// internal pages
  if (window.location.hostname === 'localhost' && window.location.port === '3000') {
    return
  }

  let capturedCredentials = null
  let activePromptContainer = null

  /**
   * Extract username and password from a form or surrounding container
   */
  function extractCredentialsFromForm(formElement) {
    const passwordInputs = Array.from(formElement.querySelectorAll('input[type="password"]'))
    if (passwordInputs.length === 0) return null

    // Pick the first filled password input
    const passwordInput = passwordInputs.find(p => p.value && p.value.length > 0)
    if (!passwordInput) return null

    const password = passwordInput.value

    // Look for corresponding username / email input
    let username = ''
    const candidateInputs = Array.from(formElement.querySelectorAll(
      'input[type="email"], input[type="text"], input:not([type]), input[name*="user"], input[name*="email"], input[name*="login"], input[autocomplete="username"]'
    ))

    // Filter out search or hidden inputs
    const validUserInputs = candidateInputs.filter(inp => {
      const type = (inp.getAttribute('type') || 'text').toLowerCase()
      const name = (inp.getAttribute('name') || '').toLowerCase()
      return type !== 'hidden' && type !== 'password' && !name.includes('search') && inp.value
    })

    if (validUserInputs.length > 0) {
      // Pick the closest input right before the password field or the one with value
      username = validUserInputs[0].value.trim()
    }

    const domain = window.location.hostname.replace(/^www\./i, '')
    const fullUrl = window.location.href

    return {
      domain,
      name: domain,
      url: fullUrl,
      username,
      password
    }
  }

  /**
   * Render a sleek, isolated Shadow DOM prompt in the top-right corner
   */
  function showSavePrompt(creds) {
    if (activePromptContainer) {
      activePromptContainer.remove()
      activePromptContainer = null
    }

    const hostDiv = document.createElement('div')
    hostDiv.id = 'jot-save-prompt-root'
    hostDiv.style.all = 'initial'
    hostDiv.style.position = 'fixed'
    hostDiv.style.top = '20px'
    hostDiv.style.right = '20px'
    hostDiv.style.zIndex = '2147483647'
    hostDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

    // Attach closed Shadow DOM for maximum isolation
    const shadow = hostDiv.attachShadow({ mode: 'closed' })

    const style = document.createElement('style')
    style.textContent = `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      .jot-prompt-card {
        background: #ffffff;
        color: #1e293b;
        width: 320px;
        border-radius: 14px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border: 1px solid #e2e8f0;
        overflow: hidden;
        animation: jotSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes jotSlideIn {
        from {
          opacity: 0;
          transform: translateY(-16px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .jot-prompt-header {
        background: #7c3aed;
        color: #ffffff;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .jot-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13.5px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .jot-close-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        font-size: 16px;
        padding: 2px 6px;
        border-radius: 6px;
        line-height: 1;
      }
      .jot-close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }
      .jot-prompt-body {
        padding: 14px;
      }
      .jot-field-row {
        margin-bottom: 8px;
        font-size: 12.5px;
        line-height: 1.4;
      }
      .jot-field-label {
        font-weight: 600;
        color: #64748b;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 2px;
      }
      .jot-field-value {
        color: #0f172a;
        font-weight: 600;
        word-break: break-all;
      }
      .jot-masked-pass {
        letter-spacing: 2px;
        color: #64748b;
      }
      .jot-status-msg {
        font-size: 12px;
        padding: 6px 10px;
        border-radius: 6px;
        margin-bottom: 10px;
        display: none;
      }
      .jot-status-msg.error {
        display: block;
        background: #fee2e2;
        color: #b91c1c;
      }
      .jot-status-msg.success {
        display: block;
        background: #dcfce7;
        color: #15803d;
        font-weight: 600;
      }
      .jot-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      .jot-btn {
        flex: 1;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;
        text-align: center;
      }
      .jot-btn-primary {
        background: #7c3aed;
        color: #ffffff;
      }
      .jot-btn-primary:hover {
        background: #6d28d9;
      }
      .jot-btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .jot-btn-secondary {
        background: #f1f5f9;
        color: #475569;
      }
      .jot-btn-secondary:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
    `

    const card = document.createElement('div')
    card.className = 'jot-prompt-card'

    const maskedPassword = '•'.repeat(Math.min(creds.password.length, 8))

    card.innerHTML = `
      <div class="jot-prompt-header">
        <div class="jot-header-title">
          <span>🔒</span>
          <span>Save password to Jot?</span>
        </div>
        <button class="jot-close-btn" title="Close">✕</button>
      </div>
      <div class="jot-prompt-body">
        <div id="jot-status" class="jot-status-msg"></div>
        <div class="jot-field-row">
          <div class="jot-field-label">Website</div>
          <div class="jot-field-value">${escapeHtml(creds.domain)}</div>
        </div>
        ${creds.username ? `
        <div class="jot-field-row">
          <div class="jot-field-label">Username</div>
          <div class="jot-field-value">${escapeHtml(creds.username)}</div>
        </div>
        ` : ''}
        <div class="jot-field-row">
          <div class="jot-field-label">Password</div>
          <div class="jot-field-value jot-masked-pass">${maskedPassword}</div>
        </div>
        <div class="jot-actions">
          <button id="jot-save-btn" class="jot-btn jot-btn-primary">Save to Jot</button>
          <button id="jot-ignore-btn" class="jot-btn jot-btn-secondary">Ignore</button>
        </div>
      </div>
    `

    shadow.appendChild(style)
    shadow.appendChild(card)
    document.body.appendChild(hostDiv)
    activePromptContainer = hostDiv

    const closeBtn = card.querySelector('.jot-close-btn')
    const ignoreBtn = card.querySelector('#jot-ignore-btn')
    const saveBtn = card.querySelector('#jot-save-btn')
    const statusMsg = card.querySelector('#jot-status')

    const dismiss = () => {
      if (activePromptContainer) {
        activePromptContainer.remove()
        activePromptContainer = null
      }
    }

    closeBtn.addEventListener('click', dismiss)
    ignoreBtn.addEventListener('click', dismiss)

    saveBtn.addEventListener('click', () => {
      saveBtn.disabled = true
      saveBtn.textContent = 'Saving...'

      chrome.runtime.sendMessage({
        action: 'save_credential',
        credential: creds
      }, response => {
        if (response && response.success) {
          statusMsg.className = 'jot-status-msg success'
          statusMsg.textContent = 'Saved to Jot Vault! 🔒'
          saveBtn.style.display = 'none'
          ignoreBtn.style.display = 'none'

          setTimeout(dismiss, 1600)
        } else {
          saveBtn.disabled = false
          saveBtn.textContent = 'Try Again'
          statusMsg.className = 'jot-status-msg error'
          statusMsg.textContent = response && response.error
            ? response.error
            : 'Failed to connect to Jot. Make sure Jot is running.'
        }
      })
    })
  }

  function escapeHtml(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  // Intercept form submissions
  document.addEventListener('submit', e => {
    const form = e.target
    if (!(form instanceof HTMLFormElement)) return

    const creds = extractCredentialsFromForm(form)
    if (creds && creds.password) {
      capturedCredentials = creds
      setTimeout(() => {
        showSavePrompt(capturedCredentials)
      }, 300)
    }
  }, true)

  // Also listen for button clicks on login forms
  document.addEventListener('click', e => {
    const btn = e.target.closest('button, input[type="submit"]')
    if (!btn) return

    const form = btn.closest('form')
    if (form) {
      const creds = extractCredentialsFromForm(form)
      if (creds && creds.password) {
        capturedCredentials = creds
      }
    }
  }, true)
})()
