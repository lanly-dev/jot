# Jot

Jot is a small full-stack web application for managing notes and encrypted credentials. The server is implemented in Node.js with Express, and the frontend is a static Vanilla JavaScript UI served from the project root.

The application stores data as JSON files on disk rather than using a dedicated database. Notes and credentials are persisted in the local `data/` directory and exposed through REST endpoints.

---

## Overview

- Frontend: vanilla HTML, CSS, and JavaScript
- Backend: Express 5 on Node.js
- Persistence: filesystem JSON storage under `data/`
- Encryption: AES-256-GCM for sensitive credential fields at rest
- Local dev: Node + nodemon with live-reload support
- Containerized deployment: Docker and Docker Compose

The backend serves the static frontend and exposes the following API surface:

- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`
- `GET /api/credentials`
- `POST /api/credentials`
- `PUT /api/credentials/:id`
- `DELETE /api/credentials/:id`

---

## Runtime requirements

- Node.js 22 LTS or newer recommended
- npm
- Optional: Docker + Docker Compose for containerized deployment

The app uses the Web Crypto API for encryption and the Express server listens on port 3000 by default.

---

## Local development

Install dependencies:

```bash
npm install
```

Run the app in development mode:

```bash
npm run dev
```

Run the app in production mode:

```bash
npm start
```

The server binds to `http://localhost:3000` unless `PORT` is overridden.

When `NODE_ENV` is not set to `production`, the server enables `livereload` and `connect-livereload` for browser refresh during local development.

---

## Project structure

```text
jot/
├── app.js                        # Frontend logic and state management
├── index.html                    # Shell UI structure
├── server.js                     # Express API and persistence layer
├── styles.css                    # Frontend styling
├── package.json                  # Scripts and dependencies
├── Dockerfile                    # Container image definition
├── docker-compose.yml            # Container orchestration config
├── install-jot-ve.sh             # Proxmox LXC helper script
├── update-jot.sh                 # Proxmox update helper (pull + restart)
├── data/
│   ├── notes.json                # Notes storage
│   ├── credentials.json          # Credential storage, encrypted at rest
│   └── .jot-secret.key           # AES key used for credential encryption
├── .gitignore
├── .dockerignore
├── .env.example
└── README.md
```

---

## Storage model

The app does not use a database server. Instead, it writes JSON files directly to disk.

### Notes

`data/notes.json` stores note records as an array. Each note includes fields such as:

- `id`
- `title`
- `content`
- `color`
- `tags`
- `pinned`
- `archived`
- `type`
- `reminderAt`
- `spreadsheetData`
- `createdAt`

The backend initializes a sample note set if the file does not exist.

### Credentials

`data/credentials.json` stores credential entries as an array. Sensitive values are encrypted before being written to disk.

The following fields are encrypted when persisted:

- `password`
- `notes`

The server transparently decrypts values when `GET /api/credentials` is called, so the frontend can work with the decrypted payload without special handling.

---

## Encryption design

Credential encryption is implemented using the Node.js Web Crypto API with AES-256-GCM.

Behavior:

- A 32-byte key is loaded from `JOT_SECRET_KEY` if provided.
- Otherwise the server generates one and stores it in `data/.jot-secret.key`.
- Data is stored with an `ENC:` prefix followed by base64-encoded IV + ciphertext.
- Decryption is performed automatically on read.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Express listen port |
| `NODE_ENV` | unset | Controls dev-only behavior such as live reload |
| `JOT_SECRET_KEY` | unset | Base64-encoded 32-byte AES key for portable credential encryption |

Important operational note: if the key file is lost and `JOT_SECRET_KEY` is not configured, encrypted credential data cannot be recovered.

---

## API behavior

### Notes API

`GET /api/notes`
- Reads and returns all notes from `data/notes.json`

`POST /api/notes`
- Accepts a note payload and inserts it at the front of the array
- Normalizes fields such as note type and spreadsheet data

`PUT /api/notes/:id`
- Updates an existing note by ID
- Preserves unspecified fields unless a replacement is provided

`DELETE /api/notes/:id`
- Removes the note by ID and rewrites the JSON file

### Credentials API

`GET /api/credentials`
- Reads the encrypted file, decrypts sensitive values, and returns the result

`POST /api/credentials`
- Stores a new credential with encrypted sensitive fields

`PUT /api/credentials/:id`
- Updates the credential record and re-encrypts stored sensitive fields

`DELETE /api/credentials/:id`
- Removes the credential from the file

---

## Docker and deployment

The repository includes a Docker image and Compose configuration for running the app in a container.

### Basic startup

```bash
docker compose up -d
```

Check service health:

```bash
docker compose ps
docker compose logs -f
```

The application is exposed on port 3000 by default; this can be adjusted in `docker-compose.yml`.

### Persistent data

The Compose configuration mounts a named Docker volume at `/app/data` so that the JSON database and encryption key survive container restarts.

### Proxmox deployment

The project also includes `install-jot-ve.sh`, a helper script designed to bootstrap an unprivileged LXC container on Proxmox and run the app via Node directly instead of Docker. This keeps the runtime environment light and avoids a Docker daemon dependency.

One-line deployment from a Proxmox VE host as root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/lanly-dev/jot/main/install-jot-ve.sh)"
```

**Updating** — a companion `update-jot.sh` pulls the latest code, reinstalls
production dependencies, and restarts the systemd service inside the existing
Jot container. It auto-detects the container by name (`jot`) and is data-safe
(never touches your `.env` or `data/`):

```bash
sudo bash update-jot.sh            # auto-detect the "jot" container
sudo bash update-jot.sh 110        # or target a specific container ID
```

---

## Security considerations

- Credential secrets are encrypted at rest using AES-256-GCM.
- The encryption key is stored outside the repository in `data/.jot-secret.key` unless `JOT_SECRET_KEY` is explicitly set.
- The app is not a production-grade identity system; it is a local filesystem-backed tool intended for personal or low-risk usage.
- Back up the data directory and key file before changing deployment environments.

---

## Useful commands

```bash
npm install
npm run dev
npm start
npm run efix
```

`npm run efix` runs ESLint with autofix enabled.

---

## Notes

This project is intentionally lightweight and runs without a database service. Its reliability depends on the integrity of the local filesystem and the secrecy of the encryption key. For production use with shared infrastructure, additional hardening such as authenticated access control, external secret management, and backup automation would be recommended.