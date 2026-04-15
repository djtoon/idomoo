const { IdomooClient, pollUntilDone } = require('../client');

function buildBlueprintPayload(opts) {
  if (!opts.briefId) {
    throw new Error('--brief-id is required when creating a blueprint.');
  }
  const payload = { brief_id: opts.briefId };
  if (opts.duration != null) payload.video_duration_in_seconds = Number(opts.duration);
  if (opts.sceneLibraryId) payload.scene_library_id = opts.sceneLibraryId;
  if (opts.narratorId) payload.narrator_id = opts.narratorId;
  if (opts.avatarId) payload.avatar_id = opts.avatarId;
  if (opts.presenterId) payload.presenter_id = opts.presenterId;
  if (opts.useAvatar) payload.use_avatar = true;
  if (opts.brainModel) payload.brain_model = opts.brainModel;
  if (opts.promptVersion) payload.prompt_version = opts.promptVersion;
  if (opts.mediaWorkspaceIds && opts.mediaWorkspaceIds.length) {
    payload.media_workspace_ids = opts.mediaWorkspaceIds;
  }
  return payload;
}

async function blueprintCreate(opts) {
  const client = new IdomooClient();
  const payload = buildBlueprintPayload(opts);
  const res = await client.createBlueprint(payload);
  console.log(JSON.stringify(res, null, 2));

  if (opts.wait) {
    console.log('Waiting for blueprint to be ready...');
    const done = await pollUntilDone(() => client.getBlueprint(res.id), {
      onTick: (d) => process.stdout.write(`  status: ${d.status}\n`),
    });
    console.log(JSON.stringify(done, null, 2));
    return done;
  }
  return res;
}

async function blueprintGet(id) {
  const client = new IdomooClient();
  const res = await client.getBlueprint(id);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

async function blueprintUpdateByPrompt(id, opts) {
  if (!opts.prompt) {
    throw new Error('--prompt is required (natural-language instruction for Lucas, e.g. "use a CTA scene as the last scene").');
  }
  const client = new IdomooClient();
  const res = await client.updateBlueprintByPrompt(id, opts.prompt);
  console.log(JSON.stringify(res, null, 2));

  if (opts.wait) {
    console.log('Waiting for blueprint update to apply...');
    const done = await pollUntilDone(() => client.getBlueprint(res.id || id), {
      onTick: (d) => process.stdout.write(`  status: ${d.status}\n`),
    });
    console.log(JSON.stringify(done, null, 2));
    return done;
  }
  return res;
}

module.exports = { blueprintCreate, blueprintGet, blueprintUpdateByPrompt, buildBlueprintPayload };
