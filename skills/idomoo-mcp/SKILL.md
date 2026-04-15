---
name: idomoo-mcp
description: Use this skill to generate AI videos with the official Lucas MCP server hosted by Idomoo (https://lucas-mcp.idomoo.ai/mcp). Trigger when the user asks to create AI videos, mentions Idomoo or Lucas, or wants to manage briefs / blueprints / videos through MCP tools. Implements an interactive brief → blueprint → video flow with user review at every step.
---

# Idomoo Lucas MCP — Skill

This skill drives the **official Lucas MCP server** hosted by Idomoo at `https://lucas-mcp.idomoo.ai/mcp`. You call MCP tools directly by name — there is no shell or CLI involved.

> **Setup reference:** https://academy.idomoo.com/support/solutions/articles/4000227306-lucas-mcp-server-integration-guide

---

## Tools available (6 total, exposed by the Lucas MCP server)

| Tool | Purpose | Required params |
| --- | --- | --- |
| `create_brief` | Create a video brief from a natural-language prompt | `prompt` (string); optional `brand_id` |
| `get_brief` | Fetch a brief by ID — used to poll status | `brief_id` |
| `create_blueprint` | Generate a scene blueprint from a brief | `brief_id`; optional `duration` (15–900s) |
| `get_blueprint` | Fetch a blueprint by ID — used to poll status | `blueprint_id` |
| `create_video` | Render the final AI video from a blueprint | `blueprint_id` |
| `get_video` | Fetch the AI video by ID — `video_url` populates when status is `Done` | `ai_video_id` |

If a tool returns `status: In process` or `Waiting for a file`, **poll** the matching `get_*` tool every ~4 seconds until `status: Done` or `status: Error`. There is no built-in `wait` flag — polling is your responsibility.

---

## 🎬 Interactive video creation flow

**Default to this flow** unless the user explicitly asks for a one-shot. Stop and show results after every `create_*` call so the user can review before moving on.

### Step 1 — Gather brief info

Ask the user for:
- **prompt** (required) — one-paragraph description of the video
- **brand_id** (optional) — if they have an existing Idomoo brand they want to use
- **duration** (optional) — target length in seconds (Lucas defaults to 30, valid range 15–900)

If the user mentions branding but doesn't have a `brand_id`, point them at https://studio.idomoo.com to create one — the Lucas MCP doesn't expose brand creation.

### Step 2 — Create the brief

Call `create_brief` with the gathered fields. The response has an `id` (the `brief_id`) and an initial `status`.

If `status` is not `Done`, **poll** `get_brief` with that `brief_id` every ~4 seconds. Stop polling when:
- `status: Done` → continue
- `status: Error` → surface `status_message` to the user, do NOT proceed
- 10 minutes elapsed → tell the user it's still processing and offer to keep checking

### Step 3 — Show the brief and ask for confirmation

Once the brief is `Done`, **show the full JSON to the user** including:
- `audience_name` / `audience_description`
- `script` and/or `main_messages`
- `tone`, `narrator_style`, `call_to_action`
- `custom_instructions`

Ask: *"Does the brief look right? If you want changes, tell me what to adjust and I'll create a new brief."*

> ⚠️ The Lucas MCP **does not expose `edit_brief` or `patch_brief`**. To change a brief, call `create_brief` again with an adjusted prompt — Lucas will produce a fresh brief. Don't pretend you can edit in place.

### Step 4 — Create the blueprint

Once the brief is approved, call `create_blueprint` with `brief_id` and optional `duration`. Poll `get_blueprint` until `status: Done`.

### Step 5 — Show the blueprint and ask for confirmation

Show the user the blueprint structure (scenes, narration, transitions). Ask: *"Look good? If you want changes, tell me what to adjust and I'll regenerate."*

> ⚠️ The Lucas MCP **does not expose `edit_blueprint`**. To change a blueprint, call `create_blueprint` again — typically with a tweaked brief if the issue is content-level, or a different `duration` if it's pacing.

### Step 6 — Render the final video

Once the blueprint is approved, call `create_video` with `blueprint_id`. Poll `get_video` until `status: Done`. The response then includes `video_url`. Present that URL to the user.

---

## Status values

Brief, blueprint, and video resources all expose a `status` field:

- `Waiting for a file` — pending external input
- `In process` — actively processing
- `Done` — ready (final `video_url` populated for videos)
- `Error` — failed; read `status_message` and surface it to the user

---

## Rules for Claude

1. **Default to the interactive flow** above — show JSON, get approval, then move on. Only skip approvals when the user explicitly says "just make it" or "one-shot".
2. **Always poll after `create_*`.** None of the Lucas MCP tools block until `Done`; you must call the matching `get_*` repeatedly.
3. **Don't invent edit tools.** Lucas MCP only has 6 tools (above). To change a brief/blueprint, regenerate it — don't call a non-existent `edit_*` or `patch_*` tool.
4. **Remember IDs** as you go — `brief_id` feeds into `create_blueprint`; `blueprint_id` feeds into `create_video`; `ai_video_id` feeds into `get_video`.
5. **On error responses**, read `status_message` and tell the user verbatim. Don't retry blindly — errors are usually configuration issues (invalid `brand_id`, unsupported prompt, etc.).
6. **Never log auth headers.** The user's `X-Lucas-MCP-Key` is configured at the MCP-client level (Claude Desktop / Cursor / Claude Code) and never appears in tool inputs or outputs.

---

## Endpoints not exposed via Lucas MCP

If the user asks for things outside the 6 tools above (brand creation, knowledge bases, audio, avatars, Getty media, presenters, video saving to workspace, etc.), tell them:

- For **brand creation / management**: use https://studio.idomoo.com or the [`idomoo-cli`](https://github.com/djtoon/idomoo) which wraps additional endpoints.
- For **other endpoints**: the underlying REST API has them but the MCP server doesn't surface them yet. Direct REST calls or the CLI are the workarounds.
