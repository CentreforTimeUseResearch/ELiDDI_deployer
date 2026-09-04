import { h, textField, textAreaField, numberField, checkboxField, selectField, colorField, listSection } from './dom.js';
import {
  createBlankConfig,
  createBlankDimension,
  createBlankCategory,
  createBlankActivity,
  createBlankChildItem,
  createBlankOnboardingStep,
} from './model.js';
import { validateConfig } from './validator.js';

const ELIDDI_OWNER = 'CentreforTimeUseResearch';
const ELIDDI_REPO = 'ELiDDI';
// Fetched live from ELiDDI's main branch rather than kept as a local copy -
// this repo used to hand-duplicate the config shape (in the old config.js),
// which could silently drift from what ELiDDI's build actually validates.
const SCHEMA_URL = `https://raw.githubusercontent.com/${ELIDDI_OWNER}/${ELIDDI_REPO}/main/config/config.schema.json`;

const state = {
  config: createBlankConfig(),
  schema: null,
  fileHandle: null,
};

// ---- Undo/redo ----
// Coarse-grained on purpose: snapshots are debounced so a burst of keystrokes
// collapses into one undo step instead of one per character.
const history = { entries: [], index: -1 };
let historyTimer = null;

function pushHistorySnapshot() {
  const snapshot = JSON.stringify(state.config);
  if (history.entries[history.index] === snapshot) return;
  history.entries = history.entries.slice(0, history.index + 1);
  history.entries.push(snapshot);
  if (history.entries.length > 50) history.entries.shift();
  history.index = history.entries.length - 1;
  updateUndoRedoButtons();
}

function pushHistorySnapshotDebounced() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(pushHistorySnapshot, 500);
}

function resetHistory() {
  clearTimeout(historyTimer);
  history.entries = [JSON.stringify(state.config)];
  history.index = 0;
  updateUndoRedoButtons();
}

function undo() {
  clearTimeout(historyTimer);
  pushHistorySnapshot();
  if (history.index <= 0) return;
  history.index -= 1;
  state.config = JSON.parse(history.entries[history.index]);
  render({ skipHistory: true });
}

function redo() {
  if (history.index >= history.entries.length - 1) return;
  history.index += 1;
  state.config = JSON.parse(history.entries[history.index]);
  render({ skipHistory: true });
}

function updateUndoRedoButtons() {
  document.getElementById('undo-btn').disabled = history.index <= 0;
  document.getElementById('redo-btn').disabled = history.index >= history.entries.length - 1;
}

const tabsEl = document.getElementById('tabs');
const panelsEl = document.getElementById('panels');
const validationEl = document.getElementById('validation-results');
const schemaBannerEl = document.getElementById('schema-banner');
const jsonPreviewEl = document.getElementById('json-preview');
const fileInput = document.getElementById('file-input');

const TABS = [
  { id: 'general', label: 'General', render: renderGeneralTab },
  { id: 'onboarding', label: 'Onboarding', render: renderOnboardingTab },
  { id: 'timeline', label: 'Timeline', render: renderTimelineTab },
];

let activeTabId = TABS[0].id;

function onChange() {
  updateValidation();
  updateJsonPreview();
  pushHistorySnapshotDebounced();
}

function currentValidationErrors() {
  return state.schema ? validateConfig(state.schema, state.config) : [];
}

function updateValidation() {
  if (!state.schema) {
    validationEl.innerHTML = '';
    validationEl.append(h('p', { class: 'hint' }, 'Schema not loaded - see banner above.'));
    return;
  }
  const errors = currentValidationErrors();
  validationEl.innerHTML = '';
  if (errors.length === 0) {
    validationEl.append(h('p', { class: 'valid' }, `Valid against config.schema.json`));
    return;
  }
  validationEl.append(
    h('p', { class: 'invalid' }, `${errors.length} issue${errors.length === 1 ? '' : 's'} found:`),
    h(
      'ul',
      { class: 'error-list' },
      errors.map((e) => h('li', {}, [h('code', {}, e.path || '/'), ` ${e.message}`]))
    )
  );
}

function updateJsonPreview() {
  jsonPreviewEl.textContent = JSON.stringify(state.config, null, 2);
}

function renderTabs() {
  tabsEl.innerHTML = '';
  TABS.forEach((tab) => {
    tabsEl.append(
      h(
        'button',
        {
          type: 'button',
          class: `tab-btn${tab.id === activeTabId ? ' active' : ''}`,
          onClick: () => {
            activeTabId = tab.id;
            renderTabs();
            renderActivePanel();
          },
        },
        tab.label
      )
    );
  });
}

function renderActivePanel() {
  panelsEl.innerHTML = '';
  const tab = TABS.find((t) => t.id === activeTabId);
  panelsEl.append(tab.render());
}

// ---- General tab ----

function renderGeneralTab() {
  const g = state.config.general;
  const wrapper = h('div', { class: 'panel' });

  wrapper.append(
    h('fieldset', {}, [
      h('legend', {}, 'General'),
      textField('Experiment ID', g.experimentID, (v) => ((g.experimentID = v), onChange())),
      textField('App name', g.app_name, (v) => ((g.app_name = v), onChange())),
      textField('Version', g.version, (v) => ((g.version = v), onChange()), {
        placeholder: '1.0.0',
      }),
      textField('Author', g.author, (v) => ((g.author = v), onChange())),
      textField('Language', g.language, (v) => ((g.language = v), onChange()), {
        placeholder: 'en',
        hint: 'Two-letter language code.',
      }),
      checkboxField('Show onboarding instructions', g.instructions, (v) => ((g.instructions = v), onChange()), {
        hint: 'Boolean toggle - the actual step text lives in the Onboarding tab, not here.',
      }),
      textField(
        'Primary redirect URL',
        g.primary_redirect_url,
        (v) => ((g.primary_redirect_url = v), onChange())
      ),
      checkboxField('Fallback to CSV', g.fallbackToCSV, (v) => ((g.fallbackToCSV = v), onChange())),
    ])
  );

  wrapper.append(
    h('fieldset', {}, [
      h('legend', {}, 'Accessibility'),
      checkboxField(
        'Enable reduced motion',
        g.accessibility?.enableReducedMotion,
        (v) => ((g.accessibility.enableReducedMotion = v), onChange())
      ),
      checkboxField(
        'Enable high contrast',
        g.accessibility?.enableHighContrast,
        (v) => ((g.accessibility.enableHighContrast = v), onChange())
      ),
      checkboxField(
        'Enable forced colors',
        g.accessibility?.enableForcedColors,
        (v) => ((g.accessibility.enableForcedColors = v), onChange())
      ),
      numberField(
        'Autoscroll speed',
        g.accessibility?.autoscrollSpeed,
        (v) => ((g.accessibility.autoscrollSpeed = v), onChange()),
        { hint: 'ELiDDI-specific extension, not part of the upstream O-TUD spec.' }
      ),
    ])
  );

  wrapper.append(
    h('fieldset', {}, [
      h('legend', {}, 'Day boundary'),
      textField(
        'Day boundary (HH:MM)',
        state.config.day_boundary,
        (v) => ((state.config.day_boundary = v), onChange()),
        { placeholder: '04:00', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', hint: 'Top-level field, not under General.' }
      ),
    ])
  );

  return wrapper;
}

// ---- Onboarding tab ----

function renderOnboardingTab() {
  const wrapper = h('div', { class: 'panel' });
  wrapper.append(
    listSection({
      title: 'Onboarding steps',
      items: state.config.instructions,
      itemLabel: 'step',
      createItem: createBlankOnboardingStep,
      onChange,
      renderItem: renderOnboardingStep,
      getSummary: (step) => step.title || '(untitled step)',
    })
  );
  return wrapper;
}

function renderOnboardingStep(step) {
  const spotlight = (step.spotlight ||= [0, 0, 0]);
  return h('div', { class: 'item-fields' }, [
    textField('Title', step.title, (v) => ((step.title = v), onChange())),
    textAreaField('Text', step.text, (v) => ((step.text = v), onChange())),
    h('div', { class: 'field-row' }, [
      numberField('Spotlight X', spotlight[0], (v) => ((spotlight[0] = v), onChange())),
      numberField('Spotlight Y', spotlight[1], (v) => ((spotlight[1] = v), onChange())),
      numberField('Spotlight radius', spotlight[2], (v) => ((spotlight[2] = v), onChange())),
    ]),
    textField('Modal top (optional)', step.modalTop, (v) => ((step.modalTop = v || undefined), onChange())),
    textField('Show panel (optional)', step.showPanel, (v) => ((step.showPanel = v || undefined), onChange())),
  ]);
}

// ---- Timeline tab ----

function renderTimelineTab() {
  const wrapper = h('div', { class: 'panel' });
  wrapper.append(
    h(
      'p',
      { class: 'hint' },
      'Order here controls display order in ELiDDI (which dimension shows first, and the picker’s sequence) - no dimension needs to be at a specific position.'
    ),
    listSection({
      title: 'Dimensions',
      items: state.config.timeline,
      itemLabel: 'dimension',
      minItems: 5,
      createItem: () => createBlankDimension(''),
      onChange,
      renderItem: renderDimension,
      getSummary: (dim) => `${dim.name || '(unnamed dimension)'} — ${(dim.categories || []).length} categories`,
    })
  );
  return wrapper;
}

function renderDimension(dim) {
  return h('div', { class: 'item-fields dimension' }, [
    textField('Name', dim.name, (v) => ((dim.name = v), onChange())),
    textField('Description', dim.description, (v) => ((dim.description = v), onChange())),
    textField('Instruction (optional)', dim.instruction, (v) => ((dim.instruction = v || undefined), onChange())),
    selectField('Mode', dim.mode, ['single-choice', 'multiple-choice'], (v) => ((dim.mode = v), onChange())),
    textField('Min coverage', dim.min_coverage, (v) => ((dim.min_coverage = v), onChange()), {
      pattern: '^\\d+$',
      hint: 'A string of digits (e.g. "10"), not a number.',
    }),
    checkboxField(
      'Allow free text',
      dim.allow_free_text,
      (v) => ((dim.allow_free_text = v), onChange())
    ),
    listSection({
      title: 'Categories',
      items: (dim.categories ||= []),
      itemLabel: 'category',
      createItem: createBlankCategory,
      onChange,
      renderItem: renderCategory,
      getSummary: (cat) => `${cat.name || '(unnamed category)'} — ${(cat.activities || []).length} activities`,
      defaultCollapsed: true,
    }),
  ]);
}

function renderCategory(cat) {
  return h('div', { class: 'item-fields' }, [
    textField('Name', cat.name, (v) => ((cat.name = v), onChange()), {
      hint: 'A single space (" ") is a valid dummy name when there is no real grouping.',
    }),
    colorField('Color (optional)', cat.color, (v) => ((cat.color = v || undefined), onChange())),
    listSection({
      title: 'Activities',
      items: (cat.activities ||= []),
      itemLabel: 'activity',
      createItem: createBlankActivity,
      onChange,
      renderItem: (activity) => renderActivity(activity, { requireColor: true }),
      getSummary: activitySummary,
      defaultCollapsed: true,
    }),
  ]);
}

function activitySummary(activity) {
  const childCount = activity.childItems?.length || 0;
  return `${activity.name || '(unnamed activity)'}${childCount ? ` — ${childCount} child items` : ''}`;
}

function renderActivity(activity, { requireColor }) {
  return h('div', { class: 'item-fields' }, [
    textField('Name', activity.name, (v) => ((activity.name = v), onChange())),
    colorField(
      requireColor ? 'Color' : 'Color (optional)',
      activity.color,
      (v) => ((activity.color = v || (requireColor ? '' : undefined)), onChange())
    ),
    numberField('Code (optional)', activity.code, (v) => ((activity.code = v), onChange()), {
      hint: 'Integer. Not required to be unique across sibling activities.',
    }),
    h('div', { class: 'field-group' }, [
      h('p', { class: 'hint' }, 'label / short / vshort must all be present together, or all omitted.'),
      textField('Label (optional)', activity.label, (v) => ((activity.label = v || undefined), onChange())),
      textField('Short (optional)', activity.short, (v) => ((activity.short = v || undefined), onChange())),
      textField('Vshort (optional)', activity.vshort, (v) => ((activity.vshort = v || undefined), onChange())),
    ]),
    textField('Examples (optional)', activity.examples, (v) => ((activity.examples = v || undefined), onChange())),
    listSection({
      title: 'Child items',
      items: (activity.childItems ||= []),
      itemLabel: 'child item',
      createItem: createBlankChildItem,
      onChange,
      renderItem: (child) => renderActivity(child, { requireColor: false }),
      getSummary: activitySummary,
      defaultCollapsed: true,
    }),
    renderSubselection(activity),
  ]);
}

function renderSubselection(activity) {
  const hasSubselection = !!activity.subselection;
  const container = h('div', { class: 'field-group' });

  const toggle = checkboxField('Has subselection questions', hasSubselection, (checked) => {
    activity.subselection = checked ? { questions: [[]] } : undefined;
    onChange();
    rerenderInPlace();
  });
  container.append(toggle);

  if (activity.subselection) {
    container.append(
      listSection({
        title: 'Question groups',
        items: activity.subselection.questions,
        itemLabel: 'group',
        createItem: () => [],
        onChange,
        renderItem: (group) => renderQuestionGroup(activity.subselection.questions, group),
        getSummary: (group) => (group.length ? group.join(', ') : '(empty group)'),
      })
    );
  }

  function rerenderInPlace() {
    const replacement = renderSubselection(activity);
    container.replaceWith(replacement);
  }

  return container;
}

function renderQuestionGroup(questions, group) {
  const input = h('input', { type: 'text', value: group.join(', ') });
  input.addEventListener('input', () => {
    // Mutate `group` in place rather than replacing questions[i] - listSection's
    // up/down/remove controls find this item via questions.indexOf(group), which
    // breaks the moment the array reference is swapped out for a new one.
    const parsed = input.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    group.length = 0;
    group.push(...parsed);
    onChange();
  });
  return h('label', { class: 'field' }, [h('span', { class: 'field-label' }, 'Questions (comma-separated)'), input]);
}

// ---- File open/save ----

async function openFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const file = await handle.getFile();
      loadConfigFromText(await file.text());
      state.fileHandle = handle;
      return;
    } catch (err) {
      if (err.name !== 'AbortError') alert(`Could not open file: ${err.message}`);
      return;
    }
  }
  fileInput.click();
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  loadConfigFromText(await file.text());
  fileInput.value = '';
});

function loadConfigFromText(text) {
  try {
    state.config = JSON.parse(text);
  } catch (err) {
    alert(`That file isn't valid JSON: ${err.message}`);
    return;
  }
  state.fileHandle = null;
  render();
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function saveFile() {
  const text = `${JSON.stringify(state.config, null, 2)}\n`;

  if (state.fileHandle) {
    try {
      const writable = await state.fileHandle.createWritable();
      await writable.write(text);
      await writable.close();
      return;
    } catch {
      // fall through to save-as / download below
    }
  }

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'config.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      state.fileHandle = handle;
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  downloadText(text, 'config.json');
}

document.getElementById('open-btn').addEventListener('click', openFile);
document.getElementById('save-btn').addEventListener('click', saveFile);
document.getElementById('new-btn').addEventListener('click', () => {
  if (!confirm('Start a new blank config? Unsaved changes will be lost.')) return;
  state.config = createBlankConfig();
  state.fileHandle = null;
  render();
});
document.getElementById('undo-btn').addEventListener('click', undo);
document.getElementById('redo-btn').addEventListener('click', redo);

// Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z, but only when focus isn't in a field - a
// field's own native undo (e.g. mid-edit text) should win over ours there.
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
});

// ---- Deploy ----
// Triggers workflow_dispatch on ELiDDI's own deploy.yml via the GitHub REST
// API, passing the current in-editor config as the `data` input - the same
// call the old static config.js + button made, just sourced from live state
// instead of a hand-copied file.

function setDeployStatus(text, kind) {
  const statusEl = document.getElementById('deploy-status');
  statusEl.textContent = text;
  statusEl.className = `deploy-status${kind ? ` ${kind}` : ''}`;
}

async function deployToELiDDI() {
  const token = document.getElementById('deploy-token').value.trim();
  if (!token) {
    setDeployStatus('Enter a GitHub personal access token first.', 'invalid');
    return;
  }

  const errors = currentValidationErrors();
  if (errors.length > 0) {
    const proceed = confirm(
      `This config has ${errors.length} validation issue${errors.length === 1 ? '' : 's'}. Deploy anyway?`
    );
    if (!proceed) return;
  }

  setDeployStatus('Dispatching…');
  const dispatchUrl = `https://api.github.com/repos/${ELIDDI_OWNER}/${ELIDDI_REPO}/actions/workflows/deploy.yml/dispatches`;

  try {
    const res = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { data: JSON.stringify(state.config) },
      }),
    });

    if (res.status === 204) {
      setDeployStatus(
        `Deploy triggered (${new Date().toLocaleTimeString()}) - check the ELiDDI repo's Actions tab for progress.`,
        'valid'
      );
    } else {
      const body = await res.text();
      setDeployStatus(`GitHub API returned ${res.status}: ${body}`, 'invalid');
    }
  } catch (err) {
    setDeployStatus(`Request failed: ${err.message}`, 'invalid');
  }
}

document.getElementById('deploy-btn').addEventListener('click', deployToELiDDI);

// ---- Boot ----

function render({ skipHistory = false } = {}) {
  renderTabs();
  renderActivePanel();
  updateValidation();
  updateJsonPreview();
  if (skipHistory) {
    updateUndoRedoButtons();
  } else {
    resetHistory();
  }
}

async function boot() {
  // fetch() of a local file fails under file:// in Chromium-based browsers -
  // that's expected, not a bug; the editor still works for editing/exporting
  // and the Deploy button still works too, just without live schema
  // validation until served over http (GitHub Pages always is).
  try {
    const schemaResp = await fetch(SCHEMA_URL);
    if (schemaResp.ok) state.schema = await schemaResp.json();
  } catch {
    // handled by the banner below
  }

  if (!state.schema) {
    schemaBannerEl.hidden = false;
  }

  try {
    const configResp = await fetch('./config.json');
    if (configResp.ok) state.config = await configResp.json();
  } catch {
    // starting from a blank config is fine
  }

  render();
}

boot();
