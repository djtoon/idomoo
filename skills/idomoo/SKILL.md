---
name: idomoo
description: Use this skill to generate AI videos via the Idomoo API using the `idomoo` CLI tool. Trigger when the user asks to create an AI video, mentions Idomoo, Lucas (Idomoo's AI video creator), or wants to generate, render, or manage video briefs/blueprints/AI videos from the command line. Covers installation, first-time login, the end-to-end create flow, and individual brief/blueprint/video subcommands.
---

# idomoo CLI

Command-line interface for the Idomoo AI Video Generation API (Lucas). Wraps the public REST API at `https://api-ai.idomoo.com` with OAuth2 token handling so you can create videos with a single command.

## When to use this skill

- The user wants to generate an AI video and you have access to a shell.
- The user mentions "Idomoo", "Lucas", or pastes an Idomoo Account ID / API key.
- The user asks about creating briefs, blueprints, or rendering AI videos via the Idomoo API.
- The user wants to script/automate Idomoo video generation.

If the user wants to call the API directly (Python, curl, raw HTTP), this skill still applies — the workflow (auth → brief → blueprint → ai-video) is the same, but prefer the CLI when a shell is available because it handles polling and token refresh.

## Installation

The CLI ships as **standalone binaries** (no Node required) and as an **npm package**. Pick whichever matches the user's environment — binary install is preferred when the user doesn't already have Node ≥ 18.

### A. Native install (recommended — no Node needed)

**macOS / Linux / WSL:**

```bash
curl -fsSL https://raw.githubusercontent.com/djtoon/idomoo/main/scripts/install.sh | bash
```

Installs to `~/.local/bin/idomoo`. Supports arm64 and x86_64.

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/djtoon/idomoo/main/scripts/install.ps1 | iex
```

Installs to `%LOCALAPPDATA%\Programs\idomoo\idomoo.exe` and adds it to the user PATH automatically (requires reopening the terminal).

Both installers auto-detect OS + architecture, download the matching binary from GitHub Releases, and verify SHA-256 checksums. Supported targets:
- `darwin-arm64`, `darwin-x64`
- `linux-x64`, `linux-arm64`
- `win-x64`

To pin a version: append `-s -- --version v0.1.1` (bash) or `-Version v0.1.1` (PowerShell).

### B. npm / pnpm / yarn (requires Node ≥ 18)

```bash
npm install -g idomoo-cli
# or
pnpm add -g idomoo-cli
# or
yarn global add idomoo-cli
```

### C. npx (no install, requires Node ≥ 18)

For one-off use in CI or ad-hoc shells:

```bash
npx --yes idomoo-cli create -p "..."
```

### Verify

```bash
idomoo --help
```

### Troubleshooting install

- **`command not found` after binary install on Mac/Linux**: `~/.local/bin` is not on PATH. Add `export PATH="$HOME/.local/bin:$PATH"` to `~/.zshrc` / `~/.bashrc` and reopen the terminal.
- **`command not found` after npm install**: npm global bin is not on PATH. Find it with `npm config get prefix` — add `<prefix>` (Windows) or `<prefix>/bin` (Mac/Linux) to PATH.
- **Windows SmartScreen warning**: the binary is unsigned. Click "More info" → "Run anyway". This will be fixed with Authenticode signing in a later release.
- **macOS "cannot be opened because the developer cannot be verified"**: run `xattr -d com.apple.quarantine ~/.local/bin/idomoo` once, or right-click → Open.

### Uninstall

```bash
# Native installer
curl -fsSL https://raw.githubusercontent.com/djtoon/idomoo/main/scripts/uninstall.sh | bash
# Windows
irm https://raw.githubusercontent.com/djtoon/idomoo/main/scripts/uninstall.ps1 | iex
# npm
npm uninstall -g idomoo-cli
```

## First-time setup (login)

The CLI authenticates with the Idomoo API using OAuth2 client credentials. Token endpoint is `https://usa-api.idomoo.com/api/v3/oauth/token`, called via HTTP Basic auth. The CLI caches the bearer token in `~/.idomoo/config.json` (Windows: `%USERPROFILE%\.idomoo\config.json`) and auto-refreshes it.

Run once:

```bash
idomoo login
```

You will be prompted for:
- **Idomoo Account ID** — visible characters
- **Idomoo API Secret Key** — input is masked with `*`

The CLI immediately verifies by fetching a token. On success it prints `Verifying credentials... OK`.

You can also pass them non-interactively (handy for CI):

```bash
idomoo login --account-id ACCOUNT_ID --api-key SECRET_KEY
```

To override regional/auth URLs:

```bash
idomoo login --auth-url https://usa-api.idomoo.com/api/v3/oauth/token --api-url https://api-ai.idomoo.com
```

## Quick start — create a video end-to-end

The simplest flow. The `create` command chains brief → blueprint → ai-video and polls until the video URL is ready:

```bash
idomoo create -p "Promote our summer sale to high-spending customers" -t "Summer Sale"
```

It prints status updates at each phase and finishes with the rendered `Video URL: ...`. Useful options:

| Flag | Description |
| --- | --- |
| `-p, --prompt <text>` | **Required.** Natural-language description of what the video should be about. |
| `-t, --title <text>` | Video title. |
| `-s, --script <text>` | Pre-written narration script. If omitted, Lucas writes one from the prompt. |
| `--brand-id <id>` | Use a brand for styling/colors/logo. |
| `--kb-id <id>` | Knowledge base ID to ground the script in. |
| `--audience-name <name>` | Target audience name (e.g. `HeavySpenders`). |
| `--audience-description <text>` | Free-text description of the audience. |
| `-d, --duration <seconds>` | Target duration of the final video (default `30`). |
| `--scene-library-id <id>` | Library of scene templates to use. |
| `--narrator-id <id>` | Voice ID for narration (see `audio/voices` in the API). |
| `--avatar-id <id>` | Avatar to use in the video. |
| `--presenter-id <id>` | Presenter to use in the video. |
| `--use-avatar` | Use the avatar from the chosen presenter. |
| `--media-workspace-id <id>` | Workspace containing media assets (repeatable). |
| `--data-points <json>` | JSON object of dynamic data points to substitute in the script. |
| `--workspace-id <id>` | Destination workspace for the rendered video. |
| `--path <path>` | Destination path within the workspace. |

## Command reference

### `idomoo login [options]`
Save credentials to `~/.idomoo/config.json`. See "First-time setup" above.

### `idomoo config show`
Print the current config (API key is masked) and the path to the config file. Default command if you just run `idomoo config`.

### `idomoo config set [options]`
Update individual fields without re-running login. Flags: `--account-id`, `--api-key`, `--auth-url`, `--api-url`. Updating credentials clears the cached token.

### `idomoo config reset`
Wipe credentials and cached token, restoring URL defaults.

### `idomoo brief create -p "..." [options]`
Create a brief (the input description for the video). Returns a `BriefResponse` with an `id` and a `status` field. Required flag is `-p, --prompt`. Optional: `-t, --title`, `-s, --script`, `--brand-id`, `--kb-id`, `--audience-name`, `--audience-description`. Output is JSON.

### `idomoo brief get <brief_id>`
Fetch a brief by ID. Use to poll status (`Waiting for a file` / `In process` / `Done` / `Error`).

### `idomoo blueprint create -b <brief_id> [options]`
Create a video blueprint (scene structure) from a brief. Required: `-b, --brief-id`. Optional flags include `-d, --duration` (seconds, default 30), `--scene-library-id`, `--narrator-id`, `--avatar-id`, `--presenter-id`, `--use-avatar`, `--brain-model`, `--prompt-version`, `--media-workspace-id` (repeatable). Add `--wait` to block and poll until the blueprint is `Done`.

### `idomoo blueprint get <blueprint_id>`
Fetch a blueprint by ID. Used for polling.

### `idomoo video create -b <blueprint_id> [options]`
Render the final AI video from a blueprint. Required: `-b, --blueprint-id`. Optional: `--data-points '{"key":"val"}'`, `--audience` (repeatable), `--analytic-tag` (repeatable), `--workspace-id`, `--path`, `--brain-model`, `--prompt-version`. Add `--wait` to block until rendering is `Done` and print the final `Video URL`.

### `idomoo video get <ai_video_id>`
Fetch an AI video by ID. When the status reaches `Done`, the response contains `video_url`.

### `idomoo create -p "..." [options]`
End-to-end shortcut that does brief → blueprint → ai-video with polling between each step. Accepts the union of all the flags above. Recommended starting point for one-off video generation.

## Status values

All long-running resources (brief, blueprint, ai-video) have a `status` field with these values:

- `Waiting for a file` — pending external input
- `In process` — actively processing
- `Done` — ready (final video URL is available on AI videos)
- `Error` — failed; check `status_message`

Polling cadence is 4 seconds with a 10-minute total timeout. Errors raise a non-zero exit code so you can chain in shell scripts.

## Configuration file

Stored at `~/.idomoo/config.json` (Windows: `%USERPROFILE%\.idomoo\config.json`). Schema:

```json
{
  "account_id": "...",
  "api_key": "...",
  "auth_url": "https://usa-api.idomoo.com/api/v3/oauth/token",
  "api_url": "https://api-ai.idomoo.com",
  "token": {
    "access_token": "...",
    "token_type": "Bearer",
    "expires_at": 1715000000
  }
}
```

The `token` block is managed automatically. Refresh happens within 60s of expiry or after any 401. To force a fresh token, run `idomoo config reset` and `idomoo login` again.

## Common workflows

**One-shot video from a prompt:**
```bash
idomoo create -p "30-second promo for our new mobile app launch" -t "App Launch"
```

**Video from a pre-written script:**
```bash
idomoo create -p "Educational explainer" -t "How sleep works" \
  -s "Ever wondered why we spend a third of our lives asleep? ..."
```

**Branded video aimed at a specific audience:**
```bash
idomoo create -p "Promote summer sale" -t "Summer Sale" \
  --brand-id brand_67890 --kb-id kb_12345 \
  --audience-name HeavySpenders \
  --audience-description "Upper-middle-class households aged 25-45"
```

**Step-by-step (manual control between steps):**
```bash
brief_id=$(idomoo brief create -p "Quarterly results recap" | jq -r '.id')
blueprint_id=$(idomoo blueprint create -b "$brief_id" --wait | jq -r '.id')
idomoo video create -b "$blueprint_id" --wait
```

**Inspect existing artifacts:**
```bash
idomoo brief get brief_12345
idomoo blueprint get blueprint_67890
idomoo video get aivideo_abcdef
```

## Troubleshooting

- **`Missing credentials`** — run `idomoo login`.
- **`Token request failed (401)`** — wrong account ID / API key. Re-run `idomoo login`.
- **`Token request failed (400/403)`** — make sure the request body is form-urlencoded (`grant_type=client_credentials`), not JSON. The CLI does this automatically; you only see this if you bypassed the CLI.
- **`Processing failed`** — the API returned `status: Error`. Print the `status_message` from the JSON output for the reason; it usually points at a missing brand asset, invalid scene library, or unsupported prompt.
- **`Timed out`** — polling exceeded 10 minutes. The job might still finish on the server. Use `idomoo video get <id>` to keep checking.
- **`'idomoo' is not recognized` / `command not found`** — npm global bin is not on PATH. Find it with `npm config get prefix` and add to PATH, then reopen the terminal.

## Notes for agents using this CLI

- Always run `idomoo login` (or check `~/.idomoo/config.json` exists) before any API command. The CLI errors out clearly if credentials are missing — propagate that to the user instead of guessing.
- Output of every command is JSON on stdout, status messages on stderr/stdout — safe to pipe to `jq` for chaining.
- The `--wait` flag is recommended whenever the next step depends on the resource being ready.
- For long jobs, the `create` end-to-end command is the simplest path. Only drop down to individual `brief`/`blueprint`/`video` subcommands when the user wants to inspect or modify intermediate results.
- Never log the API secret key. The `idomoo config show` output already masks it; preserve that when passing output back to the user.
- Authoritative API spec: the OpenAPI schema at `https://developers.idomoo.com/docs/ai-api-schema/`. Use it when the user asks for endpoints that this CLI doesn't expose yet (the CLI currently covers only the brief/blueprint/ai-video core, not images, audio, brands, music, getty, etc.).
