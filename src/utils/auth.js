const TOKEN_KEY = 'voxbharat_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authFetch(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).then(r => {
    if (r.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('voxbharat-logout'));
    }
    return r;
  });
}
