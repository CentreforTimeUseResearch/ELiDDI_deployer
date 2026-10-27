// run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VALIDATION_RULES,
  createBlankValidation,
  getValidationLevel,
  setValidationLevel,
} from './validationRules.js';

const IDS = [
  'no-gaps-in-primary',
  'primary-secondary-differ',
  'minimum-sleep',
  'eating-or-drinking',
];

test('the four ELiDDI rules are listed, each with a name and a description', () => {
  assert.deepEqual(
    VALIDATION_RULES.map((rule) => rule.id),
    IDS
  );
  for (const rule of VALIDATION_RULES) {
    assert.ok(rule.name && rule.description);
  }
});

test('a blank validation has every rule Off', () => {
  assert.deepEqual(createBlankValidation(), {
    'no-gaps-in-primary': 'off',
    'primary-secondary-differ': 'off',
    'minimum-sleep': 'off',
    'eating-or-drinking': 'off',
  });
});

test('a config with no validation, or a rule missing from it, reads as Off', () => {
  assert.equal(getValidationLevel({}, 'minimum-sleep'), 'off');
  assert.equal(getValidationLevel(undefined, 'minimum-sleep'), 'off');
  assert.equal(getValidationLevel({ validation: {} }, 'minimum-sleep'), 'off');
});

test('a value that is not a level reads as Off', () => {
  assert.equal(getValidationLevel({ validation: { 'minimum-sleep': 'strict' } }, 'minimum-sleep'), 'off');
});

test('a level in the config is read as it is', () => {
  const config = { validation: { 'minimum-sleep': 'soft', 'no-gaps-in-primary': 'hard' } };

  assert.equal(getValidationLevel(config, 'minimum-sleep'), 'soft');
  assert.equal(getValidationLevel(config, 'no-gaps-in-primary'), 'hard');
  assert.equal(getValidationLevel(config, 'eating-or-drinking'), 'off');
});

test('setting a level on a config with no validation writes all four rules', () => {
  const config = {};

  setValidationLevel(config, 'minimum-sleep', 'soft');

  assert.deepEqual(config.validation, { ...createBlankValidation(), 'minimum-sleep': 'soft' });
});

test('setting a level changes only that rule', () => {
  const config = { validation: { ...createBlankValidation(), 'no-gaps-in-primary': 'hard' } };

  setValidationLevel(config, 'eating-or-drinking', 'soft');
  setValidationLevel(config, 'no-gaps-in-primary', 'off');

  assert.deepEqual(config.validation, { ...createBlankValidation(), 'eating-or-drinking': 'soft' });
});

test('a rule can be set back to Off', () => {
  const config = { validation: { 'minimum-sleep': 'hard' } };

  setValidationLevel(config, 'minimum-sleep', 'off');

  assert.equal(config.validation['minimum-sleep'], 'off');
});

test('a level that does not exist is rejected, leaving the config as it was', () => {
  const config = { validation: { 'minimum-sleep': 'soft' } };

  assert.throws(() => setValidationLevel(config, 'minimum-sleep', 'strict'), RangeError);
  assert.throws(() => setValidationLevel(config, 'minimum-sleep', undefined), RangeError);
  assert.deepEqual(config, { validation: { 'minimum-sleep': 'soft' } });
});

test('a rule that does not exist is rejected, leaving the config as it was', () => {
  const config = {};

  assert.throws(() => setValidationLevel(config, 'not-a-rule', 'soft'), RangeError);
  assert.deepEqual(config, {});
});

test('settings for ids this tool does not know are kept', () => {
  const config = { validation: { 'future-rule': 'hard' } };

  setValidationLevel(config, 'minimum-sleep', 'soft');

  assert.equal(config.validation['future-rule'], 'hard');
});
