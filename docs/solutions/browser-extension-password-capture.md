---
title: "Browser Extension for Automatic Password Capture into Jot Vault"
date: 2026-10-25
category: feature-architecture
tags: [vault, chrome-extension, edge-extension, manifest-v3, password-capture, shadow-dom, self-hosting]
status: completed
---

# Solution: Browser Extension for Automatic Password Capture into Jot Vault

## 1. Problem Statement

While Jot previously supported bulk importing passwords via CSV files, users had no mechanism to capture new or updated passwords at the point of login across websites (e.g. GitHub, Google, Amazon, corporate SSO) without manually switching to Jot and typing or pasting credentials.

Due to the web browser's **Same-Origin Policy**, web pages running inside a browser tab are strictly sandboxed and cannot monitor form submissions on external websites. The standard, industry-proven solution for password managers is a dedicated browser extension.

---

## 2. Key Architecture & Security Guardrails

### 2.1 Manifest V3 Extension (`extension/`)
- **`manifest.json`**:
  - Manifest V3 compliant.
  - Minimal permissions: `storage`, `activeTab`.
  - Host permissions: `*://*/*` (for login detection on websites) and loopback addresses (`http://localhost:*/*`, `http://127.0.0.1:*/*`) for local API communication.
- **Service Worker (`background.js`)**:
  - Relays credential save requests from content scripts to the Jot backend (`POST /api/credentials`).
  - Manages configuration (`serverUrl`, `apiToken`) in `chrome.storage.local`.
  - Avoids CORS restrictions on arbitrary web origins.
- **Shadow DOM Isolation (`content.js`)**:
  - Listens for `<form>` submissions containing `<input type="password">`.
  - Resolves domain (`window.location.hostname`), username, and password.
  - Injects a floating card into a **closed Shadow DOM** (`attachShadow({ mode: 'closed' })`). This guarantees that host website styles cannot alter Jot's prompt, and host page scripts cannot inspect or tamper with prompt DOM elements.
  - Requires explicit user action ("Save to Jot" or "Ignore"). It **never** auto-saves in the background without consent.
- **Extension Toolbar Popup (`popup.html` & `popup.js`)**:
  - Displays live server connectivity status (`🟢 Connected (v1.0)` / `🔴 Disconnected`).
  - Allows configuring custom server URLs and optional Bearer API tokens.
  - Provides a quick 1-click link to launch the Jot web app.

### 2.2 Server-Side Self-Hosting & Packaging (`server.js`)
- `GET /api/extension/status`: Health-check endpoint reporting server presence, app name, and version.
- `GET /api/extension/download`: Serves `jot-extension.zip`. If not present, it dynamically packages `extension/` using a zero-dependency PKZip generator (`scripts/package-extension.js`) using Node's native `zlib`.

### 2.3 In-App UI & Guided Installer (`public/index.html`, `public/app.js`, `public/styles.css`)
- **Vault Action Bar**: Added **🧩 Extension** button next to "Import CSV".
- **Setup Modal**:
  - Direct 1-click download of `jot-extension.zip`.
  - 3-step visual installation walkthrough for Chrome and Edge.
  - One-click button to copy `chrome://extensions` to clipboard.
  - Live server readiness status indicator.

---

## 3. Verification & Results

1. **Packaging & Extraction**:
   - `scripts/package-extension.js` generated a clean 9,556-byte zip file.
   - Verified clean extraction via PowerShell `Expand-Archive` without checksum or structure errors.
2. **API Endpoints**:
   - `GET /api/extension/status` returned HTTP 200 with `{ success: true, app: 'Jot', version: '1.0.0' }`.
   - `GET /api/extension/download` returned HTTP 200 with `application/zip`.
3. **Browser E2E Verification**:
   - Tested in browser: Switched to Vault, verified **Extension** button, opened setup modal, confirmed live green server status indicator, and closed modal cleanly.
4. **Code Quality**:
   - Configured `globals.webextensions` in `eslint.config.js`.
   - Ran `npx eslint .` with **0 errors and 0 warnings**.
