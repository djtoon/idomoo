#!/usr/bin/env bash
# Idomoo CLI installer for macOS, Linux, and WSL.
#
# Usage:
#   curl -fsSL https://idomoo.com/cli/install.sh | bash
#   curl -fsSL https://idomoo.com/cli/install.sh | bash -s -- --version v0.1.1
#
# Environment overrides:
#   INSTALL_DIR   — where to place the binary (default: $HOME/.local/bin)
#   GITHUB_REPO   — override release source (default: djtoon/idomoo)

set -euo pipefail

# ── configuration ──────────────────────────────────────────────────────────────
GITHUB_REPO="${GITHUB_REPO:-djtoon/idomoo}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
BIN_NAME="idomoo"
VERSION=""

# ── ANSI helpers ───────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_BLUE='\033[34m'; C_GREEN='\033[32m'; C_YELLOW='\033[33m'; C_RED='\033[31m'; C_RESET='\033[0m'
else
  C_BLUE=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_RESET=''
fi

info()  { printf "${C_BLUE}==>${C_RESET} %s\n" "$*"; }
ok()    { printf "${C_GREEN}✓${C_RESET}  %s\n" "$*"; }
warn()  { printf "${C_YELLOW}!${C_RESET}  %s\n" "$*" >&2; }
err()   { printf "${C_RED}✗${C_RESET}  %s\n" "$*" >&2; }
die()   { err "$@"; exit 1; }

# ── arg parsing ────────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --version)    VERSION="$2"; shift 2 ;;
    --version=*)  VERSION="${1#*=}"; shift ;;
    --dir)        INSTALL_DIR="$2"; shift 2 ;;
    --dir=*)      INSTALL_DIR="${1#*=}"; shift ;;
    -h|--help)
      cat <<EOF
Idomoo CLI installer.

Options:
  --version VERSION   Install a specific tag (e.g. v0.1.1). Default: latest.
  --dir PATH          Install destination (default: \$HOME/.local/bin).

Environment:
  INSTALL_DIR         Same as --dir.
  GITHUB_REPO         Source repo (default: djtoon/idomoo).
EOF
      exit 0 ;;
    *) die "Unknown option: $1 (try --help)" ;;
  esac
done

# ── platform detection ─────────────────────────────────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Darwin) echo "darwin" ;;
    Linux)  echo "linux"  ;;
    *) die "Unsupported OS: $(uname -s). Use the npm install instead: npm i -g idomoo-cli" ;;
  esac
}

detect_arch() {
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64)   echo "x64" ;;
    arm64|aarch64)  echo "arm64" ;;
    *) die "Unsupported architecture: $arch" ;;
  esac
}

# Apple Silicon running an x86 shell still reports arm64 from sysctl.
if [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "x86_64" ]; then
  if sysctl -n sysctl.proc_translated 2>/dev/null | grep -q '^1$'; then
    warn "Detected Rosetta — installing arm64 build instead of x86_64."
    OVERRIDE_ARCH="arm64"
  fi
fi

OS="$(detect_os)"
ARCH="${OVERRIDE_ARCH:-$(detect_arch)}"

# ── tool checks ────────────────────────────────────────────────────────────────
require() { command -v "$1" >/dev/null 2>&1 || die "Required tool missing: $1"; }
require uname
require mkdir
require chmod
require mv

if command -v curl >/dev/null 2>&1; then
  DL() { curl -fsSL "$1" -o "$2"; }
elif command -v wget >/dev/null 2>&1; then
  DL() { wget -q "$1" -O "$2"; }
else
  die "Need curl or wget."
fi

if command -v sha256sum >/dev/null 2>&1; then
  SHA() { sha256sum "$1" | awk '{print $1}'; }
elif command -v shasum >/dev/null 2>&1; then
  SHA() { shasum -a 256 "$1" | awk '{print $1}'; }
else
  die "Need sha256sum or shasum."
fi

# ── resolve version ────────────────────────────────────────────────────────────
if [ -z "$VERSION" ]; then
  info "Resolving latest release from github.com/${GITHUB_REPO}..."
  TAGS_URL="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"
  TMP_TAG="$(mktemp)"
  DL "$TAGS_URL" "$TMP_TAG" || die "Couldn't reach GitHub. Pass --version to install a specific tag."
  # Plain-text grep avoids needing jq.
  VERSION="$(grep -E '"tag_name"' "$TMP_TAG" | head -n1 | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')"
  rm -f "$TMP_TAG"
  [ -n "$VERSION" ] || die "Couldn't parse latest version."
fi

ok "Version:  $VERSION"
ok "Platform: ${OS}-${ARCH}"
ok "Target:   $INSTALL_DIR/$BIN_NAME"

# ── download ───────────────────────────────────────────────────────────────────
ASSET="${BIN_NAME}-${OS}-${ARCH}"
BASE="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

info "Downloading $ASSET..."
DL "${BASE}/${ASSET}"        "${TMP}/${ASSET}"        || die "Download failed: ${BASE}/${ASSET}"
DL "${BASE}/checksums.txt"   "${TMP}/checksums.txt"   || die "Download failed: ${BASE}/checksums.txt"

# ── verify ─────────────────────────────────────────────────────────────────────
info "Verifying checksum..."
EXPECTED="$(grep " ${ASSET}\$" "${TMP}/checksums.txt" | awk '{print $1}' || true)"
[ -n "$EXPECTED" ] || die "Checksum for ${ASSET} not found in checksums.txt"
ACTUAL="$(SHA "${TMP}/${ASSET}")"
[ "$EXPECTED" = "$ACTUAL" ] || die "Checksum mismatch: expected $EXPECTED, got $ACTUAL"
ok "Checksum verified."

# ── install ────────────────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
DEST="${INSTALL_DIR}/${BIN_NAME}"

# Remove the old binary first so nothing weird happens with busy file handles
# or stale quarantine attributes on macOS.
if [ -e "$DEST" ]; then
  info "Removing existing ${BIN_NAME}..."
  rm -f "$DEST" 2>/dev/null || sudo rm -f "$DEST" 2>/dev/null || true
fi

chmod 0755 "${TMP}/${ASSET}"
mv -f "${TMP}/${ASSET}" "$DEST"

# Clear the macOS Gatekeeper quarantine bit so users can run the binary
# without the "cannot be opened because the developer cannot be verified" dialog.
if [ "$OS" = "darwin" ] && command -v xattr >/dev/null 2>&1; then
  xattr -d com.apple.quarantine "$DEST" 2>/dev/null || true
fi

ok "Installed ${BIN_NAME} to $DEST"

# ── PATH check ─────────────────────────────────────────────────────────────────
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    warn "$INSTALL_DIR is not on your PATH."
    case "$SHELL" in
      */zsh)  RC="$HOME/.zshrc" ;;
      */bash) RC="$HOME/.bashrc" ;;
      */fish) RC="$HOME/.config/fish/config.fish" ;;
      *)      RC="your shell rc" ;;
    esac
    echo
    echo "  Add this line to $RC and reopen your terminal:"
    echo "    export PATH=\"$INSTALL_DIR:\$PATH\""
    echo ;;
esac

# ── final ──────────────────────────────────────────────────────────────────────
echo
ok "Done. Verify with:  ${BIN_NAME} --help"
echo "    Then run:       ${BIN_NAME} login"
