const config = require('../config');

function showConfig() {
  const cfg = config.load();
  const view = {
    config_file: config.configPath(),
    account_id: cfg.account_id || '(not set)',
    api_key: config.maskSecret(cfg.api_key),
    auth_url: cfg.auth_url,
    api_url: cfg.api_url,
    token: cfg.token
      ? {
          token_type: cfg.token.token_type,
          expires_at: new Date(cfg.token.expires_at * 1000).toISOString(),
        }
      : '(none cached)',
  };
  console.log(JSON.stringify(view, null, 2));
}

function setConfig(opts) {
  const patch = {};
  if (opts.accountId) patch.account_id = opts.accountId;
  if (opts.apiKey) patch.api_key = opts.apiKey;
  if (opts.authUrl) patch.auth_url = opts.authUrl;
  if (opts.apiUrl) patch.api_url = opts.apiUrl;
  if (Object.keys(patch).length === 0) {
    throw new Error('Nothing to set. Use --account-id, --api-key, --auth-url, or --api-url.');
  }
  // Credentials changed — invalidate cached token.
  if (patch.account_id || patch.api_key || patch.auth_url) {
    const cfg = config.load();
    delete cfg.token;
    config.save({ ...cfg, ...patch });
  } else {
    config.update(patch);
  }
  console.log(`Updated ${Object.keys(patch).join(', ')} in ${config.configPath()}`);
}

function resetConfig() {
  config.save({ ...config.DEFAULTS });
  console.log(`Reset config at ${config.configPath()}`);
}

module.exports = { showConfig, setConfig, resetConfig };
