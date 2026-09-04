// Factories for new/blank pieces of config.json, kept separate from the
// rendering code in app.js so the "what does an empty X look like" question
// has one answer.
export function createBlankConfig() {
  return {
    $schema: './config.schema.json',
    general: {
      experimentID: '',
      app_name: '',
      version: '1.0.0',
      author: '',
      language: 'en',
      instructions: true,
      primary_redirect_url: '',
      fallbackToCSV: true,
      accessibility: {
        enableReducedMotion: false,
        enableHighContrast: false,
        enableForcedColors: false,
        autoscrollSpeed: 32,
      },
    },
    day_boundary: '04:00',
    instructions: [],
    timeline: [
      createBlankDimension('Primary activity'),
      createBlankDimension('Secondary activity'),
      createBlankDimension('Location'),
      createBlankDimension('Who'),
      createBlankDimension('Device'),
    ],
  };
}

export function createBlankDimension(name = '') {
  return {
    name,
    description: '',
    mode: 'single-choice',
    min_coverage: '0',
    categories: [],
  };
}

export function createBlankCategory() {
  return { name: '', activities: [] };
}

export function createBlankActivity() {
  return { name: '', color: '#a8a8a8' };
}

export function createBlankChildItem() {
  return { name: '' };
}

export function createBlankOnboardingStep() {
  return { title: '', text: '', spotlight: [0, 0, 0] };
}
