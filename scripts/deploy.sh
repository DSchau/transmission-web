#!/usr/bin/env bash
# Build and ship the UI to the HTPC (the Mac Studio), where Transmission serves it from
# ~/htpc-data/transmission-web/current (see ../htpc/TRANSMISSION-WEB.md and ../htpc/macOS/docker/compose.yml).
#
#   scripts/deploy.sh              build, install, switch `current` to the new build
#   scripts/deploy.sh --rollback   switch `current` back to the previous build
#   scripts/deploy.sh --allow-dirty   deploy even with uncommitted changes
#   HTPC_HOST=dschau@ssh.dschau.dev scripts/deploy.sh   # when away from home
#
# Run on the Studio itself, it installs locally (no SSH). Anywhere else it streams the build over SSH.
# Switching is an atomic symlink swap, so Transmission never needs a restart.
set -euo pipefail

# Relative paths are relative to $HOME on the target. The old NUC: HTPC_ROOT=/opt/transmission-web
ROOT="${HTPC_ROOT:-htpc-data/transmission-web}"
KEEP=3
if [[ -z "${HTPC_HOST:-}" && -d "$HOME/$ROOT" ]] || [[ "${HTPC_HOST:-}" == local ]]; then
  HOST=local
else
  HOST="${HTPC_HOST:-dschau@192.168.0.250}"
fi

# Runs a script on the target with VAR=value arguments as its environment; stdin is passed through.
on_target() {
  local script=$1
  shift
  if [[ $HOST == local ]]; then
    (cd "$HOME" && env "$@" bash -c "$script")
  else
    ssh "$HOST" "env $(printf '%q ' "$@")bash -c $(printf %q "$script")"
  fi
}

# Shared by deploy and rollback. Plain BSD/GNU tools only: the target may be macOS or Linux.
# perl's rename(2) swaps the symlink atomically (GNU `mv -T` doesn't exist on macOS).
switch='switch_to() {
  ln -sfn "releases/$1" "$ROOT/current.tmp"
  perl -e "rename shift, shift or die qq(rename: \$!\n)" "$ROOT/current.tmp" "$ROOT/current"
  echo "current -> $1"
}'

cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--rollback" ]]; then
  read -r -d '' rollback <<'EOF' || true
set -euo pipefail
cur=$(basename "$(readlink "$ROOT/current")")
prev=$(ls -1 "$ROOT/releases" | sort | grep -B1 -x "$cur" | head -n1)
[[ -n "$prev" && "$prev" != "$cur" ]] || { echo "No release older than $cur." >&2; exit 1; }
switch_to "$prev"
echo "(was $cur)"
EOF
  on_target "$switch"$'\n'"$rollback" ROOT="$ROOT"
  exit
fi

sha=$(git rev-parse --short HEAD)
if [[ -n "$(git status --porcelain)" ]]; then
  if [[ "${1:-}" != "--allow-dirty" ]]; then
    git status --short >&2
    echo "Uncommitted changes would ship in this build. Commit or stash them, or pass --allow-dirty." >&2
    exit 1
  fi
  sha="$sha-dirty"
fi
release="$(date +%Y%m%d-%H%M%S)-$sha"

pnpm install --frozen-lockfile
pnpm run build
entry=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -n1)

# Runs on the target; stdin carries the tarball.
read -r -d '' install <<'EOF' || true
set -euo pipefail
dir="$ROOT/releases/$RELEASE"
mkdir -p "$dir"
tar -xzf - -C "$dir"
test -f "$dir/index.html"
switch_to "$RELEASE"

# Prune old builds, never the live one.
ls -1 "$ROOT/releases" | sort -r | tail -n +"$((KEEP + 1))" | { grep -vx "$RELEASE" || true; } |
  while read -r old; do rm -rf "${ROOT:?}/releases/$old"; done

# Check what Transmission actually serves (401 = RPC auth is on, so it can't be checked anonymously).
page=$(mktemp)
code=$(curl -s -m 5 -o "$page" -w '%{http_code}' http://127.0.0.1:9091/transmission/web/ || true)
if [[ $code == 200 ]] && grep -q "$ENTRY" "$page"; then
  echo "✅ Transmission is serving the new build"
elif [[ $code == 200 ]]; then
  echo "⚠️  Transmission is serving a different UI. Is TRANSMISSION_WEB_HOME set? (see TRANSMISSION-WEB.md)"
else
  echo "ℹ️  Couldn't verify (HTTP $code)"
fi
rm -f "$page"
EOF

echo "Deploying $release to $HOST:$ROOT"
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata -C dist -czf - . |
  on_target "$switch"$'\n'"$install" ROOT="$ROOT" RELEASE="$release" KEEP="$KEEP" ENTRY="$entry"
