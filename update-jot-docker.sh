#!/usr/bin/env bash
# =============================================================================
# Jot — Docker update helper
# -----------------------------------------------------------------------------
# Pulls the latest Jot image and recreates the Docker container safely:
#
#   1. Backs up /app/data from the current container (notes, credentials and
#      the encryption key file all live there) to ./jot-backups/<timestamp>/
#   2. Carries over JOT_API_TOKEN / JOT_SECRET_KEY if the current container
#      was started with them, so the new container unlocks the same vault.
#   3. Recreates the container WITH port 3000 published to the host and a
#      persistent data volume — containers started by a bare `docker run`
#      often have neither, which is why http://localhost:3000 refuses the
#      connection even though the container looks healthy.
#   4. Keeps the old container, stopped and renamed to
#      jot-backup-<timestamp>, as a one-command rollback.
#
# Run from any terminal with Docker available (on Windows: Git Bash or WSL):
#   bash update-jot-docker.sh            # container named "jot"
#   bash update-jot-docker.sh myjot      # custom container name
# =============================================================================

set -Eeuo pipefail

function msg_info()  { echo -e "\e[1;34m [INFO]\e[0m $*"; }
function msg_ok()    { echo -e "\e[1;32m [ OK ]\e[0m $*"; }
function msg_warn()  { echo -e "\e[1;33m [WARN]\e[0m $*"; }
function msg_error() { echo -e "\e[1;31m[ERROR]\e[0m $*"; }

NAME="${1:-jot}"
IMAGE="ghcr.io/lanly-dev/jot:latest"
HOST_PORT="${HOST_PORT:-3000}"
DEFAULT_VOLUME="jot-data"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="./jot-backups/$STAMP"
OLD_NAME="${NAME}-backup-${STAMP}"

command -v docker >/dev/null 2>&1 || { msg_error "docker CLI not found. Start Docker Desktop first."; exit 1; }
docker container inspect "$NAME" >/dev/null 2>&1 || {
  msg_error "No container named '$NAME'. If you have never run Jot in Docker,"
  msg_error "use docker-compose.yml instead:  docker compose up -d"
  exit 1
}

# --- Read the current container's shape -------------------------------------
# Which volume (if any) backs /app/data, and which JOT_* env vars were set.
DATA_VOLUME="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}' "$NAME")"
WAS_RUNNING="$(docker inspect --format '{{.State.Running}}' "$NAME")"

ENV_ARGS=()
while IFS='=' read -r key value; do
  case "$key" in
    JOT_API_TOKEN|JOT_SECRET_KEY)
      [ -n "$value" ] && ENV_ARGS+=(-e "$key=$value") ;;
  esac
done < <(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$NAME")

if [ -n "$DATA_VOLUME" ]; then
  msg_info "Current container stores data on volume '$DATA_VOLUME' — it will be reused."
else
  msg_info "Current container has NO data volume — data lives in the container"
  msg_info "and will be restored from the backup below into volume '$DEFAULT_VOLUME'."
  DATA_VOLUME="$DEFAULT_VOLUME"
fi
[ "${#ENV_ARGS[@]}" -gt 0 ] && msg_info "Carrying over JOT_* environment from the current container."

# --- 1. Back up the data before touching anything ----------------------------
mkdir -p "$BACKUP_DIR/data"
msg_info "Backing up /app/data to $BACKUP_DIR/data ..."
docker cp "$NAME:/app/data/." "$BACKUP_DIR/data/"
msg_ok "Backup saved: $BACKUP_DIR/data"

# --- 2. Pull the new image (old container still running) ---------------------
msg_info "Pulling $IMAGE ..."
docker pull "$IMAGE" >/dev/null
msg_ok "Image up to date."

# --- 3. Swap containers -------------------------------------------------------
rollback() {
  msg_error "New container did not come up healthy — rolling back."
  docker logs --tail 30 "$NAME" 2>/dev/null || true
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker rename "$OLD_NAME" "$NAME" >/dev/null 2>&1 || true
  [ "$WAS_RUNNING" = "true" ] && docker start "$NAME" >/dev/null 2>&1 || true
  msg_warn "Old container restored as '$NAME'. Note: it still has no published"
  msg_warn "port (that was the original problem) — your data is safe in"
  msg_warn "$BACKUP_DIR and in the restored container."
  exit 1
}

[ "$WAS_RUNNING" = "true" ] && docker stop "$NAME" >/dev/null
docker rename "$NAME" "$OLD_NAME"
msg_info "Old container kept as '$OLD_NAME' (stopped) for rollback."

msg_info "Starting new container with port $HOST_PORT published ..."
docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  -p "$HOST_PORT:3000" \
  -v "$DATA_VOLUME:/app/data" \
  "${ENV_ARGS[@]}" \
  "$IMAGE" >/dev/null

# If the data volume is fresh (old container had none), restore the backup.
if ! docker exec "$NAME" test -f /app/data/notes.json 2>/dev/null; then
  if [ -f "$BACKUP_DIR/data/notes.json" ] || [ -f "$BACKUP_DIR/data/credentials.json" ]; then
    msg_info "Restoring data backup into the new container ..."
    docker cp "$BACKUP_DIR/data/." "$NAME:/app/data/" || rollback
    # docker cp lands files as root; the app runs as appuser.
    docker exec -u root "$NAME" chown -R appuser:appgroup /app/data || rollback
    docker restart "$NAME" >/dev/null || rollback
  fi
fi

# --- 4. Verify it actually serves ---------------------------------------------
msg_info "Waiting for Jot to answer on port 3000 ..."
HEALTHY=0
for _ in $(seq 1 30); do
  if docker exec "$NAME" node -e "require('http').get('http://127.0.0.1:3000/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" 2>/dev/null; then
    HEALTHY=1; break
  fi
  docker inspect --format '{{.State.Running}}' "$NAME" 2>/dev/null | grep -q true || break
  sleep 2
done
[ "$HEALTHY" = "1" ] || rollback

msg_ok "Jot updated and running."
docker ps --filter "name=^/${NAME}$" --format '  {{.Names}}  {{.Status}}  {{.Ports}}'
echo
msg_info "Open Jot at:  http://localhost:$HOST_PORT"
msg_info "Data backup:  $BACKUP_DIR/data"
msg_info "Rollback:     docker rm -f $NAME && docker rename $OLD_NAME $NAME && docker start $NAME"
msg_info "Once you've confirmed your notes and vault are intact, clean up with:"
msg_info "  docker rm $OLD_NAME"
