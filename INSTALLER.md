# Idomoo CLI — One-line Installer

This folder contains everything needed to ship the `idomoo` CLI as a **standalone binary** that anyone can install with a single `curl | bash` (Mac/Linux/WSL) or `irm | iex` (Windows) — no Node.js required.

End-state:

```bash
# macOS, Linux, WSL
curl -fsSL https://idomoo.com/cli/install.sh | bash

# Windows PowerShell
irm https://idomoo.com/cli/install.ps1 | iex
```

---

## What's in this folder

```
installer/
├── README.md                          ← you are here
├── HOSTING.md                         ← how to host the install scripts under your domain
├── TESTING.md                         ← how to test the full pipeline locally
├── scripts/
│   ├── install.sh                     ← Mac/Linux/WSL installer (served from your CDN)
│   ├── install.ps1                    ← Windows PowerShell installer
│   ├── uninstall.sh                   ← Mac/Linux/WSL uninstaller
│   ├── uninstall.ps1                  ← Windows uninstaller
│   └── build-local.sh                 ← Build all binaries locally with Bun (testing)
└── .github/
    └── workflows/
        └── release.yml                ← GitHub Actions: build & release on every tag push
```

---

## How it works

```
   ┌──────────────────────────────────────────────────────────────────┐
   │  1. Developer:                                                    │
   │     git tag v0.1.1 && git push --tags                             │
   └─────────────────────────────────┬────────────────────────────────┘
                                     │
   ┌─────────────────────────────────▼────────────────────────────────┐
   │  2. GitHub Actions (release.yml):                                 │
   │     - Bun cross-compiles 5 binaries (mac arm64/x64,               │
   │       linux x64/arm64, win x64)                                   │
   │     - Generates checksums.txt                                     │
   │     - Creates GitHub Release v0.1.1 with all artifacts            │
   └─────────────────────────────────┬────────────────────────────────┘
                                     │
   ┌─────────────────────────────────▼────────────────────────────────┐
   │  3. End user runs:                                                │
   │     curl -fsSL https://idomoo.com/cli/install.sh | bash           │
   │                                                                   │
   │  install.sh:                                                      │
   │     - Detects OS + arch                                           │
   │     - Resolves "latest" via GitHub releases API                   │
   │     - Downloads the right binary + checksums.txt                  │
   │     - Verifies SHA-256                                            │
   │     - Installs to ~/.local/bin/idomoo (chmod +x)                  │
   │     - Warns if PATH needs updating                                │
   └──────────────────────────────────────────────────────────────────┘
```

---

## One-time setup (you do this once)

You'll do these in **two repos**: your CLI source repo (where the JS code lives) and wherever you serve `idomoo.com` from (or skip if you're using raw GitHub URLs).

### Step 1 — Copy files into your CLI repo

From this folder into the root of your `idomoo-cli` GitHub repo:

```bash
cp -r installer/.github                  /path/to/idomoo-cli/   # release workflow
cp -r installer/scripts                  /path/to/idomoo-cli/   # scripts (so users can curl from raw GitHub if you skip a CDN)
cp     installer/HOSTING.md              /path/to/idomoo-cli/
cp     installer/TESTING.md              /path/to/idomoo-cli/
```

The `.github/workflows/release.yml` is what makes the release pipeline run when you push a tag.

### Step 2 — Update repo slug in scripts (if not `djtoon/idomoo`)

In `install.sh` and `install.ps1`, change:

```bash
GITHUB_REPO="${GITHUB_REPO:-djtoon/idomoo}"   # ← line ~13 of install.sh
$GithubRepo = "djtoon/idomoo"                 # ← line ~12 of install.ps1
```

…to your actual GitHub `owner/repo`.

### Step 3 — Push and tag your first release

```bash
cd /path/to/idomoo-cli
git add .github scripts HOSTING.md TESTING.md
git commit -m "Add binary installer pipeline"
git push

# Create the first release
git tag v0.1.1
git push --tags
```

Within ~3 minutes the GitHub Action will:
1. Build all 5 binaries.
2. Create release **v0.1.1** with the binaries + `checksums.txt` attached.

Watch the progress at `https://github.com/<your-org>/idomoo-cli/actions`.

### Step 4 — Verify the install works

Without a custom domain (works immediately):

```bash
curl -fsSL https://raw.githubusercontent.com/<your-org>/idomoo-cli/main/scripts/install.sh | bash
idomoo --help
```

If that works, you're done. The CLI is publicly installable without Node.

### Step 5 (optional) — Host under your own domain

If you want pretty URLs like `idomoo.com/cli/install.sh`, follow [`HOSTING.md`](./HOSTING.md). Three options covered: Vercel, S3+CloudFront, or raw GitHub URLs (no setup).

---

## Releasing a new version

```bash
# 1. Bump version in package.json
npm version patch     # 0.1.1 → 0.1.2

# 2. Push the tag
git push --follow-tags

# 3. Done — Actions builds and uploads the release automatically.
```

Users update with the **same install command** — it always pulls the latest unless they pin a version.

---

## Pre-flight checklist

Before you tag your first real release:

- [ ] `bin/idomoo.js` works locally (`node bin/idomoo.js --help`)
- [ ] `installer/scripts/build-local.sh` succeeds (requires Bun: https://bun.sh)
- [ ] You've updated `GITHUB_REPO` in both install scripts to match your repo
- [ ] You've copied `.github/workflows/release.yml` into your CLI repo root
- [ ] You've followed [`TESTING.md`](./TESTING.md) for at least Mac and Linux

---

## How users uninstall

```bash
# Mac / Linux / WSL
curl -fsSL https://idomoo.com/cli/uninstall.sh | bash

# Windows
irm https://idomoo.com/cli/uninstall.ps1 | iex
```

---

## What you do NOT need

This pipeline gives you `curl | sh` style distribution. If you're also publishing to npm (`PUBLISHING.md`), Homebrew (`HOMEBREW.md`), or Scoop, **all four channels can coexist** — they just point at the same code. Users pick whichever they prefer.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `bun: command not found` in Actions | Workflow installs Bun automatically — make sure you're using the workflow at `.github/workflows/release.yml`. |
| `Resource not accessible by integration` (release fails) | Repo settings → Actions → General → Workflow permissions → "Read and write". |
| Checksum mismatch on user install | Almost always means the release was re-uploaded but the script cached. Bump the patch version and re-tag. |
| Binary too large (~50 MB) | Normal for Bun-compiled CLIs (Bun runtime is bundled). To shrink: use `--minify`, drop unused deps. |
| Mac users see "Unknown developer" warning | Code-sign + notarize the binary (Apple Developer Program, ~$99/yr). Optional but professional. |
| Windows SmartScreen warning | Authenticode signing certificate. Same idea, ~$200/yr. Optional. |

See [`TESTING.md`](./TESTING.md) for a thorough validation walkthrough and [`HOSTING.md`](./HOSTING.md) for putting the scripts behind your own domain.
