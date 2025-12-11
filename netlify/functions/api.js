const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const createToken = (payload) => {
  return jwt.sign(payload, SECRET_KEY, { algorithm: 'HS256' });
};

const verifyToken = (token) => {
  return jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
};

let storage = { 
  users: [], 
  products: [], 
  sales: [], 
  expenses: [],
  reminders: [],
  serviceFees: [],
  discounts: [],
  creditRequests: [],
  timeEntries: [],
  settings: {
    lockTimeout: 45000,
    currency: 'KSH',
    companyName: 'Universal POS',
    taxRate: 0
  }
};

const tokenRequired = (handler) => async (event, context) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Token is missing' }) };
  try {
    event.user = verifyToken(token);
    return handler(event, context);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return { statusCode: 401, body: JSON.stringify({ error: 'Token is invalid' }) };
  }
};

exports.handler = async (event, context) => {
  let path = event.path.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
  const method = event.httpMethod;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Auth endpoints (no token required)
    if (path === '/auth/signup' && method === 'POST') {
      const data = JSON.parse(event.body);
      if (storage.users.some(u => u.email === data.email)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'User already exists' }) };
      }
      
      // First user is admin with Ultra package
      const isFirstUser = storage.users.length === 0;
      
      const user = {
        id: storage.users.length + 1,
        email: data.email,
        password: data.password,
        name: data.name || '',
        role: isFirstUser ? 'admin' : 'cashier',
        plan: isFirstUser ? 'ultra' : null,
        price: isFirstUser ? 1600 : null,
        active: isFirstUser,
        permissions: isFirstUser ? {} : { 
          viewSales: true, 
          viewInventory: true, 
          viewExpenses: false, 
          manageProducts: false 
        },
        createdAt: new Date().toISOString()
      };
      storage.users.push(user);
      const token = createToken({ id: user.id, email: user.email, role: user.role });
      const { password, ...userWithoutPassword } = user;
      return { statusCode: 200, headers, body: JSON.stringify({ token, user: userWithoutPassword }) };
    }

    if (path === '/auth/login' && method === 'POST') {
      const data = JSON.parse(event.body);
      const user = storage.users.find(u => u.email === data.email);
      if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Email not found. Please check your email or contact admin.' }) };
      
      // First time login - set password
      if (user.needsPasswordSetup && data.newPassword) {
        user.password = data.newPassword;
        user.needsPasswordSetup = false;
        const token = createToken({ id: user.id, email: user.email, role: user.role });
        const { password, ...userWithoutPassword } = user;
        return { statusCode: 200, headers, body: JSON.stringify({ token, user: userWithoutPassword, firstLogin: true }) };
      }
      
      // Check if needs password setup
      if (user.needsPasswordSetup) {
        return { statusCode: 200, headers, body: JSON.stringify({ needsPasswordSetup: true, userId: user.id, email: user.email, role: user.role }) };
      }
      
      // Normal login
      if (user.password !== data.password) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid password' }) };
      const token = createToken({ id: user.id, email: user.email, role: user.role });
      const { password, ...userWithoutPassword } = user;
      return { statusCode: 200, headers, body: JSON.stringify({ token, user: userWithoutPassword }) };
    }

    // All other endpoints require authentication
    return tokenRequired(async (event) => {
      const body = event.body ? JSON.parse(event.body) : {};

      // Users endpoints
      if (path === '/users' && method === 'GET') {
        if (event.user.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        return { statusCode: 200, headers, body: JSON.stringify(storage.users.map(({ password, ...u }) => u)) };
      }

      if (path === '/users' && method === 'POST') {
        if (event.user.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        const user = { 
          id: storage.users.length + 1, 
          ...body, 
          password: null, 
          needsPasswordSetup: true, 
          role: 'cashier', 
          plan: 'ultra', 
          price: 0, 
          active: true, 
          addedByAdmin: true,
          createdAt: new Date().toISOString() 
        };
        storage.users.push(user);
        const { password, ...userWithoutPassword } = user;
        return { statusCode: 201, headers, body: JSON.stringify(userWithoutPassword) };
      }

      if (path.startsWith('/users/') && method === 'PUT') {
        const id = parseInt(path.split('/')[2]);
        const user = storage.users.find(u => u.id === id);
        if (!user) return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
        Object.assign(user, body);
        const token = createToken({ id: user.id, email: user.email, role: user.role });
        const { password, ...userWithoutPassword } = user;
        return { statusCode: 200, headers, body: JSON.stringify({ token, user: userWithoutPassword }) };
      }

      if (path.startsWith('/users/') && method === 'DELETE') {
        if (event.user.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        storage.users = storage.users.filter(u => u.id !== parseInt(path.split('/')[2]));
        return { statusCode: 204, headers, body: '' };
      }

      // Products endpoints
      if (path === '/products' && method === 'GET') {
        let products = storage.products;
        if (event.user.role === 'cashier') products = products.filter(p => !p.expenseOnly);
        return { statusCode: 200, headers, body: JSON.stringify(products) };
      }

      if (path === '/products' && method === 'POST') {
        const product = { id: storage.products.length + 1, ...body, createdAt: new Date().toISOString() };
        storage.products.push(product);
        return { statusCode: 201, headers, body: JSON.stringify(product) };
      }

      if (path.startsWith('/products/') && method === 'PUT') {
        const product = storage.products.find(p => p.id === parseInt(path.split('/')[2]));
        if (!product) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
        Object.assign(product, body);
        return { statusCode: 200, headers, body: JSON.stringify(product) };
      }

      if (path.startsWith('/products/') && method === 'DELETE') {
        storage.products = storage.products.filter(p => p.id !== parseInt(path.split('/')[2]));
        return { statusCode: 204, headers, body: '' };
      }

      // Sales endpoints
      if (path === '/sales' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.sales) };
      }

      if (path === '/sales' && method === 'POST') {
        let totalCogs = 0;
        body.items.forEach(item => {
          const product = storage.products.find(p => p.id === item.productId);
          if (product?.recipe) {
            product.recipe.forEach(ing => {
              const raw = storage.products.find(p => p.id === ing.productId);
              if (raw) {
                const qtyNeeded = ing.quantity * item.quantity;
                raw.quantity -= qtyNeeded;
                const unitCost = raw.cost / (raw.quantity + qtyNeeded);
                totalCogs += unitCost * qtyNeeded;
                if (raw.expenseOnly) {
                  storage.expenses.push({ 
                    id: storage.expenses.length + 1, 
                    description: `Used ${qtyNeeded} ${raw.unit} of ${raw.name}`, 
                    amount: unitCost * qtyNeeded, 
                    category: 'ingredient', 
                    automatic: true, 
                    createdAt: new Date().toISOString() 
                  });
                }
              }
            });
          } else if (product) {
            product.quantity -= item.quantity;
            totalCogs += product.cost * item.quantity;
          }
        });
        const sale = { 
          id: storage.sales.length + 1, 
          ...body, 
          cogs: totalCogs, 
          profit: body.total - totalCogs, 
          cashierId: event.user.id, 
          createdAt: new Date().toISOString() 
        };
        storage.sales.push(sale);
        return { statusCode: 201, headers, body: JSON.stringify(sale) };
      }

      // Expenses endpoints
      if (path === '/expenses' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.expenses) };
      }

      if (path === '/expenses' && method === 'POST') {
        const expense = { id: storage.expenses.length + 1, ...body, automatic: false, createdAt: new Date().toISOString() };
        storage.expenses.push(expense);
        return { statusCode: 201, headers, body: JSON.stringify(expense) };
      }

      // Stats endpoint
      if (path === '/stats' && method === 'GET') {
        const totalSales = storage.sales.reduce((sum, s) => sum + s.total, 0);
        const totalCOGS = storage.sales.reduce((sum, s) => sum + (s.cogs || 0), 0);
        const totalExpenses = storage.expenses.reduce((sum, e) => sum + e.amount, 0);
        const today = new Date().toDateString();
        const dailySales = storage.sales.filter(s => new Date(s.createdAt).toDateString() === today).reduce((sum, s) => sum + s.total, 0);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklySales = storage.sales.filter(s => new Date(s.createdAt) >= weekAgo).reduce((sum, s) => sum + s.total, 0);
        return { 
          statusCode: 200, 
          headers, 
          body: JSON.stringify({ 
            totalSales, 
            totalCOGS, 
            totalExpenses, 
            grossProfit: totalSales - totalCOGS, 
            netProfit: totalSales - totalCOGS - totalExpenses, 
            salesCount: storage.sales.length, 
            dailySales, 
            weeklySales, 
            productCount: storage.products.length 
          }) 
        };
      }

      // Settings endpoints
      if (path === '/settings' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.settings) };
      }

      if (path === '/settings' && method === 'PUT') {
        if (event.user.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        storage.settings = { ...storage.settings, ...body };
        return { statusCode: 200, headers, body: JSON.stringify(storage.settings) };
      }

      // Reminders endpoints
      if (path === '/reminders' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.reminders) };
      }

      if (path === '/reminders/today' && method === 'GET') {
        const today = new Date().toDateString();
        const todayReminders = storage.reminders.filter(r => 
          new Date(r.dueDate).toDateString() === today && !r.completed
        );
        return { statusCode: 200, headers, body: JSON.stringify(todayReminders) };
      }

      if (path === '/reminders' && method === 'POST') {
        const reminder = { id: storage.reminders.length + 1, ...body, completed: false, createdAt: new Date().toISOString() };
        storage.reminders.push(reminder);
        return { statusCode: 201, headers, body: JSON.stringify(reminder) };
      }

      if (path.startsWith('/reminders/') && method === 'PUT') {
        const reminder = storage.reminders.find(r => r.id === parseInt(path.split('/')[2]));
        if (!reminder) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Reminder not found' }) };
        Object.assign(reminder, body);
        return { statusCode: 200, headers, body: JSON.stringify(reminder) };
      }

      if (path.startsWith('/reminders/') && method === 'DELETE') {
        storage.reminders = storage.reminders.filter(r => r.id !== parseInt(path.split('/')[2]));
        return { statusCode: 204, headers, body: '' };
      }

      // Service Fees endpoints
      if (path === '/service-fees' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.serviceFees) };
      }

      if (path === '/service-fees' && method === 'POST') {
        const fee = { id: storage.serviceFees.length + 1, ...body, createdAt: new Date().toISOString() };
        storage.serviceFees.push(fee);
        return { statusCode: 201, headers, body: JSON.stringify(fee) };
      }

      if (path.startsWith('/service-fees/') && method === 'PUT') {
        const fee = storage.serviceFees.find(f => f.id === parseInt(path.split('/')[2]));
        if (!fee) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Service fee not found' }) };
        Object.assign(fee, body);
        return { statusCode: 200, headers, body: JSON.stringify(fee) };
      }

      if (path.startsWith('/service-fees/') && method === 'DELETE') {
        storage.serviceFees = storage.serviceFees.filter(f => f.id !== parseInt(path.split('/')[2]));
        return { statusCode: 204, headers, body: '' };
      }

      // Discounts endpoints
      if (path === '/discounts' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.discounts) };
      }

      if (path === '/discounts' && method === 'POST') {
        const discount = { id: storage.discounts.length + 1, ...body, createdAt: new Date().toISOString() };
        storage.discounts.push(discount);
        return { statusCode: 201, headers, body: JSON.stringify(discount) };
      }

      if (path.startsWith('/discounts/') && method === 'PUT') {
        const discount = storage.discounts.find(d => d.id === parseInt(path.split('/')[2]));
        if (!discount) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Discount not found' }) };
        Object.assign(discount, body);
        return { statusCode: 200, headers, body: JSON.stringify(discount) };
      }

      if (path.startsWith('/discounts/') && method === 'DELETE') {
        storage.discounts = storage.discounts.filter(d => d.id !== parseInt(path.split('/')[2]));
        return { statusCode: 204, headers, body: '' };
      }

      // Credit Requests endpoints
      if (path === '/credit-requests' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.creditRequests) };
      }

      if (path === '/credit-requests' && method === 'POST') {
        const request = { id: storage.creditRequests.length + 1, ...body, status: 'pending', createdAt: new Date().toISOString() };
        storage.creditRequests.push(request);
        return { statusCode: 201, headers, body: JSON.stringify(request) };
      }

      if (path.startsWith('/credit-requests/') && method === 'PUT') {
        const request = storage.creditRequests.find(r => r.id === parseInt(path.split('/')[2]));
        if (!request) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Credit request not found' }) };
        Object.assign(request, body);
        return { statusCode: 200, headers, body: JSON.stringify(request) };
      }

      // Time Tracking endpoints
      if (path === '/time-entries' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.timeEntries) };
      }

      if (path === '/time-entries' && method === 'POST') {
        const entry = { id: storage.timeEntries.length + 1, ...body, createdAt: new Date().toISOString() };
        storage.timeEntries.push(entry);
        return { statusCode: 201, headers, body: JSON.stringify(entry) };
      }

      if (path.startsWith('/time-entries/') && method === 'PUT') {
        const entry = storage.timeEntries.find(e => e.id === parseInt(path.split('/')[2]));
        if (!entry) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Time entry not found' }) };
        Object.assign(entry, body);
        return { statusCode: 200, headers, body: JSON.stringify(entry) };
      }

      if (path.startsWith('/time-entries/') && method === 'DELETE') {
        storage.timeEntries = storage.timeEntries.filter(e => e.id !== parseInt(path.split('/')[2]));
        return { statusCode: 204, headers, body: '' };
      }

      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
    })(event, context);
  } catch (error) {
    console.error('API Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};