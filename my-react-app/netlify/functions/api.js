const crypto = require('crypto');

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const createToken = (payload) => {
  const data = JSON.stringify(payload);
  const token = Buffer.from(data).toString('base64');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(token).digest('base64');
  return `${token}.${signature}`;
};

const verifyToken = (token) => {
  const [data, signature] = token.split('.');
  const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64');
  if (signature !== expectedSignature) throw new Error('Invalid token');
  return JSON.parse(Buffer.from(data, 'base64').toString());
};

let storage = { users: [], products: [], sales: [], expenses: [] };

const tokenRequired = (handler) => async (event, context) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Token is missing' }) };
  try {
    event.user = verifyToken(token);
    return handler(event, context);
  } catch {
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
    if (path === '/auth/signup' && method === 'POST') {
      const data = JSON.parse(event.body);
      if (storage.users.some(u => u.email === data.email)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'User already exists' }) };
      }
      const user = {
        id: storage.users.length + 1,
        email: data.email,
        password: data.password,
        name: data.name || '',
        role: 'cashier',
        plan: null,
        price: null,
        active: false,
        permissions: { viewSales: true, viewInventory: true, viewExpenses: false, manageProducts: true },
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

    return tokenRequired(async (event) => {
      const body = event.body ? JSON.parse(event.body) : {};

      if (path === '/users' && method === 'GET') {
        if (event.user.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        return { statusCode: 200, headers, body: JSON.stringify(storage.users.map(({ password, ...u }) => u)) };
      }

      if (path === '/users' && method === 'POST') {
        if (event.user.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        // Cashiers added by Ultra admin get access automatically
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
                  storage.expenses.push({ id: storage.expenses.length + 1, description: `Used ${qtyNeeded} ${raw.unit} of ${raw.name}`, amount: unitCost * qtyNeeded, category: 'ingredient', automatic: true, createdAt: new Date().toISOString() });
                }
              }
            });
          } else if (product) {
            product.quantity -= item.quantity;
            totalCogs += product.cost * item.quantity;
          }
        });
        const sale = { id: storage.sales.length + 1, ...body, cogs: totalCogs, profit: body.total - totalCogs, cashierId: event.user.id, createdAt: new Date().toISOString() };
        storage.sales.push(sale);
        return { statusCode: 201, headers, body: JSON.stringify(sale) };
      }

      if (path === '/expenses' && method === 'GET') {
        return { statusCode: 200, headers, body: JSON.stringify(storage.expenses) };
      }

      if (path === '/expenses' && method === 'POST') {
        const expense = { id: storage.expenses.length + 1, ...body, automatic: false, createdAt: new Date().toISOString() };
        storage.expenses.push(expense);
        return { statusCode: 201, headers, body: JSON.stringify(expense) };
      }

      if (path === '/stats' && method === 'GET') {
        const totalSales = storage.sales.reduce((sum, s) => sum + s.total, 0);
        const totalCOGS = storage.sales.reduce((sum, s) => sum + (s.cogs || 0), 0);
        const totalExpenses = storage.expenses.reduce((sum, e) => sum + e.amount, 0);
        const today = new Date().toDateString();
        const dailySales = storage.sales.filter(s => new Date(s.createdAt).toDateString() === today).reduce((sum, s) => sum + s.total, 0);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklySales = storage.sales.filter(s => new Date(s.createdAt) >= weekAgo).reduce((sum, s) => sum + s.total, 0);
        return { statusCode: 200, headers, body: JSON.stringify({ totalSales, totalCOGS, totalExpenses, grossProfit: totalSales - totalCOGS, netProfit: totalSales - totalCOGS - totalExpenses, salesCount: storage.sales.length, dailySales, weeklySales, productCount: storage.products.length }) };
      }

      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
    })(event, context);
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
