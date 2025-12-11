# POSify - Modern POS System

A complete Point of Sale system with role-based dashboards, inventory management, recipe builder, and automatic stock deduction.

## 🚀 Features

### Admin Dashboard (Ultra Package - KSH 1,600/month)
- Full inventory management (raw materials + composite products)
- Recipe/BOM Builder with automatic COGS calculation
- Automatic stock deduction on sales
- User management with permission controls
- Expense tracking (manual + automatic)
- Advanced analytics and reports
- Sales tracking with profit margins

### Cashier Dashboard (Basic Package - KSH 900/month)
- Point of Sale interface
- Sales tracking
- Daily/Weekly summaries
- Basic inventory view
- Limited permissions

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Routing:** React Router v6
- **Backend:** Flask (Python) / Netlify Functions
- **Auth:** JWT tokens
- **Storage:** JSON files / In-memory (Netlify)

## 📦 Installation

```bash
# Install dependencies
npm install

# Install Python dependencies (for local backend)
pip install -r requirements.txt
```

## 🏃 Running Locally

### Option 1: Using start script
```bash
./start.sh
```

### Option 2: Manual start
```bash
# Terminal 1 - Backend
cd src/backend && python3 app.py

# Terminal 2 - Frontend
npm run dev
```

Visit: http://localhost:5173

## 🌐 Deploy to Netlify

### Step 1: Generate JWT Secret
```bash
node generate-secret.cjs
```
Copy the generated secret.

### Step 2: Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Step 3: Add Environment Variable
1. Go to https://app.netlify.com
2. Select your site
3. Site settings → Environment variables
4. Add: `JWT_SECRET` = (your generated secret)
5. Redeploy site

## 📖 Usage

### First Time Setup
1. Sign up (first user becomes Admin with Ultra package)
2. Add raw materials in Inventory
3. Create recipes for composite products
4. Add cashiers with custom permissions
5. Start making sales!

### Key Workflows

**Creating Composite Products:**
1. Admin → Recipes/BOM → Create Recipe
2. Add ingredients with quantities
3. System auto-calculates COGS and profit margin

**Making Sales:**
1. Cashier → POS
2. Add products to cart
3. Select payment method
4. Complete sale
5. Stock automatically deducted!

**Adding Cashiers:**
1. Admin → Users → Add Cashier
2. Set permissions
3. Default password: changeme123

## 🔐 Security

- JWT token authentication
- Role-based access control
- Admin-only endpoints protected
- Secure password handling

## 📊 Features Breakdown

### Automatic Stock Deduction
When selling composite products:
- Ingredients automatically deducted from inventory
- COGS calculated based on ingredient costs
- Expense-only items tracked separately

### Recipe/BOM Builder
- Create products from raw materials
- Define ingredient quantities
- Auto-calculate production costs
- Track max producible units

### Permission System
- Granular permission controls
- View Sales, View Inventory, View Expenses, Manage Products
- Admin can customize per cashier

## 🐛 Troubleshooting

**Build fails:**
```bash
npm run build
```

**Clear data:**
```bash
rm src/backend/data/*.json
```

**Reset localStorage:**
Open DevTools → Application → Local Storage → Clear All

## 📝 License

Proprietary

## 👨‍💻 Author

Ian Mabruk

## 🔗 Links

- GitHub: https://github.com/Ianmabruk/POSify
- Live Demo: (Add after deployment)

---

Built with ❤️ using React + Vite
