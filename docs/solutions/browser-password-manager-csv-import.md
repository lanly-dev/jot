---
title: "Browser Password Manager CSV Import (Chrome, Edge, Safari, Firefox, Bitwarden)"
date: 2026-10-24
category: feature-architecture
tags: [vault, import, csv, browser, passwords, chrome, firefox, safari, bitwarden, rfc4180]
status: completed
---

# Solution: Browser Password Manager CSV Import

## 1. Problem Statement

Users migrating to Jot's client-encrypted vault needed a direct, secure, and friction-free way to import stored passwords from major browser password managers (Google Chrome, Microsoft Edge, Mozilla Firefox, Apple Safari) and popular password managers like Bitwarden. 

Prior to this feature:
1. Jot only supported importing its own proprietary `jot-backup-*.json` format via the general import menu.
2. Standard browser exports use CSV formats with divergent schemas (column names, field order, and URL representations vary significantly across Chrome, Firefox, Safari, and Bitwarden).
3. Naive comma-splitting (`line.split(',')`) fails on passwords or notes containing commas, quotes, or multi-line text.
4. Users importing passwords into a locked vault would bypass master-password verification or fail silently due to zero-retention client memory security.

---

## 2. Root Cause & Format Variance Analysis

Each password management system exports CSV files with distinct column naming conventions:

| Source | Name / Title | URL / Domain | Username | Password | Notes / Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chrome / Edge** | `name` | `url` | `username` | `password` | `note` |
| **Safari (macOS/iOS)** | `Title` | `URL` | `Username` | `Password` | `Notes`, `OTPAuth` |
| **Firefox** | *(None / uses URL)* | `url` | `username` | `password` | `httpRealm`, `formActionOrigin` |
| **Bitwarden** | `name` | `login_uri` | `login_username` | `login_password` | `notes`, `fields` |
| **Generic CSV** | `title`, `service`, `site` | `website`, `link`, `uri` | `user`, `login`, `email` | `pass`, `secret` | `comment`, `description` |

Furthermore:
- Firefox exports omit a friendly site title, providing only the full `url` (e.g. `https://accounts.google.com/signin`).
- Safari wraps all values in double quotes, including empty fields (`""`).
- Chrome and Bitwarden allow user notes containing commas, multi-line carriage returns (`\r\n`), and escaped quotes (`""`).

---

## 3. Key Decisions & Architecture

### 3.1 Zero-Dependency RFC 4180 CSV Parser (`parseCSV` in `public/app.js`)
To adhere to Jot's zero-bloat vanilla architecture without external dependencies (such as PapaParse), an RFC 4180 compliant finite-state parser was implemented:
- Iterates character-by-character over the file content.
- Tracks `inQuotes` boolean state to preserve commas and line breaks within quoted fields.
- Handles standard escaped double-quotes (`""` within a quoted string is unescaped to `"`).
- Normalizes CRLF and LF delimiters cleanly into rows and fields.

### 3.2 Adaptive Multi-Source Header Detection (`mapCSVToCredentials` in `public/app.js`)
- Headers are normalized (lowercase and trimmed).
- Detects the originating source:
  - If `login_uri` or `login_username` is present: **Bitwarden**.
  - If `httpRealm` or `formActionOrigin` is present: **Firefox**.
  - If `Title` and `Notes` with `URL`: **Safari**.
  - If `name`, `url`, `username`, `password`: **Chrome / Edge**.
  - Otherwise: **Generic CSV**.
- Flexible column resolution checks candidate key arrays (e.g., `['username', 'login_username', 'user', 'login', 'email']`).
- When a friendly title is absent or is a raw URL, the parser extracts a clean domain name using `new URL(rawUrl).hostname.replace(/^www\./i, '')` (e.g., `https://github.com/login` becomes `github.com`).
- Assigns default category `login` and timestamps (`createdAt`, `updatedAt`).

### 3.3 Interactive Preview & Security Modal (`showCsvImportConfirmModal` in `public/app.js`)
Before committing imported credentials to storage:
- **Duplicate Detection**: Compares incoming credentials against decrypted in-memory vault items matching on `username` and `url` / `name`.
- **Preview Table**: Displays a clean preview table of the first 5 records with titles, usernames, masked passwords (`••••••••`), and domain URLs.
- **Source Badge**: Highlights detected source (e.g., "Detected format: Chrome / Edge").
- **Locked Vault Safeguard**: If the vault is locked with a master password, the modal prompts the user for their master password inline. Only valid passwords proceed with the batch persistence.

### 3.4 Atomic Batch Persistence via `POST /api/import`
- Once confirmed and authorized, the credential array is dispatched directly to the existing server endpoint `POST /api/import`.
- `server.js` normalizes, assigns UUIDs, and encrypts sensitive fields (`password`, `notes`) with AES-256-GCM before atomically writing to `data/credentials.json`.
- Automatically calls `fetchCredentials()` and updates the vault table view without requiring a manual page refresh.

### 3.5 UI Access Points (`public/index.html` & `public/styles.css`)
- **Vault Action Bar**: Added "Import CSV" button (`#btn-import-vault-csv`) next to "Lock Vault" and "New Item".
- **Vault Empty State**: Added "Import from Browser CSV" button (`#btn-empty-vault-import`) for new users onboarding to the vault.
- **Unified Import Picker**: Updated general import file picker (`#import-file-input`) to accept `.json,.csv`, automatically routing CSV files to the browser import workflow.

---

## 4. Verification & Testing

1. **Browser End-to-End Test**:
   - Injected sample Chrome export CSV (`GitHub`, `Google`, `Slack`) through the file upload pipeline.
   - Verified that the detected format tag displays `Chrome / Edge`.
   - Verified preview table accurately masked passwords and rendered domains correctly.
   - Confirmed import; verified server response `POST /api/import 200 OK` and toast notification: `Import complete: 3 credentials! 📥`.
   - Verified credentials rendered decrypted in the vault table and persisted to disk.
2. **Lint & Code Quality**:
   - Ran `npx eslint .` — 0 errors, 0 warnings.
   - All function comments and JSDoc preserved.
