// Taskify API client
// API_BASE resolves relative to how the app is served (nginx proxies /api to backend).
const API_BASE = '/api';

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('taskify_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data;
}

const TaskifyAPI = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (name, email, password, role) =>
    apiRequest('/auth/register', { method: 'POST', body: { name, email, password, role }, auth: false }),
  me: () => apiRequest('/auth/me'),
  updateProfile: (fields) => apiRequest('/auth/me', { method: 'PATCH', body: fields }),
  changePassword: (currentPassword, newPassword) =>
    apiRequest('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  getTasks: () => apiRequest('/tasks'),
  createTask: (task) => apiRequest('/tasks', { method: 'POST', body: task }),
  updateTask: (id, fields) => apiRequest(`/tasks/${id}`, { method: 'PATCH', body: fields }),
  deleteTask: (id) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }),
  getAssignments: () => apiRequest('/assignments'),
  createAssignment: (title, due_date, grade) =>
    apiRequest('/assignments', { method: 'POST', body: { title, due_date, grade } }),
  toggleAssignment: (id) => apiRequest(`/assignments/${id}/toggle`, { method: 'PATCH' }),
  logProgress: (day_label, sort_order, hours) =>
    apiRequest('/tasks/progress-log', { method: 'POST', body: { day_label, sort_order, hours } }),
  getBatchmates: () => apiRequest('/users/batchmates'),
  addBatchmate: (name, role) => apiRequest('/users/batchmates', { method: 'POST', body: { name, role } }),
  removeBatchmate: (id) => apiRequest(`/users/batchmates/${id}`, { method: 'DELETE' }),
  getReportsSummary: () => apiRequest('/reports/summary'),
};

function saveSession(token, user) {
  localStorage.setItem('taskify_token', token);
  localStorage.setItem('taskify_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('taskify_token');
  localStorage.removeItem('taskify_user');
}

function getSessionUser() {
  const raw = localStorage.getItem('taskify_user');
  return raw ? JSON.parse(raw) : null;
}