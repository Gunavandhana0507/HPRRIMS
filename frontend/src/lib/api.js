import axios from 'axios';

const TOKEN_KEY = 'hprrims.token';
const USER_KEY = 'hprrims.user';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`,
  timeout: 20000,
});

export const session = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.request.use((config) => {
  const token = session.token();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      onUnauthorized(error.response?.data?.code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
    }
    return Promise.reject(error);
  },
);

/** Human-readable message for any API error. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Check your connection and try again.'
      : 'Cannot reach the HPRRIMS server. Check that the backend is running and try again.';
  }
  const { status, data } = error.response;
  if (data?.message) return data.message;
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'The requested record was not found.';
  return fallback;
}

/** Field errors from a 400 validation response, keyed by field name. */
export function fieldErrors(error) {
  return error?.response?.data?.fieldErrors || {};
}

export async function downloadFile(url, params) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const name = match ? match[1] : 'report.csv';
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
  return { name, rows: Number(res.headers['x-row-count'] || 0) };
}
