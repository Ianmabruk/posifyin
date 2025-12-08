const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory storage (replace with database in production)
let storage = {
  users: [],
  products: [],
  sales: [],
  expenses: []
};

const tokenRequired = (handler) => async (event, context) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token is missing' }) };
  }
  try {
    const user = jwt.verify(token, SECRET_KEY);
    event.user = user;
    return handler(event, context);
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token is invalid' }) };
  }
};

exports.handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api', '');
  const method = event.httpMethod;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Auth routes
    if (path === '/auth/signup' && method === 'POST') {
      const data = JSON.parse(event.body);
      if (storage.users.some(u => u.email === data.email)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'User already exists' }) };
      }
      
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
        permissions: isFirstUser ? {} : { viewSales: true, viewInventory: true, viewExpenses: false, manageProducts: false },
        createdAt: new Date().toISOString()
      };
      storage.users.push(user);
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY);
      const { password, ...userWithoutPassword } = user;
      return { statusCode: 200, headers, body: JSON.stringify({ token, user: userWithoutPassword }) };
    }

    if (path === '/auth/login' && method === 'POST') {
      const data = JSON.parse(event.body);
      const user = storage.users.find(u => u.email === data.email && u.password === data.password);
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid credentials' }) };
      }
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY);
      const { password, ...userWithoutPassword } = user;
      return { statusCode: 200, headers, body: JSON.stringify({ token, user: userWithoutPassword }) };
    }

    // Protected routes
    return tokenRequired(async (event) => {
      const body = event.body ? JSON.parse(event.body) : {};

      // Users
      if (path === '/users' && method === 'GET') {
        if (event.user.role !== 'admin') {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        }
        const users = storage.users.map(({ password, ...u }) => u);
        return { statusCode: 200, headers, body: JSON.stringify(users) };
      }

      if (path === '/users' && method === 'POST') {
        if (event.user.role !== 'admin') {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        }
        const user = {
          id: storage.users.length + 1,
          ...body,
          password: body.password || 'changeme123',
          role: 'cashier',
          plan: 'basic',
          price: 900,
          active: true,
          createdAt: new Date().toISOString()
        };
        storage.users.push(user);
        const { password, ...userWithoutPassword } = user;
        return { statusCode: 201, headers, body: JSON.stringify(userWithoutPassword) };
      }

      if (path.startsWith('/users/') && method === 'PUT') {
        const id = parseInt(path.split('/')[2]);
        const user = storage.users.find(u => u.id === id);
        if (!user) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
        }
        Object.assign(user, body);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY);
        const { password, ...userWithoutPassword } = user;
        return { statusCode: 200, headers, body: JSON.stringify({ token, user: userWithoutPassword }) };
      }

      if (path.startsWith('/users/') && method === 'DELETE') {
        if (event.user.role !== 'admin') {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        }
        const id = parseInt(path.split('/')[2]);
        storage.users = storage.users.filter(u => u.id !== id);
        return { statusCode: 204, headers, body: '' };
      }

      // Products
      if (path === '/products' && method === 'GET') {
        let products = storage.products;
        if (event.user.role === 'cashier') {
          products = products.filter(p => !p.expenseOnly);
        }
        return { statusCode: 200, headers, body: JSON.stringify(products) };
      }

      if (path === '/products' && method === 'POST') {
        const product = { id: storage.products.length + 1, ...body, createdAt: new Date().toISOString() };
        storage.products.push(product);
        return { statusCode: 201, headers, body: JSON.stringify(product) };
      }

      if (path.startsWith('/products/') && method === 'PUT') {
        const id = parseInt(path.split('/')[2]);
        const product = storage.products.find(p => p.id === id);
        if (!product) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
        }
        Object.assign(product, body);
        return { statusCode: 200, headers, body: JSON.stringify(product) };
      }

      if (path.startsWith('/products/') && method === 'DELETE') {
        const id = parseInt(path.split('/')[2]);
        storage.products = storage.products.filter(p => p.id !== id);
        return { statusCode: 204, headers, body: '' };
      }

      // Sales
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

      // Expenses
      if (path === '/expenses' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.expenses) };
      }

      if (path === '/expenses' && method === 'POST') {
        const expense = {
          id: storage.expenses.length + 1,
          ...body,
          automatic: false,
          createdAt: new Date().toISOString()
        };
        storage.expenses.push(expense);
        return { statusCode: 201, headers, body: JSON.stringify(expense) };
      }

      // Stats
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

      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
    })(event, context);

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
