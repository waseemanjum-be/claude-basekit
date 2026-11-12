#!/usr/bin/env sh
# Basekit installer for macOS and Linux. All logic lives in setup.js.
# Usage: ./install.sh [--yes] [--dry-run] [--no-plugins] [--no-rules] [--uninstall]
set -eu
KIT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! command -v node >/dev/null 2>&1; then
  echo "Basekit needs Node.js 18 or later on PATH." >&2
  exit 1
fi
exec node "$KIT_DIR/setup.js" "$@"
