# Implementation Plan: Browser Password Manager CSV Import

## Problem & Use Case
Users transitioning to Jot's built-in encrypted Vault want to migrate their existing saved logins from web browsers (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari / Apple Passwords) and password managers (Bitwarden, 1Password, Dashlane) without manually retyping dozens or hundreds of credentials.

All major browsers and password managers export credentials as standard CSV files with varying header conventions.

## Supported Formats & Header Detection
A resilient RFC 4180 CSV parser and header mapper will detect:
- **Site / URL**: `name`, `title`, `url`, `website`, `site`, `login_uri`
- **Username**: `username`, `login_username`, `user`, `login`, `email`
- **Password**: `password`, `login_password`, `pass`
- **Notes**: `note`, `notes`, `comments`, `comment`

Clean URL normalization will extract clean domain names (e.g. `https://accounts.google.com/...` -> `Google (accounts.google.com)` or `google.com`) when `name`/`title` is missing or is just a URL.

Pastel palette colors will be assigned sequentially to give imported credentials Jot's signature colorful aesthetic.

## UI Touchpoints
1. **File Input**: Update `#import-file-input` to accept `.json,.csv`.
2. **Options Dropdown** (`public/index.html`): Add "Import Passwords" (`.csv from Chrome, Edge, Safari`) option to the footer dropdown.
3. **Vault Header** (`public/index.html`): Add an "Import Passwords" button in the Vault header action bar and empty state.
4. **Preview & Confirmation Modal**:
   - Displays browser source detection, credential count, duplicate count, and a preview of the first items.
   - If vault is locked, requires Master Password verification before importing.
5. **Persistence**:
   - Submits credentials batch to `POST /api/import` on the server for AES-256-GCM encryption at rest in `data/credentials.json`.
   - Re-fetches credentials and re-renders vault.

## Verification Checklist
- [ ] Parse Google Chrome export CSV (`name,url,username,password,note`).
- [ ] Parse Firefox export CSV (`url,username,password,...`).
- [ ] Parse Safari export CSV (`Title,URL,Username,Password,Notes`).
- [ ] Handle quoted commas, quotes, and newlines in CSV without crashing.
- [ ] Detect duplicates matching existing site + username in vault.
- [ ] Persist all imported credentials to `data/credentials.json` on disk.
- [ ] Zero lint regressions (`npx eslint .`).
