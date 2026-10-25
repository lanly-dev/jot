# Jot — User How-To & Feature Guide

A complete guide on using Jot for note-taking, encrypted credential storage, and seamless migration from browser password managers.

---

## Table of Contents

1. [Importing Passwords from Browsers & Password Managers](#1-importing-passwords-from-browsers--password-managers)
   - [Google Chrome](#google-chrome)
   - [Microsoft Edge](#microsoft-edge)
   - [Mozilla Firefox](#mozilla-firefox)
   - [Apple Safari](#apple-safari-macos--ios)
   - [Bitwarden](#bitwarden)
   - [Importing the CSV into Jot](#importing-the-csv-into-jot)
   - [Security Advice on Plaintext CSVs](#security-advice-on-plaintext-csvs)
2. [Managing Your Encrypted Vault](#2-managing-your-encrypted-vault)
   - [Setting Up a Master Password](#setting-up-a-master-password)
   - [Adding Credentials (Logins, Cards, Secure Notes)](#adding-credentials)
   - [Unlocking and Locking the Vault](#unlocking-and-locking-the-vault)
   - [Auto-Lock Timer Settings](#auto-lock-timer-settings)
3. [Managing Notes & Tasks](#3-managing-notes--tasks)
   - [Creating & Formatting Notes](#creating--formatting-notes)
   - [Checklists & Spreadsheets](#checklists--spreadsheets)
   - [Pinning & Color Coding](#pinning--color-coding)
   - [Tags, Search & Filters](#tags-search--filters)
   - [Archiving & Trash Recovery](#archiving--trash-recovery)
4. [Backup & Restore (Full Data Parity)](#4-backup--restore-full-data-parity)
   - [Exporting Backups](#exporting-backups)
   - [Restoring from Backup](#restoring-from-backup)
5. [Keyboard Shortcuts & Quick Actions](#5-keyboard-shortcuts--quick-actions)

---

## 1. Importing Passwords from Browsers & Password Managers

Jot allows you to migrate your existing passwords from popular web browsers and password managers into Jot's AES-256-GCM encrypted vault in seconds with zero external dependencies.

### Google Chrome
1. In Chrome, enter `chrome://password-manager/settings` in your URL address bar.
2. Under **Export passwords**, click **Download file**.
3. Authenticate with your Windows PIN, fingerprint, or operating system password when prompted.
4. Save the `.csv` file to your computer.

### Microsoft Edge
1. In Edge, open `edge://wallet/passwords` (or go to **Settings** $\rightarrow$ **Profiles** $\rightarrow$ **Passwords**).
2. Click the **`...` (More actions)** menu next to the search bar.
3. Select **Export passwords**.
4. Confirm and enter your Windows PIN or password to download the `.csv` file.

### Mozilla Firefox
1. In Firefox, enter `about:logins` in the URL bar (or open the menu `☰` $\rightarrow$ **Passwords**).
2. Click the **`...` menu** at the top right of the logins column.
3. Select **Export Logins...**.
4. Acknowledge the security prompt and enter your OS credentials to save the `.csv` file.

### Apple Safari (macOS / iOS)
1. In Safari on macOS, open **Settings** (or **Preferences**) $\rightarrow$ **Passwords**.
2. Authenticate with Touch ID or your Mac user password.
3. Select **File** $\rightarrow$ **Export** $\rightarrow$ **Passwords...** (or click the `...` menu button).
4. Save the `.csv` file.

### Bitwarden
1. Log into your Bitwarden web vault or desktop app.
2. Navigate to **Settings** $\rightarrow$ **Export vault**.
3. Under **File format**, select **`.csv`**.
4. Enter your master password and click **Export vault**.

---

### Importing the CSV into Jot

1. In Jot, switch to the **🔒 Vault** tab.
2. Click the **📥 Import CSV** button in the vault action bar (or click **Import from Browser CSV** if your vault is empty).
   > *Note: You can also click the general **Import** button in the bottom-left footer and select your `.csv` file directly.*
3. Select your exported `.csv` file.
4. The **Import Confirmation** modal will display:
   - **Detected Format**: Shows your detected format tag (e.g. `Chrome / Edge`, `Safari`, `Firefox`, `Bitwarden`).
   - **Preview Table**: Displays a preview of incoming records with masked passwords (`••••••••`) and clean domain URLs.
   - **Duplicate Detection**: Identifies whether items are brand new or duplicate entries.
5. If your vault is locked, enter your Jot **Master Password** in the authorization field.
6. Click **Confirm & Import**. The credentials will be encrypted with AES-256-GCM and saved to your vault immediately.

> [!WARNING]
> **Important Security Tip**: Browser-exported CSV files are stored in **unencrypted plain text** on your disk. Once your passwords are imported into Jot, **permanently delete the CSV file** (Shift + Delete on Windows) and empty your Recycle Bin/Trash.

---

## 2. Managing Your Encrypted Vault

Jot features a zero-knowledge, zero-retention client-encrypted vault. Sensitive fields (`password`, `notes`, `cardNumber`, `cvv`) are encrypted with AES-256-GCM at rest and only held in client memory while the vault remains unlocked.

### Setting Up a Master Password
1. Navigate to the **🔒 Vault** tab.
2. If this is your first time, click **Set Up Vault**.
3. Choose a strong Master Password. 
4. Confirm your password and submit.

> [!IMPORTANT]
> Your Master Password is used directly to derive cryptographic keys. Jot does not store your master password in plain text. If you lose your Master Password, there is no reset mechanism.

### Adding Credentials
Click **+ New Item** in the vault header to store:
- **Login**: Website name, URL, username/email, password, and private notes.
- **Credit Card**: Cardholder name, card number, expiration date, CVV, and notes.
- **Secure Note**: Encrypted title and multi-line private notes.

### Unlocking and Locking the Vault
- **Unlocking**: Enter your Master Password on the lock screen.
- **Manual Lock**: Click **🔒 Lock Vault** in the vault action bar at any time. All decrypted credentials are immediately purged from client memory.

### Auto-Lock Timer Settings
Protect your vault when stepping away:
1. In the Vault view, locate the **Auto-Lock** dropdown.
2. Choose your preferred timeout:
   - `30 seconds`
   - `1 minute`
   - `5 minutes` *(default)*
   - `15 minutes`
   - `30 minutes`
   - `1 hour`
   - `Never`
3. If no mouse, touch, or keyboard activity is detected within the chosen timeframe, the vault automatically locks and purges memory.

---

## 3. Managing Notes & Tasks

### Creating & Formatting Notes
- Click **+ New Note** or click inside the top note creation box.
- Notes support rich colors, custom tags, pinned status, and format types.

### Checklists & Spreadsheets
- **Checklist Mode**: Click the checkbox icon to turn your note into an interactive to-do list with strike-through completion.
- **Spreadsheet Mode**: Click the spreadsheet icon to create an interactive tabular draft with customizable columns and rows.

### Pinning & Color Coding
- Click the **Pin 📌** icon to keep critical notes at the top of your workspace.
- Select from Jot's pastel color palette to color-code your notes for quick visual identification.

### Tags, Search & Filters
- Add tags starting with `#` (e.g. `#work`, `#ideas`, `#shopping`) to organize notes.
- Use the **Search bar** to perform instant real-time filtering across titles, note content, and tags.
- Click any tag badge in the sidebar or note card to filter notes by that specific tag.

### Archiving & Trash Recovery
- **Archive**: Click the archive box icon on any note to hide it from your active view while keeping it searchable in the **Archive** view.
- **Trash**: Deleted notes are moved to the **Trash** tab first, preventing accidental data loss. You can restore notes or permanently purge them.

---

## 4. Backup & Restore (Full Data Parity)

Jot provides full backup parity ensuring your notes and vault items are never lost.

### Exporting Backups
Click the **Export** button in the bottom-left footer:
- **If Vault is Unlocked**: Automatically generates and downloads `jot-backup-YYYY-MM-DD.json` containing all notes and decrypted credentials.
- **If Vault is Locked**: A backup options dialog gives you two choices:
  1. **Notes Only**: Immediately exports notes without touching the locked vault.
  2. **Full Backup (Notes & Vault)**: Prompts for your Master Password. Once authorized, it exports a complete backup of both notes and vault items.

### Restoring from Backup
1. Click the **Import** button in the bottom-left footer.
2. Select your `jot-backup-*.json` file.
3. Review the import summary (notes to add, notes to update, credentials count).
4. If the backup contains vault credentials and the vault is locked, enter your Master Password.
5. Click **Confirm & Import** to atomically merge the backup to your server disk.

---

## 5. Keyboard Shortcuts & Quick Actions

| Shortcut / Action | Description |
| :--- | :--- |
| `Ctrl + N` / `Cmd + N` | Create a new note |
| `Ctrl + F` / `Cmd + F` | Focus the search input |
| `Escape` | Close active modals or exit note editor |
| `Enter` (in checklist) | Create a new checklist item |
| `Drag & Drop` (files) | Attach supported images or export backups |
| Click masked password (`••••••••`) | Instantly copies password to clipboard |

---

## 6. Testing & CLI Scripts

For testing and development, Jot includes CLI helper scripts in the [`scripts/`](scripts/) directory:

### Generating Sample Browser Password CSVs
Generate test CSV files matching real browser formats (Chrome, Safari, Firefox, Bitwarden):

```bash
# Generate all 4 sample formats (saved to data/samples/)
node scripts/generate-sample-csv.js all

# Or generate a specific format:
node scripts/generate-sample-csv.js chrome
node scripts/generate-sample-csv.js safari
node scripts/generate-sample-csv.js firefox
node scripts/generate-sample-csv.js bitwarden
```

### Direct CLI CSV Import
Import any password CSV directly into your running Jot server from the command line:

```bash
node scripts/import-csv.js data/samples/chrome-passwords.csv
```
Optional arguments for remote instances or token-protected servers:
```bash
node scripts/import-csv.js <path-to-csv> [server-url] [api-token]
```

