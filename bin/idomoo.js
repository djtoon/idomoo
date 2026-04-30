#!/usr/bin/env node
// Async update-notifier check — fires on every invocation, but the actual
// registry lookup is debounced to once per ~24h via update-notifier's own
// cache. Failures (no network, stale cache, etc.) are swallowed silently so
// they never break the CLI.
try {
  const updateNotifier = require('update-notifier');
  const pkg = require('../package.json');
  updateNotifier({
    pkg,
    updateCheckInterval: 1000 * 60 * 60 * 24, // 24h
  }).notify({
    isGlobal: true,
    defer: true,
    message:
      'Update available {currentVersion} → {latestVersion}\nRun {updateCommand} to update',
  });
} catch (_) {
  // update-notifier missing (e.g. Bun-compiled binary) — ignore.
}

require('../src/cli').run(process.argv);
