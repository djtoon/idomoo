const { Command } = require('commander');
const pkg = require('../package.json');

const { login } = require('./commands/login');
const { showConfig, setConfig, resetConfig } = require('./commands/config');
const { briefCreate, briefGet } = require('./commands/brief');
const { blueprintCreate, blueprintGet } = require('./commands/blueprint');
const { videoCreate, videoGet } = require('./commands/video');
const { brandCreate, brandGet, brandUpdate } = require('./commands/brand');
const { createVideo } = require('./commands/create');
const { IdomooError } = require('./client');

function collect(value, previous) {
  return (previous || []).concat([value]);
}

function build() {
  const program = new Command();
  program
    .name('idomoo')
    .description('CLI for the Idomoo AI Video Generation API (Lucas).')
    .version(pkg.version);

  // ---- login (interactive) ----
  program
    .command('login')
    .description('Save your Idomoo Account ID and API Secret Key to ~/.idomoo/config.json')
    .option('--account-id <id>', 'Account ID (skip the interactive prompt)')
    .option('--api-key <key>', 'API Secret Key (skip the interactive prompt)')
    .option('--auth-url <url>', 'Override the OAuth token URL')
    .option('--api-url <url>', 'Override the AI API base URL')
    .action((opts) => login(opts));

  // ---- config ----
  const configCmd = program.command('config').description('View or edit CLI configuration');
  configCmd
    .command('show', { isDefault: true })
    .description('Show current configuration (API key is masked)')
    .action(() => showConfig());
  configCmd
    .command('set')
    .description('Update individual configuration fields')
    .option('--account-id <id>', 'Account ID')
    .option('--api-key <key>', 'API Secret Key')
    .option('--auth-url <url>', 'OAuth token URL')
    .option('--api-url <url>', 'AI API base URL')
    .action((opts) => setConfig(opts));
  configCmd
    .command('reset')
    .description('Reset config to defaults (clears credentials and cached token)')
    .action(() => resetConfig());

  // ---- brief ----
  const briefCmd = program.command('brief').description('Manage briefs');
  briefCmd
    .command('create')
    .description('Create a new brief')
    .requiredOption('-p, --prompt <text>', 'Natural-language description of the video goals')
    .option('-t, --title <text>', 'Video title')
    .option('-s, --script <text>', 'Pre-written script content')
    .option('--brand-id <id>', 'Brand ID for styling and guidelines')
    .option('--kb-id <id>', 'Knowledge base ID')
    .option('--audience-name <name>', 'Target audience name')
    .option('--audience-description <text>', 'Target audience description')
    .action((opts) => briefCreate(opts));
  briefCmd
    .command('get <brief_id>')
    .description('Fetch a brief by ID')
    .action((id) => briefGet(id));

  // ---- blueprint ----
  const blueprintCmd = program.command('blueprint').description('Manage blueprints');
  blueprintCmd
    .command('create')
    .description('Create a blueprint from a brief')
    .requiredOption('-b, --brief-id <id>', 'Brief ID')
    .option('-d, --duration <seconds>', 'Target video duration in seconds', '30')
    .option('--scene-library-id <id>', 'Scene library template ID')
    .option('--narrator-id <id>', 'Voice ID of the narrator')
    .option('--avatar-id <id>', 'Avatar ID to use in the video')
    .option('--presenter-id <id>', 'Presenter ID to use in the video')
    .option('--use-avatar', 'Use avatar from presenter')
    .option('--brain-model <name>', 'AI brain model version')
    .option('--prompt-version <version>', 'Prompt template version')
    .option('--media-workspace-id <id>', 'Media workspace (repeat for multiple)', collect, [])
    .option('--wait', 'Poll until the blueprint is Done before returning')
    .action((opts) => {
      // Rename media-workspace-id collection to the expected field.
      opts.mediaWorkspaceIds = opts.mediaWorkspaceId;
      return blueprintCreate(opts);
    });
  blueprintCmd
    .command('get <blueprint_id>')
    .description('Fetch a blueprint by ID (also used to poll status)')
    .action((id) => blueprintGet(id));

  // ---- video ----
  const videoCmd = program.command('video').description('Manage AI videos');
  videoCmd
    .command('create')
    .description('Render an AI video from a blueprint')
    .requiredOption('-b, --blueprint-id <id>', 'Blueprint ID')
    .option('--data-points <json>', 'JSON object of data points to substitute')
    .option('--audience <name>', 'Audience (repeat for multiple)', collect, [])
    .option('--analytic-tag <tag>', 'Analytic tag (repeat for multiple)', collect, [])
    .option('--workspace-id <id>', 'Destination workspace ID')
    .option('--path <path>', 'Destination path in the workspace')
    .option('--brain-model <name>', 'AI brain model version')
    .option('--prompt-version <version>', 'Prompt template version')
    .option('--wait', 'Poll until the video is Done before returning')
    .action((opts) => {
      opts.audiences = opts.audience;
      opts.analyticTags = opts.analyticTag;
      return videoCreate(opts);
    });
  videoCmd
    .command('get <ai_video_id>')
    .description('Fetch an AI video by ID (also used to poll status)')
    .action((id) => videoGet(id));

  // ---- brand ----
  const brandCmd = program.command('brand').description('Manage brands');
  brandCmd
    .command('create')
    .description('Create a new brand')
    .requiredOption('-n, --name <text>', 'Brand name')
    .option('--logo-url <url>', 'URL to the brand logo')
    .option('--colors <rgb>', 'Brand color in rgb() format — repeat for up to 4 colors', collect, [])
    .option('--fonts <url>', 'Font URL (Google Fonts or direct file) — repeatable', collect, [])
    .option('--use-stock-footage', 'Allow Getty stock footage in videos using this brand')
    .option('--reference-image-url <url>', 'Reference image URL for AI image generation')
    .option('--tone-of-voice <text>', 'Tone of voice for narration')
    .option('--tone-instruction <text>', 'Custom tone-of-voice instructions')
    .option('--pronunciation-dictionary <json>', 'JSON object mapping words to pronunciations')
    .action((opts) => brandCreate(opts));
  brandCmd
    .command('get <brand_id>')
    .description('Fetch a brand by ID')
    .action((id) => brandGet(id));
  brandCmd
    .command('update <brand_id>')
    .description('Update brand fields (only provided fields are changed)')
    .option('-n, --name <text>', 'Brand name')
    .option('--logo-url <url>', 'URL to the brand logo')
    .option('--colors <rgb>', 'Brand color in rgb() format — repeat for up to 4 colors', collect, [])
    .option('--fonts <url>', 'Font URL — repeatable', collect, [])
    .option('--use-stock-footage', 'Allow Getty stock footage')
    .option('--reference-image-url <url>', 'Reference image URL')
    .option('--tone-of-voice <text>', 'Tone of voice for narration')
    .option('--tone-instruction <text>', 'Custom tone-of-voice instructions')
    .option('--pronunciation-dictionary <json>', 'JSON object mapping words to pronunciations')
    .action((id, opts) => brandUpdate(id, opts));

  // ---- one-shot end-to-end ----
  program
    .command('create')
    .description('Create a video end-to-end: brief -> blueprint -> ai-video with polling')
    .requiredOption('-p, --prompt <text>', 'Natural-language description of the video goals')
    .option('-t, --title <text>', 'Video title')
    .option('-s, --script <text>', 'Pre-written script content')
    .option('--brand-id <id>', 'Brand ID')
    .option('--kb-id <id>', 'Knowledge base ID')
    .option('--audience-name <name>', 'Target audience name')
    .option('--audience-description <text>', 'Target audience description')
    .option('-d, --duration <seconds>', 'Target video duration in seconds', '30')
    .option('--scene-library-id <id>', 'Scene library template ID')
    .option('--narrator-id <id>', 'Voice ID of the narrator')
    .option('--avatar-id <id>', 'Avatar ID')
    .option('--presenter-id <id>', 'Presenter ID')
    .option('--use-avatar', 'Use avatar from presenter')
    .option('--brain-model <name>', 'AI brain model version')
    .option('--prompt-version <version>', 'Prompt template version')
    .option('--media-workspace-id <id>', 'Media workspace (repeat for multiple)', collect, [])
    .option('--data-points <json>', 'JSON object of data points to substitute')
    .option('--workspace-id <id>', 'Destination workspace ID')
    .option('--path <path>', 'Destination path in the workspace')
    .action((opts) => {
      opts.mediaWorkspaceIds = opts.mediaWorkspaceId;
      return createVideo(opts);
    });

  return program;
}

async function run(argv) {
  const program = build();
  try {
    await program.parseAsync(argv);
  } catch (err) {
    if (err instanceof IdomooError) {
      console.error(`Error: ${err.message}`);
      if (err.body && err.body.detail) {
        console.error(JSON.stringify(err.body.detail, null, 2));
      }
    } else {
      console.error(`Error: ${err.message || err}`);
    }
    process.exitCode = 1;
  }
}

module.exports = { run, build };
