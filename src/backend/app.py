from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import json
import os
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    return []

def save_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.split(' ')[1] if ' ' in token else token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            request.user = data
        except:
            return jsonify({'error': 'Token is invalid'}), 401
        return f(*args, **kwargs)
    return decorated



@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    users = load_json('users.json')
    
    if any(u['email'] == data['email'] for u in users):
        return jsonify({'error': 'User already exists'}), 400
    
    # First user is admin with Ultra package
    is_first_user = len(users) == 0
    
    user = {
        'id': len(users) + 1,
        'email': data['email'],
        'password': data['password'],
        'name': data.get('name', ''),
        'role': 'admin' if is_first_user else 'cashier',
        'plan': 'ultra' if is_first_user else None,
        'price': 1600 if is_first_user else None,
        'active': is_first_user,  # First user is active immediately
        'permissions': {
            'viewSales': True,
            'viewInventory': True,
            'viewExpenses': False,
            'manageProducts': False
        } if not is_first_user else {},
        'createdAt': datetime.now().isoformat()
    }
    users.append(user)
    save_json('users.json', users)
    
    token = jwt.encode({'id': user['id'], 'email': user['email'], 'role': user['role']}, 
                       app.config['SECRET_KEY'], algorithm='HS256')
    
    return jsonify({'token': token, 'user': {k: v for k, v in user.items() if k != 'password'}})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    users = load_json('users.json')
    
    user = next((u for u in users if u['email'] == data['email'] and u['password'] == data['password']), None)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Include role in token for proper authorization
    token = jwt.encode({
        'id': user['id'], 
        'email': user['email'], 
        'role': user['role']
    }, app.config['SECRET_KEY'], algorithm='HS256')
    
    return jsonify({'token': token, 'user': {k: v for k, v in user.items() if k != 'password'}})

@app.route('/api/users', methods=['GET', 'POST'])
@token_required
def users_list():
    if request.method == 'GET':
        # Check if user is admin
        if request.user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        users = load_json('users.json')
        return jsonify([{k: v for k, v in u.items() if k != 'password'} for u in users])
    
    # POST - Admin creating cashier
    # Check if user is admin
    if request.user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.json
    users = load_json('users.json')
    
    if any(u['email'] == data['email'] for u in users):
        return jsonify({'error': 'User already exists'}), 400
    
    user = {
        'id': len(users) + 1,
        'email': data['email'],
        'password': data.get('password', 'changeme123'),
        'name': data['name'],
        'role': 'cashier',
        'plan': 'basic',
        'price': 900,
        'active': True,
        'permissions': data.get('permissions', {
            'viewSales': True,
            'viewInventory': True,
            'viewExpenses': False,
            'manageProducts': False
        }),
        'createdAt': datetime.now().isoformat()
    }
    users.append(user)
    save_json('users.json', users)
    
    return jsonify({k: v for k, v in user.items() if k != 'password'}), 201

@app.route('/api/users/<int:id>', methods=['PUT', 'DELETE'])
@token_required
def user_detail(id):
    users = load_json('users.json')
    user = next((u for u in users if u['id'] == id), None)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if request.method == 'PUT':
        data = request.json
        # Allow user to update themselves or admin to update anyone
        if request.user.get('id') != id and request.user.get('role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        user.update({k: v for k, v in data.items() if k != 'password' and k != 'id'})
        save_json('users.json', users)
        
        # Generate new token with updated role
        new_token = jwt.encode({
            'id': user['id'], 
            'email': user['email'], 
            'role': user['role']
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': new_token,
            'user': {k: v for k, v in user.items() if k != 'password'}
        })
    
    # DELETE
    if request.user.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    users = [u for u in users if u['id'] != id]
    save_json('users.json', users)
    return '', 204

@app.route('/api/products', methods=['GET', 'POST'])
@token_required
def products():
    if request.method == 'GET':
        products = load_json('products.json')
        
        # Cashiers don't see expense-only items
        if request.user.get('role') == 'cashier':
            products = [p for p in products if not p.get('expenseOnly', False)]
        
        return jsonify(products)
    
    data = request.json
    products = load_json('products.json')
    
    product = {
        'id': len(products) + 1,
        'name': data['name'],
        'price': data.get('price', 0),
        'cost': data.get('cost', 0),
        'quantity': data.get('quantity', 0),
        'unit': data.get('unit', 'pcs'),
        'category': data.get('category', 'raw'),
        'recipe': data.get('recipe', []),
        'expenseOnly': data.get('expenseOnly', False),
        'visibleToCashier': data.get('visibleToCashier', True),
        'createdAt': datetime.now().isoformat()
    }
    products.append(product)
    save_json('products.json', products)
    return jsonify(product), 201

@app.route('/api/products/<int:id>', methods=['PUT', 'DELETE'])
@token_required
def product_detail(id):
    products = load_json('products.json')
    product = next((p for p in products if p['id'] == id), None)
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    if request.method == 'PUT':
        data = request.json
        product.update({k: v for k, v in data.items() if k != 'id'})
        save_json('products.json', products)
        return jsonify(product)
    
    products = [p for p in products if p['id'] != id]
    save_json('products.json', products)
    return '', 204

@app.route('/api/products/<int:id>/max-producible', methods=['GET'])
@token_required
def max_producible(id):
    products = load_json('products.json')
    product = next((p for p in products if p['id'] == id), None)
    
    if not product or not product.get('recipe'):
        return jsonify({'maxUnits': 0, 'limitingIngredient': None})
    
    max_units = float('inf')
    limiting = None
    
    for ingredient in product['recipe']:
        raw = next((p for p in products if p['id'] == ingredient['productId']), None)
        if raw:
            available = raw.get('quantity', 0)
            needed = ingredient['quantity']
            possible = available / needed if needed > 0 else 0
            if possible < max_units:
                max_units = possible
                limiting = raw['name']
    
    return jsonify({'maxUnits': int(max_units) if max_units != float('inf') else 0, 'limitingIngredient': limiting})

@app.route('/api/sales', methods=['GET', 'POST'])
@token_required
def sales():
    if request.method == 'GET':
        sales = load_json('sales.json')
        return jsonify(sales)
    
    data = request.json
    products = load_json('products.json')
    expenses = load_json('expenses.json')
    
    total_cogs = 0
    
    # Process each item sold
    for item in data['items']:
        product = next((p for p in products if p['id'] == item['productId']), None)
        if not product:
            continue
        
        quantity_sold = item['quantity']
        
        # If composite product with recipe
        if product.get('recipe'):
            for ingredient in product['recipe']:
                raw_product = next((p for p in products if p['id'] == ingredient['productId']), None)
                if raw_product:
                    qty_needed = ingredient['quantity'] * quantity_sold
                    raw_product['quantity'] = raw_product.get('quantity', 0) - qty_needed
                    
                    # Calculate COGS
                    unit_cost = raw_product.get('cost', 0) / max(raw_product.get('quantity', 1) + qty_needed, 1)
                    cost = unit_cost * qty_needed
                    total_cogs += cost
                    
                    # Record expense if expenseOnly
                    if raw_product.get('expenseOnly'):
                        expense = {
                            'id': len(expenses) + 1,
                            'description': f'Used {qty_needed} {raw_product.get("unit", "units")} of {raw_product["name"]}',
                            'amount': cost,
                            'category': 'ingredient',
                            'automatic': True,
                            'saleId': len(load_json('sales.json')) + 1,
                            'createdAt': datetime.now().isoformat()
                        }
                        expenses.append(expense)
        else:
            # Simple product
            product['quantity'] = product.get('quantity', 0) - quantity_sold
            total_cogs += product.get('cost', 0) * quantity_sold
    
    save_json('products.json', products)
    save_json('expenses.json', expenses)
    
    sales_list = load_json('sales.json')
    sale = {
        'id': len(sales_list) + 1,
        'items': data['items'],
        'total': data['total'],
        'cogs': total_cogs,
        'profit': data['total'] - total_cogs,
        'paymentMethod': data.get('paymentMethod', 'cash'),
        'cashierId': request.user.get('id'),
        'createdAt': datetime.now().isoformat()
    }
    sales_list.append(sale)
    save_json('sales.json', sales_list)
    
    return jsonify(sale), 201

@app.route('/api/expenses', methods=['GET', 'POST'])
@token_required
def expenses():
    if request.method == 'GET':
        expenses = load_json('expenses.json')
        return jsonify(expenses)
    
    data = request.json
    expenses = load_json('expenses.json')
    
    expense = {
        'id': len(expenses) + 1,
        'description': data['description'],
        'amount': data['amount'],
        'category': data.get('category', 'general'),
        'automatic': False,
        'createdAt': datetime.now().isoformat()
    }
    expenses.append(expense)
    save_json('expenses.json', expenses)
    
    return jsonify(expense), 201

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user():
    """Get current user info from token"""
    users = load_json('users.json')
    user = next((u for u in users if u['id'] == request.user.get('id')), None)
    if user:
        return jsonify({k: v for k, v in user.items() if k != 'password'})
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/stats', methods=['GET'])
@token_required
def stats():
    sales = load_json('sales.json')
    expenses = load_json('expenses.json')
    products = load_json('products.json')
    
    total_sales = sum(s.get('total', 0) for s in sales)
    total_cogs = sum(s.get('cogs', 0) for s in sales)
    total_expenses = sum(e.get('amount', 0) for e in expenses)
    gross_profit = total_sales - total_cogs
    net_profit = total_sales - total_cogs - total_expenses
    
    # Daily/Weekly stats
    today = datetime.now().date()
    daily_sales = sum(s.get('total', 0) for s in sales if datetime.fromisoformat(s['createdAt']).date() == today)
    
    week_start = today - timedelta(days=today.weekday())
    weekly_sales = sum(s.get('total', 0) for s in sales if datetime.fromisoformat(s['createdAt']).date() >= week_start)
    
    return jsonify({
        'totalSales': total_sales,
        'totalCOGS': total_cogs,
        'totalExpenses': total_expenses,
        'grossProfit': gross_profit,
        'netProfit': net_profit,
        'salesCount': len(sales),
        'dailySales': daily_sales,
        'weeklySales': weekly_sales,
        'productCount': len(products)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)
