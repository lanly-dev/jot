# AGENT.md

## Purpose

This repository contains a lightweight full-stack note-taking app built with Node.js, Express, vanilla HTML/CSS/JavaScript, and local JSON persistence. The project is intentionally simple and filesystem-backed rather than database-backed.

## Project summary

- Frontend: static HTML/CSS/JS served from the project root
- Backend: Express server in `server.js`
- Runtime: Node.js
- Persistence: JSON files in `data/`
- Encryption: AES-256-GCM for sensitive credential fields
- Dev workflow: `npm run dev` with live reload enabled outside production mode

## Key files

- `server.js` — Express API, persistence logic, encryption, file initialization
- `app.js` — frontend state management, rendering, note/credential interactions, sync logic
- `index.html` — app shell and modal/layout structure
- `styles.css` — styling and UI behavior
- `data/notes.json` — persisted notes
- `data/credentials.json` — persisted credentials, with encrypted sensitive fields
- `data/.jot-secret.key` — generated AES key for credential encryption when `JOT_SECRET_KEY` is not set
- `docker-compose.yml` — containerized runtime configuration
- `Dockerfile` — app container build
- `install-jot-ve.sh` — Proxmox LXC helper setup script

## Development commands

```bash
npm install
npm run dev
npm start
npm run efix
```

## Important conventions

- Do not introduce a database dependency unless explicitly requested.
- Respect the current server/frontend split: backend logic belongs in `server.js`, UI behavior belongs in `app.js`.
- Keep persistence file-based and JSON-oriented.
- Maintain compatibility with the existing API contract (`/api/notes` and `/api/credentials`).
- Preserve the current encryption model for credential fields: `password` and `notes` are encrypted at rest.
- When modifying runtime behavior, consider both client-side rendering and server-side validation.

## Storage behavior

- Notes are stored in `data/notes.json`.
- Credentials are stored in `data/credentials.json` and sensitive values are encrypted before write.
- If `JOT_SECRET_KEY` is absent, the app generates a key in `data/.jot-secret.key` on first run.
- Losing that key without a backup can make stored credentials unrecoverable.

## API contract

### Notes

- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id` — soft-delete (to trash); `?permanent=1` hard-deletes
- `POST /api/notes/:id/restore` — restore a trashed note
- `DELETE /api/notes/trash` — empty the trash (hard-delete all trashed notes)

### Credentials

- `GET /api/credentials`
- `POST /api/credentials`
- `PUT /api/credentials/:id`
- `DELETE /api/credentials/:id`

### Updates (self-update, git installs only)

- `GET /api/update/status` — reports whether in-app updates are supported and the current commit
- `POST /api/update/check` — fetches remote refs and compares against the local commit
- `POST /api/update` — pulls latest code, reinstalls production deps, restarts the service

## Deployment notes

- Default app port is `3000`.
- Docker Compose uses a named volume mounted at `/app/data` for persistence.
- `NODE_ENV=production` disables dev-only live reload features.

## Editing guidance

- Prefer small, surgical changes that match the existing style.
- When updating docs, keep prose technical and implementation-focused rather than marketing-style.
- Before claiming success, validate with the smallest relevant command (for example, a local app start or a targeted lint check).
- If a change affects data persistence or encryption, test the round-trip behavior carefully.

## Safety rules

- Do not commit secrets or generated keys to source control.
- Do not expose plaintext credential values in logs or responses unless explicitly required.
- Avoid broad refactors without a concrete reason; this project is intentionally compact.
