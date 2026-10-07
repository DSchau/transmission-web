#!/usr/bin/env bash
# Build and ship the UI to the NUC, where transmission-daemon serves it via
# TRANSMISSION_WEB_HOME=/opt/transmission-web/current (see ../htpc/TRANSMISSION-WEB.md).
#
#   scripts/deploy.sh              build, upload, switch `current` to the new build
#   scripts/deploy.sh --rollback   switch `current` back to the previous build
#   HTPC_HOST=dschau@ssh.dschau.dev scripts/deploy.sh   # when away from home
#
# Switching is an atomic symlink swap, so the daemon never needs a restart.
set -euo pipefail

HOST="${HTPC_HOST:-dschau@192.168.0.250}"
ROOT=/opt/transmission-web
KEEP=3

cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--rollback" ]]; then
  ssh "$HOST" ROOT="$ROOT" bash -s <<'EOF'
set -euo pipefail
cd "$ROOT/releases"
cur=$(basename "$(readlink "$ROOT/current")")
prev=$(ls -1 | sort | grep -B1 -x "$cur" | head -n1)
[[ -n "$prev" && "$prev" != "$cur" ]] || { echo "No release older than $cur." >&2; exit 1; }
ln -sfn "releases/$prev" "$ROOT/current.tmp" && mv -T "$ROOT/current.tmp" "$ROOT/current"
echo "current -> $prev (was $cur)"
EOF
  exit
fi

sha=$(git rev-parse --short HEAD)
[[ -z "$(git status --porcelain)" ]] || sha="$sha-dirty"
release="$(date +%Y%m%d-%H%M%S)-$sha"

bun install --frozen-lockfile
bun run build
entry=$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -n1)

# Runs on the NUC; stdin carries the tarball, so the script goes in as an argument.
remote=$(cat <<'EOF'
set -euo pipefail
dir="$ROOT/releases/$RELEASE"
mkdir -p "$dir"
tar -xzf - -C "$dir"
test -f "$dir/index.html"
ln -sfn "releases/$RELEASE" "$ROOT/current.tmp" && mv -T "$ROOT/current.tmp" "$ROOT/current"
echo "current -> $RELEASE"

# Prune old builds, never the live one.
cd "$ROOT/releases"
ls -1 | sort | head -n -"$KEEP" | grep -vx "$RELEASE" | xargs -r rm -rf

# Check what the daemon actually serves (401 = RPC auth is on, so it can't be checked anonymously).
code=$(curl -s -m 5 -o /tmp/tw-index.html -w '%{http_code}' http://127.0.0.1:9091/transmission/web/ || true)
if [[ $code == 200 ]] && grep -q "$ENTRY" /tmp/tw-index.html; then
  echo "✅ Transmission is serving the new build"
elif [[ $code == 200 ]]; then
  echo "⚠️  Transmission is serving a different UI. Is TRANSMISSION_WEB_HOME set? (see TRANSMISSION-WEB.md)"
else
  echo "ℹ️  Couldn't verify (HTTP $code)"
fi
rm -f /tmp/tw-index.html
EOF
)

echo "Deploying $release to $HOST:$ROOT"
COPYFILE_DISABLE=1 tar --no-xattrs --no-mac-metadata -C dist -czf - . |
  ssh "$HOST" "ROOT=$ROOT RELEASE=$release KEEP=$KEEP ENTRY=$entry bash -c $(printf %q "$remote")"
