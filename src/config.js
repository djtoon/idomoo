const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULTS = {
  auth_url: 'https://usa-api.idomoo.com/api/v3/oauth/token',
  api_url: 'https://api-ai.idomoo.com',
};

function configDir() {
  return path.join(os.homedir(), '.idomoo');
}

function configPath() {
  return path.join(configDir(), 'config.json');
}

function load() {
  const p = configPath();
  if (!fs.existsSync(p)) return { ...DEFAULTS };
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { ...DEFAULTS, ...data };
  } catch (err) {
    throw new Error(`Failed to read config at ${p}: ${err.message}`);
  }
}

function save(cfg) {
  const dir = configDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const p = configPath();
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  try {
    fs.chmodSync(p, 0o600);
  } catch (_) {
    // best-effort on platforms that don't support chmod (Windows)
  }
  return p;
}

function update(patch) {
  const cfg = load();
  const next = { ...cfg, ...patch };
  save(next);
  return next;
}

function clearToken() {
  const cfg = load();
  delete cfg.token;
  save(cfg);
}

function maskSecret(value) {
  if (!value) return '(not set)';
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`;
}

module.exports = {
  DEFAULTS,
  configDir,
  configPath,
  load,
  save,
  update,
  clearToken,
  maskSecret,
};
