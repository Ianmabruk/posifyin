import { useState, useEffect } from 'react';
import { products as productsApi } from '../../services/api';
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    cost: '',
    quantity: '',
    unit: 'pcs',
    category: 'raw',
    expenseOnly: false
  });
  const [editProduct, setEditProduct] = useState({
    name: '',
    price: '',
    cost: '',
    quantity: '',
    unit: 'pcs',
    category: 'raw',
    expenseOnly: false
  });

  useEffect(() => {
    loadProducts();
  }, []);


  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      // Ensure we always have an array
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    await productsApi.create({
      ...newProduct,
      price: parseFloat(newProduct.price),
      cost: parseFloat(newProduct.cost),
      quantity: parseFloat(newProduct.quantity)
    });
    setNewProduct({ name: '', price: '', cost: '', quantity: '', unit: 'pcs', category: 'raw', expenseOnly: false });
    setShowAddModal(false);
    loadProducts();
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    const originalProduct = products.find(p => p.id === editProduct.id);
    if (parseFloat(editProduct.price) < originalProduct.price) {
      alert('You cannot lower prices, only increase.');
      return;
    }
    await productsApi.update(editProduct.id, {
      ...editProduct,
      price: parseFloat(editProduct.price),
      cost: parseFloat(editProduct.cost),
      quantity: parseFloat(editProduct.quantity)
    });
    setShowEditModal(false);
    loadProducts();
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await productsApi.delete(id);
      loadProducts();
    }
  };


  const filteredProducts = (products || []).filter(p => {
    if (!p) return false;
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'raw' && !p.recipe) ||
      (filter === 'composite' && p.recipe) ||
      (filter === 'expense' && p.expenseOnly) ||
      (filter === 'low-stock' && p.quantity < 10);
    return matchesSearch && matchesFilter;
  });

  const rawProducts = (products || []).filter(p => p && !p.recipe && !p.expenseOnly);
  const compositeProducts = (products || []).filter(p => p && p.recipe);
  const expenseProducts = (products || []).filter(p => p && p.expenseOnly);


  const calculateMaxProducible = (product) => {
    if (!product || !product.recipe) return 0;
    let max = Infinity;
    (product.recipe || []).forEach(ingredient => {
      if (!ingredient) return;
      const raw = (products || []).find(p => p && p.id === ingredient.productId);
      if (raw && raw.quantity > 0 && ingredient.quantity > 0) {
        const possible = Math.floor(raw.quantity / ingredient.quantity);
        max = Math.min(max, possible);
      }
    });
    return max === Infinity ? 0 : max;
  };

  const calculateCOGS = (product) => {
    if (!product) return 0;
    if (!product.recipe) return product.cost || 0;
    let totalCost = 0;
    (product.recipe || []).forEach(ingredient => {
      if (!ingredient) return;
      const raw = (products || []).find(p => p && p.id === ingredient.productId);
      if (raw && raw.quantity > 0) {
        const unitCost = (raw.cost || 0) / raw.quantity;
        totalCost += unitCost * (ingredient.quantity || 0);
      }
    });
    return totalCost;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="input pl-10 w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="input w-40"
          >
            <option value="all">All Products</option>
            <option value="raw">Raw Materials</option>
            <option value="composite">Composite</option>
            <option value="expense">Expense Only</option>
            <option value="low-stock">Low Stock</option>
          </select>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <h4 className="text-sm font-medium text-blue-700 mb-2">Raw Materials</h4>
          <p className="text-3xl font-bold text-blue-900">{rawProducts.length}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <h4 className="text-sm font-medium text-purple-700 mb-2">Composite Products</h4>
          <p className="text-3xl font-bold text-purple-900">{compositeProducts.length}</p>
        </div>
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <h4 className="text-sm font-medium text-orange-700 mb-2">Expense Items</h4>
          <p className="text-3xl font-bold text-orange-900">{expenseProducts.length}</p>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cost/COGS</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Max Units</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Margin</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody>
              {(filteredProducts || []).map((product) => {
                if (!product) return null;
                const cogs = calculateCOGS(product);
                const margin = product.price ? (((product.price - cogs) / product.price) * 100).toFixed(1) : 0;
                const maxUnits = calculateMaxProducible(product);
                const isExpanded = expandedRow === product.id;

                return (
                  <>
                    <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {product.recipe && (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : product.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                          <span className="font-medium">{product.name}</span>
                          {product.quantity < 10 && !product.recipe && (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${
                          product.expenseOnly ? 'badge-warning' :
                          product.recipe ? 'badge-success' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {product.expenseOnly ? 'Expense' : product.recipe ? 'Composite' : 'Raw'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">
                        KSH {product.price?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-orange-600">
                        KSH {cogs.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${product.quantity < 10 && !product.recipe ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.quantity} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {product.recipe ? (
                          <span className="font-semibold text-blue-600">{maxUnits} units</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${margin > 30 ? 'text-green-600' : margin > 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {margin}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditProduct(product);
                              setShowEditModal(true);
                            }}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row - Recipe Breakdown */}
                    {isExpanded && product.recipe && (
                      <tr className="bg-blue-50">
                        <td colSpan="8" className="px-4 py-4">
                          <div className="ml-8">
                            <h4 className="font-semibold text-sm text-gray-700 mb-3">Recipe Breakdown:</h4>
                            <table className="w-full text-sm">
                              <thead className="bg-white">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Ingredient</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Quantity Needed</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Available</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Unit Cost</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Total Cost</th>
                                </tr>
                              </thead>

                              <tbody>
                                {(product.recipe || []).map((ingredient, idx) => {
                                  if (!ingredient) return null;
                                  const raw = (products || []).find(p => p && p.id === ingredient.productId);
                                  if (!raw) return null;
                                  const unitCost = (raw.cost || 0) / (raw.quantity || 1);
                                  const totalCost = unitCost * (ingredient.quantity || 0);
                                  return (
                                    <tr key={idx} className="border-t border-blue-100">
                                      <td className="px-3 py-2">{raw.name || 'Unknown'}</td>
                                      <td className="px-3 py-2">{ingredient.quantity || 0} {raw.unit || 'pcs'}</td>
                                      <td className="px-3 py-2">{raw.quantity || 0} {raw.unit || 'pcs'}</td>
                                      <td className="px-3 py-2">KSH {unitCost.toFixed(2)}</td>
                                      <td className="px-3 py-2 font-semibold">KSH {totalCost.toFixed(2)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot className="bg-white font-semibold">
                                <tr>
                                  <td colSpan="4" className="px-3 py-2 text-right">Total COGS per unit:</td>
                                  <td className="px-3 py-2 text-orange-600">KSH {cogs.toFixed(2)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add New Product</h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <input
                type="text"
                placeholder="Product Name"
                className="input"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  className="input"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Cost"
                  className="input"
                  value={newProduct.cost}
                  onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Quantity"
                  className="input"
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                  required
                />
                <select
                  className="input"
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                >
                  <option value="pcs">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="L">Liters</option>
                  <option value="g">Grams</option>
                  <option value="ml">Milliliters</option>
                </select>
              </div>
              <select
                className="input"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              >
                <option value="raw">Raw Material</option>
                <option value="finished">Finished Product</option>
              </select>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newProduct.expenseOnly}
                  onChange={(e) => setNewProduct({ ...newProduct, expenseOnly: e.target.checked })}
                />
                <span className="text-sm">Expense Only (Hidden from cashier)</span>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">Add Product</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
