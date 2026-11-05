// run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from './validator.js';

// the part of ELiDDI's config.schema.json that governs server accounts
const schema = {
  type: 'object',
  properties: { general: { $ref: '#/definitions/general' } },
  definitions: {
    general: {
      type: 'object',
      required: ['experimentID'],
      if: { properties: { server_accounts: { const: true } }, required: ['server_accounts'] },
      then: { required: ['backend_url'] },
      properties: {
        experimentID: { type: 'string' },
        server_accounts: { type: 'boolean' },
        backend_url: { type: 'string', pattern: '^https?://[^\\s/?#]+(/[^\\s?#]*)?$' },
      },
    },
  },
};

const check = (general) => validateConfig(schema, { general: { experimentID: 'x', ...general } });

test('accounts off, or the setting absent: no backend_url needed', () => {
  assert.deepEqual(check({}), []);
  assert.deepEqual(check({ server_accounts: false }), []);
});

test('accounts on without a backend_url is an error', () => {
  const errors = check({ server_accounts: true });
  assert.deepEqual(errors, [{ path: '/general/backend_url', message: 'is required' }]);
});

test('accounts on with an empty backend_url is an error (it must be a URL)', () => {
  const errors = check({ server_accounts: true, backend_url: '' });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, '/general/backend_url');
});

test('accounts on with a good backend_url is valid, with or without a path or trailing slash', () => {
  for (const url of ['https://diary.example.org', 'https://diary.example.org/', 'http://localhost:5000/api']) {
    assert.deepEqual(check({ server_accounts: true, backend_url: url }), [], url);
  }
});

test('accounts on with a malformed backend_url is an error', () => {
  for (const url of ['diary.example.org', 'ftp://diary.example.org', 'https://bad host']) {
    assert.equal(check({ server_accounts: true, backend_url: url }).length, 1, url);
  }
});

test('a malformed backend_url is still an error with accounts off (the schema checks the shape)', () => {
  assert.equal(check({ server_accounts: false, backend_url: 'nope' }).length, 1);
});

test('const rejects a different value', () => {
  assert.deepEqual(validateConfig({ const: 3 }, 4), [{ path: '/', message: 'must be 3' }]);
});

test('if/then/else applies else when the condition does not match', () => {
  const s = { if: { const: 1 }, then: { type: 'string' }, else: { type: 'number' } };
  assert.deepEqual(validateConfig(s, 1), [{ path: '/', message: 'must be of type string' }]);
  assert.deepEqual(validateConfig(s, 2), []);
  assert.deepEqual(validateConfig(s, 'x'), [{ path: '/', message: 'must be of type number' }]);
});
