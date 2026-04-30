---
name: idomoo-npx
description: Use this skill to generate AI videos via the Idomoo `idomoo-cli` package with `npx` — no global install, no native binary. Trigger when the user asks to create, edit, or manage AI videos, mentions Idomoo or Lucas (Idomoo's AI video creator), or wants to work with briefs / blueprints / brands / AI videos and either has Node ≥ 18 available or wants a one-line setup. Implements the full interactive brand → brief → blueprint → video flow with user review and edits between steps — every command is the same as the regular `idomoo` CLI but prefixed with `npx idomoo-cli`.
---

# idomoo (npx edition)

Drives the [`idomoo-cli`](https://www.npmjs.com/package/idomoo-cli) npm package via `npx` so the user does not have to globally install or download a native binary. Every command here is identical to the regular `idomoo` CLI skill — same flags, same output, same behavior — just prefixed with `npx idomoo-cli`.

## When to use this skill

- The user wants to generate, edit, or manage AI videos and you have access to a shell.
- The user has Node.js ≥ 18 available (or `npx`).
- The user does **not** have the `idomoo` binary on PATH and prefers not to install one (sandbox / ephemeral environment / cowork / quick test).

If the user already has the native `idomoo` binary installed, prefer the regular `idomoo` skill instead — the commands are shorter.

---

## Setup

### Prerequisite

Node.js ≥ 18 (which ships with `npx`). Verify:

```bash
node --version
npx --version
```

### First-time login

Interactive (prompts for Account ID + API Secret Key, key is masked):

```bash
npx idomoo-cli login
```

Non-interactive (good for CI / scripts):

```bash
npx idomoo-cli login --account-id <ACCOUNT_ID> --api-key <API_SECRET_KEY>
```

Optional regional overrides:

```bash
npx idomoo-cli login --auth-url <AUTH_URL> --api-url <API_URL>
```

Credentials are cached at `~/.idomoo/config.json` (Windows: `%USERPROFILE%\.idomoo\config.json`). The OAuth2 token auto-refreshes — you only run `login` once per machine.

> ⚠️ The first `npx idomoo-cli` invocation downloads the package (a few MB). Subsequent calls hit npx's cache and are fast. If the user objects to the per-call latency, suggest `npm i -g idomoo-cli` and switch to the regular `idomoo` skill.

### Sanity check

```bash
npx idomoo-cli config show
```

Confirms `account_id`, masked `api_key`, and a non-expired `token`.

---

## 🎬 Interactive video creation flow

**This is the primary way to use the skill.** Never jump straight to `npx idomoo-cli create` unless the user explicitly asks for a one-shot. Walk the user through the steps below, pausing for confirmation at each gate.

### Step 1 — Pick or create a brand

Ask the user: *"Which brand should this video use? I can list existing brands, or we can skip branding for this one."*

- **List existing brands:**
  ```bash
  npx idomoo-cli brand list
  ```
  Show the user `id` + `name` for each returned brand. Let them pick one (remember the `brand_id`).

- **Create a new brand** (if the user wants fresh branding):
  ```bash
  npx idomoo-cli brand create -n "Acme Corp" \
    --logo-url "https://example.com/logo.png" \
    --colors "rgb(255,87,51)" --colors "rgb(46,134,171)" \
    --fonts "https://fonts.googleapis.com/css2?family=Inter" \
    --tone-of-voice "friendly, confident" \
    --use-stock-footage
  ```
  Gather values from the user conversationally (name is required; everything else optional). The response has `id` — remember it as `brand_id`.

- **Update an existing brand** later if needed:
  ```bash
  npx idomoo-cli brand update <brand_id> --tone-of-voice "more casual" --colors "rgb(0,0,0)"
  ```

- **No brand:** skip this step and continue without `--brand-id`.

### Step 2 — Gather brief information

Ask the user for:
- **Prompt** (required) — one-paragraph description of what the video is about
- **Title** — video title
- **Audience name + description** — who it's for
- **Script** — if they have pre-written narration (otherwise Lucas writes it)
- **Knowledge base ID** — if they want the script grounded in specific docs
- **Assets / PPT / parameters** — advanced (JSON payloads, skip unless asked)

### Step 3 — Create the brief and show it

```bash
npx idomoo-cli brief create -p "<prompt>" -t "<title>" \
  --brand-id <brand_id> \
  --audience-name "<name>" --audience-description "<desc>"
```

The response has `id` (`brief_id`) and a structured `Brief` body (audience, main_messages, script, tone, narrator_style, call_to_action, custom_instructions). **Show this to the user** and ask: *"Does the brief look right? I can edit any part of it before we continue."*

### Step 4 — Edit the brief until the user approves

The API exposes two ways to edit a brief. Pick whichever fits the user's request:

**(a) Natural-language edit** — best when the user gives a free-form instruction:
```bash
npx idomoo-cli brief edit <brief_id> -u "make the audience young professionals"
npx idomoo-cli brief edit <brief_id> -u "shorten the script to 3 key points"
npx idomoo-cli brief edit <brief_id> -u "change the call to action to 'Sign up today'"
```

**(b) Structured patch** — best when the user knows exactly which field to change:
```bash
npx idomoo-cli brief patch <brief_id> \
  --audience-name "Executives" \
  --audience-description "C-level decision makers in mid-market SaaS" \
  --tone "authoritative" \
  --call-to-action "Book a demo" \
  --main-message "Cut onboarding time in half" \
  --main-message "Enterprise-grade security" \
  --script-line "Opening hook..." \
  --script-line "Key benefit..." \
  --narrator-style "confident" \
  --custom-instructions "Avoid industry jargon"
```

After each edit, print the updated brief JSON and ask the user: *"Good to go, or more changes?"* Loop until they say **"approved"** or similar.

### Step 5 — Create the blueprint and show it

Once the brief is approved:

```bash
npx idomoo-cli blueprint create -b <brief_id> \
  -d 30 \
  --scene-library-id <id>      # optional
  --narrator-id <id>            # optional
  --presenter-id <id>           # optional
  --use-avatar                  # optional
  --media-workspace-id <id>     # repeatable
  --wait                        # blocks until Done
```

Show the returned blueprint to the user. Explain: *"This is the scene-by-scene structure of your video. I can adjust it before we render."*

### Step 6 — Edit the blueprint until the user approves

Blueprints only support natural-language editing:

```bash
npx idomoo-cli blueprint edit <blueprint_id> -p "use a CTA scene as the last scene"
npx idomoo-cli blueprint edit <blueprint_id> -p "swap the first two scenes"
npx idomoo-cli blueprint edit <blueprint_id> -p "replace the product demo with a testimonial"
```

Add `--wait` to block until the update is applied. Show the user the updated blueprint. Loop until approved.

### Step 7 — Render the final video

When the user approves the blueprint:

```bash
npx idomoo-cli video create -b <blueprint_id> \
  --data-points '{"customer_name":"Jane"}' \
  --audience HeavySpenders \
  --analytic-tag Q2Campaign \
  --workspace-id <id> \
  --path /videos \
  --wait
```

The `--wait` flag polls until the video is `Done` and prints the final `Video URL`. Present it to the user.

### Step 8 (optional) — Save to a workspace

If the user wants the rendered video persisted to a specific workspace/folder:

```bash
npx idomoo-cli video save \
  --ai-video-id <id> \
  --workspace-id <id> \
  --folder-id <id> \
  --title "Summer Sale Promo"
```

---

## ⏩ One-shot end-to-end (only when explicitly requested)

If the user says *"just make it"* or *"don't ask me, I trust you"*, skip the interactive flow and run:

```bash
npx idomoo-cli create -p "<prompt>" -t "<title>" --brand-id <brand_id> [other flags]
```

This chains brief → blueprint → ai-video with polling and returns the final URL. Accepts the union of brief/blueprint/video flags.

---

## Complete command reference

### Authentication & config
- `npx idomoo-cli login [--account-id ID --api-key KEY --auth-url URL --api-url URL]`
- `npx idomoo-cli config show`
- `npx idomoo-cli config set [--account-id ID ...]`
- `npx idomoo-cli config reset`

### Brand
- `npx idomoo-cli brand list [-n NAME]` — list/search brands
- `npx idomoo-cli brand create -n NAME [--logo-url URL --colors RGB... --fonts URL... --use-stock-footage --reference-image-url URL --tone-of-voice TEXT --tone-instruction TEXT --pronunciation-dictionary JSON]`
- `npx idomoo-cli brand get <brand_id>`
- `npx idomoo-cli brand update <brand_id> [same options as create]`

### Brief
- `npx idomoo-cli brief create -p PROMPT [-t TITLE -s SCRIPT --brand-id ID --kb-id ID --audience-name NAME --audience-description TEXT --assets JSON --ppt URL --parameters JSON]`
- `npx idomoo-cli brief get <brief_id>`
- `npx idomoo-cli brief patch <brief_id> [--audience-name --audience-description --main-message (repeat) --script-line (repeat) --call-to-action --tone --narrator-style --custom-instructions]`
- `npx idomoo-cli brief edit <brief_id> -u "natural-language change"` — Lucas applies the change

### Blueprint
- `npx idomoo-cli blueprint create -b BRIEF_ID [-d DURATION --scene-library-id ID --narrator-id ID --avatar-id ID --presenter-id ID --use-avatar --brain-model NAME --prompt-version VER --media-workspace-id ID (repeat) --wait]`
- `npx idomoo-cli blueprint get <blueprint_id>`
- `npx idomoo-cli blueprint edit <blueprint_id> -p "natural-language change" [--wait]`

### AI Video
- `npx idomoo-cli video create -b BLUEPRINT_ID [--data-points JSON --audience NAME (repeat) --analytic-tag TAG (repeat) --workspace-id ID --path PATH --brain-model NAME --prompt-version VER --wait]`
- `npx idomoo-cli video get <ai_video_id>`
- `npx idomoo-cli video save --ai-video-id ID --workspace-id ID [--folder-id ID --title TEXT]`

### One-shot
- `npx idomoo-cli create -p PROMPT [...union of all brief/blueprint/video flags]`

---

## Status values & polling

Brief, blueprint, and ai-video all have a `status` field:

- `Waiting for a file` — pending external input
- `In process` — actively processing
- `Done` — ready
- `Error` — failed; read `status_message`

The CLI polls every 4 s with a 10 min timeout when `--wait` is passed. Errors exit non-zero.

---

## Rules for the agent

1. **Default to the interactive flow** (brand → brief → review/edit → blueprint → review/edit → video). Only use `npx idomoo-cli create` when the user explicitly asks for a one-shot.
2. **Always pause and show JSON** after `brief create`, `brief edit`, `brief patch`, `blueprint create`, `blueprint edit`. Ask for approval before moving on.
3. **Prefer `brief edit -u "..."` / `blueprint edit -p "..."`** when the user describes changes in natural language. Use `brief patch` only when they specify exact fields.
4. **Never log the API Secret Key**; `npx idomoo-cli config show` masks it — preserve that in any output you pass back to the user.
5. **Run `npx idomoo-cli login` first** if the CLI returns `Missing credentials`. Propagate the error; don't guess credentials.
6. **Use `--wait`** on blueprint-create, blueprint-edit, and video-create so the caller sees the final state, not an intermediate "In process".
7. **Save the brand_id, brief_id, blueprint_id, ai_video_id** as you go — subsequent commands need them.
8. **Output is JSON on stdout**; safe to pipe to `jq` for chaining. Status lines go to stdout/stderr.

---

## Troubleshooting

- `Missing credentials` → run `npx idomoo-cli login`.
- `Token request failed (401)` → wrong account ID / API key; re-run `npx idomoo-cli login`.
- `Processing failed` → read `status_message` from the JSON for the reason (usually missing brand asset, invalid scene library, or unsupported prompt).
- `Timed out` → polling exceeded 10 min. Job may still finish; use `npx idomoo-cli <resource> get <id>` to keep checking.
- `npx: installed N in Ms` warning every call → switch to `npm i -g idomoo-cli` (then use the regular `idomoo` skill — same commands without the `npx idomoo-cli` prefix).
- Network / firewall blocking the npm registry → `npm pack idomoo-cli` then `npm i -g <tarball>` and switch to the regular `idomoo` skill.

---

## Not yet exposed via the CLI

The API has additional endpoints (audio/voices, avatars, presenters search, Getty media, music, knowledge base CRUD, images, video translation). These are marked `x-internal` in the public OpenAPI schema. If the user asks for something in those domains, fall back to direct `curl` calls using the OAuth2 token from `~/.idomoo/config.json` — or tell them it's out of scope for the CLI today.
