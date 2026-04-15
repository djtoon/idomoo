# Idomoo — Claude Desktop Extension (MCPB)

A **[Claude Desktop Extension](https://www.anthropic.com/engineering/desktop-extensions)** that gives Claude Desktop direct access to the Idomoo AI Video Generation API via MCP tools — no CLI, no terminal, no Node install on the user's side (the runtime is bundled).

After install, you can ask Claude things like:

> *"Make a 30-second promo video for our spring collection using our Acme brand."*

…and it will drive the brief → blueprint → video flow for you, right from the chat window.

---

## Install

### One-click (once built)

1. Download `idomoo.mcpb` from the [latest release](https://github.com/djtoon/idomoo/releases/latest).
2. Double-click it — Claude Desktop opens an install dialog.
3. Enter your **Idomoo Account ID** and **API Secret Key** (get them from https://studio.idomoo.com).
4. Click Install.

### Manual sideload

- Claude Desktop → Settings → **Extensions** → drag `idomoo.mcpb` into the panel.

---

## What it provides

**14 MCP tools** Claude can call automatically:

| Group | Tools |
| --- | --- |
| Brand | `brand_list`, `brand_create`, `brand_get`, `brand_update` |
| Brief | `brief_create`, `brief_get`, `brief_patch`, `brief_edit` |
| Blueprint | `blueprint_create`, `blueprint_get`, `blueprint_edit` |
| Video | `video_create`, `video_get`, `video_save` |

Plus a bundled **Agent Skill** (`skills/idomoo/SKILL.md`) that teaches Claude the interactive brand → brief → review → blueprint → review → video workflow.

---

## Build the .mcpb yourself

### Prerequisites

- Node.js ≥ 18
- `@anthropic-ai/mcpb` CLI:
  ```bash
  npm install -g @anthropic-ai/mcpb
  ```

### Build

From this folder (`mcpb/`):

```bash
npm install --production
mcpb validate manifest.json
mcpb pack .
```

This produces `idomoo.mcpb` in the current directory. The `.mcpb` is just a zip — feel free to inspect with `unzip -l`.

Optional self-sign (removes the "unsigned extension" warning in Claude Desktop):

```bash
mcpb sign idomoo.mcpb --self-signed
```

---

## File layout

```
mcpb/
├── manifest.json                       # MCPB metadata + user_config prompts
├── package.json                        # Node package (runtime deps)
├── .mcpbignore                         # files excluded from the .mcpb zip
├── README.md                           # this file
├── skills/idomoo/SKILL.md              # bundled agent skill (mirrors root skill)
├── node_modules/                       # bundled by `npm install --production`
└── server/
    ├── index.js                        # MCP server entry point (ListTools + CallTool)
    └── client.js                       # OAuth2 + REST client for Idomoo API
```

---

## How credentials flow

1. User installs the `.mcpb` and fills in **Account ID** + **API Secret Key**.
2. Claude Desktop stores those locally (OS keychain where possible).
3. At server launch, Claude Desktop passes them as env vars:
   - `IDOMOO_ACCOUNT_ID`
   - `IDOMOO_API_KEY`
4. The MCP server uses them for the OAuth2 client-credentials flow against `https://usa-api.idomoo.com/api/v3/oauth/token`.
5. Bearer token is cached in-memory and auto-refreshes within 60s of expiry.

Credentials **never leave your machine** except to authenticate with Idomoo itself.

---

## License

MIT — see the repo root.
