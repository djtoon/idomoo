---
name: idomoo-mcp
description: Use this skill to generate AI videos via the Idomoo Lucas MCP server. Trigger when the user asks to create, edit, or manage AI videos, mentions Idomoo or Lucas (Idomoo's AI video creator), or wants to work with brands / briefs / blueprints / videos through MCP tools. Implements an interactive brand → brief → blueprint → video flow with user review and edits between every step.
---

# idomoo (MCP edition)

This skill drives the Idomoo Lucas MCP server. You call MCP tools directly by name — no shell, no CLI. Tool names and behavior match the official Lucas MCP spec.

> **Setup reference:** https://academy.idomoo.com/support/solutions/articles/4000227306-lucas-mcp-server-integration-guide

## When to use this skill

- The user wants to generate or modify an AI video and the Lucas MCP is connected.
- The user mentions "Idomoo" or "Lucas".
- The user asks about brands, briefs, blueprints, or AI videos.

---

## Tools available (11 total)

| Tool | Purpose | Key params |
| --- | --- | --- |
| `create_brand` | Create a brand (logo, colors, fonts, tone) | `name` (required); `logo_url`, `colors[]`, `fonts[]`, `tone_of_voice`, `tone_instruction`, `use_stock_footage`, `reference_image_url`, `pronunciation_dictionary` |
| `update_brand` | Update an existing brand (partial — only fields you pass change) | `brand_id`; same optional fields as `create_brand` |
| `create_brief` | Create a video brief from a natural-language prompt | `prompt` (required); optional `brand_id` |
| `get_brief` | Fetch a brief by ID — used to poll status | `brief_id` |
| `update_brief_by_prompt` | Edit a brief via a free-form natural-language instruction | `brief_id`, `prompt` (the change you want) |
| `update_brief` | Structured patch — change specific brief fields directly | `brief_id`; any of `audience_name`, `audience_description`, `main_messages[]`, `script_lines[]`, `tone`, `narrator_style`, `call_to_action`, `custom_instructions` |
| `create_blueprint` | Generate a scene blueprint from a brief | `brief_id`; optional `duration` (15–900s) |
| `get_blueprint` | Fetch a blueprint by ID — used to poll status | `blueprint_id` |
| `update_blueprint_by_prompt` | Edit a blueprint via a free-form natural-language instruction | `blueprint_id`, `prompt` |
| `create_video` | Render the final AI video from a blueprint | `blueprint_id` |
| `get_video` | Fetch the AI video — `video_url` populates when status is `Done` | `ai_video_id` |

None of the `create_*` or `update_*_by_prompt` tools block until `Done`. After each one, **poll** the matching `get_*` tool every ~4 seconds until `status: Done` or `status: Error`.

---

## 🎬 Interactive video creation flow

**This is the primary way to use the skill.** Walk the user through every step and pause for confirmation at every gate. Only skip approvals if the user explicitly says "just make it" or "one-shot".

### Step 1 — Pick or create a brand

Ask the user: *"Which brand should this video use? I can create a new one, use an existing brand ID, or skip branding for this one."*

- **Existing brand:** have the user paste the `brand_id` (from prior calls or https://studio.idomoo.com).
- **New brand:** call `create_brand`. Gather values from the user conversationally — `name` is required, everything else optional. Example payload:
  ```json
  {
    "name": "Acme Corp",
    "logo_url": "https://example.com/logo.png",
    "colors": ["rgb(255,87,51)", "rgb(46,134,171)"],
    "fonts": ["https://fonts.googleapis.com/css2?family=Inter"],
    "tone_of_voice": "friendly, confident",
    "use_stock_footage": true
  }
  ```
  Save the returned `id` as `brand_id` for the next step.
- **Update an existing brand** (if user wants to tweak before using): call `update_brand` with `brand_id` and only the fields to change.
- **No brand:** skip and continue without `brand_id`.

> ⚠️ Lucas MCP does not expose `list_brands` or `get_brand`. If the user asks "what brands do I have?" tell them to check https://studio.idomoo.com — you can only create/update from here.

### Step 2 — Gather brief information

Ask the user for:
- **prompt** (required) — one-paragraph description of what the video is about
- **brand_id** (optional) — from Step 1
- **duration** (optional, captured for Step 5) — target length in seconds, 15–900 (Lucas defaults to 30)

If the user has a **title**, **audience**, or **script** in mind, roll them into the `prompt` — Lucas parses the prompt to derive those fields. (You can also patch them later in Step 4 with `update_brief`.)

### Step 3 — Create the brief and poll until Done

Call `create_brief` with the prompt (and `brand_id` if set). The response has `id` (the `brief_id`) and an initial `status`.

If `status` is not `Done`, poll `get_brief` with that `brief_id` every ~4 seconds. Stop when:
- `status: Done` → continue
- `status: Error` → surface `status_message` to the user verbatim, do **not** proceed
- ~10 minutes elapsed → tell the user it's still processing and ask whether to keep polling

### Step 4 — Show the brief and edit until approved

Once the brief is `Done`, **show the full JSON to the user**, highlighting:
- `audience_name` / `audience_description`
- `script` and/or `main_messages`
- `tone`, `narrator_style`, `call_to_action`
- `custom_instructions`

Ask: *"Does the brief look right? I can edit any part of it before we continue."*

To edit, pick whichever fits the user's request:

**(a) Natural-language edit** — best when the user gives a free-form instruction:
- `update_brief_by_prompt` with `brief_id` and `prompt` like:
  - *"make the audience young professionals"*
  - *"shorten the script to 3 key points"*
  - *"change the call to action to 'Sign up today'"*

**(b) Structured patch** — best when the user names exact fields:
- `update_brief` with `brief_id` and any subset of:
  ```json
  {
    "audience_name": "Executives",
    "audience_description": "C-level decision makers in mid-market SaaS",
    "tone": "authoritative",
    "call_to_action": "Book a demo",
    "main_messages": ["Cut onboarding time in half", "Enterprise-grade security"],
    "script_lines": ["Opening hook...", "Key benefit..."],
    "narrator_style": "confident",
    "custom_instructions": "Avoid industry jargon"
  }
  ```

After each edit call, poll `get_brief` until `Done`, then re-show the JSON. Loop until the user says **"approved"** or similar.

### Step 5 — Create the blueprint and poll until Done

Once the brief is approved, call `create_blueprint` with the `brief_id` and optional `duration`. Poll `get_blueprint` with the returned `blueprint_id` every ~4 seconds until `Done` or `Error`.

### Step 6 — Show the blueprint and edit until approved

Show the user the blueprint structure — scenes, per-scene narration, transitions, pacing. Ask: *"Look good? I can adjust scenes, swap the order, change the CTA, etc."*

To edit, call `update_blueprint_by_prompt` with `blueprint_id` and a natural-language `prompt`:
- *"use a CTA scene as the last scene"*
- *"swap the first two scenes"*
- *"replace the product demo with a testimonial"*

Poll `get_blueprint` until `Done`, then re-show. Loop until approved.

> ⚠️ Blueprints only support natural-language editing — there is no structured `update_blueprint`. If the change is content-level (script wording, audience, etc.), edit the **brief** (`update_brief_by_prompt` / `update_brief`) and regenerate the blueprint instead.

### Step 7 — Render the final video

When the blueprint is approved, call `create_video` with `blueprint_id`. Poll `get_video` with the returned `ai_video_id` every ~4 seconds until `Done`. The final response will include `video_url` — present that URL to the user.

---

## ⏩ One-shot end-to-end (only when explicitly requested)

If the user says *"just make it"* or *"don't ask me, I trust you"*, chain the calls without pausing for approvals:

1. (Optional) `create_brand` if the user wants new branding
2. `create_brief` → poll `get_brief` until `Done`
3. `create_blueprint` → poll `get_blueprint` until `Done`
4. `create_video` → poll `get_video` until `Done`
5. Return the `video_url`

Still surface errors (`status_message`) verbatim — don't retry blindly.

---

## Status values & polling

Brief, blueprint, and ai-video resources expose a `status` field:

- `Waiting for a file` — pending external input
- `In process` — actively processing
- `Done` — ready (for videos, `video_url` is populated)
- `Error` — failed; read `status_message` and surface it to the user verbatim

**Polling cadence:** every ~4 seconds, up to ~10 minutes before asking the user whether to keep waiting. Brand operations (`create_brand` / `update_brand`) return synchronously and do not need polling.

---

## Rules for the agent

1. **Default to the interactive flow** (brand → brief → review/edit → blueprint → review/edit → video). Only skip approvals on explicit "one-shot" instruction.
2. **Always pause and show JSON** after `create_brief`, `update_brief*`, `create_blueprint`, `update_blueprint_by_prompt`. Ask for approval before moving on.
3. **Prefer `update_brief_by_prompt` / `update_blueprint_by_prompt`** when the user describes changes in natural language. Use `update_brief` (structured) only when they specify exact fields.
4. **Always poll after a `create_*` or `update_*_by_prompt` call** on briefs, blueprints, or videos. None of them block until `Done`.
5. **On errors,** read `status_message` and surface it verbatim. Don't retry blindly — errors are usually invalid `brand_id`, unsupported prompt, or missing brand assets.
6. **Never log auth headers.** The `X-Lucas-MCP-Key` is configured at the MCP-client level and never appears in tool inputs or outputs.
7. **Remember IDs as you go:** `brand_id` → `create_brief`; `brief_id` → `create_blueprint` and `update_brief*`; `blueprint_id` → `create_video` and `update_blueprint_by_prompt`; `ai_video_id` → `get_video`.

---

## Endpoints not exposed via Lucas MCP

The 11 tools above cover the full brand → brief → blueprint → video creation loop. If the user asks for things still outside MCP scope:

- **`list_brands` / `get_brand`** — not exposed. Direct the user to https://studio.idomoo.com to browse, or the [`idomoo`](https://github.com/djtoon/idomoo) CLI (`idomoo brand list`, `idomoo brand get`).
- **Workspaces / save-to-folder** — not exposed (CLI has `idomoo video save`).
- **Knowledge bases, audio/voices, avatars, presenters, Getty media, music, video translation** — REST API supports them, MCP doesn't yet. Use direct REST or the CLI.
