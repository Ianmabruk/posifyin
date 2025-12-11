const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';

const getToken = () => localStorage.getItem('token');

const request = async (endpoint, options = {}) => {
  const token = getToken();
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const auth = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) })
};

export const products = {
  getAll: () => request('/products'),
  create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/products/${id}`, { method: 'DELETE' })
};

export const sales = {
  getAll: () => request('/sales'),
  create: (data) => request('/sales', { method: 'POST', body: JSON.stringify(data) })
};

export const expenses = {
  getAll: () => request('/expenses'),
  create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) })
};

export const stats = {
  get: () => request('/stats')
};

export const users = {
  getAll: () => request('/users'),
  create: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' })
};

export const reminders = {
  getAll: () => request('/reminders'),
  getToday: () => request('/reminders/today'),
  create: (data) => request('/reminders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/reminders/${id}`, { method: 'DELETE' })
};

export const priceHistory = {
  getAll: () => request('/price-history'),
  create: (data) => request('/price-history', { method: 'POST', body: JSON.stringify(data) })
};

export const serviceFees = {
  getAll: () => request('/service-fees'),
  create: (data) => request('/service-fees', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/service-fees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/service-fees/${id}`, { method: 'DELETE' })
};

export const discounts = {
  getAll: () => request('/discounts'),
  create: (data) => request('/discounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/discounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/discounts/${id}`, { method: 'DELETE' })
};

export const creditRequests = {
  getAll: () => request('/credit-requests'),
  create: (data) => request('/credit-requests', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id) => request(`/credit-requests/${id}/approve`, { method: 'POST' }),
  reject: (id) => request(`/credit-requests/${id}/reject`, { method: 'POST' })
};

export const settings = {
  get: () => request('/settings'),
  update: (data) => request('/settings', { method: 'POST', body: JSON.stringify(data) })
};

export const batches = {
  getAll: (productId) => request(`/batches${productId ? `?productId=${productId}` : ''}`),
  create: (data) => request('/batches', { method: 'POST', body: JSON.stringify(data) })
};

export const production = {
  getAll: () => request('/production'),
  create: (data) => request('/production', { method: 'POST', body: JSON.stringify(data) })
};

export const categories = {
  generateCode: (data) => request('/categories/generate-code', { method: 'POST', body: JSON.stringify(data) })
};