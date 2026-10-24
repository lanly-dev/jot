# Implementation Plan: Backup & Import Parity (Notes & Vault Credentials)

## Problem & Gaps
1. **In-Memory-Only Import (Data Loss on Refresh)**: Currently, `performImport(importData)` in `public/app.js` only pushes new items into JavaScript memory (`notes.push`, `credentials.push`). It never calls the backend API to persist to disk. Refreshing the browser or opening in another tab loses all imported data.
2. **Export Omission with Locked Vault**: Because of zero-retention memory security, `credentials` is empty `[]` when the vault is locked. If a user clicks "Export Notes / Data" while the vault is locked, credentials are silently omitted (or only 0 credentials exported) without informing the user or offering them a chance to unlock their vault.
3. **UI Asymmetry**: Menu options in `public/index.html` say "Export Notes" and "Import Notes" rather than "Export Data / Backup" and "Import Backup". The import confirmation modal only mentions notes in its title and primary button (`Import X notes`), ignoring credentials statistics.
4. **No Server-Side Batch Import Endpoint**: Adding items one-by-one over individual HTTP POSTs is slow, non-atomic, and prone to partial failure. A clean `POST /api/import` batch endpoint is needed in `server.js`.

## Proposed Solution
1. **Server-Side Batch Endpoint (`server.js`)**:
   - `POST /api/import`: Accepts `{ notes: [...], credentials: [...] }`.
   - Normalizes notes using existing server logic and merges by ID or content signature.
   - Writes notes atomically via `writeNotes()`.
   - Normalizes credentials and merges by ID, encrypts sensitive fields (`password`, `notes`, `cardNumber`, `cvv`) via `writeCredentials()`.
   - Returns `{ success: true, notesAdded, notesUpdated, credentialsAdded, credentialsUpdated }`.
2. **Export Flow Enhancement (`public/app.js`)**:
   - If vault is unlocked: exports both `notes` and `credentials` immediately with a clear toast (`Exported N notes and M credentials! 📦`).
   - If vault is locked and credentials exist in vault:
     - Prompt user via an export modal: either "Export Notes Only" or "Unlock Vault & Export Full Backup".
     - If master password is provided, unlock, fetch credentials, and export the full package.
3. **Import Flow & Persistence (`public/app.js`)**:
   - Read JSON file (`notes`, `credentials`).
   - Show enriched preview modal displaying stats for BOTH notes and credentials:
     - Notes: New, Updated, Duplicates
     - Credentials: New, Updated, Duplicates
   - If import contains credentials and the vault is locked (with master password configured):
     - Prompt user for master password right inside the import flow to authorize vault credential import.
   - On confirm: `POST /api/import` with bearer token, await persistence, re-fetch notes (`fetchNotes()`) and credentials (`fetchCredentials()`), and re-render.
4. **UI & Accessibility Polish**:
   - Update dropdown labels in `public/index.html` to "Export Backup" and "Import Backup".
   - Style the import preview modal with badges for notes and vault credentials.

## Verification Checklist
- [ ] Export when vault unlocked includes both notes and credentials in `jot-backup-YYYY-MM-DD.json`.
- [ ] Export when vault locked prompts user or provides clear option to unlock or export notes only.
- [ ] Import persists to backend `data/notes.json` and encrypted `data/credentials.json`.
- [ ] Refreshing the browser preserves all imported notes and credentials.
- [ ] Importing duplicate notes/credentials skips them without creating collisions.
- [ ] Zero lint regressions (`npm run efix`).
