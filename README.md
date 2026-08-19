# Jot | A Cute & Colorful Space for Your Thoughts ✏️✨

Welcome to **Jot**, a delightful, pastel-colored note-taking application designed to organize your thoughts with color and joy.

Jot is built as a lightweight full-stack application using Vanilla HTML, CSS, JavaScript, and a Node.js/Express backend that persists your notes safely onto local storage.

---

## 🌸 Key Features

* **Sweet Pastel Aesthetics:** Curated color palettes, responsive cards with physical tape design details, and smooth micro-animations.
* **Persistent Disk Database:** Saves your notes to a local JSON file (`data/notes.json`) on your computer via REST API endpoints.
* **Full Note Operations:** Create, edit, and permanently delete notes (with a playful "poof" animation).
* **Organize & Prioritize:** Pin important notes to the top of your board, archive notes you are finished with, and search by keywords or tags.
* **Dynamic Toast Notifications:** Colorful bottom-right toast alerts keep you informed when notes are saved, updated, or deleted.
* **Bulletproof Offline Fallback:** If the backend server is stopped, Jot automatically saves your notes in the browser's `localStorage` and alerts you with warning toasts, syncing back smoothly when you are ready.
* **Credential Encryption at Rest:** Sensitive vault fields (`password` & `notes`) are encrypted with AES-256-GCM before they are written to disk, so `data/credentials.json` never contains plaintext secrets. Decryption happens automatically on read, so the rest of the app works unchanged.

---

## 🚀 How to Run the App

Follow these simple steps to get Jot running on your local machine:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 14 or higher recommended).

### 1. Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### 2. Start the Server
Start the Express backend server by running:
```bash
npm start
```

### 3. Open in Browser
Once the server starts, open your web browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔐 Credential Encryption

Vault credentials (the `password` and `notes` fields) are encrypted at rest with **AES-256-GCM** using Node's built-in Web Crypto API (`crypto.subtle`). What you see in `data/credentials.json` is ciphertext, never plaintext — the server decrypts transparently before responding to the API, so the frontend works exactly as before.

* **Key handling:** On first run the server generates a random 32‑byte key and stores it in `data/.jot-secret.key` (this directory is git-ignored). To keep the key out of the repo entirely, set the `JOT_SECRET_KEY` environment variable to a base64‑encoded 32‑byte key instead:
  ```bash
  # generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  JOT_SECRET_KEY=<base64-key> npm start
  ```
* **Backwards compatible:** Credentials saved before encryption existed are automatically re-encrypted on the next server boot.
* **Recovery warning:** If you lose the key (and you aren't using `JOT_SECRET_KEY`), existing encrypted credentials cannot be decrypted. Back up `data/.jot-secret.key` along with your data.

---

## 📁 Project Structure

```text
jot/
├── data/
│   └── notes.json       # Auto-generated database storage file
├── app.js               # Frontend note engine & sync coordinator
├── index.html           # Main layout structure
├── package.json         # Dependencies & scripts configuration
├── server.js            # Express server & REST API backend
└── styles.css           # Styling rules & custom keyframe animations
```

---

*Handcrafted with 💖 and pastel sparkles.*
