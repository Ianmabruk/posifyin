import { saveData, loadData } from '../utils/localStorage.js';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5002/api';

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

  // Extract data key from endpoint for localStorage
  const getDataKey = (endpoint) => {
    if (endpoint.includes('/products')) return 'products';
    if (endpoint.includes('/sales')) return 'sales';
    if (endpoint.includes('/expenses')) return 'expenses';
    if (endpoint.includes('/users')) return 'users';
    if (endpoint.includes('/reminders')) return 'reminders';
    if (endpoint.includes('/stats')) return 'stats';
    if (endpoint.includes('/settings')) return 'settings';
    if (endpoint.includes('/service-fees')) return 'serviceFees';
    if (endpoint.includes('/discounts')) return 'discounts';
    if (endpoint.includes('/credit-requests')) return 'creditRequests';
    if (endpoint.includes('/time-entries')) return 'timeEntries';
    if (endpoint.includes('/categories')) return 'categories';
    if (endpoint.includes('/batches')) return 'batches';
    if (endpoint.includes('/production')) return 'production';
    if (endpoint.includes('/price-history')) return 'priceHistory';
    return null;
  };

  const dataKey = getDataKey(endpoint);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);


    // For auth endpoints, throw errors so they can be caught and handled with fallback
    if (endpoint.includes('/auth/')) {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
        throw new Error(errorData.error || 'Authentication failed');
      }
      return await response.json();
    }


    // Handle 401 Unauthorized for non-auth endpoints (Invalid Token)
    if (response.status === 401) {
      console.warn('Session expired or token invalid. Backend returned 401.');
      // Only redirect if we are sure it's not a temporary glitch
      // localStorage.removeItem('token');
      // localStorage.removeItem('user');
      // window.location.href = '/'; // Redirect to login
      throw new Error('Session expired. Please login again.');
    }


    // Handle 204 No Content responses (typically DELETE operations)
    if (response.status === 204) {
      return { success: true, message: 'Operation completed successfully' };
    }

    // For CRUD operations (POST, PUT, DELETE), throw errors to ensure proper feedback
    if (!response.ok && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE')) {
      const errorData = await response.json().catch(() => ({ error: 'Operation failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // For GET operations, return localStorage data on failure
    if (!response.ok) {
      console.warn(`API request failed: ${endpoint} - ${response.status}`);
      if (dataKey) {
        return loadData(dataKey);
      }
      return getFallbackData(endpoint);
    }

    const data = await response.json();

    // Save successful GET responses to localStorage
    if (!options.method || options.method === 'GET') {
      if (dataKey && Array.isArray(data)) {
        saveData(dataKey, data);
      }
    }

    return data;
  } catch (error) {
    // For auth endpoints, re-throw the error
    if (endpoint.includes('/auth/')) {
      throw error;
    }

    // For CRUD operations, re-throw the error
    if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
      throw error;
    }

    console.warn(`API request error: ${endpoint}`, error);

    // Return localStorage data for GET operations on network failure
    if (dataKey) {
      return loadData(dataKey);
    }

    // Return appropriate empty data based on endpoint for GET operations
    return getFallbackData(endpoint);
  }
};

// Helper function to return appropriate fallback data
const getFallbackData = (endpoint) => {
  if (endpoint.includes('/products')) return [];
  if (endpoint.includes('/sales')) return [];
  if (endpoint.includes('/expenses')) return [];
  if (endpoint.includes('/users')) return [];
  if (endpoint.includes('/reminders')) return [];
  if (endpoint.includes('/stats')) return { 
    totalSales: 0, 
    totalExpenses: 0, 
    profit: 0, 
    grossProfit: 0,
    netProfit: 0,
    totalCOGS: 0,
    dailySales: 0,
    weeklySales: 0,
    productCount: 0
  };
  if (endpoint.includes('/settings')) return { 
    lockTimeout: 300000, 
    currency: 'KSH',
    logo: '',
    companyName: '',
    address: ''
  };
  if (endpoint.includes('/service-fees')) return [];
  if (endpoint.includes('/discounts')) return [];
  if (endpoint.includes('/credit-requests')) return [];
  if (endpoint.includes('/time-entries')) return [];
  if (endpoint.includes('/categories')) return [];
  if (endpoint.includes('/batches')) return [];
  if (endpoint.includes('/production')) return [];
  if (endpoint.includes('/price-history')) return [];
  
  return {};
};

export const auth = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) })
};

export const products = {
  getAll: () => request('/products'),
  create: async (data) => {
    const result = await request('/products', { method: 'POST', body: JSON.stringify(data) });
    // Update localStorage after successful creation
    const currentProducts = loadData('products');
    currentProducts.push(result);
    saveData('products', currentProducts);
    return result;
  },
  update: async (id, data) => {
    const result = await request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    // Update localStorage after successful update
    const currentProducts = loadData('products');
    const index = currentProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      currentProducts[index] = result;
      saveData('products', currentProducts);
    }
    return result;
  },
  delete: async (id) => {
    const result = await request(`/products/${id}`, { method: 'DELETE' });
    // Update localStorage after successful deletion
    const currentProducts = loadData('products');
    const filteredProducts = currentProducts.filter(p => p.id !== id);
    saveData('products', filteredProducts);
    return result;
  }
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