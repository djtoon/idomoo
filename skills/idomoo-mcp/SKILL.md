---
name: idomoo-mcp
description: Use this skill to generate AI videos via the Idomoo Lucas MCP server. Trigger when the user asks to create, edit, or manage AI videos, mentions Idomoo or Lucas (Idomoo's AI video creator), or wants to work with briefs / blueprints / videos through MCP tools. Implements an interactive brief → blueprint → video flow with user review between each step.
---

# idomoo (MCP edition)

This skill drives the Idomoo Lucas MCP server that is **already connected** via this MCPB extension. You call MCP tools directly by name — no shell, no CLI. The bundle proxies to `https://lucas-mcp.idomoo.ai/mcp`; tool names and behavior match the official Lucas MCP spec.

> **Setup reference:** https://academy.idomoo.com/support/solutions/articles/4000227306-lucas-mcp-server-integration-guide

## When to use this skill

- The user wants to generate an AI video and this MCPB is installed.
- The user mentions "Idomoo" or "Lucas".
- The user asks about briefs, blueprints, or AI videos.

---

## Tools available (6 total)

| Tool | Purpose | Required params |
| --- | --- | --- |
| `create_brief` | Create a video brief from a natural-language prompt | `prompt` (string); optional `brand_id` |
| `get_brief` | Fetch a brief by ID — used to poll status | `brief_id` |
| `create_blueprint` | Generate a scene blueprint from a brief | `brief_id`; optional `duration` (15–900s) |
| `get_blueprint` | Fetch a blueprint by ID — used to poll status | `blueprint_id` |
| `create_video` | Render the final AI video from a blueprint | `blueprint_id` |
| `get_video` | Fetch the AI video — `video_url` populates when status is `Done` | `ai_video_id` |

None of the `create_*` tools block until `Done`. After each one, **poll** the matching `get_*` tool every ~4 seconds until `status: Done` or `status: Error`.

---

## 🎬 Interactive video creation flow

**This is the primary way to use the skill.** Walk the user through each step and pause for confirmation at every gate. Only skip approvals if the user explicitly says "just make it" or "one-shot".

### Step 1 — Pick a brand (optional)

Ask the user: *"Which brand should this video use? I can use an existing brand ID, or we can skip branding for this one."*

- **Existing brand:** have the user paste the `brand_id` from https://studio.idomoo.com.
- **New brand:** Lucas MCP does **not** expose brand creation. Send the user to https://studio.idomoo.com to create one, or to the `idomoo` CLI (`idomoo brand create ...`) if they have it installed. Do not pretend you can create brands from here.
- **No brand:** skip and continue without `brand_id`.

### Step 2 — Gather brief information

Ask the user for:
- **prompt** (required) — one-paragraph description of what the video is about
- **brand_id** (optional) — from Step 1
- **duration** (optional) — target length in seconds, 15–900 (Lucas defaults to 30)

If the user has a **title**, **audience**, or **script** in mind, roll them into the `prompt` — Lucas parses the prompt to derive those fields. (The MCP `create_brief` tool only accepts `prompt` + optional `brand_id`, unlike the CLI which takes them as separate flags.)

### Step 3 — Create the brief and poll until Done

Call `create_brief` with the prompt (and `brand_id` if set). The response has `id` (the `brief_id`) and an initial `status`.

If `status` is not `Done`, poll `get_brief` with that `brief_id` every ~4 seconds. Stop when:
- `status: Done` → continue
- `status: Error` → surface `status_message` to the user verbatim, do **not** proceed
- ~10 minutes elapsed → tell the user it's still processing and ask whether to keep polling

### Step 4 — Show the brief and get approval

Once the brief is `Done`, **show the full JSON to the user**, highlighting:
- `audience_name` / `audience_description`
- `script` and/or `main_messages`
- `tone`, `narrator_style`, `call_to_action`
- `custom_instructions`

Ask: *"Does the brief look right? If you want changes, tell me what to adjust and I'll regenerate it."*

> ⚠️ **No edit tool.** Lucas MCP does not expose `edit_brief` / `patch_brief`. To change a brief, call `create_brief` again with an adjusted prompt — Lucas will produce a fresh brief. Be transparent: *"I'll regenerate the brief with that change"* — never pretend you can edit in place. Loop this step until the user approves.

### Step 5 — Create the blueprint and poll until Done

Once the brief is approved, call `create_blueprint` with the `brief_id` and optional `duration`. Poll `get_blueprint` with the returned `blueprint_id` every ~4 seconds until `Done` or `Error`.

### Step 6 — Show the blueprint and get approval

Show the user the blueprint structure — scenes, per-scene narration, transitions, pacing. Ask: *"Look good? If you want changes, tell me what to adjust and I'll regenerate."*

> ⚠️ **No edit tool.** As with briefs, there's no `edit_blueprint`. To change a blueprint, call `create_blueprint` again — typically with a tweaked brief (regenerate brief first) if the issue is content-level, or with a different `duration` if it's pacing. Loop until approved.

### Step 7 — Render the final video

When the blueprint is approved, call `create_video` with `blueprint_id`. Poll `get_video` with the returned `ai_video_id` every ~4 seconds until `Done`. The final response will include `video_url` — present that URL to the user.

---

## ⏩ One-shot end-to-end (only when explicitly requested)

If the user says *"just make it"* or *"don't ask me, I trust you"*, chain the calls without pausing for approvals:

1. `create_brief` → poll `get_brief` until `Done`
2. `create_blueprint` → poll `get_blueprint` until `Done`
3. `create_video` → poll `get_video` until `Done`
4. Return the `video_url`

Still surface errors (`status_message`) verbatim — don't retry blindly.

---

## Status values & polling

All three resources (brief, blueprint, ai-video) expose a `status` field:

- `Waiting for a file` — pending external input
- `In process` — actively processing
- `Done` — ready (for videos, `video_url` is populated)
- `Error` — failed; read `status_message` and surface it to the user verbatim

**Polling cadence:** every ~4 seconds, up to ~10 minutes before asking the user whether to keep waiting.

---

## Rules for the agent

1. **Default to the interactive flow** (brief → review → blueprint → review → video). Only skip approvals on explicit "one-shot" instruction.
2. **Always pause and show JSON** after `create_brief` and `create_blueprint`. Ask for approval before moving on.
3. **Always poll after a `create_*` call.** None of them block until `Done`.
4. **Never invent edit tools.** There are only 6 tools listed above. To change a brief or blueprint, regenerate. Tell the user that's what you're doing.
5. **On errors,** read `status_message` and surface it verbatim. Don't retry blindly — errors are usually invalid `brand_id`, unsupported prompt, or missing brand assets.
6. **Never log auth headers.** The `X-Lucas-MCP-Key` is configured at the MCPB level and never appears in tool inputs or outputs.
7. **Remember IDs as you go:** `brief_id` → `create_blueprint`; `blueprint_id` → `create_video`; `ai_video_id` → `get_video`.

---

## Endpoints not exposed via Lucas MCP

If the user asks for something outside the 6 tools above (brand creation/management, knowledge bases, audio/voices, avatars, presenters, Getty media, music, video translation, save-to-workspace, etc.), tell them:

- For **brand creation/management:** https://studio.idomoo.com, or the [`idomoo`](https://github.com/djtoon/idomoo) CLI which wraps the full REST API.
- For **other endpoints:** the underlying REST API has them but the MCP server doesn't surface them yet — direct REST or the CLI are the workarounds.
