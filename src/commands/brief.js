const { IdomooClient } = require('../client');

function buildBriefPayload(opts) {
  const payload = {};
  if (opts.prompt) payload.prompt = opts.prompt;
  if (opts.title) payload.title = opts.title;
  if (opts.script) payload.script = opts.script;
  if (opts.brandId) payload.brand_id = opts.brandId;
  if (opts.kbId) payload.knowledge_base_id = opts.kbId;
  if (opts.audienceName) payload.audience_name = opts.audienceName;
  if (opts.audienceDescription) payload.audience_description = opts.audienceDescription;
  if (!payload.prompt) {
    throw new Error('--prompt is required when creating a brief.');
  }
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

module.exports = { briefCreate, briefGet, buildBriefPayload };
