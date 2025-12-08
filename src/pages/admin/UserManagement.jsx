import { useState, useEffect } from 'react';
import { users as usersApi } from '../../services/api';
import { Plus, Edit2, Trash2, Mail, Shield } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    permissions: {
      viewSales: true,
      viewInventory: true,
      viewExpenses: false,
      manageProducts: false
    }
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await usersApi.getAll();
    setUsers(data);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      console.log('Creating cashier with data:', newUser);
      const result = await usersApi.create(newUser);
      console.log('Cashier created:', result);
      setNewUser({
        name: '',
        email: '',
        permissions: { viewSales: true, viewInventory: true, viewExpenses: false, manageProducts: false }
      });
      setShowAddModal(false);
      loadUsers();
      alert('Cashier added successfully!');
    } catch (error) {
      console.error('Error creating cashier:', error);
      alert('Failed to add cashier: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUpdatePermissions = async (userId, permissions) => {
    await usersApi.update(userId, { permissions });
    loadUsers();
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await usersApi.delete(userId);
      loadUsers();
    }
  };

  const cashiers = users.filter(u => u.role === 'cashier');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage cashiers and their permissions</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Cashier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-sm text-blue-700 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-blue-900">{users.length}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-sm text-green-700 mb-1">Cashiers</p>
          <p className="text-3xl font-bold text-green-900">{cashiers.length}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-sm text-purple-700 mb-1">Admins</p>
          <p className="text-3xl font-bold text-purple-900">{users.filter(u => u.role === 'admin').length}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Permissions</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`badge ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'badge-success'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="badge badge-warning">{user.plan || 'N/A'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.role === 'cashier' ? (
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                      >
                        Edit Permissions
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">Full Access</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.role === 'cashier' && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add New Cashier</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                className="input"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="input"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-sm">Permissions</h4>
                <div className="space-y-2">
                  {Object.entries(newUser.permissions).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNewUser({
                          ...newUser,
                          permissions: { ...newUser.permissions, [key]: e.target.checked }
                        })}
                      />
                      <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">Add Cashier</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Edit Permissions: {editingUser.name}</h3>
            <div className="space-y-3">
              {Object.entries(editingUser.permissions || {}).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      permissions: { ...editingUser.permissions, [key]: e.target.checked }
                    })}
                  />
                  <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => handleUpdatePermissions(editingUser.id, editingUser.permissions)}
                className="btn-primary flex-1"
              >
                Save Changes
              </button>
              <button onClick={() => setEditingUser(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
