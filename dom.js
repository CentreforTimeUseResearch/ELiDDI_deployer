// Tiny hyperscript-style helper so the rest of the editor can build DOM trees
// declaratively without a virtual-DOM library. Mirrors the project's
// no-runtime-dependency stance (see CLAUDE.md) - vanilla DOM APIs only.
export function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      node.className = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'checked' || key === 'value' || key === 'disabled') {
      node[key] = value;
    } else if (value === true) {
      node.setAttribute(key, '');
    } else if (value !== false && value != null) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function textField(label, value, onChange, opts = {}) {
  const input = h('input', {
    type: opts.type || 'text',
    value: value ?? '',
    placeholder: opts.placeholder || '',
  });
  if (opts.pattern) input.setAttribute('pattern', opts.pattern);
  input.addEventListener('input', () => onChange(input.value));
  return h('label', { class: 'field' }, [
    h('span', { class: 'field-label' }, label),
    input,
    opts.hint ? h('small', { class: 'hint' }, opts.hint) : null,
  ]);
}

export function textAreaField(label, value, onChange, opts = {}) {
  const textarea = h('textarea', { rows: opts.rows || 3 });
  textarea.value = value ?? '';
  textarea.addEventListener('input', () => onChange(textarea.value));
  return h('label', { class: 'field' }, [
    h('span', { class: 'field-label' }, label),
    textarea,
    opts.hint ? h('small', { class: 'hint' }, opts.hint) : null,
  ]);
}

export function numberField(label, value, onChange, opts = {}) {
  const input = h('input', { type: 'number', value: value ?? '' });
  if (opts.step !== undefined) input.step = opts.step;
  input.addEventListener('input', () => {
    onChange(input.value === '' ? undefined : Number(input.value));
  });
  return h('label', { class: 'field' }, [
    h('span', { class: 'field-label' }, label),
    input,
    opts.hint ? h('small', { class: 'hint' }, opts.hint) : null,
  ]);
}

export function checkboxField(label, checked, onChange, opts = {}) {
  const input = h('input', { type: 'checkbox', checked: !!checked });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'field field-checkbox' }, [
    input,
    h('span', {}, label),
    opts.hint ? h('small', { class: 'hint' }, opts.hint) : null,
  ]);
}

export function selectField(label, value, options, onChange) {
  const select = h(
    'select',
    {},
    options.map((opt) => h('option', { value: opt, selected: opt === value }, opt))
  );
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return h('label', { class: 'field' }, [h('span', { class: 'field-label' }, label), select]);
}

export function colorField(label, value, onChange, opts = {}) {
  const swatch = h('span', { class: 'color-swatch' });
  swatch.style.background = value || 'transparent';
  const input = h('input', {
    type: 'text',
    value: value ?? '',
    placeholder: '#rrggbb',
    pattern: '^#[0-9a-fA-F]{6}$',
  });
  input.addEventListener('input', () => {
    swatch.style.background = /^#[0-9a-fA-F]{6}$/.test(input.value) ? input.value : 'transparent';
    onChange(input.value);
  });
  return h('label', { class: 'field' }, [
    h('span', { class: 'field-label' }, label),
    h('span', { class: 'color-input' }, [swatch, input]),
    opts.hint ? h('small', { class: 'hint' }, opts.hint) : null,
  ]);
}

// Shared across every listSection instance, keyed by item object reference
// (items are mutated in place and never replaced - see below - so identity
// is stable for the item's whole lifetime). `collapsed` holds current
// expand/collapse state; `initialized` records whether a default has been
// applied yet, so a section rebuilt by an ancestor's re-render doesn't
// re-collapse something the user already expanded.
const collapsedItems = new WeakSet();
const initializedItems = new WeakSet();

function defaultSummary(item) {
  if (item == null) return '';
  if (Array.isArray(item)) return item.length ? item.join(', ') : '(empty)';
  return item.name ?? item.title ?? '';
}

// Generic add/remove/reorder/collapse list editor. `items` is mutated in
// place (push/splice) so the caller's reference stays the single source of
// truth - renderItem rebuilds only when the list's own shape changes, not on
// every keystroke inside an item (those bind directly to the item object).
export function listSection({
  title,
  items,
  itemLabel,
  createItem,
  renderItem,
  onChange,
  minItems,
  getSummary = defaultSummary,
  defaultCollapsed = false,
}) {
  const section = h('div', { class: 'list-section' });
  const headerActions = h('div', { class: 'list-section-actions' }, [
    h(
      'button',
      {
        type: 'button',
        class: 'link-btn',
        onClick: () => entries.forEach((entry) => setCollapsed(entry, true)),
      },
      'Collapse all'
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'link-btn',
        onClick: () => entries.forEach((entry) => setCollapsed(entry, false)),
      },
      'Expand all'
    ),
  ]);
  section.append(h('div', { class: 'list-section-header' }, [title ? h('h4', {}, title) : null, headerActions]));

  const itemsContainer = h('div', { class: 'list-items' });
  let entries = [];
  let dragSrcEntry = null;

  function setCollapsed(entry, collapsed) {
    if (collapsed) collapsedItems.add(entry.item);
    else collapsedItems.delete(entry.item);
    entry.contentEl.hidden = collapsed;
    entry.wrapper.classList.toggle('expanded', !collapsed);
    entry.twistyEl.textContent = collapsed ? '▶' : '▼';
    entry.twistyEl.setAttribute('aria-expanded', String(!collapsed));
  }

  function moveItem(item, delta) {
    const i = items.indexOf(item);
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    renderAll();
    onChange();
  }

  function removeItem(item) {
    if (minItems && items.length <= minItems) {
      alert(`At least ${minItems} ${itemLabel || 'items'} are required.`);
      return;
    }
    items.splice(items.indexOf(item), 1);
    renderAll();
    onChange();
  }

  function createEntry(item) {
    if (!initializedItems.has(item)) {
      initializedItems.add(item);
      if (defaultCollapsed) collapsedItems.add(item);
    }

    const twisty = h('button', { type: 'button', class: 'twisty', title: 'Expand/collapse' });
    const summaryEl = h('span', { class: 'list-item-summary' }, getSummary(item));
    const headerRow = h('div', { class: 'list-item-header', draggable: 'true' }, [
      twisty,
      summaryEl,
      h('div', { class: 'list-item-controls' }, [
        h('button', { type: 'button', title: 'Move up', onClick: () => moveItem(item, -1) }, '↑'),
        h('button', { type: 'button', title: 'Move down', onClick: () => moveItem(item, 1) }, '↓'),
        h('button', { type: 'button', class: 'danger', title: 'Remove', onClick: () => removeItem(item) }, '✕'),
      ]),
    ]);

    const contentEl = h('div', { class: 'list-item-content' });
    contentEl.append(renderItem(item, onChange));
    // Refreshes the collapsed-row label as the user edits, without needing
    // app.js's per-field callbacks to know about this section at all.
    contentEl.addEventListener('input', () => (summaryEl.textContent = getSummary(item)));
    contentEl.addEventListener('change', () => (summaryEl.textContent = getSummary(item)));

    const wrapper = h('div', { class: 'list-item' }, [headerRow, contentEl]);
    const entry = { item, wrapper, contentEl, twistyEl: twisty };
    twisty.addEventListener('click', () => setCollapsed(entry, !collapsedItems.has(item)));
    setCollapsed(entry, collapsedItems.has(item));

    // Native HTML5 drag-and-drop as an addition to the up/down buttons, not a
    // replacement - DnD alone isn't keyboard-accessible.
    headerRow.addEventListener('dragstart', (e) => {
      dragSrcEntry = entry;
      wrapper.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    headerRow.addEventListener('dragend', () => {
      wrapper.classList.remove('dragging');
      dragSrcEntry = null;
    });
    headerRow.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    headerRow.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragSrcEntry || dragSrcEntry.item === item) return;
      const from = items.indexOf(dragSrcEntry.item);
      const to = items.indexOf(item);
      if (from === -1 || to === -1) return;
      items.splice(from, 1);
      items.splice(to, 0, dragSrcEntry.item);
      renderAll();
      onChange();
    });

    return entry;
  }

  function renderAll() {
    itemsContainer.innerHTML = '';
    entries = items.map(createEntry);
    entries.forEach((entry) => itemsContainer.append(entry.wrapper));
  }

  const addBtn = h(
    'button',
    {
      type: 'button',
      class: 'add-btn',
      onClick: () => {
        const item = createItem();
        initializedItems.add(item); // new items always start expanded
        items.push(item);
        renderAll();
        onChange();
      },
    },
    `+ Add ${itemLabel || 'item'}`
  );

  renderAll();
  section.append(itemsContainer, addBtn);
  return section;
}
