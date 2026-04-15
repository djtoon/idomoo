# Idomoo — AI Video for your terminal & AI agents

Four ways to use the Idomoo AI Video Generation API (Lucas) from anywhere:

1. **[Claude Desktop extension](./mcpb/)** — double-click `idomoo.mcpb` to install 14 MCP tools into Claude Desktop
2. **[Manual MCP server](./mcpb/)** — point Cursor, Claude Code, or any MCP client at the bundled local server
3. **[CLI](./scripts/)** — native binary on macOS, Linux, and Windows (no Node required)
4. **[Agent skill](./skills/idomoo/)** — a `SKILL.md` that teaches Claude Code, Cursor, Copilot, etc. to drive the CLI in plain English

👉 **Full install guide: https://djtoon.github.io/idomoo/**

---

## Quick start

### Option A — Claude Desktop (one-click)

Download and double-click: **https://github.com/djtoon/idomoo/releases/latest/download/idomoo.mcpb**

Claude Desktop opens an install dialog, asks for your Account ID + API Key, and you're done. Try: *"Create a 30-second promo video for a coffee shop."*

### Option B — CLI

```bash
curl -fsSL https://raw.githubusercontent.com/djtoon/idomoo/main/scripts/install.sh | bash
idomoo login
idomoo create -p "Promote our summer sale" -t "Summer Sale"
```

### Option C — MCP in Cursor / Claude Code

See [`mcpb/README.md`](./mcpb/README.md) for manual MCP server setup.

---

## Install (full options)

### Native (recommended — no Node.js required) ⭐

**macOS / Linux / WSL**
```bash
curl -fsSL https://raw.githubusercontent.com/djtoon/idomoo/main/scripts/install.sh | bash
```
Installs to `~/.local/bin/idomoo`. Supports Apple Silicon, Intel Macs, x86_64 and arm64 Linux.

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/djtoon/idomoo/main/scripts/install.ps1 | iex
```
Installs to `%LOCALAPPDATA%\Programs\idomoo\idomoo.exe` and adds it to your user PATH automatically.

Pin a version with `--version v0.1.1` (bash) or `-Version v0.1.1` (PowerShell).

### npm / pnpm / yarn (requires Node.js ≥ 18)

```bash
npm install -g idomoo-cli
# or
pnpm add -g idomoo-cli
# or
yarn global add idomoo-cli
```

### npx (one-off, requires Node.js ≥ 18)

```bash
npx --yes idomoo-cli create -p "..."
```

### Verify

```bash
idomoo --help
```

> If `idomoo` is "not recognized" / "command not found" after the native install, `~/.local/bin` isn't on PATH — add `export PATH="$HOME/.local/bin:$PATH"` to your shell rc and reopen the terminal. For npm installs, find the global bin with `npm config get prefix`.

---

## First-time setup

The CLI authenticates via OAuth2 client credentials and caches the bearer token at `~/.idomoo/config.json` (Windows: `%USERPROFILE%\.idomoo\config.json`).

```bash
idomoo login
```

You'll be prompted for:
- **Idomoo Account ID**
- **Idomoo API Secret Key** (input is masked)

Or pass them non-interactively (handy for CI):

```bash
idomoo login --account-id ACCOUNT_ID --api-key SECRET_KEY
```

Override regional/auth URLs:

```bash
idomoo login \
  --auth-url https://usa-api.idomoo.com/api/v3/oauth/token \
  --api-url https://api-ai.idomoo.com
```

---

## Quick start — create a video end-to-end

The simplest flow. `create` chains brief → blueprint → ai-video and polls until the rendered video URL is ready:

```bash
idomoo create -p "Promote our summer sale to high-spending customers" -t "Summer Sale"
```

Useful options:

| Flag | Description |
| --- | --- |
| `-p, --prompt <text>` | **Required.** Natural-language description of what the video should be about. |
| `-t, --title <text>` | Video title. |
| `-s, --script <text>` | Pre-written narration script. If omitted, Lucas writes one from the prompt. |
| `--brand-id <id>` | Use a brand for styling/colors/logo. |
| `--kb-id <id>` | Knowledge base ID to ground the script in. |
| `--audience-name <name>` | Target audience name (e.g. `HeavySpenders`). |
| `--audience-description <text>` | Free-text description of the audience. |
| `-d, --duration <seconds>` | Target video duration (default `30`). |
| `--scene-library-id <id>` | Library of scene templates to use. |
| `--narrator-id <id>` | Voice ID for narration. |
| `--avatar-id <id>` | Avatar to use in the video. |
| `--presenter-id <id>` | Presenter to use in the video. |
| `--use-avatar` | Use the avatar from the chosen presenter. |
| `--media-workspace-id <id>` | Workspace containing media assets (repeatable). |
| `--data-points <json>` | JSON object of dynamic data points to substitute in the script. |
| `--workspace-id <id>` | Destination workspace for the rendered video. |
| `--path <path>` | Destination path within the workspace. |

---

## Command reference

### Authentication & config

```bash
idomoo login                                    # interactive setup
idomoo config show                              # print current config (api key masked)
idomoo config set --account-id ID --api-key KEY # update fields without re-running login
idomoo config reset                             # wipe credentials & cached token
```

### Brief

```bash
idomoo brief create -p "..." [-t TITLE] [-s SCRIPT] \
  [--brand-id ID] [--kb-id ID] \
  [--audience-name NAME] [--audience-description TEXT]

idomoo brief get <brief_id>
```

### Blueprint

```bash
idomoo blueprint create -b <brief_id> \
  [-d 30] [--scene-library-id ID] \
  [--narrator-id ID] [--avatar-id ID] [--presenter-id ID] [--use-avatar] \
  [--brain-model NAME] [--prompt-version VER] \
  [--media-workspace-id ID]... \
  [--wait]

idomoo blueprint get <blueprint_id>
```

### Video

```bash
idomoo video create -b <blueprint_id> \
  [--data-points '{"key":"val"}'] \
  [--audience NAME]... [--analytic-tag TAG]... \
  [--workspace-id ID] [--path PATH] \
  [--brain-model NAME] [--prompt-version VER] \
  [--wait]

idomoo video get <ai_video_id>
```

### End-to-end

```bash
idomoo create -p "..." [all the flags above]
```

---

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

---

## Status values

All long-running resources (brief, blueprint, ai-video) expose a `status` field:

- `Waiting for a file` — pending external input
- `In process` — actively processing
- `Done` — ready (final video URL is available on AI videos)
- `Error` — failed; check `status_message`

Polling cadence is **4 seconds** with a **10-minute** total timeout. Errors return a non-zero exit code so you can chain in shell scripts.

---

## Configuration file

Stored at `~/.idomoo/config.json` (Windows: `%USERPROFILE%\.idomoo\config.json`). Permissions are set to `0600` on Unix.

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

The `token` block is managed automatically — refreshed within 60 s of expiry or after any 401. Force a fresh token with `idomoo config reset && idomoo login`.

---

## 🤖 Use it inside an AI agent (Claude Code, Cursor, Copilot, …)

This package ships with an **Agent Skill** — a `SKILL.md` instruction file that teaches AI coding assistants how to drive the CLI for you. Once installed, you can ask your agent in plain English:

> *"Create a 30-second promo video for our spring collection"*

…and it will run the right `idomoo` commands for you.

### Install the skill

**With the [skills CLI](https://skills.sh/) (works with Claude Code, Cursor, Copilot, Cline, Windsurf, and 18+ other agents):**

```bash
npx skills add djtoon/idomoo
```

**As a Claude Code plugin:**

```text
/plugin marketplace add djtoon/idomoo
/plugin install idomoo@idomoo
```

**Or just paste this to your coding assistant:**

> Install the Idomoo agent skill from `https://github.com/djtoon/idomoo` and use it to manage Idomoo videos.

The skill teaches the agent the full brief → blueprint → video workflow, all CLI flags, status polling, and troubleshooting steps.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Missing credentials` | Run `idomoo login`. |
| `Token request failed (401)` | Wrong account ID / API key — re-run `idomoo login`. |
| `Token request failed (400/403)` | Make sure the request body is form-urlencoded (`grant_type=client_credentials`). The CLI does this; you only see this if you bypassed it. |
| `Processing failed` | API returned `status: Error`. Check `status_message` for the reason — usually a missing brand asset, invalid scene library, or unsupported prompt. |
| `Timed out` | Polling exceeded 10 minutes; the job may still finish on the server. Use `idomoo video get <id>` to keep checking. |
| `'idomoo' is not recognized` / `command not found` | npm global bin is not on PATH — see *Install* section above. |

---

## Links

- **API docs:** https://developers.idomoo.com/
- **Idomoo Studio:** https://studio.idomoo.com
- **Agent skill / plugin:** https://github.com/djtoon/idomoo
- **Issues:** https://github.com/djtoon/idomoo/issues

---

## License

MIT
