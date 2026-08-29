#!/usr/bin/env bash

# =============================================================================
# Jot — Proxmox VE Helper Script
# -----------------------------------------------------------------------------
# One-command installer that spins up a brand-new LXC container on your
# Proxmox VE node and deploys Jot (the cute note-taking app) inside it,
# running natively under Node.js (no Docker daemon, minimal overhead).
#
# Modelled on the community "Proxmox VE Helper Scripts":
#   https://github.com/community-scripts/ProxmoxVE-scripts
#
# Usage (run as root ON the Proxmox host):
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/lanly-dev/jot/main/install-jot-ve.sh)"
#   -or- copy the repo here and run:
#   sudo bash install-jot-ve.sh
#
# A script can only be executed directly on the Proxmox VE node (it drives
# `pct`, the Proxmox LXC tool). It does NOT run inside a container.
# =============================================================================

set -Eeuo pipefail
shopt -s nullglob

# -- Template: Debian 12 is a lean, stable base for Jot ----------------------#
TEMPLATE_NAME="debian-12-standard"
TEMPLATE_STORAGE="${TEMPLATE_STORAGE:-local}"

# -- Container defaults (override via env vars before running the script) ----#
CT_ID="${CT_ID:-}"
HOST="${HOST:-jot}"
CORE_COUNT="${CORE_COUNT:-2}"
RAM_SIZE="${RAM_SIZE:-2048}"
DISK_SIZE="${DISK_SIZE:-4}"
BRG="${BRG:-vmbr0}"
VLAN="${VLAN:-}"
NET="${NET:-dhcp}"
IPV6="${IPV6:-auto}"
NAMESERVER="${NAMESERVER:-1.1.1.1}"
TZ_RAW="$(cat /etc/timezone 2>/dev/null || echo 'Etc/UTC')"
# Guest appearance in the PVE web UI (pink circle/icon + a "note" tag).
COLOR="${COLOR:-ffd1d9}"   # pastel brand pink (hex WITHOUT the #)
TAGS="${TAGS:-notes}"

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
function msg_info()  { echo -e "\e[1;34m [INFO]\e[0m $*"; }
function msg_ok()    { echo -e "\e[1;32m [ OK ]\e[0m $*"; }
function msg_warn()  { echo -e "\e[1;33m [WARN]\e[0m $*"; }
function msg_error() { echo -e "\e[1;31m[ERROR]\e[0m $*"; }

# ---------------------------------------------------------------------------
# Pre-flight: must be root on a Proxmox VE host.
# ---------------------------------------------------------------------------
if [ "$(id -u)" -ne 0 ]; then
  msg_error "Please run this script as root (sudo bash install-jot-ve.sh)."
  exit 1
fi
for _cmd in pct pveam; do
  if ! command -v "$_cmd" >/dev/null 2>&1; then
    msg_error "The '$_cmd' command was not found. Run this on a Proxmox VE host."
    exit 1
  fi
done
# ---------------------------------------------------------------------------
# Pick the first free container ID (>= 100) unless CT_ID was given.
# ---------------------------------------------------------------------------
if [ -z "$CT_ID" ]; then
  cid=100
  while pct status "$cid" >/dev/null 2>&1; do cid=$((cid + 1)); done
  CT_ID=$cid
fi

# Resolve a writable storage for the container rootdir.
STORAGE_BOX="${STORAGE_BOX:-}"
if [ -z "$STORAGE_BOX" ]; then
  STORAGE_BOX="$(pvesm status -content rootdir 2>/dev/null | awk 'NR>1 {print $1; exit}')"
  [ -z "$STORAGE_BOX" ] && STORAGE_BOX="local"
fi

# ---------------------------------------------------------------------------
# Show settings and confirm before doing anything.
# ---------------------------------------------------------------------------
echo
echo " Jot — Proxmox VE Helper Script"
echo " ------------------------------"
echo "  Container ID : $CT_ID"
echo "  Hostname     : $HOST"
echo "  Storage      : $STORAGE_BOX"
echo "  Disk size    : ${DISK_SIZE}G"
echo "  RAM / cores  : ${RAM_SIZE} MiB / $CORE_COUNT"
echo "  Bridge       : $BRG"
echo "  Template     : $TEMPLATE_NAME"
echo " ---------------------------------"
read -r -p "  Press ENTER to continue (Ctrl+C to abort) ... "
echo

# ---------------------------------------------------------------------------
# 1. Make sure the Debian template is present on this node.
# ---------------------------------------------------------------------------
# pveam list can print templates either as "storage:vztmpl/<file>" on one line
# or as a table. Extract whatever whitespace-separated token matches the name,
# then normalise into a "storage:vztmpl/<file>" path for pct.
get_template_file() {
  local storage="$1"
  pveam list "$storage" 2>/dev/null | awk -v c="$TEMPLATE_NAME" '
    $0 ~ c {
      line=$0; sub(/^[ \t]+/,"",line); sub(/[ \t]+$/,"",line)
      n=split(line, f, "[ \t]+")
      for (i=1;i<=n;i++) if (f[i] ~ c) { print f[i]; exit }
    }'
}

normalise_template() {
  case "$1" in
    *":"*) echo "$1" ;;                                          # storage:vztmpl/file
    "vztmpl/"*) echo "${TEMPLATE_STORAGE}:$1" ;;                  # vztmpl/file
    *)         echo "${TEMPLATE_STORAGE}:vztmpl/$1" ;;            # bare filename
  esac
}

# pveam available lists downloadable templates (full filenames like
# debian-12-standard_12.7-1_amd64.tar.zst). Match our short TEMPLATE_NAME and
# return the exact .tar* filename needed by `pveam download`.
get_available_template() {
  pveam available 2>/dev/null | awk -v c="$TEMPLATE_NAME" '
    {
      n=split($0, f, "[ \t]+")
      for (i=1;i<=n;i++)
        if (f[i] ~ c && f[i] ~ /\.tar/) { print f[i]; exit }
    }'
}

msg_info "Ensuring the '$TEMPLATE_NAME' template is available"
TPL_FILE=""
for s in "$TEMPLATE_STORAGE" local; do
  RAW="$(get_template_file "$s")"
  if [ -n "$RAW" ]; then
    TEMPLATE_STORAGE="$s"
    TPL_FILE="$(normalise_template "$RAW")"
    break
  fi
done

if [ -z "$TPL_FILE" ]; then
  msg_warn "Template not found locally. Updating the template index..."
  pveam update >/dev/null 2>&1 || true

  # pveam download needs the *exact* filename (e.g. debian-12-standard_12.7-1_amd64.tar.zst).
  EXACT_TEMPLATE="$(get_available_template)"
  if [ -n "$EXACT_TEMPLATE" ]; then
    msg_info "Downloading '$EXACT_TEMPLATE' to '$TEMPLATE_STORAGE'..."
    if pveam download "$TEMPLATE_STORAGE" "$EXACT_TEMPLATE" >/dev/null 2>&1; then
      RAW="$(get_template_file "$TEMPLATE_STORAGE")"
      TPL_FILE="$(normalise_template "$RAW")"
    else
      msg_error "pveam download failed for '$EXACT_TEMPLATE'. Check the host has internet"
      msg_error "access to turnkeylinux.org (or your proxy)."
    fi
  else
    msg_error "Could not find a '$TEMPLATE_NAME' template in 'pveam available'. This usually"
    msg_error "means there is no internet access to the Proxmox template repository."
  fi

  if [ -z "$TPL_FILE" ]; then
    msg_error "Automatic download did not complete. To do it manually:"
    msg_error "  pveam update && pveam available | grep debian-12"
    msg_error "  pveam download $TEMPLATE_STORAGE <exact template name from the list>"
    msg_error "then re-run this script."
    exit 1
  fi
fi
msg_ok "Template ready: $TPL_FILE"
# ---------------------------------------------------------------------------
# 2. Create the LXC container.
# ---------------------------------------------------------------------------
msg_info "Creating LXC container $CT_ID"
NETLINE="name=eth0,bridge=$BRG,firewall=1,ip=$NET,ip6=$IPV6"
[ -n "$VLAN" ] && NETLINE="$NETLINE,tag=$VLAN"

if ! pct create "$CT_ID" "$TPL_FILE" \
  --hostname "$HOST" \
  --cores "$CORE_COUNT" \
  --memory "$RAM_SIZE" \
  --swap 512 \
  --storage "$STORAGE_BOX" \
  --rootfs "${STORAGE_BOX}:${DISK_SIZE}" \
  --unprivileged 1 \
  --net0 "$NETLINE" \
  --nameserver "$NAMESERVER" \
  --timezone "$TZ_RAW" \
  --color "${COLOR:-ffd1d9}" \
  --tags "${TAGS:-note}" \
  --onboot 1 >/dev/null 2>&1; then
  msg_error "pct create failed. Check the CT ID is free and storage is writable."
  exit 1
fi
msg_ok "Container created (ID $CT_ID)"

# ---------------------------------------------------------------------------
# 3. Start the container and wait for it to boot.
# ---------------------------------------------------------------------------
msg_info "Starting container and waiting for it to come up"
pct start "$CT_ID" >/dev/null 2>&1 || true
sleep 3
for _ in $(seq 1 30); do
  if pct exec "$CT_ID" -- sh -c "echo ok" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done
if [ "${ok:-0}" != "1" ]; then
  msg_error "Container never came up. Run 'pct start $CT_ID' and 'pct enter $CT_ID' to debug."
  exit 1
fi
msg_ok "Container is up"
# ---------------------------------------------------------------------------
# 4. Write and run the bootstrap script inside the container.
# ---------------------------------------------------------------------------
msg_info "Preparing the bootstrap script"
TMPSETUP="/tmp/jot-setup-$$"
cat > "$TMPSETUP" <<'STARTUP_EOF'
#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo " >> Updating package lists ..."
apt-get update -y >/dev/null 2>&1
apt-get install -y curl ca-certificates git openssl build-essential >/dev/null 2>&1

echo " >> Installing Node.js 22 LTS ..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
apt-get install -y nodejs >/dev/null 2>&1

echo " >> Fetching Jot ..."
cd /opt
rm -rf jot
git clone --depth 1 https://github.com/lanly-dev/jot.git jot >/dev/null 2>&1
cd /opt/jot

echo " >> Installing production dependencies ..."
npm install --omit=dev --no-audit --no-fund >/dev/null 2>&1

echo " >> Creating a dedicated 'jot' user ..."
useradd -r -d /opt/jot -s /usr/sbin/nologin jot 2>/dev/null || true
chown -R jot:jot /opt/jot

echo " >> Generating JOT_SECRET_KEY (AES-256-GCM) ..."
SECRET_KEY="$(openssl rand -base64 32)"
cat > /opt/jot/.env <<EOF
PORT=3000
NODE_ENV=production
JOT_SECRET_KEY=${SECRET_KEY}
EOF
chmod 600 /opt/jot/.env
chown jot:jot /opt/jot/.env

echo " >> Installing the Jot systemd service ..."
cat > /etc/systemd/system/jot.service <<'SVC_EOF'
[Unit]
Description=Jot note-taking app
After=network.target

[Service]
Type=simple
User=jot
Group=jot
WorkingDirectory=/opt/jot
EnvironmentFile=/opt/jot/.env
ExecStart=/usr/bin/node /opt/jot/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SVC_EOF

systemctl daemon-reload
systemctl enable --now jot >/dev/null 2>&1
systemctl is-active --quiet jot

echo "BOOTSTRAP_DONE"
STARTUP_EOF
pct push "$CT_ID" "$TMPSETUP" /root/jot-setup.sh
rm -f "$TMPSETUP"

# ---------------------------------------------------------------------------
# 5. Run the bootstrap for real (this can take several minutes).
# ---------------------------------------------------------------------------
msg_info "Running the bootstrap script inside the container (might take a while)..."
if ! pct exec "$CT_ID" -- bash /root/jot-setup.sh; then
  msg_error "The container could not finish the setup. Review the logs above."
  exit 1
fi
pct exec "$CT_ID" -- rm -f /root/jot-setup.sh

# ---------------------------------------------------------------------------
# 6. Final summary with the access URL.
# ---------------------------------------------------------------------------
IP_INFO="$(pct exec "$CT_ID" -- sh -c "hostname -I 2>/dev/null | awk '{print \$1}'" 2>/dev/null || true)"
[ -z "$IP_INFO" ] && IP_INFO="<run: pct exec $CT_ID -- ip a>"
PORT="${PORT:-3000}"

msg_ok "Jot is installed and running!"
msg_info "Manage the container with:  pct enter $CT_ID"
msg_info "Open Jot at:  http://${IP_INFO}:${PORT}"
msg_info "Service is managed by systemd:  systemctl status jot"
msg_warn "Notes & credentials live in /opt/jot/data, and JOT_SECRET_KEY is in /opt/jot/.env."
msg_warn "Back those up so your encrypted credentials survive a reinstall."