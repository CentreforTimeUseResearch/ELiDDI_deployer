// The pre-made validation rules ELiDDI ships, and how strictly a study applies
// each (config.validation: rule id -> 'off' | 'soft' | 'hard'). The ids match
// ELiDDI's config schema and its src/validation/ rules; a rule that is missing
// from the config is Off. Pure functions over the config, so they can be tested
// without a browser.

export const VALIDATION_LEVELS = [
  { value: 'off', label: 'Off' },
  { value: 'soft', label: 'Soft' },
  { value: 'hard', label: 'Hard' },
];

export const VALIDATION_RULES = [
  {
    id: 'no-gaps-in-primary',
    name: 'No gaps in Primary activity',
    description: 'Every time slot of the day has a Primary activity entry.',
  },
  {
    id: 'primary-secondary-differ',
    name: 'Primary and Secondary differ',
    description: 'The same activity is not recorded as both Primary and Secondary at the same time.',
  },
  {
    id: 'minimum-sleep',
    name: 'Minimum sleep',
    description: 'At least 4 hours of sleep are recorded.',
  },
  {
    id: 'eating-or-drinking',
    name: 'Some eating or drinking',
    description: 'At least one eating or drinking episode is recorded.',
  },
];

const OFF = 'off';
const isLevel = (value) => VALIDATION_LEVELS.some((level) => level.value === value);

// a `validation` object with every rule Off
export function createBlankValidation() {
  return Object.fromEntries(VALIDATION_RULES.map((rule) => [rule.id, OFF]));
}

// the level a rule is set to; Off when the config says nothing about it (or
// something that is not a level)
export function getValidationLevel(config, ruleId) {
  const level = config?.validation?.[ruleId];
  return isLevel(level) ? level : OFF;
}

// sets one rule's level, in place. All four rules are written out, so the
// config says what every rule is set to once any has been chosen; settings
// for ids this tool does not know are left alone. Throws for a rule or level
// that does not exist, rather than writing something ELiDDI would reject.
export function setValidationLevel(config, ruleId, level) {
  if (!VALIDATION_RULES.some((rule) => rule.id === ruleId)) {
    throw new RangeError(`Unknown validation rule: ${ruleId}`);
  }
  if (!isLevel(level)) {
    throw new RangeError(`Unknown validation level: ${level}`);
  }
  const levels = Object.fromEntries(
    VALIDATION_RULES.map((rule) => [rule.id, getValidationLevel(config, rule.id)])
  );
  config.validation = { ...config.validation, ...levels, [ruleId]: level };
}
