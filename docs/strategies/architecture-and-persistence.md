---
title: "Architecture & Storage Strategy"
category: strategy
tags: [architecture, express, persistence, encryption, zero-db]
last_updated: 2026-10-24
---

# Architecture & Storage Strategy

## 1. System Topology

Jot is designed as an ultra-lightweight, zero-database, self-contained personal note and credential management application.

```
┌────────────────────────────────────────────────────────┐
│                   Client (Browser)                     │
│  - public/index.html (Semantic HTML5 shell)            │
│  - public/styles.css (Vanilla CSS Design System)       │
│  - public/app.js     (State, Reactive UI, API Sync)   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON API (Bearer Auth)
┌───────────────────────────▼────────────────────────────┐
│               Node.js / Express (server.js)            │
│  - Static Asset Delivery                               │
│  - CRUD endpoints for /api/notes and /api/credentials  │
│  - AES-256-GCM Encryption / Decryption at rest         │
│  - Self-update git endpoint (/api/update)              │
└───────────────────────────┬────────────────────────────┘
                            │ Atomic Filesystem I/O
┌───────────────────────────▼────────────────────────────┐
│                    data/ Directory                     │
│  - notes.json         (Notes storage)                  │
│  - credentials.json   (Encrypted credentials storage)  │
│  - .jot-secret.key    (AES Master key if env unset)    │
└────────────────────────────────────────────────────────┘
```

## 2. Core Architectural Invariants

### 2.1 Zero External Database
- All persistent state is strictly maintained in `data/notes.json` and `data/credentials.json`.
- Do not introduce SQLite, PostgreSQL, MongoDB, Prisma, or any ORM.

### 2.2 Atomic Write Pattern
Disk writes must never write directly to live JSON files. `server.js` enforces atomic writes:
1. Serialize JSON payload.
2. Write to a temporary file: `data/<file>.tmp`.
3. Atomically rename: `fs.renameSync(tempPath, finalPath)`.

### 2.3 Corruption Quarantine Defense
When reading JSON files from disk:
- If JSON parsing fails, the server **must not** silently overwrite the corrupt file with an empty array `[]`.
- Instead, the corrupted file is renamed to `data/<name>.corrupt-<timestamp>` for forensics, and the API returns HTTP 500 until manually resolved or restored.

### 2.4 Cryptographic Model
- **Encryption Algorithm**: AES-256-GCM.
- **Key Source**: Loaded from `process.env.JOT_SECRET_KEY`. If unset, `server.js` generates a persistent random 32-byte key at `data/.jot-secret.key` (with restricted permissions `0600`).
- **Encrypted Fields**:
  - `password`: Encrypted at rest.
  - `notes`: Encrypted at rest for secure notes.
  - `cardNumber` and `cvv`: Encrypted at rest for payment credentials.
- **Payload Format**: Ciphertext strings are stored with IV and authentication tag: `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`.
- **Client Master Password**: The client browser verifies vault unlocks using a SHA-256 hash stored in `localStorage` under `jot_vault_master_hash`. Plaintext master passwords are never transmitted over HTTP.

## 3. API Contract & Soft-Delete Lifecycle

- Every `/api` endpoint requires `Authorization: Bearer <token>` when `JOT_API_TOKEN` is configured.
- **Soft-Delete**:
  - `DELETE /api/notes/:id` $\rightarrow$ marks item as `{ deleted: true, deletedAt: ISOString }`.
  - `DELETE /api/credentials/:id` $\rightarrow$ marks credential as `{ deleted: true, deletedAt: ISOString }`.
- **Restoration**:
  - `POST /api/notes/:id/restore` and `POST /api/credentials/:id/restore`.
- **Permanent Deletion**:
  - Appending query parameter `?permanent=1` permanently removes the item from disk.
  - `DELETE /api/notes/trash` and `DELETE /api/credentials/trash` permanently purge all trashed items.
