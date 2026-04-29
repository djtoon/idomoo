---
name: idomoo-npx
description: Use this skill to generate AI videos via the Idomoo `idomoo-cli` package with `npx` — no global install, no native binary. Trigger when the user asks to create, edit, or manage AI videos, mentions Idomoo or Lucas (Idomoo's AI video creator), or wants to work with briefs / blueprints / brands / AI videos and either has Node ≥ 18 available or wants a one-line setup. Implements the same interactive brand → brief → blueprint → video flow as the regular CLI skill, but every command runs through `npx`.
---

# idomoo (npx edition)

Drives the [`idomoo-cli`](https://www.npmjs.com/package/idomoo-cli) npm package via `npx` so the user does not have to globally install or download a native binary. Every command runs through `npx idomoo-cli ...`. Behavior, flags, and output are identical to the natively installed CLI.

## When to use this skill

- The user wants to use Idomoo / Lucas but does not have the `idomoo` binary installed and prefers not to install one.
- The user has Node.js ≥ 18 available (or `npx`).
- The user is in a sandbox / ephemeral environment (CI, scratch container, cowork) where a global install is impractical.

If the user already has the native `idomoo` binary on PATH, prefer the regular `idomoo` skill instead — the commands are shorter.

---

## Setup

### Prerequisite

Node.js ≥ 18 (which ships with `npx`). Verify:

```bash
node --version
npx --version
```

### First-time login

```bash
npx idomoo-cli login --account-id <ACCOUNT_ID> --api-key <API_SECRET_KEY>
```

Or fully interactive (will prompt and mask the API key):

```bash
npx idomoo-cli login
```

Credentials are cached at `~/.idomoo/config.json` (Windows: `%USERPROFILE%\.idomoo\config.json`). The OAuth2 token auto-refreshes — you only run `login` once per machine.

> ⚠️ The first `npx idomoo-cli` invocation downloads the package (a few MB). Subsequent calls hit npx's cache and are fast. If the user objects to the per-call latency, suggest `npm i -g idomoo-cli` and switch to the `idomoo` skill.

### Sanity check

```bash
npx idomoo-cli config show
```

Confirms `account_id`, masked `api_key`, and a non-expired `token`.

---

## 🎬 Interactive video creation flow

Same step-by-step gating as the native CLI — show JSON after each create/edit, pause for approval. Only skip approvals on explicit "one-shot" instruction.

### Step 1 — Pick or create a brand

- **List existing brands:**
  ```bash
  npx idomoo-cli brand list
  ```
- **Create a new brand:**
  ```bash
  npx idomoo-cli brand create -n "Acme Corp" \
    --logo-url "https://example.com/logo.png" \
    --colors "rgb(255,87,51)" --colors "rgb(46,134,171)" \
    --fonts "https://fonts.googleapis.com/css2?family=Inter" \
    --tone-of-voice "friendly, confident" \
    --use-stock-footage
  ```
  Save the returned `id` as `brand_id`.
- **Update an existing brand:**
  ```bash
  npx idomoo-cli brand update <brand_id> --tone-of-voice "more casual"
  ```
- **No brand:** skip and continue without `--brand-id`.

### Step 2 — Gather brief information

Ask for:
- **Prompt** (required) — one-paragraph video description
- **Title**
- **Audience name + description**
- **Script** (optional — Lucas writes one if omitted)
- **Knowledge base ID** (optional)

### Step 3 — Create the brief and show it

```bash
npx idomoo-cli brief create -p "<prompt>" -t "<title>" \
  --brand-id <brand_id> \
  --audience-name "<name>" --audience-description "<desc>"
```

Show the returned brief JSON to the user and ask for approval.

### Step 4 — Edit the brief until approved

- **Natural-language edit:**
  ```bash
  npx idomoo-cli brief edit <brief_id> -u "make the audience young professionals"
  ```
- **Structured patch:**
  ```bash
  npx idomoo-cli brief patch <brief_id> \
    --audience-name "Executives" \
    --tone "authoritative" \
    --call-to-action "Book a demo" \
    --main-message "Cut onboarding time in half"
  ```

Loop until the user approves.

### Step 5 — Create the blueprint

```bash
npx idomoo-cli blueprint create -b <brief_id> -d 30 --wait
```

Show the blueprint JSON to the user.

### Step 6 — Edit the blueprint until approved

```bash
npx idomoo-cli blueprint edit <blueprint_id> -p "use a CTA scene as the last scene" --wait
```

Loop until approved.

### Step 7 — Render the final video

```bash
npx idomoo-cli video create -b <blueprint_id> --wait
```

`--wait` polls until `Done` and prints the final `Video URL`.

### Step 8 (optional) — Save to a workspace

```bash
npx idomoo-cli video save \
  --ai-video-id <id> \
  --workspace-id <id> \
  --folder-id <id> \
  --title "Summer Sale Promo"
```

---

## ⏩ One-shot end-to-end (only when explicitly requested)

```bash
npx idomoo-cli create -p "<prompt>" -t "<title>" --brand-id <brand_id> --wait
```

Chains brief → blueprint → ai-video and returns the final URL.

---

## Command reference (npx prefix on everything)

All `idomoo` subcommands documented in the regular CLI skill work the same way — just prefix with `npx idomoo-cli`. The full taxonomy: `login`, `config (show|set|reset)`, `brand (list|create|get|update)`, `brief (create|get|patch|edit)`, `blueprint (create|get|edit)`, `video (create|get|save)`, `create` (one-shot).

Run `npx idomoo-cli --help` or `npx idomoo-cli <command> --help` for full flag lists.

---

## Status values & polling

Briefs, blueprints, and ai-videos expose a `status` field: `Waiting for a file`, `In process`, `Done`, `Error` (with `status_message`). The CLI polls every 4 s with a 10 min timeout when `--wait` is passed.

---

## Rules for the agent

1. **Default to the interactive flow.** Use `npx idomoo-cli create` only on explicit "one-shot" instruction.
2. **Always pause and show JSON** after `brief create`, `brief edit`, `brief patch`, `blueprint create`, `blueprint edit`. Get approval before proceeding.
3. **Prefer `brief edit -u "..."` / `blueprint edit -p "..."`** for natural-language changes; reserve `brief patch` for explicit field changes.
4. **Use `--wait`** on blueprint-create, blueprint-edit, and video-create so the caller sees the final state, not "In process".
5. **Never log the API Secret Key.** `npx idomoo-cli config show` masks it — preserve that masking when echoing output.
6. **Run `npx idomoo-cli login` first** if you see `Missing credentials`. Don't guess credentials.
7. **Save IDs as you go** — `brand_id`, `brief_id`, `blueprint_id`, `ai_video_id` feed the next step.

---

## Troubleshooting

- `Missing credentials` → `npx idomoo-cli login`.
- `Token request failed (401)` → wrong account ID / API key — re-run login.
- `Processing failed` → check `status_message` from the JSON response.
- `Timed out` → polling exceeded 10 min. The job may still finish on the server — poll with `npx idomoo-cli <resource> get <id>`.
- `npx: installed N in Ms` warning every call → user can switch to `npm i -g idomoo-cli` for instant invocation.
- Network / firewall blocking npm registry → install offline via `npm pack idomoo-cli` then `npm i -g <tarball>` and use the `idomoo` skill instead.

---

## Out-of-scope endpoints

The CLI doesn't yet wrap audio/voices, avatars, presenters search, Getty media, music, knowledge-base CRUD, image generation, or video translation. For those, fall back to direct REST calls using the OAuth2 token cached at `~/.idomoo/config.json`.
