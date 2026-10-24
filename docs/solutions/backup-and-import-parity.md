---
title: "Backup & Import Parity (Notes & Vault Credentials)"
date: 2026-10-24
category: feature-architecture
tags: [backup, export, import, vault, persistence, atomic-writes, batch-api]
status: completed
---

# Solution: Backup & Import Parity (Notes & Vault Credentials)

## 1. Problem Statement

Jot's original export and import mechanism had critical persistence and data parity gaps:

1. **In-Memory-Only Import (Total Data Loss on Reload)**: `performImport()` in `public/app.js` only appended imported objects to client-side in-memory arrays (`notes.push`, `credentials.push`). It never made network calls to persist imported data to disk. Reloading or navigating away lost all imported data.
2. **Export Omission with Locked Vault**: With zero-retention memory security, the client `credentials` array is empty `[]` when the vault is locked. Exporting while locked silently omitted all saved vault credentials with zero explanation or recourse.
3. **Missing Server-Side Batch Import**: The server had individual CRUD endpoints (`/api/notes`, `/api/credentials`), but lacked a batch atomic import endpoint (`/api/import`) to safely merge notes and encrypted credentials in a single roundtrip.
4. **UI Asymmetry**: Menu options were labelled "Export Notes" and "Import Notes", ignoring vault items, and the confirmation dialog only referenced notes.

---

## 2. Root Cause Analysis

- **Client-Side Illusion**: `performImport` updated the frontend reactive state without ever contacting the server.
- **Disconnected Vault Lifecycle**: Export had no awareness of whether the vault was locked or whether credentials existed in storage.
- **Lack of Atomic Batch Persistence**: Without `/api/import`, an import would have required tens or hundreds of sequential HTTP POST requests.

---

## 3. Key Decisions & Architecture

### 3.1 Server-Side Batch Import Endpoint (`POST /api/import` in `server.js`)
- Accepts `{ notes: [...], credentials: [...] }`.
- **Notes Processing**: Normalizes incoming notes with `normalizeNoteServer()`. Matches against existing notes using both ID and content signature (`title|content`). If the ID matches, it updates; if identical content signature exists, it avoids creating duplicate notes; otherwise it appends. Writes atomically using `writeNotes()`.
- **Credentials Processing**: Normalizes incoming credentials and updates by ID or appends. Sensitive fields (`password`, `notes`, `cardNumber`, `cvv`, `expiry`) are encrypted using AES-256-GCM before writing to `data/credentials.json` via `writeCredentials()`.
- Returns `{ success: true, notesAdded, notesUpdated, credentialsAdded, credentialsUpdated }`.

### 3.2 Server-Side Full Export Endpoint (`GET /api/export` in `server.js`)
- Reads notes and, if `includeCredentials=true`, decrypts and returns credentials for backup purposes, enforcing API token bearer authentication when configured.

### 3.3 Dynamic Export Flow with Master Password Unlock
In `public/app.js`:
- **When Vault is Unlocked**: Directly downloads `jot-backup-YYYY-MM-DD.json` containing all notes and decrypted credentials, displaying `showToast("Exported N notes & M credentials! 📦")`.
- **When Vault is Locked**:
  - Displays a modal (`showExportOptionsModal()`) giving the user two clear choices:
    1. **Notes Only**: Exports notes immediately without touching the vault.
    2. **Full Backup (Notes & Vault)**: Expands an inline master password field. Upon entering the correct master password, it unlocks the vault, loads credentials JIT, starts the auto-lock timer, and downloads the full backup.

### 3.4 Comprehensive Import Preview & Authorization
In `public/app.js`:
- Parses incoming JSON and presents a statistics modal:
  - New notes, updated notes, and duplicate skips.
  - Vault credentials count badge.
- If vault credentials are present and the vault is locked with a master password, the modal prompts for the master password right in the dialog before saving.
- On confirmation, `performImport()` calls `POST /api/import`, fetches fresh data (`fetchNotes()`, `fetchCredentials()`), updates UI status, and displays a summary toast.

---

## 4. Verification & Results

- **Export Modal Verification**: Verified in browser that clicking "Export Backup" when locked displays options and reveals the password field on selecting "Full Backup".
- **Master Password Validation**: Verified that entering the master password successfully exports notes and vault credentials.
- **Immediate Export When Unlocked**: Verified that clicking "Export Backup" while unlocked immediately triggers the file download without prompts.
- **Persistent Disk Storage**: Verified that `POST /api/import` persists notes to `data/notes.json` and credentials to `data/credentials.json`.
- **Linter**: Ran `npm run efix` — 0 errors, no lint regressions.
