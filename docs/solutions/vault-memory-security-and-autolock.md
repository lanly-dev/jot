---
title: "Vault Memory Security & Inactivity Auto-Lock"
date: 2026-10-24
category: security-architecture
tags: [vault, security, memory-safety, zero-retention, auto-lock, idle-detection, visibility-change]
status: completed
---

# Solution: Vault Memory Security & Inactivity Auto-Lock

## 1. Problem Statement

Prior to this solution, Jot's Vault suffered from two critical security vulnerabilities and an operational risk:

1. **Memory Retention Vulnerability**: When the vault was locked manually (`lockVault()`), DOM nodes were emptied, but the global `credentials` array in `public/app.js` retained all decrypted passwords, credit card numbers, and secure notes in heap memory. Anyone with browser access could open DevTools console and inspect `credentials` directly.
2. **Eager Boot Pre-Loading**: During app initialization (`init()`), `fetchCredentials()` was called eagerly before the user ever entered their master password, exposing credentials in memory on boot.
3. **No Inactivity or Background Auto-Lock**: If a user walked away from their desk or switched browser tabs, the unlocked vault remained open indefinitely.

---

## 2. Root Cause Analysis

- **`init()` eager fetch**: `public/app.js` line 268 invoked `fetchCredentials()` unconditionally alongside `fetchNotes()`.
- **`lockVault()` omitted memory purge**: `lockVault()` only toggled UI classes and cleared `credentialsGrid.innerHTML`, but did not reset `credentials = []`.
- **Missing activity listeners & timer loop**: There was no inactivity tracking mechanism, activity reset listener, or `visibilitychange` handler attached to the browser tab lifecycle.

---

## 3. Key Decisions & Architecture

### 3.1 Zero-Retention on Lock & Just-In-Time (JIT) Fetch on Unlock
- **Boot**: Removed `fetchCredentials()` from `init()`. The `credentials` state variable starts as empty `[]`.
- **Unlock**: In `handleVaultUnlockFormSubmit()`, once the master password hash is verified against `localStorage.getItem(VAULT_HASH_KEY)`, `await fetchCredentials()` is called just-in-time and the auto-lock timer starts.
- **Lock**: In `lockVault(reason)`, `credentials = []` immediately purges all decrypted credentials from JavaScript memory, active timers are cleared (`stopVaultAutoLockTimer()`), creator drafts are collapsed (`closeCredentialModal()`), and edit modals are closed (`closeCredentialEditModal()`).

### 3.2 Dual-Layer Inactivity Auto-Lock System
Configured with a 10-minute timeout (`VAULT_AUTO_LOCK_TIMEOUT_MS = 10 * 60 * 1000`):

1. **Foreground Inactivity Timer**:
   - `resetVaultAutoLockTimer()` schedules a `setTimeout` for 10 minutes.
   - Throttled user activity listeners (`mousedown`, `keydown`, `touchstart`, `scroll` with a 5-second throttle) update `vaultLastActiveAt` and reset the timer.
   - If 10 minutes elapse without activity, `lockVault('timeout')` fires, locking the vault and alerting the user: `"Vault auto-locked due to inactivity 🔒"`.
2. **Background Tab & System Sleep Detection (`visibilitychange`)**:
   - When the user switches tabs or minimizes the window, `vaultTabHiddenAt = Date.now()` records the timestamp.
   - When the tab regains visibility, the elapsed background time (`Date.now() - vaultTabHiddenAt`) and wall-clock time since last activity (`Date.now() - vaultLastActiveAt`) are inspected.
   - If $\ge 10$ minutes have elapsed while hidden or during system sleep, the vault immediately locks before any sensitive data is rendered.

### 3.3 Focus Guarding on Lock
When auto-locking, `showVaultLockedState()` only focuses the master password input if the user is actively in Vault mode (`if (currentMode === 'vault') vaultUnlockPasswordInput.focus()`). This ensures background auto-locking does not steal keyboard focus while the user is actively typing in a note in Notes mode.

### 3.4 Unified CVV Input Formatter
Cleaned up inline regex replacements in `credentialCvvInput` and `credentialEditCvvInput` event listeners to consistently use `formatCvvInput()`, eliminating unused function linter warnings.

---

## 4. Verification & Results

- **Memory Security**: Verified that `credentials` remains `[]` on initial page load and is wiped to `[]` whenever the vault locks.
- **Auto-Lock Notification**: Verified that timeout locks trigger `showToast('Vault auto-locked due to inactivity 🔒')`.
- **Manual Lock**: Verified that manual lock triggers `showToast('Vault locked 🔒')`.
- **Linter**: Ran `npm run efix` — 0 errors, no lint regressions.
