// ELiDDI shows an onboarding step's `text` as raw HTML, on purpose (authors
// use <strong>, <br> and so on), so nothing escapes it. These checks warn about
// markup that runs code; they never block, and a clean <strong> must not warn.

const UNSAFE_MARKUP = [
  { pattern: /<\s*script/i, message: 'contains a <script> tag, which would run code in the diary' },
  {
    pattern: /<[a-z][^>]*\son[a-z]+\s*=/i,
    message: 'contains an inline event handler (such as onclick=), which would run code in the diary',
  },
  { pattern: /javascript\s*:/i, message: 'contains a javascript: URL, which would run code in the diary' },
];

// the reasons `html` is unsafe to show unescaped; empty when it looks fine
export function findUnsafeMarkup(html) {
  if (typeof html !== 'string') return [];
  return UNSAFE_MARKUP.filter(({ pattern }) => pattern.test(html)).map(({ message }) => message);
}

// warnings for a whole config, shaped like the validator's errors ({ path, message })
export function collectHtmlWarnings(config) {
  const steps = Array.isArray(config?.instructions) ? config.instructions : [];
  return steps.flatMap((step, index) =>
    findUnsafeMarkup(step?.text).map((message) => ({
      path: `/instructions/${index}/text`,
      message: `Text ${message}`,
    }))
  );
}
