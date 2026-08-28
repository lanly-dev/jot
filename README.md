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
* **Live Save/Sync Indicator:** A status pill in the editor shows exactly when a note has been saved & synced to the server (and warns with a 🔴 "not synced / offline" state whenever the server can't be reached).
* **Credential Encryption at Rest:** Sensitive vault fields (`password` & `notes`) are encrypted with AES-256-GCM before they are written to disk, so `data/credentials.json` never contains plaintext secrets. Decryption happens automatically on read, so the rest of the app works unchanged.

---

## 🚀 How to Run the App

Follow these simple steps to get Jot running on your local machine:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 22 LTS or higher is recommended — the app uses the Web Crypto API).

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

## 🐳 Docker Deployment

A multi-stage `Dockerfile` and `docker-compose.yml` are included for easy
deployment — ideal for **Proxmox VE**, Portainer, or any other Docker host.

### Quick Start

```bash
# Build & start with a single command
docker compose up -d

# Check health
docker compose ps

# View logs
docker compose logs -f
```

Then open `http://<your-host-ip>:3000` in your browser.

### Proxmox VE Deployment

The most common Proxmox workflow is an **LXC container** running Docker:

1. **Create an LXC container**
   - Template: *Ubuntu 22.04* (or Debian 12)
   - Disk: ≥ 4 GB · RAM: ≥ 512 MB · CPU: 1 core
   - Enable *Nesting* and *Keyctl* in the container options.

2. **Install Docker inside the container**

   ```bash
   apt update && apt install -y docker.io docker-compose-v2
   ```

3. **Copy the project files** to the container (e.g. via `scp` or `rsync`).

4. **(Optional)** Create a `.env` file for environment overrides:

   ```bash
   cp .env.example .env
   # Edit .env if you want a custom port or a pre-generated JOT_SECRET_KEY
   ```

5. **Start the app**

   ```bash
   docker compose up -d
   ```

   The server listens on port **3000** inside the container; adjust the
   `ports` mapping in `docker-compose.yml` if you want a different host port.

6. **Access** `http://<LXC-IP>:3000` from your browser.

### ⚡ One-Command Helper Script

For a fully automated, `pct`-driven install (the same idea as the
[community "Proxmox VE Helper Scripts"](https://github.com/community-scripts/ProxmoxVE-scripts)),
run [`install-jot-ve.sh`](install-jot-ve.sh) **as root on the Proxmox host**:

```bash
# From the Proxmox node (fetches the script from this repo):
bash -c "$(curl -fsSL https://raw.githubusercontent.com/lanly-dev/jot/main/install-jot-ve.sh)"

# Or run it straight from your checkout:
sudo bash install-jot-ve.sh
```

It will:

1. Download the `debian-12-standard` template if missing.
2. Prompt for (or auto-pick) a free container ID and storage, then create an
   **unprivileged LXC** container.
3. Install **Node.js 22 LTS** inside, clone this repo, install production
   dependencies, generate a fresh `JOT_SECRET_KEY`, and run Jot **natively**
   as a `systemd` service — **no Docker daemon**, so overhead stays minimal.
4. Print the access URL, e.g. `http://<LXC-IP>:3000`.

Customize it via environment variables before running:
`CT_ID=130 RAM_SIZE=4096 DISK_SIZE=8 CORE_COUNT=4 sudo bash install-jot-ve.sh`

> **Why native instead of Docker?** Jot is a single light Express app, so running
> it directly under Node keeps the container tiny and avoids a Docker daemon.
> The app is managed by systemd (`systemctl status jot`) and restarts
> automatically.

### Environment Variables

| Variable          | Default | Description |
|-------------------|---------|-------------|
| `PORT`            | `3000`  | Port the Express server listens on |
| `NODE_ENV`        | `production` | Disables dev-only live-reload |
| `JOT_SECRET_KEY`  | *(empty)* | Base64-encoded 32-byte AES-256-GCM key. Set this for portable encrypted credentials. If unset, a random key is generated inside the container on first start. |

> **⚠️ Important:** When `JOT_SECRET_KEY` is not set, a random encryption key is
> generated inside the container and stored in `data/.jot-secret.key`. Deleting
> the container **without** a volume backup will permanently lock encrypted
> credentials. Either set `JOT_SECRET_KEY` explicitly or keep the named volume
> (`jot-data`) — docker-compose preserves it across restarts automatically.

### Data Persistence

`docker-compose.yml` mounts a named volume (`jot-data`) at `/app/data`, so
your notes, credentials, and encryption key survive container restarts,
upgrades, and `docker compose down`.

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
├── data/                          # Auto-generated database (git-ignored)
│   ├── notes.json                 # Notes storage
│   ├── credentials.json           # Encrypted credentials storage
│   └── .jot-secret.key            # AES-256-GCM encryption key
├── Dockerfile                     # Multi-stage Docker image build
├── docker-compose.yml             # One-command Docker deployment
├── install-jot-ve.sh              # Proxmox VE helper script (one-command LXC + Docker install)
├── .dockerignore                  # Docker build context exclusions
├── .env.example                   # Environment variable template
├── .gitignore
├── app.js                         # Frontend note engine & sync coordinator
├── index.html                     # Main layout structure
├── package.json                   # Dependencies & scripts
├── server.js                      # Express server & REST API backend
└── styles.css                     # Styling rules & keyframe animations
```

---

*Handcrafted with 💖 and pastel sparkles.*
