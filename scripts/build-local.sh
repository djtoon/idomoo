#!/usr/bin/env bash
# Build all idomoo binaries locally for testing the installer pipeline.
# Requires Bun: https://bun.sh
#
# Usage:   ./scripts/build-local.sh
# Output:  ./dist/idomoo-{darwin,linux,win}-{x64,arm64}[.exe] + checksums.txt

set -euo pipefail

cd "$(dirname "$0")/.."

# Adjust this path if you place this folder somewhere other than alongside the CLI.
ENTRY="${ENTRY:-../bin/idomoo.js}"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun is required: https://bun.sh"
  exit 1
fi

if [ ! -f "$ENTRY" ]; then
  echo "Entry file not found: $ENTRY"
  echo "Set ENTRY=path/to/bin/idomoo.js"
  exit 1
fi

mkdir -p dist
rm -f dist/*

echo "Building from $ENTRY..."
bun build "$ENTRY" --compile --minify --target=bun-darwin-arm64  --outfile dist/idomoo-darwin-arm64
bun build "$ENTRY" --compile --minify --target=bun-darwin-x64    --outfile dist/idomoo-darwin-x64
bun build "$ENTRY" --compile --minify --target=bun-linux-x64     --outfile dist/idomoo-linux-x64
bun build "$ENTRY" --compile --minify --target=bun-linux-arm64   --outfile dist/idomoo-linux-arm64
bun build "$ENTRY" --compile --minify --target=bun-windows-x64   --outfile dist/idomoo-win-x64.exe

cd dist
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum * > checksums.txt
else
  shasum -a 256 * > checksums.txt
fi

echo
echo "✓ Built:"
ls -lh
echo
echo "Checksums:"
cat checksums.txt
