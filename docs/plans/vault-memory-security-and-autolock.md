# Implementation Plan: Vault Memory Security & Inactivity Auto-Lock

## Problem & Threat Model
1. **Memory Retention Vulnerability**: When the vault is locked (`lockVault()`), DOM nodes are cleared, but the global `credentials` array in `public/app.js` retains all decrypted passwords, card numbers, and secure notes in memory. Anyone with browser access can open DevTools and read `credentials` directly.
2. **Eager Pre-Loading on Boot**: On app initialization (`init()`), `fetchCredentials()` was called eagerly, populating memory before the master password was ever entered.
3. **No Inactivity Auto-Lock**: An unlocked vault remains open indefinitely if the user walks away from their computer or switches tabs.

## Proposed Solution
1. **Zero-Retention on Lock**:
   - In `lockVault()`: Set `credentials = []` to completely purge decrypted credentials from heap memory.
   - Stop and clear any active auto-lock timers.
2. **Just-In-Time Fetch on Unlock**:
   - Remove eager `fetchCredentials()` from `init()`.
   - In `handleVaultUnlockFormSubmit()`: Once the master password hash is verified, `await fetchCredentials()` before rendering.
3. **Inactivity Auto-Lock System**:
   - Add a 10-minute inactivity timer (`VAULT_AUTO_LOCK_TIMEOUT_MS = 10 * 60 * 1000`).
   - Listen for user activity events (`mousedown`, `keydown`, `touchstart`, `scroll`) with a 5-second throttle to reset the timer while `vaultUnlocked` is true.
   - Listen to `visibilitychange`: Track timestamp when the tab is hidden. If the tab has been in the background for longer than the auto-lock threshold upon return, immediately lock the vault and show a notification toast.

## File Touchpoints
- `public/app.js`: Update `init()`, `handleVaultUnlockFormSubmit()`, `lockVault()`, and add inactivity/visibility listeners.

## Verification Checklist
- [ ] On initial page load with locked vault: `window.credentials` / `credentials` in memory is `[]`.
- [ ] Entering valid master password fetches credentials and renders them.
- [ ] Clicking "Lock" clears `credentials` to `[]` and clears DOM.
- [ ] Simulating inactivity timer locks the vault and shows "Vault auto-locked due to inactivity 🔒".
- [ ] Hiding tab for past threshold and refocusing triggers auto-lock.
- [ ] Run `npm run efix` to ensure no lint regressions.
