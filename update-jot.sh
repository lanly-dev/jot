#!/usr/bin/env bash
# =============================================================================
# Jot — Proxmox VE update helper
# -----------------------------------------------------------------------------
# Pulls the latest Jot code inside its LXC container, reinstalls production
# dependencies, restarts the systemd service, and verifies it came up.
#
# Run as root ON the Proxmox host (needs `pct`):
#   sudo bash update-jot.sh              # auto-detect container named "jot"
#   sudo bash update-jot.sh 110          # target a specific container ID
# =============================================================================

set -Eeuo pipefail

function msg_info()  { echo -e "\e[1;34m [INFO]\e[0m $*"; }
function msg_ok()    { echo -e "\e[1;32m [ OK ]\e[0m $*"; }
function msg_warn()  { echo -e "\e[1;33m [WARN]\e[0m $*"; }
function msg_error() { echo -e "\e[1;31m[ERROR]\e[0m $*"; }

if [ "$(id -u)" -ne 0 ]; then
  msg_error "Please run this script as root (sudo bash update-jot.sh)."
  exit 1
fi
if ! command -v pct >/dev/null 2>&1; then
  msg_error "The 'pct' command was not found. Run this on the Proxmox VE host."
  exit 1
fi

# --- Determine the container: explicit arg, else auto-detect by name "jot" --#
CTID="${1:-}"
if [ -z "$CTID" ]; then
  CTID="$(pct list | awk '$1 ~ /^[0-9]+$/ && $NF == "jot" {print $1; exit}')"
  if [ -z "$CTID" ]; then
    msg_error "Could not find a container named 'jot'. Pass the container ID:"
    msg_error "  sudo bash update-jot.sh <CTID>"
    exit 1
  fi
fi

# Confirm the target is actually the Jot container (protect against typo).
NAME="$(pct list | awk -v id="$CTID" '$1==id {print $NF}')"
if [ -z "$NAME" ]; then
  msg_error "No container with ID $CTID exists."
  exit 1
fi
if ! pct config "$CTID" | grep -q 'hostname: jot'; then
  msg_warn "Container $CTID does not appear to be Jot (hostname != jot)."
  msg_warn "Continuing anyway. Proceed only if this is intended."
fi

msg_info "Updating Jot in container $CTID ($NAME) ..."

if ! pct status "$CTID" | grep -q running; then
  msg_info "Container not running — starting it."
  pct start "$CTID" || { msg_error "Failed to start container $CTID."; exit 1; }
  sleep 3
fi

if ! pct exec "$CTID" -- sh -c "
  git config --global --add safe.directory /opt/jot 2>/dev/null || true
  cd /opt/jot || exit 1
  git pull || exit 1
  npm install --omit=dev --no-audit --no-fund || exit 1
  systemctl restart jot || exit 1
  systemctl is-active --quiet jot
"; then
  msg_error "Update failed. Inspect with: pct enter $CTID -> journalctl -u jot"
  exit 1
fi

IP="$(pct exec "$CTID" -- sh -c "hostname -I 2>/dev/null | awk '{print \$1}'" 2>/dev/null || true)"
[ -n "$IP" ] || IP="<check: pct exec $CTID -- ip a>"
msg_ok "Jot updated and running in container $CTID"
msg_info "Open Jot at:  http://${IP}:3000"
msg_info "Shell access:  pct enter $CTID"