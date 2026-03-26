const API_BASE = String(process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
const API_PREFIX = API_BASE ? `${API_BASE}/api/` : '/api/';
const FETCH_TIMEOUT_MS = Number(process.env.REACT_APP_FETCH_TIMEOUT_MS || 12000);
const FETCH_RETRY_COUNT = Math.max(0, Number(process.env.REACT_APP_FETCH_RETRY_COUNT || 1));
const ORIGINAL_FETCH = typeof window !== 'undefined' && typeof window.fetch === 'function'
  ? window.fetch.bind(window)
  : null;

let nativeFetch = null;
let refreshInFlight = null;
let isPatched = false;

function ensureNativeFetch() {
  if (!nativeFetch) {
    nativeFetch = ORIGINAL_FETCH || window.fetch.bind(window);
  }
  return nativeFetch;
}

function toUrlString(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof input.url === 'string') return input.url;
  return '';
}

function normalizeApiUrl(url) {
  const rawUrl = String(url || '');
  if (!rawUrl || !API_BASE) return rawUrl;
  if (rawUrl.startsWith('/api/')) return resolveApiUrl(rawUrl);

  try {
    const parsed = new URL(rawUrl, window.location.origin);
    if (parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/')) {
      return `${API_BASE}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch (error) {
    return rawUrl;
  }

  return rawUrl;
}

function normalizeApiInput(input) {
  const nextUrl = normalizeApiUrl(toUrlString(input));
  if (!nextUrl) return input;
  if (typeof input === 'string') return nextUrl;
  if (input instanceof URL) return new URL(nextUrl);
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return new Request(nextUrl, input);
  }
  return input;
}

function isApiRequest(url) {
  return url.startsWith(API_PREFIX) || url.startsWith('/api/');
}

export function resolveApiUrl(path) {
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${cleanPath}` : cleanPath;
}

export async function fetchPublicApi(input, init = {}) {
  const fetchImpl = ensureNativeFetch();
  const requestInput = normalizeApiInput(input);
  return fetchWithPolicy(fetchImpl, requestInput, init);
}

function normalizeMethod(method) {
  return String(method || 'GET').toUpperCase();
}

function shouldRetryResponse(response, method, attempt) {
  return normalizeMethod(method) === 'GET' && attempt < FETCH_RETRY_COUNT && response.status >= 500;
}

function shouldRetryError(error, method, attempt, timedOutByClient) {
  if (normalizeMethod(method) !== 'GET' || attempt >= FETCH_RETRY_COUNT) return false;
  if (timedOutByClient) return true;
  const name = String(error?.name || '');
  return name === 'AbortError' || name === 'TypeError';
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchWithPolicy(fetchImpl, input, init = {}) {
  const method = normalizeMethod(init?.method);
  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const upstreamSignal = init?.signal || null;
    let abortHandler = null;

    if (upstreamSignal) {
      if (upstreamSignal.aborted) {
        controller.abort();
      } else {
        abortHandler = () => controller.abort();
        upstreamSignal.addEventListener('abort', abortHandler, { once: true });
      }
    }

    try {
      const response = await fetchImpl(input, { ...init, signal: controller.signal });
      if (shouldRetryResponse(response, method, attempt)) {
        attempt += 1;
        await wait(250 * attempt);
        continue;
      }
      return response;
    } catch (error) {
      const timedOutByClient = controller.signal.aborted && !upstreamSignal?.aborted;
      if (shouldRetryError(error, method, attempt, timedOutByClient)) {
        attempt += 1;
        await wait(250 * attempt);
        continue;
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
      if (upstreamSignal && abortHandler) {
        upstreamSignal.removeEventListener('abort', abortHandler);
      }
    }
  }
}

export function getAccessToken() {
  return String(localStorage.getItem('accessToken') || '');
}

export function getRefreshToken() {
  return String(localStorage.getItem('refreshToken') || '');
}

export function clearAuthSession() {
  sessionStorage.removeItem('wertech_session_active');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('username');
  localStorage.removeItem('userBalance');
  localStorage.removeItem('hasSubscribed');
}

export function setAuthSession(payload = {}) {
  if (payload.access_token) localStorage.setItem('accessToken', String(payload.access_token));
  if (payload.refresh_token) localStorage.setItem('refreshToken', String(payload.refresh_token));
  if (payload.role) localStorage.setItem('userRole', String(payload.role));
  if (payload.username) localStorage.setItem('username', String(payload.username));
  if (payload.wtk_balance !== undefined) localStorage.setItem('userBalance', String(payload.wtk_balance || 0));
  if (payload.has_subscribed !== undefined) localStorage.setItem('hasSubscribed', String(!!payload.has_subscribed));
  localStorage.setItem('isAuthenticated', 'true');
  sessionStorage.setItem('wertech_session_active', 'true');
}

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;

  const doRefresh = async () => {
    const fetchImpl = ensureNativeFetch();
    try {
      const response = await fetchImpl(resolveApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!response.ok) {
        clearAuthSession();
        return false;
      }
      const data = await response.json();
      if (!data?.access_token || !data?.refresh_token) {
        clearAuthSession();
        return false;
      }
      localStorage.setItem('accessToken', String(data.access_token));
      localStorage.setItem('refreshToken', String(data.refresh_token));
      return true;
    } catch (err) {
      clearAuthSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  };

  refreshInFlight = doRefresh();
  return refreshInFlight;
}

async function authFetchImpl(input, init = {}) {
  const fetchImpl = ensureNativeFetch();
  const requestInput = normalizeApiInput(input);
  const url = normalizeApiUrl(toUrlString(requestInput));
  const apiRequest = isApiRequest(url);
  const requestInit = { ...init };
  requestInit.headers = { ...(requestInit.headers || {}) };

  if (apiRequest) {
    const accessToken = getAccessToken();
    if (accessToken) {
      requestInit.headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  let response = await fetchWithPolicy(fetchImpl, requestInput, requestInit);
  if (!apiRequest || response.status !== 401) {
    return response;
  }

  if (url.endsWith('/api/auth/login') || url.endsWith('/api/auth/register') || url.endsWith('/api/auth/refresh')) {
    return response;
  }

  const refreshed = await refreshTokens();
  if (!refreshed) return response;

  const retryInit = { ...init, headers: { ...(init?.headers || {}) } };
  const nextAccess = getAccessToken();
  if (nextAccess) retryInit.headers.Authorization = `Bearer ${nextAccess}`;
  response = await fetchWithPolicy(fetchImpl, requestInput, retryInit);
  if (response.status === 401) {
    clearAuthSession();
  }
  return response;
}

export function setupApiAuthFetch() {
  if (isPatched) return;
  ensureNativeFetch();
  window.fetch = (input, init) => authFetchImpl(input, init);
  isPatched = true;
}

export async function bootstrapAuthSession() {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken && !refreshToken) {
    clearAuthSession();
    return false;
  }

  try {
    const response = await window.fetch(resolveApiUrl('/api/auth/me'));
    if (!response.ok) {
      clearAuthSession();
      return false;
    }
    const data = await response.json();
    setAuthSession(data);
    return true;
  } catch (err) {
    clearAuthSession();
    return false;
  }
}

export async function logoutFromServer(options = {}) {
  const allDevices = options?.allDevices === true;
  try {
    await window.fetch(resolveApiUrl('/api/auth/logout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all_devices: allDevices })
    });
  } catch (err) {
    // ignore network/logout errors and clear local session regardless
  } finally {
    clearAuthSession();
  }
}
