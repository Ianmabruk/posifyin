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