---
name: idomoo
description: Use this skill to generate AI videos with Idomoo / Lucas using the MCP tools exposed by the Idomoo Claude Desktop extension. Trigger when the user asks to create, edit, or manage AI videos, mentions Idomoo or Lucas, or wants to work with briefs, blueprints, brands, or rendered videos. Implements an interactive brand → brief → blueprint → video flow with user review and edits between steps.
---

# Idomoo — MCP skill

This skill drives the **Idomoo Claude Desktop extension**'s MCP tools. You are not using a shell CLI — you call the MCP tools directly by name.

**Tools available** (all exposed by this extension):

| Group | Tools |
| --- | --- |
| Brand  | `list_brands`, `create_brand`, `get_brand`, `update_brand` |
| Brief  | `create_brief`, `get_brief`, `patch_brief`, `edit_brief` |
| Blueprint | `create_blueprint`, `get_blueprint`, `edit_blueprint` |
| Video  | `create_video`, `get_video`, `save_video` |

Names follow the official Lucas MCP convention (`verb_noun`) where they overlap — plus extras for editing and brand management.

---

## 🎬 Interactive video creation flow

**Default to this flow** unless the user explicitly asks to skip confirmation ("just make it", "one-shot", etc.). Stop and show results after every `create_*` / `edit_*` / `patch_*` call and ask for approval before moving to the next step.

### Step 1 — Pick or create a brand

Ask: *"Which brand should this video use? I can list existing brands, or create a new one."*

- **List existing brands** → call `list_brands` (optionally with `name` filter). Show the returned brands' `id` + `name` to the user; let them pick one (remember the `brand_id`).
- **Create a new brand** → gather `name` (required), then optional `logo_url`, `colors` (rgb() array, up to 4), `fonts`, `tone_of_voice`, `use_stock_footage`, `reference_image_url`, `tone_instruction`, `pronunciation_dictionary`, and call `create_brand`. The response has `id` — remember it.
- **Update a brand** later with `update_brand` if needed.
- **Skip branding** — continue without a `brand_id`.

### Step 2 — Gather brief info

Ask the user for:
- **prompt** (required) — one-paragraph video description
- **title** — video title
- **audience_name** + **audience_description** — who it's for
- **script** — pre-written narration (optional)
- **knowledge_base_id** — if they want script grounded in specific docs
- **assets** / **ppt** / **parameters** — advanced (skip unless asked)

### Step 3 — Create the brief and show it

Call `create_brief` with the collected fields. The response has `id` (`brief_id`) and a structured `Brief` body (audience, main_messages, script, tone, narrator_style, call_to_action, custom_instructions).

**Show the full brief JSON to the user** and ask: *"Does the brief look right? I can edit any part before we continue."*

### Step 4 — Edit the brief until the user approves

Two editing tools — pick based on the user's phrasing:

- **`edit_brief`** — free-form natural language ("make the audience younger", "shorten to 3 points", "change the call to action"). Parameters: `brief_id`, `user_prompt`.
- **`patch_brief`** — structured edits when the user names exact fields. Parameters: `brief_id` + any of `audience_name`, `audience_description`, `main_messages[]`, `script[]`, `call_to_action`, `tone`, `narrator_style`, `custom_instructions`.

After each edit, show the updated brief and ask: *"Good to go, or more changes?"* Loop until the user says **"approved"**.

### Step 5 — Create the blueprint

Call `create_blueprint` with `brief_id` and optional `video_duration_in_seconds` (15–900, default 30), `scene_library_id`, `narrator_id`, `avatar_id`, `presenter_id`, `use_avatar`, `media_workspace_ids[]`. **Pass `wait: true`** to block until the blueprint status is `Done`.

Show the blueprint (scenes) to the user: *"This is the scene-by-scene structure. I can adjust it before rendering."*

### Step 6 — Edit the blueprint until approved

Use `edit_blueprint` with `blueprint_id` and a natural-language `prompt` ("use a CTA scene as the last scene", "swap scenes 1 and 2", "replace the product demo with a testimonial"). Pass `wait: true` so the user sees the final state, not an intermediate `In process`. Show the updated blueprint, loop until approved.

### Step 7 — Render the final video

Call `create_video` with `blueprint_id` and optional `data_points` (dynamic substitutions), `audiences[]`, `analytic_tags[]`, `workspace_id`, `path`. **Always pass `wait: true`** so the tool polls for the final `video_url`. Return the URL to the user.

### Step 8 (optional) — Save to a workspace

If the user wants the video persisted to a specific workspace/folder, call `save_video` with `ai_video_id` + `workspace_id` + optional `folder_id` + `title`.

---

## Status values (for polling tools)

Brief, blueprint, and video resources expose a `status` field:

- `Waiting for a file` — pending external input
- `In process` — actively processing
- `Done` — ready (final `video_url` populated for videos)
- `Error` — failed; read `status_message`

The `wait: true` flag on `create_blueprint`, `edit_blueprint`, `create_video` polls automatically (every 4s, 10 min timeout). If a tool returns `status: Error`, read `status_message` and surface it to the user — don't retry blindly.

---

## Rules for Claude

1. **Default to the interactive flow** above. Only skip approvals when the user explicitly asks.
2. **Show JSON after every `create_*`, `edit_*`, `patch_*`** so the user can review before proceeding.
3. **Prefer `edit_brief` / `edit_blueprint`** (natural-language) when the user describes a change in free form. Use `patch_brief` only when they name exact fields.
4. **Always pass `wait: true`** on blueprint and video creation/editing so the user sees final state, not intermediate.
5. **Remember IDs** as you go — `brand_id`, `brief_id`, `blueprint_id`, `ai_video_id` all feed into later tools.
6. **On credential errors** (`Missing Idomoo credentials`, `Token request failed (401)`), tell the user to re-open the extension settings in Claude Desktop and re-enter their Account ID / API Key. Don't guess credentials.
7. **Never log the API Secret Key.** The extension stores it in the OS keychain; it won't appear in tool inputs or outputs.

---

## Endpoints not exposed as tools

The underlying API has additional endpoints (audio/voices, avatars, presenters search, Getty media, music, knowledge base CRUD, image generation, video translation) that are marked `x-internal` in the public OpenAPI schema and are not wrapped by this extension. If the user asks for something in those domains, tell them it's out of scope for this extension — they can use the `idomoo-cli` from the same GitHub repo or call the REST API directly with their OAuth2 token.
