# Idomoo Lucas MCPB

A Claude Desktop Extension (`.mcpb`) that proxies to Idomoo's hosted Lucas MCP server at `https://lucas-mcp.idomoo.ai/mcp`.

Double-click the built `.mcpb` in Claude Desktop, enter your **Lucas MCP Key**, and the 6 Lucas tools (`create_brief`, `get_brief`, `create_blueprint`, `get_blueprint`, `create_video`, `get_video`) become available.

## Build

```bash
cd mcpb
npm install --omit=dev
npx @anthropic-ai/mcpb pack .
```

Produces `idomoo.mcpb` in this folder.

## Local test (without packing)

```bash
cd mcpb
npm install
LUCAS_MCP_KEY=your_key node server/index.js
```

The server speaks MCP over stdio. You can point Claude Desktop (or any MCP client) at `node /abs/path/mcpb/server/index.js` with `LUCAS_MCP_KEY` set in the env.

## Config

| User config | Required | Default | Notes |
| --- | --- | --- | --- |
| `lucas_mcp_key` | yes | — | Sent as `X-Lucas-MCP-Key` header |
| `server_url` | no | `https://lucas-mcp.idomoo.ai/mcp` | Override for staging |
