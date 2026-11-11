# Plan: Chrome & Edge Extension for Automatic Password Capture into Jot Vault

## 1. Overview & Objectives

Build a lightweight, self-contained Chrome / Edge extension (Manifest V3) and host it inside Jot so users can:
1. Automatically detect login form submissions on any website.
2. Display a floating, non-intrusive prompt: *"Save password to Jot? (Domain, Username)"*.
3. Save the credential directly into Jot's encrypted vault via `POST /api/credentials` (or `POST /api/import`).
4. Download and install the extension directly from Jot's Vault UI via a **"🧩 Browser Extension"** button and guided modal.

---

## 2. Architectural Blueprint

### 2.1 Extension Architecture (`extension/`)
- **`manifest.json` (Manifest V3)**:
  - Permissions: `storage`, `activeTab`.
  - Host permissions: `*://*/*` (for content script on websites) and `http://localhost:*/*`, `http://127.0.0.1:*/*` (for background API calls).
  - Background Service Worker: `background.js` (handles API communication with Jot backend, avoiding web-page CORS restrictions).
  - Content Script: `content.js` + `content.css` (detects password forms and renders a clean prompt inside a **Shadow DOM** to prevent page CSS clashes).
  - Popup: `popup.html` + `popup.js` (shows Jot connection status, server URL, API token setting, and quick link to open Jot).
  - Icons: Clean SVG/PNG icons for 16, 48, 128px.

### 2.2 Security & Guardrails
- **Shadow DOM Isolation**: The prompt UI is injected inside an isolated Shadow Root so third-party page styles cannot alter the prompt, and the page cannot read the prompt's internal state.
- **Explicit Confirmation**: Never auto-saves in the background. Always requires user to click "Save to Jot".
- **Background Relay**: `content.js` captures `hostname`, `username`, and `password`, passes them via `chrome.runtime.sendMessage` to `background.js`, which then talks to Jot's API.
- **API Token Support**: Passes `Authorization: Bearer <token>` if configured.
- **Zero External Dependencies**: Pure vanilla JavaScript, 0 npm dependencies in the extension.

### 2.3 Server-Side Hosting & Distribution (`server.js`)
- Add `GET /api/extension/download`:
  - Dynamically packages the `extension/` directory into a `.zip` archive (or serves pre-built `public/downloads/jot-extension.zip`).
  - Standard Node.js zip creation (using Node's `zlib` / archiver or a zero-dependency zip packer) so no heavy external native libraries are needed.
- Add `GET /api/extension/status`:
  - Simple health-check endpoint for the extension to verify connectivity to Jot.

### 2.4 Frontend Integration (`public/index.html`, `public/app.js`, `public/styles.css`)
- **Action Bar Button**: Add **🧩 Extension** button in the Vault action bar next to "Import CSV".
- **Extension Guide Modal**:
  - Direct download button for `jot-extension.zip`.
  - 3-step visual instruction card with copyable `chrome://extensions` link.
  - Live Connection Detector: Listens for extension ping / heartbeat; displays `🟢 Extension Connected` when active.

---

## 3. Step-by-Step Execution Plan

1. **Create Extension Files**:
   - `extension/manifest.json`
   - `extension/icons/icon.png` (and SVG)
   - `extension/content.js` (form detection + Shadow DOM modal)
   - `extension/background.js` (relay to Jot backend)
   - `extension/popup.html` & `extension/popup.js` (server settings & status)
2. **Server Zip & Download Endpoint**:
   - Create zip packager script/endpoint in `server.js` (`/api/extension/download`).
3. **Frontend UI & Modal**:
   - Add `#btn-vault-extension` in `public/index.html`.
   - Add modal styling in `public/styles.css`.
   - Add modal logic and connection test in `public/app.js`.
4. **Verification**:
   - Run `npx eslint .` to maintain zero errors and zero warnings.
   - Test extension installation and communication end-to-end.
5. **Codification**:
   - Document in `docs/solutions/browser-extension-password-capture.md` and update `HOW-TO.md` (with relative paths).
