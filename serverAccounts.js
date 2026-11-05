// Server-side accounts (ELiDDI#111): a study can have its Respondents log in to
// an ELiDDI backend so a Diary follows them between devices. Two settings in
// config.general, both defined by ELiDDI's config schema:
//   server_accounts  boolean, absent = false
//   backend_url      string, http(s)://..., required when server_accounts is true
// Pure helpers for the General tab and the Deploy panel; tested by
// serverAccounts.test.mjs (node --test).

// shown beside the Deploy button whenever the config has accounts on
export const ACCOUNTS_DEPLOY_WARNING =
  'This study uses server accounts: you must have a correctly configured backend to use server side accounts. ' +
  'Deploying only publishes the diary; it does not set up or check the backend.';

export function isServerAccountsOn(config) {
  return config?.general?.server_accounts === true;
}

// Turns the setting on or off on `general`. Turning it on makes sure there is a
// backend_url to fill in; turning it off keeps whatever URL was typed, so
// switching back does not lose it (ELiDDI ignores backend_url unless the
// setting is true).
export function setServerAccounts(general, on) {
  general.server_accounts = Boolean(on);
  if (on && typeof general.backend_url !== 'string') {
    general.backend_url = '';
  }
}

// Advisory only - none of these make the config invalid (a missing or malformed
// backend_url is an error, reported by the schema check). Shaped like the
// validator's errors: { path, message }.
export function collectAccountsWarnings(config) {
  if (!isServerAccountsOn(config)) {
    return [];
  }
  const general = config.general;
  const warnings = [];
  const url = typeof general.backend_url === 'string' ? general.backend_url.trim() : '';

  if (/^http:\/\//i.test(url)) {
    warnings.push({
      path: '/general/backend_url',
      message:
        'uses http://. A diary served over https cannot talk to an http backend (the browser blocks it), ' +
        'and logins and diaries would travel unencrypted. Use https:// except for testing on your own machine.',
    });
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?=[:/]|$)/i.test(url)) {
    warnings.push({
      path: '/general/backend_url',
      message: 'points at this computer, so it will only work for you. Use the backend’s public address for a real study.',
    });
  }
  if (general.accessibility?.generateHtmlFallback === true) {
    warnings.push({
      path: '/general/accessibility/generateHtmlFallback',
      message: 'is on, but is ignored with server accounts: a plain HTML form cannot log in.',
    });
  }
  if (typeof general.submit_completed_diary_url === 'string' && general.submit_completed_diary_url.trim() !== '') {
    warnings.push({
      path: '/general/submit_completed_diary_url',
      message:
        'is ignored with server accounts: a completed diary is sent to the backend (backend_url + /submit) with the Respondent’s login.',
    });
  }
  return warnings;
}
