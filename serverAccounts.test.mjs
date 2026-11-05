// run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlankConfig } from './model.js';
import {
  ACCOUNTS_DEPLOY_WARNING,
  collectAccountsWarnings,
  isServerAccountsOn,
  setServerAccounts,
} from './serverAccounts.js';

const withAccounts = (extra = {}) => {
  const config = createBlankConfig();
  setServerAccounts(config.general, true);
  config.general.backend_url = 'https://diary.example.org';
  Object.assign(config.general, extra);
  return config;
};

test('a new config has accounts off, and neither setting written', () => {
  const config = createBlankConfig();
  assert.equal(isServerAccountsOn(config), false);
  assert.equal('server_accounts' in config.general, false);
  assert.equal('backend_url' in config.general, false);
});

test('only an explicit true counts as on', () => {
  assert.equal(isServerAccountsOn({ general: { server_accounts: true } }), true);
  assert.equal(isServerAccountsOn({ general: { server_accounts: 'true' } }), false);
  assert.equal(isServerAccountsOn({ general: {} }), false);
  assert.equal(isServerAccountsOn(undefined), false);
});

test('turning it on writes the flag and an empty URL to fill in', () => {
  const general = {};
  setServerAccounts(general, true);
  assert.deepEqual(general, { server_accounts: true, backend_url: '' });
});

test('turning it on keeps a URL that is already there', () => {
  const general = { backend_url: 'https://a.example' };
  setServerAccounts(general, true);
  assert.equal(general.backend_url, 'https://a.example');
});

test('turning it off writes false and keeps the typed URL for next time', () => {
  const general = { server_accounts: true, backend_url: 'https://a.example' };
  setServerAccounts(general, false);
  assert.deepEqual(general, { server_accounts: false, backend_url: 'https://a.example' });
});

test('the settings survive a JSON round trip', () => {
  const config = withAccounts();
  const back = JSON.parse(JSON.stringify(config));
  assert.equal(isServerAccountsOn(back), true);
  assert.equal(back.general.backend_url, 'https://diary.example.org');
});

test('no warnings with accounts off, whatever else is set', () => {
  const config = createBlankConfig();
  config.general.backend_url = 'http://localhost:5000';
  config.general.submit_completed_diary_url = 'https://x.example';
  assert.deepEqual(collectAccountsWarnings(config), []);
});

test('a clean https backend has no warnings', () => {
  assert.deepEqual(collectAccountsWarnings(withAccounts()), []);
});

test('an http backend warns', () => {
  const warnings = collectAccountsWarnings(withAccounts({ backend_url: 'http://diary.example.org' }));
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].path, '/general/backend_url');
  assert.match(warnings[0].message, /http:\/\//);
});

test('a backend on this computer warns, with or without a port', () => {
  for (const url of ['http://localhost:5000', 'https://localhost', 'http://127.0.0.1:5000/api']) {
    const warnings = collectAccountsWarnings(withAccounts({ backend_url: url }));
    assert.ok(
      warnings.some((w) => /this computer/.test(w.message)),
      url
    );
  }
});

test('a host that merely starts with localhost does not warn as local', () => {
  const warnings = collectAccountsWarnings(withAccounts({ backend_url: 'https://localhost.example.org' }));
  assert.deepEqual(warnings, []);
});

test('the HTML fallback and the submit URL are called out as ignored', () => {
  const config = withAccounts({ submit_completed_diary_url: 'https://other.example/submit' });
  config.general.accessibility.generateHtmlFallback = true;
  const paths = collectAccountsWarnings(config).map((w) => w.path);
  assert.deepEqual(paths.sort(), [
    '/general/accessibility/generateHtmlFallback',
    '/general/submit_completed_diary_url',
  ]);
});

test('the deploy warning says a correctly configured backend is needed', () => {
  assert.match(ACCOUNTS_DEPLOY_WARNING, /correctly configured backend/);
});
