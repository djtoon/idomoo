# Publishing `idomoo-cli` to npm

This document walks through publishing the Idomoo CLI to the public npm registry so users can install it with `npm install -g idomoo-cli`.

---

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js ≥ 18** | Required by the package's `engines` field. Verify with `node -v`. |
| **npm CLI** | Ships with Node.js. Verify with `npm -v`. |
| **npm account** | Create one at https://www.npmjs.com/signup if you don't have one. |
| **2FA enabled (recommended)** | Required for "automation" tokens and high-trust packages. |
| **Owner of the `idomoo-cli` name** | Either the name is unclaimed, or you're added as a maintainer of the existing package. Check with `npm view idomoo-cli`. |

If `idomoo-cli` is already taken by someone else, you'll need to publish under a scope (e.g. `@idomoo/cli`) — see the *Scoped package* section at the bottom.

---

## 2. One-time setup

### 2.1 Log in to npm

```bash
npm login
```

This opens a browser window for authentication. After it completes, verify with:

```bash
npm whoami
```

### 2.2 Confirm the package metadata

Open `package.json` and review:

```jsonc
{
  "name": "idomoo-cli",          // must be unique on npm
  "version": "0.1.1",            // semver — bump on every publish
  "description": "...",
  "bin": { "idomoo": "bin/idomoo.js" },
  "files": ["bin", "src", "skills"],
  "engines": { "node": ">=18" },
  "license": "MIT"
}
```

Make sure:
- `name` is the exact name you want users to install.
- `version` is greater than the version currently on npm. You can never re-publish the same version.
- `files` includes everything that needs to ship (and excludes anything sensitive like `.env`, secrets, or local config).
- `bin` paths exist and are executable Node scripts (start with `#!/usr/bin/env node`).

---

## 3. Pre-publish checklist

Run through this every time before you publish:

```bash
# 1. From the project root
cd C:/idomooCli

# 2. Install dependencies clean
npm install

# 3. Smoke-test the CLI locally
node bin/idomoo.js --help

# 4. (Optional but recommended) Test the install as if from npm
npm pack
# This produces idomoo-cli-<version>.tgz — install it globally to test:
npm install -g ./idomoo-cli-0.1.1.tgz
idomoo --help
# Clean up after testing:
npm uninstall -g idomoo-cli
```

The `npm pack` step is the safest way to see exactly what will ship — it produces the same tarball that `npm publish` uploads. Open the `.tgz` to confirm only the files you want are inside.

---

## 4. Bump the version

Use `npm version` — it edits `package.json` and creates a git tag:

```bash
# Patch release (0.1.1 → 0.1.2) — bug fixes
npm version patch

# Minor release (0.1.1 → 0.2.0) — new features, no breaking changes
npm version minor

# Major release (0.1.1 → 1.0.0) — breaking changes
npm version major
```

If you're not in a git repo, add `--no-git-tag-version` to skip the tag.

---

## 5. Publish

For a normal public release:

```bash
npm publish --access public
```

The `--access public` flag is mandatory for **scoped** packages (e.g. `@idomoo/cli`). For an unscoped package like `idomoo-cli` it's a harmless safety net.

You should see something like:

```
+ idomoo-cli@0.1.2
```

Verify it's live:

```bash
npm view idomoo-cli
npm install -g idomoo-cli
idomoo --help
```

---

## 6. Publishing a pre-release / beta

To ship a version users won't get with `npm install -g idomoo-cli` by default:

```bash
npm version prerelease --preid=beta   # e.g. 0.2.0-beta.0
npm publish --tag beta
```

Users opt in with:

```bash
npm install -g idomoo-cli@beta
```

The default `latest` tag is unaffected.

---

## 7. Unpublishing / fixing mistakes

- **Within 72 hours of publishing**, you can unpublish:
  ```bash
  npm unpublish idomoo-cli@0.1.2
  ```
- **After 72 hours**, npm only lets you *deprecate* a version:
  ```bash
  npm deprecate idomoo-cli@0.1.2 "Broken — use 0.1.3 instead"
  ```

You can never re-use a published version number. If you mess up `0.1.2`, publish `0.1.3`.

---

## 8. Automating with GitHub Actions (optional)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # for npm provenance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Generate an **automation token** at https://www.npmjs.com/settings/<username>/tokens (type: *Automation* — bypasses 2FA) and add it to the repo as `NPM_TOKEN` under *Settings → Secrets and variables → Actions*.

Then to release:
```bash
npm version patch
git push --follow-tags
```

GitHub Actions will pick up the tag and publish.

---

## 9. Scoped package fallback (if `idomoo-cli` is taken)

If the unscoped name isn't available, publish under your npm scope:

1. Create the org/scope on npm (`@idomoo`) — https://www.npmjs.com/org/create
2. Edit `package.json`:
   ```json
   { "name": "@idomoo/cli" }
   ```
3. Publish:
   ```bash
   npm publish --access public
   ```
4. Users install with:
   ```bash
   npm install -g @idomoo/cli
   ```

The `bin` entry stays the same — `idomoo` will still be the command users run.

---

## 10. Common errors

| Error | Cause | Fix |
| --- | --- | --- |
| `403 Forbidden — You do not have permission to publish "idomoo-cli"` | Someone else owns the name, or you're not logged in as a maintainer. | Check `npm view idomoo-cli`. Use a scoped name, or ask to be added as a maintainer. |
| `403 — version already exists` | You forgot to bump `version`. | Run `npm version patch` and republish. |
| `EOTP — please enter the OTP` | 2FA enabled, no token provided. | Run `npm publish --otp=123456` with your authenticator code. In CI, use an automation token. |
| `npm ERR! private` | `"private": true` in `package.json` blocks publishing. | Remove that field. |
| Files missing in the published tarball | Path not in the `files` array. | Add the path; verify with `npm pack` and inspect the tarball. |
| `idomoo: command not found` after install | Global bin not on PATH. | `npm config get prefix` → add the resulting folder (Windows) or `<prefix>/bin` (macOS/Linux) to PATH. |

---

## 11. Release flow at a glance

```bash
# 1. Make sure code is good
npm install
node bin/idomoo.js --help

# 2. Bump version
npm version patch

# 3. (Optional) preview what ships
npm pack && tar -tzf idomoo-cli-*.tgz

# 4. Publish
npm publish --access public

# 5. Push tags if using git
git push --follow-tags

# 6. Verify
npm view idomoo-cli version
```

That's it — users worldwide can now run `npm install -g idomoo-cli`.
