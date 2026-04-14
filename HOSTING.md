# Hosting `install.sh` and `install.ps1` under your domain

The end goal is making this work:

```bash
# Mac / Linux / WSL
curl -fsSL https://idomoo.com/cli/install.sh | bash

# Windows PowerShell
irm https://idomoo.com/cli/install.ps1 | iex
```

The script files themselves are tiny static text. You have several hosting options — pick whichever your team already uses.

---

## Option 1 — Vercel / Netlify / Cloudflare Pages (easiest)

Push the `scripts/` folder to a static site under `idomoo.com/cli/`. Both files are served as plain text.

### Vercel example

Create `vercel.json` at the root of whatever repo serves `idomoo.com`:

```json
{
  "rewrites": [
    { "source": "/cli/install.sh",     "destination": "/cli/install.sh"     },
    { "source": "/cli/install.ps1",    "destination": "/cli/install.ps1"    },
    { "source": "/cli/uninstall.sh",   "destination": "/cli/uninstall.sh"   },
    { "source": "/cli/uninstall.ps1",  "destination": "/cli/uninstall.ps1"  }
  ],
  "headers": [
    { "source": "/cli/install.sh",     "headers": [{ "key": "Content-Type", "value": "text/x-shellscript; charset=utf-8" }] },
    { "source": "/cli/install.ps1",    "headers": [{ "key": "Content-Type", "value": "text/plain; charset=utf-8" }] }
  ]
}
```

Drop `install.sh`, `install.ps1`, `uninstall.sh`, `uninstall.ps1` into a `public/cli/` folder and deploy.

---

## Option 2 — S3 + CloudFront (or Cloudflare R2)

```bash
aws s3 cp scripts/install.sh   s3://idomoo-cli/cli/install.sh   --content-type "text/x-shellscript"
aws s3 cp scripts/install.ps1  s3://idomoo-cli/cli/install.ps1  --content-type "text/plain"
```

Point a CloudFront distribution at the bucket and a CNAME from `idomoo.com/cli/...` to it.

---

## Option 3 — Skip the custom domain (simplest)

If you don't need `idomoo.com` branding, just tell users to curl directly from the GitHub repo (works the moment you push):

```bash
curl -fsSL https://raw.githubusercontent.com/djtoon/idomoo/main/installer/scripts/install.sh | bash
```

Same UX, no hosting required. You can always upgrade to a custom domain later — the install script will still point at the same GitHub Releases.

---

## Important: keep the scripts in sync with the binaries

The install scripts download binaries from:

```
https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/idomoo-<os>-<arch>
```

So the only thing that needs to be true:

1. **Your release workflow** uploads exactly those file names (it does — see `.github/workflows/release.yml`).
2. **`GITHUB_REPO`** in `install.sh` / `install.ps1` matches the real repo slug (default: `djtoon/idomoo` — change at the top of each script).

---

## CDN cache busting

When you update `install.sh`, your CDN may cache the old version for hours. Either:

- Set a short cache header (`Cache-Control: max-age=300`).
- Manually purge after each script change.
- Use a content hash in the URL for *binary* assets — you don't need to for the scripts themselves.

---

## Test the hosted scripts before announcing

```bash
# Dry-run from a clean Linux container
docker run --rm -it ubuntu:22.04 bash -c '
  apt-get update -qq && apt-get install -qq -y curl ca-certificates >/dev/null
  curl -fsSL https://idomoo.com/cli/install.sh | bash
  /root/.local/bin/idomoo --help
'
```

Verify the same thing on Mac and on Windows PowerShell before you tell anyone the URL works.
