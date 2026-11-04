/** Cliente HTTP mínimo. Siempre relativo: la app se sirve desde el mismo origen. */
const TOKEN_KEY = 'nexo_session_token';

export function storeToken(token) {
  if (!token) return;
  try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* modo privado */ }
}

export function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-nexo-token': token } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (body && body.error) || `Error ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export const api = {
  status: () => request('/api/status'),
  access: async (inviteCode, displayName, utm) => {
    const res = await request('/api/access', {
      method: 'POST',
      body: JSON.stringify({ inviteCode, displayName, utm }),
    });
    storeToken(res.token);
    return res;
  },
  test: () => request('/api/test'),
  submit: (answers) => request('/api/test/submit', { method: 'POST', body: JSON.stringify({ answers }) }),
  report: () => request('/api/report'),
  track: (event, value = null) =>
    request('/api/track', { method: 'POST', body: JSON.stringify({ event, value }) }).catch(() => null),
  logProgress: (payload) => request('/api/progress', { method: 'POST', body: JSON.stringify(payload) }),
  today: () => request('/api/progress/today'),
};

export function utmFromUrl() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source'),
    utm_medium: p.get('utm_medium'),
    utm_campaign: p.get('utm_campaign'),
    utm_content: p.get('utm_content'),
    utm_term: p.get('utm_term'),
    referrer: document.referrer || null,
  };
}
