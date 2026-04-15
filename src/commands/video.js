const { IdomooClient, pollUntilDone } = require('../client');

function buildVideoPayload(opts) {
  if (!opts.blueprintId) {
    throw new Error('--blueprint-id is required when creating an AI video.');
  }
  const payload = { blueprint_id: opts.blueprintId };
  if (opts.dataPoints) {
    try {
      payload.data_points = JSON.parse(opts.dataPoints);
    } catch (err) {
      throw new Error(`--data-points must be valid JSON: ${err.message}`);
    }
  }
  if (opts.audiences && opts.audiences.length) payload.audiences = opts.audiences;
  if (opts.analyticTags && opts.analyticTags.length) payload.analytic_tags = opts.analyticTags;
  if (opts.workspaceId) payload.workspace_id = opts.workspaceId;
  if (opts.path) payload.path = opts.path;
  if (opts.brainModel) payload.brain_model = opts.brainModel;
  if (opts.promptVersion) payload.prompt_version = opts.promptVersion;
  return payload;
}

async function videoCreate(opts) {
  const client = new IdomooClient();
  const payload = buildVideoPayload(opts);
  const res = await client.createAiVideo(payload);
  console.log(JSON.stringify(res, null, 2));

  if (opts.wait) {
    console.log('Waiting for video to render...');
    const done = await pollUntilDone(() => client.getAiVideo(res.id), {
      onTick: (d) => process.stdout.write(`  status: ${d.status}\n`),
    });
    console.log(JSON.stringify(done, null, 2));
    if (done.video_url) console.log(`\nVideo URL: ${done.video_url}`);
    return done;
  }
  return res;
}

async function videoGet(id) {
  const client = new IdomooClient();
  const res = await client.getAiVideo(id);
  console.log(JSON.stringify(res, null, 2));
  if (res.video_url) console.log(`\nVideo URL: ${res.video_url}`);
  return res;
}

async function videoSave(opts) {
  if (!opts.aiVideoId) throw new Error('--ai-video-id is required.');
  if (!opts.workspaceId) throw new Error('--workspace-id is required.');
  const payload = { ai_video_id: opts.aiVideoId, workspace_id: opts.workspaceId };
  if (opts.folderId) payload.folder_id = opts.folderId;
  if (opts.title) payload.title = opts.title;
  const client = new IdomooClient();
  const res = await client.saveAiVideo(payload);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

module.exports = { videoCreate, videoGet, videoSave, buildVideoPayload };
