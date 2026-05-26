import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

// attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gw_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gw_token');
      localStorage.removeItem('gw_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────
export const login         = (data) => api.post('/auth/login', data);
export const register      = (data) => api.post('/auth/register', data);
export const generateKey   = (data) => api.post('/auth/keys', data);
export const listKeys      = ()     => api.get('/auth/keys');
export const revokeKey     = (id)   => api.delete(`/auth/keys/${id}`);

// ── Admin ──────────────────────────────────────────────────────
export const getStats       = ()         => api.get('/admin/stats');
export const getRequests    = (p)        => api.get(`/admin/requests?page=${p}&limit=20`);
export const getAbuseEvents = (p)        => api.get(`/admin/abuse?page=${p}&limit=20`);
export const getUsers       = ()         => api.get('/admin/users');
export const updateUser     = (id, data) => api.patch(`/admin/users/${id}`, data);
export const deleteUser     = (id)       => api.delete(`/admin/users/${id}`);
export const blockIP        = (ip)       => api.post('/admin/block',   { ip });
export const unblockIP      = (ip)       => api.post('/admin/unblock', { ip });

// ── Settings ───────────────────────────────────────────────────
export const getSettings    = ()         => api.get('/admin/settings');
export const updateSettings = (data)     => api.post('/admin/settings', data);
export const resetSettings  = ()         => api.post('/admin/settings/reset');

// ── ML Service ─────────────────────────────────────────────────
export const getMLHealth    = ()         => axios.get('http://localhost:5001/health');
export const getMLInfo      = ()         => axios.get('http://localhost:5001/model/info');

export default api;