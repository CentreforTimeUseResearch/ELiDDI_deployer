// run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findUnsafeMarkup, collectHtmlWarnings } from './htmlWarnings.js';

test('plain text and ordinary tags do not warn', () => {
  assert.deepEqual(findUnsafeMarkup('Thank you for taking part'), []);
  assert.deepEqual(findUnsafeMarkup('Tap <strong>Next</strong><br>then <em>start</em>'), []);
  assert.deepEqual(findUnsafeMarkup('<a href="https://example.com/info">more info</a>'), []);
});

test('a <script> tag warns, in any case and spacing', () => {
  assert.equal(findUnsafeMarkup('<script>alert(1)</script>').length, 1);
  assert.equal(findUnsafeMarkup('<SCRIPT src="x.js"></SCRIPT>').length, 1);
  assert.equal(findUnsafeMarkup('< script>x</script>').length, 1);
});

test('an inline event handler inside a tag warns', () => {
  assert.equal(findUnsafeMarkup('<img src=x onerror="alert(1)">').length, 1);
  assert.equal(findUnsafeMarkup('<p onClick = "go()">hi</p>').length, 1);
});

test('the word "on" in ordinary text is not an event handler', () => {
  assert.deepEqual(findUnsafeMarkup('Please carry on = keep going'), []);
  assert.deepEqual(findUnsafeMarkup('<strong>Carry on</strong> as normal'), []);
});

test('a javascript: URL warns', () => {
  assert.equal(findUnsafeMarkup('<a href="javascript:alert(1)">x</a>').length, 1);
  assert.equal(findUnsafeMarkup('<a href="JavaScript :alert(1)">x</a>').length, 1);
});

test('reports each kind of problem once', () => {
  const reasons = findUnsafeMarkup('<script>1</script><a href="javascript:1" onclick="2">x</a>');
  assert.equal(reasons.length, 3);
});

test('a non-string is not unsafe', () => {
  assert.deepEqual(findUnsafeMarkup(undefined), []);
  assert.deepEqual(findUnsafeMarkup(null), []);
});

test('collectHtmlWarnings points at the step whose text is unsafe', () => {
  const config = {
    instructions: [
      { title: 'Welcome', text: 'Hello <strong>there</strong>' },
      { title: 'Oops', text: '<img src=x onerror=alert(1)>' },
    ],
  };

  const warnings = collectHtmlWarnings(config);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].path, '/instructions/1/text');
  assert.match(warnings[0].message, /event handler/);
});

test('collectHtmlWarnings ignores a title, which ELiDDI escapes', () => {
  const config = { instructions: [{ title: '<script>1</script>', text: 'fine' }] };

  assert.deepEqual(collectHtmlWarnings(config), []);
});

test('collectHtmlWarnings copes with a config with no instructions', () => {
  assert.deepEqual(collectHtmlWarnings({}), []);
  assert.deepEqual(collectHtmlWarnings(undefined), []);
});
