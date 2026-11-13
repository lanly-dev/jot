---
title: "Security Review Hardening — Fail-Closed Decrypt, Health Probe, Safe IDs, Vault KDF"
date: 2026-11-12
category: security-architecture
tags: [security, encryption, fail-closed, healthcheck, xss, pbkdf2, docker, lockfile]
status: completed
---

# Solution: Security Review Hardening (2026-11-12)

A full review of `main` produced three High findings, four Mediums, and a set of Lows. All but CORS policy and CI/test infrastructure were fixed the same day (commits `dc60f33e` and `c2acebb1`). This doc records the invariants so they are not reintroduced.

## 1. High findings

### 1.1 Decryption must fail closed — never return the ciphertext

`decryptCredentialValue` used to return the raw stored value when AES-GCM decryption failed. Booting with the wrong key therefore "worked": every password displayed as its `ENC:` blob, and any later edit re-encrypted that blob — permanently destroying the secret even for the correct key.

**Invariant:** decryption failure throws. Reads answer 500, all credential writes are blocked, and nothing is persisted. The stored key file (`data/.jot-secret.key`) gets the same 32-byte length validation as `JOT_SECRET_KEY`. Regression shape: boot with key B against a vault written with key A → GET/PUT/POST all 500; restore key A → data intact.

### 1.2 Healthchecks must not depend on the API token

The Dockerfile/Compose healthchecks probed `GET /api/notes` expecting 200 — permanently "unhealthy" whenever `JOT_API_TOKEN` was set (401).

**Invariant:** unauthenticated `GET /health` returns only `{ status: 'ok', timestamp }`. Healthchecks probe `/health`, never an `/api` route.

### 1.3 Client-supplied record IDs are untrusted input

The server stored client-provided note/credential IDs verbatim, and the frontend interpolated IDs into HTML attributes unescaped — a crafted ID (`x"><svg onload=…>`) was a stored-XSS chain.

**Invariant:** the server normalizes every incoming ID through `safeId()` (pattern `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`, otherwise a fresh UUID) on create and import for both notes and credentials; the UI additionally escapes IDs in attributes and sanitizes note colors client-side.

## 2. Medium findings

### 2.1 The lockfile is a build input, not a local artifact

`package-lock.json` was gitignored while the Dockerfile ran `npm ci` — clean clones could not build; the maintainer's machine only worked because of an untracked local copy.

**Invariant:** `package-lock.json` is committed. Verify with `npm ci` in a directory containing only `package.json` + `package-lock.json`.

### 2.2 Body limit must fit a real backup

`express.json()` defaulted to ~100 KB; a full `/api/import` of a real backup answered 413.

**Fix:** `express.json({ limit: '10mb' })`. Verified with 150 KB and 2 MB imports.

### 2.3 The master password is a screen lock — say so, and store its verifier properly

The master password gates rendering in one browser; the server never sees it, and the API token is the real data boundary. Two obligations follow:

- **Honesty:** UI copy and HOW-TO describe it as a per-browser screen lock, never as vault encryption (HOW-TO previously claimed it "derives cryptographic keys" — false).
- **Verifier hygiene:** the stored verifier is PBKDF2-SHA256, 310,000 iterations, per-vault random salt (`jot_vault_master_kdf` in localStorage next to the hash). Legacy unsalted SHA-256 verifiers keep working once and are transparently re-stored as PBKDF2 on the next successful unlock (`verifyAndUpgradeMasterPassword`). New vaults require 8+ characters.

Related: the extension's duplicate check originally downloaded the entire decrypted vault to compare one login. It now uses `POST /api/credentials/lookup` (see `browser-extension-password-capture.md`, section 4).

## 3. Low findings (all fixed)

- **Token comparison:** SHA-256 both sides and `timingSafeEqual` the digests (fixed length, no length leak, no throw).
- **Write races:** credential handlers do whole-file read-modify-write with awaits in between; concurrent UI + extension saves could drop each other. `/api/credentials` and `/api/import` requests are serialized (`credentialSerializer`). Note handlers are synchronous and cannot interleave. Test: 12 parallel POSTs → 12 records.
- **Self-update is opt-in:** `/api/update/*` answers 403 unless `JOT_ALLOW_SELF_UPDATE=1`. The Proxmox installer writes `JOT_ALLOW_SELF_UPDATE=1` into the generated `.env` explicitly.
- **Key file permissions:** `.jot-secret.key` is written with mode 0600 and re-tightened (`chmod 0600`) on boot when it already exists.
- **Boot migration precision:** the plaintext-migration check ignores empty-string sensitive fields, so an all-encrypted vault is no longer rewritten on every boot.
- **No require-time side effects:** `scripts/package-extension.js` only writes the zip when run as main; `require()` just exports `createZipArchive`.
- **Password generator:** 🎲 buttons in the credential creator and edit modal generate a 20-character password (all classes guaranteed, ambiguous glyphs excluded, `crypto.getRandomValues` + Fisher-Yates).

## 4. Deliberately not done

- **CORS** remains `Access-Control-Allow-Origin: *` (skipped by decision; the API token is the gate, and the extension bypasses CORS via host permissions).
- **No CI/test suite** was added (skipped by decision). ESLint is at 0 errors / 0 warnings repo-wide and should stay there.

## 5. Verification record

- Boot suite against the fixed server: token 401/200 behavior, `/health` 200, lookup none/exact/update + localhost port matching + no secret in the response, 12-way concurrent saves, 150 KB / 2 MB imports, self-update 403 by default and functional with `=1`, wrong-key 500s with data intact after key restore, no vault rewrite on idle reboot, key file 600 on creation and after loosening + reboot.
- KDF harness (functions extracted from `public/app.js`, run in Node): PBKDF2 set/verify, per-vault salt uniqueness, legacy verify + in-place upgrade, generator class/length/glyph checks over 300 samples.
- Clean-room `npm ci --omit=dev` from committed files only.
