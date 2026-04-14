#!/usr/bin/env bash
# Uninstall the Idomoo CLI binary installed by install.sh.
# Usage:
#   curl -fsSL https://idomoo.com/cli/uninstall.sh | bash

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
BIN_NAME="idomoo"
TARGET="${INSTALL_DIR}/${BIN_NAME}"

if [ -f "$TARGET" ]; then
  rm -f "$TARGET"
  echo "✓ Removed $TARGET"
else
  echo "! $TARGET not found — nothing to uninstall."
fi

CONFIG_DIR="$HOME/.idomoo"
if [ -d "$CONFIG_DIR" ]; then
  echo
  echo "Config directory still exists: $CONFIG_DIR"
  echo "Delete it with:  rm -rf $CONFIG_DIR"
fi
