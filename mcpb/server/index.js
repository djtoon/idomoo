#!/usr/bin/env node
// Idomoo MCP server for Claude Desktop Extensions (MCPB).
// Exposes brand / brief / blueprint / ai-video endpoints as MCP tools.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { IdomooClient, IdomooError } from "./client.js";

const SERVER_NAME = "idomoo";
const SERVER_VERSION = "0.1.0";

// ── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  // ---- Brand ----
  {
    name: "brand_list",
    description: "List / search brands on the account. Pass `name` as an optional filter (format: company_name.com). Returns an array of brands.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "Optional name filter" } },
    },
  },
  {
    name: "brand_create",
    description: "Create a new brand with name, logo, colors, fonts, and tone of voice.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Brand name" },
        logo_url: { type: "string", description: "URL to the brand logo" },
        colors: {
          type: "array",
          items: { type: "string" },
          description: "Brand colors in rgb() format, up to 4 (e.g. ['rgb(255,87,51)','rgb(46,134,171)'])",
        },
        fonts: { type: "array", items: { type: "string" }, description: "Font URLs (Google Fonts or direct)" },
        use_stock_footage: { type: "boolean", description: "Allow Getty stock footage in videos" },
        reference_image_url: { type: "string", description: "Reference image URL for AI image generation" },
        tone_of_voice: { type: "string", description: "Tone of voice for narration" },
        tone_instruction: { type: "string", description: "Custom tone instructions" },
        pronunciation_dictionary: { type: "object", description: "Word → pronunciation map" },
      },
    },
  },
  {
    name: "brand_get",
    description: "Fetch a single brand by ID.",
    inputSchema: {
      type: "object",
      required: ["brand_id"],
      properties: { brand_id: { type: "string" } },
    },
  },
  {
    name: "brand_update",
    description: "Update brand fields. Only the fields you include are changed.",
    inputSchema: {
      type: "object",
      required: ["brand_id"],
      properties: {
        brand_id: { type: "string" },
        name: { type: "string" },
        logo_url: { type: "string" },
        colors: { type: "array", items: { type: "string" } },
        fonts: { type: "array", items: { type: "string" } },
        use_stock_footage: { type: "boolean" },
        reference_image_url: { type: "string" },
        tone_of_voice: { type: "string" },
        tone_instruction: { type: "string" },
        pronunciation_dictionary: { type: "object" },
      },
    },
  },

  // ---- Brief ----
  {
    name: "brief_create",
    description: "Create a brief (video input). Requires `prompt` — the natural-language video description.",
    inputSchema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string", description: "Natural-language description of the video" },
        title: { type: "string" },
        script: { type: "string", description: "Pre-written script (optional — Lucas writes one if omitted)" },
        brand_id: { type: "string" },
        knowledge_base_id: { type: "string" },
        audience_name: { type: "string" },
        audience_description: { type: "string" },
        assets: { type: "array", description: "Assets to use in the video" },
        ppt: { type: "string", description: "PowerPoint URL" },
        parameters: { type: "object", description: "Dynamic name-value parameters" },
      },
    },
  },
  {
    name: "brief_get",
    description: "Fetch a brief by ID. Used to poll status.",
    inputSchema: { type: "object", required: ["brief_id"], properties: { brief_id: { type: "string" } } },
  },
  {
    name: "brief_patch",
    description: "Update structured brief fields (PATCH /brief/{id}). Only provided fields change.",
    inputSchema: {
      type: "object",
      required: ["brief_id"],
      properties: {
        brief_id: { type: "string" },
        audience_name: { type: "string" },
        audience_description: { type: "string" },
        main_messages: { type: "array", items: { type: "string" } },
        script: { type: "array", items: { type: "string" }, description: "Ordered script lines" },
        call_to_action: { type: "string" },
        tone: { type: "string" },
        narrator_style: { type: "string" },
        custom_instructions: { type: "string" },
      },
    },
  },
  {
    name: "brief_edit",
    description: "Edit a brief via natural-language instruction to Lucas (e.g. 'make the audience young professionals').",
    inputSchema: {
      type: "object",
      required: ["brief_id", "user_prompt"],
      properties: {
        brief_id: { type: "string" },
        user_prompt: { type: "string", description: "Free-form change request" },
      },
    },
  },

  // ---- Blueprint ----
  {
    name: "blueprint_create",
    description: "Create a blueprint (scene structure) from a brief. Use `wait: true` to block until Done.",
    inputSchema: {
      type: "object",
      required: ["brief_id"],
      properties: {
        brief_id: { type: "string" },
        video_duration_in_seconds: { type: "number" },
        scene_library_id: { type: "string" },
        narrator_id: { type: "string" },
        avatar_id: { type: "string" },
        presenter_id: { type: "string" },
        use_avatar: { type: "boolean" },
        brain_model: { type: "string" },
        prompt_version: { type: "string" },
        media_workspace_ids: { type: "array", items: { type: "string" } },
        wait: { type: "boolean", description: "Poll until status is Done before returning" },
      },
    },
  },
  {
    name: "blueprint_get",
    description: "Fetch a blueprint by ID.",
    inputSchema: { type: "object", required: ["blueprint_id"], properties: { blueprint_id: { type: "string" } } },
  },
  {
    name: "blueprint_edit",
    description: "Edit a blueprint via natural-language prompt (e.g. 'use a CTA scene as the last scene').",
    inputSchema: {
      type: "object",
      required: ["blueprint_id", "prompt"],
      properties: {
        blueprint_id: { type: "string" },
        prompt: { type: "string" },
        wait: { type: "boolean" },
      },
    },
  },

  // ---- Video ----
  {
    name: "video_create",
    description: "Render an AI video from a blueprint. Use `wait: true` to poll until the final video URL is ready.",
    inputSchema: {
      type: "object",
      required: ["blueprint_id"],
      properties: {
        blueprint_id: { type: "string" },
        data_points: { type: "object", description: "Dynamic values to substitute in the script" },
        audiences: { type: "array", items: { type: "string" } },
        analytic_tags: { type: "array", items: { type: "string" } },
        workspace_id: { type: "string" },
        path: { type: "string" },
        brain_model: { type: "string" },
        prompt_version: { type: "string" },
        wait: { type: "boolean" },
      },
    },
  },
  {
    name: "video_get",
    description: "Fetch an AI video by ID. `video_url` is populated once status is Done.",
    inputSchema: { type: "object", required: ["ai_video_id"], properties: { ai_video_id: { type: "string" } } },
  },
  {
    name: "video_save",
    description: "Save a rendered AI video into a workspace / folder.",
    inputSchema: {
      type: "object",
      required: ["ai_video_id", "workspace_id"],
      properties: {
        ai_video_id: { type: "string" },
        workspace_id: { type: "string" },
        folder_id: { type: "string" },
        title: { type: "string" },
      },
    },
  },
];

// ── Polling helper ──────────────────────────────────────────────────────────

async function pollUntilDone(getter, { intervalMs = 4000, timeoutMs = 10 * 60 * 1000 } = {}) {
  const start = Date.now();
  while (true) {
    const data = await getter();
    const status = data && data.status;
    if (status === "Done") return data;
    if (status === "Error") {
      throw new IdomooError(`Processing failed: ${data.status_message || "unknown error"}`, { body: data });
    }
    if (Date.now() - start > timeoutMs) {
      throw new IdomooError(`Timed out after ${Math.round(timeoutMs / 1000)}s (last status: ${status})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ── Tool dispatch ───────────────────────────────────────────────────────────

async function dispatch(client, name, args = {}) {
  switch (name) {
    // Brand
    case "brand_list":   return client.searchBrands(args.name || "");
    case "brand_create": return client.createBrand(args);
    case "brand_get":    return client.getBrand(args.brand_id);
    case "brand_update": {
      const { brand_id, ...rest } = args;
      return client.updateBrand(brand_id, rest);
    }
    // Brief
    case "brief_create": return client.createBrief(args);
    case "brief_get":    return client.getBrief(args.brief_id);
    case "brief_patch": {
      const { brief_id, ...rest } = args;
      return client.patchBrief(brief_id, rest);
    }
    case "brief_edit":   return client.updateBriefByPrompt(args.brief_id, args.user_prompt);

    // Blueprint
    case "blueprint_create": {
      const { wait, ...payload } = args;
      const res = await client.createBlueprint(payload);
      if (!wait) return res;
      return pollUntilDone(() => client.getBlueprint(res.id));
    }
    case "blueprint_get":  return client.getBlueprint(args.blueprint_id);
    case "blueprint_edit": {
      const res = await client.updateBlueprintByPrompt(args.blueprint_id, args.prompt);
      if (!args.wait) return res;
      return pollUntilDone(() => client.getBlueprint(res.id || args.blueprint_id));
    }

    // Video
    case "video_create": {
      const { wait, ...payload } = args;
      const res = await client.createAiVideo(payload);
      if (!wait) return res;
      return pollUntilDone(() => client.getAiVideo(res.id));
    }
    case "video_get":  return client.getAiVideo(args.ai_video_id);
    case "video_save": return client.saveAiVideo(args);

    default:
      throw new IdomooError(`Unknown tool: ${name}`);
  }
}

// ── Server bootstrap ────────────────────────────────────────────────────────

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    const client = new IdomooClient();
    const result = await dispatch(client, name, args || {});
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof IdomooError
      ? `${err.message}${err.body ? "\n" + JSON.stringify(err.body, null, 2) : ""}`
      : (err && err.message) || String(err);
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${message}` }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[${SERVER_NAME}] MCP server running (v${SERVER_VERSION})`);
