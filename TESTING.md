# Testing the installer locally

Before shipping the install scripts, validate the full pipeline end-to-end.

---

## 1. Build binaries locally

```bash
cd installer
./scripts/build-local.sh
```

This produces `dist/idomoo-{darwin,linux,win}-{x64,arm64}[.exe]` plus `checksums.txt`.

Smoke-test the binary for your current platform:

```bash
# macOS arm64 example
./dist/idomoo-darwin-arm64 --help
```

Expected: prints the CLI help text.

---

## 2. Test install.sh against real GitHub Releases

Once you've pushed a tag and the workflow has uploaded artifacts:

```bash
# Install latest
curl -fsSL https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/installer/scripts/install.sh | bash

# Install a specific version
curl -fsSL https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/installer/scripts/install.sh | bash -s -- --version v0.1.1

# Install to a custom dir
INSTALL_DIR=/tmp/idomoo-test bash -c '
  curl -fsSL https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/installer/scripts/install.sh | bash
'
/tmp/idomoo-test/idomoo --help
```

---

## 3. Test in clean containers (recommended)

This catches PATH and missing-tools issues before users do.

### Ubuntu

```bash
docker run --rm -it ubuntu:22.04 bash -c '
  apt-get update -qq && apt-get install -qq -y curl ca-certificates >/dev/null
  curl -fsSL https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/installer/scripts/install.sh | bash
  ~/.local/bin/idomoo --help
'
```

### Alpine

```bash
docker run --rm -it alpine bash -c '
  apk add --no-cache bash curl >/dev/null
  curl -fsSL https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/installer/scripts/install.sh | bash
  ~/.local/bin/idomoo --help
'
```

### Mac arm64 (host)

```bash
curl -fsSL https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/installer/scripts/install.sh | bash
which idomoo
idomoo --help
```

### Windows (PowerShell on a fresh VM)

```powershell
irm https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/installer/scripts/install.ps1 | iex
idomoo --help
```

---

## 4. Test failure paths

The installer should fail loudly, not silently. Verify these:

| Scenario | Expected behaviour |
| --- | --- |
| Pass `--version v999.0.0` (nonexistent) | Download fails with clear message. |
| `INSTALL_DIR=/no/such/dir` | `mkdir -p` succeeds OR clear error if path is unwritable. |
| Tampered binary in releases | Checksum verification fails, install aborts. |
| Pipe to `bash` after deleting `curl` mid-stream | `set -euo pipefail` aborts cleanly. |

To test the checksum failure path manually, edit `checksums.txt` in your release to a wrong hash — confirm install.sh aborts.

---

## 5. Test the uninstaller

```bash
curl -fsSL https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/installer/scripts/uninstall.sh | bash
which idomoo   # should be empty
ls ~/.idomoo   # config still present — the script tells the user how to remove
```

---

## 6. Test the GitHub Actions workflow

Before tagging a real release, dry-run with `workflow_dispatch`:

1. Push the workflow file to `main`.
2. Go to **Actions → Release binaries → Run workflow**.
3. Pass `tag: v0.0.0-test`.
4. Confirm:
   - All 5 binaries appear in `dist/`.
   - `checksums.txt` is generated.
   - A draft GitHub Release is created with all artifacts.
5. Delete the test release after verifying.

---

## 7. End-to-end checklist before announcing

- [ ] `install.sh` works on macOS arm64
- [ ] `install.sh` works on macOS x64
- [ ] `install.sh` works on Ubuntu x64
- [ ] `install.sh` works on Ubuntu arm64
- [ ] `install.sh` works on Alpine (musl)
- [ ] `install.ps1` works on Windows 11 x64
- [ ] `install.ps1` PATH update survives a new shell
- [ ] `--version` flag works
- [ ] Checksum failure aborts cleanly
- [ ] Uninstall scripts remove only what install added
- [ ] Hosted URLs (`idomoo.com/cli/install.sh`) return correct Content-Type
