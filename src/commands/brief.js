const { IdomooClient } = require('../client');

function parseJsonFlag(value, flagName) {
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(`${flagName} must be valid JSON: ${err.message}`);
  }
}

// Maps CLI --flags to the CreateBriefRequest schema.
function buildBriefPayload(opts) {
  const payload = {};
  if (opts.prompt) payload.prompt = opts.prompt;
  if (opts.title) payload.title = opts.title;
  if (opts.script) payload.script = opts.script;
  if (opts.brandId) payload.brand_id = opts.brandId;
  if (opts.kbId) payload.knowledge_base_id = opts.kbId;
  if (opts.audienceName) payload.audience_name = opts.audienceName;
  if (opts.audienceDescription) payload.audience_description = opts.audienceDescription;
  if (opts.assets) payload.assets = parseJsonFlag(opts.assets, '--assets');
  if (opts.ppt) payload.ppt = opts.ppt;
  if (opts.parameters) payload.parameters = parseJsonFlag(opts.parameters, '--parameters');
  if (!payload.prompt) {
    throw new Error('--prompt is required when creating a brief.');
  }
  return payload;
}

// Maps CLI --flags to the Brief schema used by PATCH /brief/{id}.
function buildBriefPatchPayload(opts) {
  const payload = {};
  if (opts.audienceName) payload.audience_name = opts.audienceName;
  if (opts.audienceDescription) payload.audience_description = opts.audienceDescription;
  if (opts.mainMessages && opts.mainMessages.length) payload.main_messages = opts.mainMessages;
  if (opts.script && opts.script.length) payload.script = opts.script;
  if (opts.callToAction) payload.call_to_action = opts.callToAction;
  if (opts.tone) payload.tone = opts.tone;
  if (opts.narratorStyle) payload.narrator_style = opts.narratorStyle;
  if (opts.customInstructions) payload.custom_instructions = opts.customInstructions;
  return payload;
}

async function briefCreate(opts) {
  const client = new IdomooClient();
  const payload = buildBriefPayload(opts);
  const res = await client.createBrief(payload);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

async function briefGet(id) {
  const client = new IdomooClient();
  const res = await client.getBrief(id);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

async function briefPatch(id, opts) {
  const client = new IdomooClient();
  const payload = buildBriefPatchPayload(opts);
  if (Object.keys(payload).length === 0) {
    throw new Error('Nothing to update. Pass at least one field (e.g. --audience-name, --script, --tone).');
  }
  const res = await client.patchBrief(id, payload);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

async function briefUpdateByPrompt(id, opts) {
  if (!opts.userPrompt) {
    throw new Error('--user-prompt is required (natural-language instruction for Lucas to apply to the brief).');
  }
  const client = new IdomooClient();
  const res = await client.updateBriefByPrompt(id, opts.userPrompt);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

module.exports = {
  briefCreate,
  briefGet,
  briefPatch,
  briefUpdateByPrompt,
  buildBriefPayload,
  buildBriefPatchPayload,
};
