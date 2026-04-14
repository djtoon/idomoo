# Distributing `idomoo-cli` via Homebrew

This guide walks through publishing the Idomoo CLI as a Homebrew formula so macOS and Linux users can install it with:

```bash
brew install idomoo/tap/idomoo-cli
```

There are two routes:

| Route | Effort | When to use |
| --- | --- | --- |
| **Custom tap** (a GitHub repo named `homebrew-tap`) | ~30 min | Recommended. Full control, instant updates. |
| **homebrew-core** (the official repo) | High | Only after the package has wide adoption (≥75 GitHub stars, 30+ days old, stable, and an active project). Most CLIs never qualify and don't need it. |

Below covers the **custom tap** route end-to-end. The formula is the same either way.

---

## Prerequisites

1. **Publish to npm first** — see `PUBLISHING.md`. The Homebrew formula installs the npm package, not source.
2. **A GitHub account/org** to host the tap.
3. **Homebrew installed** locally for testing: https://brew.sh

---

## 1. Create the tap repo

A "tap" is just a GitHub repo named `homebrew-<something>`. The `homebrew-` prefix is required.

```bash
# Create on GitHub: https://github.com/new
#   Owner: idomoo  (or your username)
#   Repo:  homebrew-tap
#   Public, no README/license needed initially

git clone https://github.com/idomoo/homebrew-tap.git
cd homebrew-tap
mkdir Formula
```

Final layout:

```
homebrew-tap/
└── Formula/
    └── idomoo-cli.rb
```

---

## 2. Write the formula

Create `Formula/idomoo-cli.rb`:

```ruby
require "language/node"

class IdomooCli < Formula
  desc "Command-line tool for the Idomoo AI Video Generation API (Lucas)"
  homepage "https://github.com/djtoon/idomoo"
  url "https://registry.npmjs.org/idomoo-cli/-/idomoo-cli-0.1.1.tgz"
  sha256 "REPLACE_WITH_REAL_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "idomoo", shell_output("#{bin}/idomoo --help")
  end
end
```

Key fields:

- **`url`** — the npm tarball for the version you want to ship. Pattern: `https://registry.npmjs.org/<pkg>/-/<pkg>-<version>.tgz`
- **`sha256`** — the SHA-256 of that tarball. Get it with:
  ```bash
  curl -sL https://registry.npmjs.org/idomoo-cli/-/idomoo-cli-0.1.1.tgz | shasum -a 256
  ```
  Or even easier:
  ```bash
  brew fetch --build-from-source idomoo-cli/djtoon/idomoo   # prints expected SHA after a mismatch
  ```
- **`depends_on "node"`** — pulls Homebrew's Node automatically.
- **`Language::Node.std_npm_install_args(libexec)`** — the standard idiom for npm-based formulae: installs into `libexec`, then symlinks `bin/*` into Homebrew's `bin`.
- **`test do ... end`** — runs on `brew test idomoo-cli`. Keep it simple and offline (no API calls).

---

## 3. Test the formula locally

From inside the tap repo:

```bash
# Audit syntax / style
brew audit --strict --new --formula Formula/idomoo-cli.rb

# Install from your local file
brew install --build-from-source --formula ./Formula/idomoo-cli.rb

# Smoke test
idomoo --help

# Run the formula's own test block
brew test idomoo-cli

# Clean up
brew uninstall idomoo-cli
```

If `brew audit` complains about the SHA, copy the *expected* hash from the error message into the formula.

---

## 4. Publish the tap

```bash
git add Formula/idomoo-cli.rb
git commit -m "idomoo-cli 0.1.1"
git push origin main
```

That's it — the tap is live the moment you push.

---

## 5. Users install with

```bash
# Long form
brew install idomoo/tap/idomoo-cli

# Or, after running `brew tap idomoo/tap` once, just:
brew install idomoo-cli
```

The naming convention `<owner>/tap/<formula>` maps to GitHub repo `<owner>/homebrew-tap` and file `Formula/<formula>.rb`.

Verify after install:

```bash
which idomoo
idomoo --help
```

---

## 6. Releasing a new version

Each time you publish a new npm version:

1. Bump `url` to the new tarball.
2. Update `sha256` to the new tarball's hash.
3. Commit & push.

Quick one-liner to generate the new SHA:

```bash
VERSION=0.1.2
curl -sL "https://registry.npmjs.org/idomoo-cli/-/idomoo-cli-${VERSION}.tgz" | shasum -a 256
```

Users get the update with:

```bash
brew update && brew upgrade idomoo-cli
```

---

## 7. Automating bumps (optional)

Two common approaches:

### 7.1 `livecheck` block (lets `brew bump-formula-pr` figure out the latest version)

Add inside the formula:

```ruby
livecheck do
  url "https://registry.npmjs.org/idomoo-cli/latest"
  regex(/"version":"([^"]+)"/i)
end
```

Then, whenever you want to refresh:

```bash
brew bump-formula-pr --version=0.1.2 idomoo/tap/idomoo-cli
```

This will compute the new SHA and open a PR against your tap.

### 7.2 GitHub Actions in the tap repo

Create `.github/workflows/bump.yml` in `homebrew-tap`:

```yaml
name: Bump on npm release
on:
  schedule: [{ cron: '0 6 * * *' }]
  workflow_dispatch:

jobs:
  bump:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Homebrew/actions/setup-homebrew@master
      - name: Bump if outdated
        env:
          HOMEBREW_GITHUB_API_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          brew tap idomoo/tap "$GITHUB_WORKSPACE"
          brew livecheck idomoo-cli --json | jq .
          brew bump-formula-pr --no-browse --no-audit \
            --tag="$(curl -s https://registry.npmjs.org/idomoo-cli/latest | jq -r .version)" \
            idomoo/tap/idomoo-cli || true
```

Now your tap auto-PRs itself whenever a new npm version appears.

---

## 8. (Optional) Promote to homebrew-core later

Once `idomoo-cli` is stable and popular, you can submit the same formula to https://github.com/Homebrew/homebrew-core. Requirements:

- Project ≥ 30 days old, ≥ 75 GitHub stars, ≥ 30 forks (or significant downloads/usage).
- Notable, useful to a broad audience.
- No vendor-specific tooling.
- Passes `brew audit --strict --online` cleanly.

If accepted, users install with just:

```bash
brew install idomoo-cli      # no tap needed
```

Until then, the custom tap is the right home.

---

## 9. Common errors

| Error | Fix |
| --- | --- |
| `SHA256 mismatch — expected X, got Y` | Replace `sha256` in the formula with `Y`. Almost always means you bumped `url` without updating the hash. |
| `Error: Calling bottle :unneeded is disabled!` | Old syntax. Remove any `bottle :unneeded` line — npm formulae don't need bottles. |
| `Cannot install: depends on itself` | Tap and formula share a name — rename one. |
| `command not found: idomoo` after install | Confirm `bin.install_symlink` line is present. Run `brew link --overwrite idomoo-cli`. |
| `brew audit` complains about `desc` length | Keep `desc` ≤ 80 chars, no trailing period, no leading "A"/"An". |
| `Homebrew/core formula already exists` | If you ever submit upstream — the tap version still works; users prefer the core one. |

---

## 10. Release flow at a glance

```bash
# 1. Publish to npm (see PUBLISHING.md)
npm version patch
npm publish --access public

# 2. Get the new tarball SHA
VERSION=$(npm view idomoo-cli version)
SHA=$(curl -sL "https://registry.npmjs.org/idomoo-cli/-/idomoo-cli-${VERSION}.tgz" | shasum -a 256 | awk '{print $1}')

# 3. Update the formula
cd ../homebrew-tap
sed -i '' "s|idomoo-cli-.*\.tgz|idomoo-cli-${VERSION}.tgz|" Formula/idomoo-cli.rb
sed -i '' "s|sha256 \".*\"|sha256 \"${SHA}\"|"            Formula/idomoo-cli.rb

# 4. Test
brew uninstall idomoo-cli 2>/dev/null
brew install --build-from-source --formula ./Formula/idomoo-cli.rb
idomoo --help

# 5. Ship
git commit -am "idomoo-cli ${VERSION}"
git push
```

Users on Mac or Linux can now run `brew install idomoo/tap/idomoo-cli`.
