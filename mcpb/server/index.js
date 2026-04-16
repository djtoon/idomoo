#!/usr/bin/env node
// Idomoo Lucas MCPB proxy.
// Forwards stdio MCP traffic from the host (Claude Desktop) to the hosted
// Lucas MCP server at https://lucas-mcp.idomoo.ai/mcp, injecting the user's
// X-Lucas-MCP-Key on every request.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const LUCAS_MCP_URL =
  process.env.LUCAS_MCP_URL && process.env.LUCAS_MCP_URL.trim() !== ""
    ? process.env.LUCAS_MCP_URL
    : "https://lucas-mcp.idomoo.ai/mcp";
const LUCAS_MCP_KEY = process.env.LUCAS_MCP_KEY;

if (!LUCAS_MCP_KEY) {
  console.error(
    "[idomoo-mcpb] LUCAS_MCP_KEY is required. Configure it in the MCPB settings (Lucas MCP Key)."
  );
  process.exit(1);
}

async function main() {
  const upstream = new Client(
    { name: "idomoo-mcpb-proxy", version: "0.3.2" },
    { capabilities: {} }
  );

  const transport = new StreamableHTTPClientTransport(new URL(LUCAS_MCP_URL), {
    requestInit: {
      headers: { "X-Lucas-MCP-Key": LUCAS_MCP_KEY },
    },
  });

  await upstream.connect(transport);

  const server = new Server(
    { name: "idomoo", version: "0.3.2" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return await upstream.listTools();
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    return await upstream.callTool(req.params);
  });

  const stdio = new StdioServerTransport();
  await server.connect(stdio);

  const shutdown = async () => {
    try {
      await upstream.close();
    } catch {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[idomoo-mcpb] fatal:", err?.message || err);
  process.exit(1);
});
