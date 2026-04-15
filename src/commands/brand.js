const { IdomooClient } = require('../client');

function parseJsonFlag(value, flagName) {
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(`${flagName} must be valid JSON: ${err.message}`);
  }
}

function buildBrandPayload(opts, { requireName = false } = {}) {
  const payload = {};
  if (opts.name) payload.name = opts.name;
  if (opts.logoUrl) payload.logo_url = opts.logoUrl;
  if (opts.colors && opts.colors.length) payload.colors = opts.colors;
  if (opts.fonts && opts.fonts.length) payload.fonts = opts.fonts;
  if (opts.useStockFootage !== undefined) payload.use_stock_footage = Boolean(opts.useStockFootage);
  if (opts.referenceImageUrl) payload.reference_image_url = opts.referenceImageUrl;
  if (opts.toneOfVoice) payload.tone_of_voice = opts.toneOfVoice;
  if (opts.toneInstruction) payload.tone_instruction = opts.toneInstruction;
  if (opts.pronunciationDictionary) {
    payload.pronunciation_dictionary = parseJsonFlag(opts.pronunciationDictionary, '--pronunciation-dictionary');
  }
  if (requireName && !payload.name) {
    throw new Error('--name is required when creating a brand.');
  }
  return payload;
}

async function brandCreate(opts) {
  const client = new IdomooClient();
  const payload = buildBrandPayload(opts, { requireName: true });
  const res = await client.createBrand(payload);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

async function brandGet(id) {
  const client = new IdomooClient();
  const res = await client.getBrand(id);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

async function brandUpdate(id, opts) {
  const client = new IdomooClient();
  const payload = buildBrandPayload(opts);
  if (Object.keys(payload).length === 0) {
    throw new Error('Nothing to update. Pass at least one field (e.g. --name, --logo-url, --colors, --fonts).');
  }
  const res = await client.updateBrand(id, payload);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

module.exports = { brandCreate, brandGet, brandUpdate, buildBrandPayload };
