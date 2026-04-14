const { IdomooClient, pollUntilDone } = require('../client');
const { buildBriefPayload } = require('./brief');
const { buildBlueprintPayload } = require('./blueprint');
const { buildVideoPayload } = require('./video');

// End-to-end: brief -> blueprint -> ai-video, polling between steps.
async function createVideo(opts) {
  const client = new IdomooClient();

  console.log('Step 1/3: Creating brief...');
  const briefPayload = buildBriefPayload(opts);
  const brief = await client.createBrief(briefPayload);
  console.log(`  brief_id: ${brief.id} (${brief.status})`);

  let briefDone = brief;
  if (brief.status !== 'Done') {
    briefDone = await pollUntilDone(() => client.getBrief(brief.id), {
      onTick: (d) => process.stdout.write(`  brief status: ${d.status}\n`),
    });
  }

  console.log('\nStep 2/3: Creating blueprint...');
  const blueprintPayload = buildBlueprintPayload({ ...opts, briefId: briefDone.id });
  const blueprint = await client.createBlueprint(blueprintPayload);
  console.log(`  blueprint_id: ${blueprint.id} (${blueprint.status})`);

  let blueprintDone = blueprint;
  if (blueprint.status !== 'Done') {
    blueprintDone = await pollUntilDone(() => client.getBlueprint(blueprint.id), {
      onTick: (d) => process.stdout.write(`  blueprint status: ${d.status}\n`),
    });
  }

  console.log('\nStep 3/3: Rendering AI video...');
  const videoPayload = buildVideoPayload({ ...opts, blueprintId: blueprintDone.id });
  const video = await client.createAiVideo(videoPayload);
  console.log(`  ai_video_id: ${video.id} (${video.status})`);

  const videoDone = await pollUntilDone(() => client.getAiVideo(video.id), {
    onTick: (d) => process.stdout.write(`  video status: ${d.status}\n`),
  });

  console.log('\nDone.');
  console.log(JSON.stringify(videoDone, null, 2));
  if (videoDone.video_url) {
    console.log(`\nVideo URL: ${videoDone.video_url}`);
  }
  return videoDone;
}

module.exports = { createVideo };
