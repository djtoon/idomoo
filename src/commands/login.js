const config = require('../config');
const { ask, askHidden } = require('../prompt');
const { IdomooClient } = require('../client');

async function login(opts = {}) {
  const current = config.load();

  const accountId =
    opts.accountId ||
    (await ask(`Idomoo Account ID${current.account_id ? ` [${current.account_id}]` : ''}: `)) ||
    current.account_id;

  if (!accountId) {
    throw new Error('Account ID is required.');
  }

  const apiKey =
    opts.apiKey ||
    (await askHidden(`Idomoo API Secret Key${current.api_key ? ' [keep existing]' : ''}: `)) ||
    current.api_key;

  if (!apiKey) {
    throw new Error('API key is required.');
  }

  const next = {
    ...current,
    account_id: accountId,
    api_key: apiKey,
  };
  // Drop any cached token since credentials may have changed.
  delete next.token;

  if (opts.authUrl) next.auth_url = opts.authUrl;
  if (opts.apiUrl) next.api_url = opts.apiUrl;

  const saved = config.save(next);
  console.log(`Saved credentials to ${saved}`);

  // Verify by fetching a token.
  process.stdout.write('Verifying credentials... ');
  try {
    const client = new IdomooClient(next);
    await client.getToken({ force: true });
    console.log('OK');
  } catch (err) {
    console.log('FAILED');
    throw err;
  }
}

module.exports = { login };
