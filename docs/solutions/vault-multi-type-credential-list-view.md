---
title: "Vault Multi-Type Credential List View & Mobile One-Liner"
date: 2026-10-24
category: ui-architecture
tags: [vault, credentials, multi-type, responsive, mobile-view, design-tokens]
status: completed
---

# Solution: Vault Multi-Type Credential List View & Mobile One-Liner

## 1. Problem Statement

Originally, the Vault was tailored solely to login credentials (Website, Username, Password). When support for multiple entry types (logins, payment cards, and secure notes) was introduced, several regressions and design mismatches emerged:

1. **Semantic Column Header Mismatch**: Viewing the "All" tab or "Trash" tab displayed headers titled `WEBSITE`, `USERNAME`, and `PASSWORD`, which made no sense for payment cards (cardholder, card number) or secure notes (note preview, note content).
2. **Dynamic Header Overwriting**: Edits directly to `index.html` table headers appeared to do nothing because `renderVault()` in `public/app.js` actively replaced `th.textContent` on every tab switch and re-render.
3. **Clumsy Mobile Layout**: On screens `<= 600px`, credentials were displayed as an unstyled two-row grid card, contrasting sharply with the clean, compact single-line layout of notes in mobile list view.
4. **Mismatched Form Padding & Input Borders**: Payment inputs retained default 2px borders, while login fields had zero borders. Furthermore, padding was inconsistent (`.5rem 0 0 0` on logins vs `.65rem .95rem` on note textareas).

---

## 2. Root Cause Analysis

- **`app.js` Header Dictionary**: `updateVaultTableHeaders()` and a duplicate block in `renderVault()` hardcoded `all: ['Website', 'Username', 'Password']`. Static HTML edits to `<th>` were overwritten every time the vault unlocked or filters changed.
- **Mobile Grid Definition**: In `public/styles.css`, an older media query forced `.credential-row` into a 2x2 CSS grid (`grid-template-areas: "site actions" "username password"`), rather than the single flex row used by `.notes-grid.list-view .note-card`.
- **Ad-hoc Input Rules**: Selectors for inputs had disparate padding declarations across `#credential-username`, `.creator-row-2 textarea`, and `.input-group input`.

---

## 3. Key Decisions & Architecture

### 3.1 Generalized Table Headers for Mixed Views
In `public/app.js`, `updateVaultTableHeaders(filter)` was updated to generalize mixed views and adapt to specific types:

| Filter Mode | Column 1 (`#th-cred-site`) | Column 2 (`#th-cred-username`) | Column 3 (`#th-cred-password`) | Column 4 (`#th-cred-actions`) |
| :--- | :--- | :--- | :--- | :--- |
| **All** (mixed) | `Item` | `Account` | `Details` | `Actions` |
| **Logins** | `Website` | `Username` | `Password` | `Actions` |
| **Payments** | `Brand / Store` | `Cardholder` | `Card Number` | `Actions` |
| **Notes** | `Title` | `Preview` | `Content` | `Actions` |
| **Trash** | `Item` | `Account` | `Details` | `Actions` |

The duplicate inline dictionary in `renderVault()` was removed, consolidating `updateVaultTableHeaders` as the single source of truth.

### 3.2 Desktop Table Card Styling Matching Note List View
- `.credentials-table-wrap` changed to `background-color: transparent; border: none; box-shadow: none;`.
- `.credentials-table` uses `border-collapse: separate; border-spacing: 0 0.5rem;`.
- Each `tr.credential-row` has `background-color: var(--cred-color); box-shadow: var(--card-shadow); border-radius: 5px;`.
- Borders (`2px solid var(--border-color)`) are set on `td` with corner radiuses on `:first-child` and `:last-child`.
- Action buttons hide by default on desktop (`opacity: 0`) and fade in on hover (`opacity: 1`), matching `.notes-grid.list-view .note-actions`.

### 3.3 Mobile View One-Liner Pattern (`<= 600px`)
Transformed mobile credentials into single horizontal flex cards matching the mobile note list view:
- **Card**: `display: flex; flex-direction: row; align-items: center; justify-content: space-between; min-height: 42px; border: 2px solid var(--border-color); border-radius: 5px;`.
- **Left (`.col-site`)**: Type icon (`🔑` / `💳` / `🔒`) + Item name (`font-weight: 700`, ellipsis).
- **Middle (`.col-username`)**: Muted secondary subtext (`font-size: 0.72rem; color: var(--text-muted); max-width: 90px; ellipsis;`).
- **Right (`.col-password` & `.col-actions`)**: Quick password copy button, open link, edit pencil, and trash can.
- **Tap Behavior**: Tapping anywhere on the row triggers `openCredentialEditModal(cred)`.

### 3.4 Unified Input Padding & Borderless Form Style
- Standardized `padding: 0.65rem 0.95rem;` across:
  - `.creator-row-1 input[type="text"]` (Title & Site)
  - `.creator-row-2 textarea` (Note body & Vault secret notes)
  - `#credential-username, #credential-password, #credential-edit-username, #credential-edit-password`
  - `.cred-fields-payment input`
- All password inputs in `.password-input-wrap` enforce `padding-right: 3rem;` to prevent text overlap with the reveal eye toggle button.
- Payment inputs are borderless: `.cred-fields-payment input { border: none; box-shadow: none; outline: none; }`.

---

## 4. Invariants & Gotchas for Future Agents

1. **Header Updates Must Occur in `app.js`**:
   Never update table column titles in `public/index.html` alone. Check `updateVaultTableHeaders(filter)` in `public/app.js` because it dynamically updates headers on every render.
2. **Do Not Hide `td` in Desktop Tables**:
   Hiding a single `<td>` with `display: none` inside a multi-column standard table shifts remaining `<td>` elements into incorrect columns. Column hiding should only happen in flex/grid mobile views.
3. **Password Reveal Button Clearance**:
   Always maintain `padding-right: 3rem;` on `.password-input-wrap input`.
4. **Lucide / Feather SVG Consistency**:
   Header stat counters must use `<span class="stat-pill">` containing an SVG vector rather than raw emoji characters.
