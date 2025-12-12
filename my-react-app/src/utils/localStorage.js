// Local data storage utilities with fallback to JSON structure

// Default sample data for initialization
const DEFAULT_DATA = {
  products: [
    {
      id: 1,
      name: "Nile Perch",
      cost: 500,
      price: 800,
      quantity: 10,
      unit: "kg",
      category: "raw",
      recipe: null,
      image: "",
      visibleToCashier: true,
      expenseOnly: false
    },
    {
      id: 2,
      name: "Cooking Oil",
      cost: 200,
      price: 300,
      quantity: 5,
      unit: "L",
      category: "raw",
      recipe: null,
      image: "",
      visibleToCashier: true,
      expenseOnly: false
    }
  ],
  sales: [],
  expenses: [],
  users: [],
  reminders: [],
  stats: {
    totalSales: 0,
    totalExpenses: 0,
    profit: 0,
    grossProfit: 0,
    netProfit: 0,
    totalCOGS: 0,
    dailySales: 0,
    weeklySales: 0,
    productCount: 2
  },
  settings: {
    lockTimeout: 300000,
    currency: 'KSH',
    logo: '',
    companyName: '',
    address: ''
  },
  serviceFees: [],
  discounts: [],
  creditRequests: [],
  timeEntries: [],
  categories: [],
  batches: [],
  production: [],
  priceHistory: []
};

/**
 * Save data to localStorage with JSON fallback
 * @param {string} key - The storage key
 * @param {any} value - The data to store
 */
export const saveData = (key, value) => {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.warn(`Failed to save to localStorage for key "${key}":`, error);
    // Fallback to in-memory storage or file-based storage could be implemented here
    // For now, we'll just log the error
  }
};

/**
 * Load data from localStorage with fallback to default data
 * @param {string} key - The storage key
 * @returns {any} The stored data or default data
 */
export const loadData = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      // Initialize with default data if not exists
      const defaultValue = DEFAULT_DATA[key] || [];
      saveData(key, defaultValue);
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.warn(`Failed to load from localStorage for key "${key}":`, error);
    // Return default data as fallback
    return DEFAULT_DATA[key] || [];
  }
};

/**
 * Reset data for a specific key to default values
 * @param {string} key - The storage key to reset
 */
export const resetData = (key) => {
  try {
    const defaultValue = DEFAULT_DATA[key] || [];
    saveData(key, defaultValue);
  } catch (error) {
    console.warn(`Failed to reset data for key "${key}":`, error);
  }
};

/**
 * Clear all stored data
 */
export const clearAllData = () => {
  try {
    Object.keys(DEFAULT_DATA).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear all data:', error);
  }
};
