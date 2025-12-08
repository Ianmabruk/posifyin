import { useAuth } from '../../context/AuthContext';
import { Bell, CreditCard, User, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold">Account Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Role</label>
              <p className="font-medium capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold">Subscription</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Current Plan</label>
              <p className="font-medium capitalize">{user?.plan || 'Ultra'} Package</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Price</label>
              <p className="font-medium">KSH {user?.price || 1600}/month</p>
            </div>
            <button className="btn-secondary text-sm">Change Plan</button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">Email Notifications</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Low Stock Alerts</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Daily Sales Summary</span>
              <input type="checkbox" className="toggle" />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold">Security</h3>
          </div>
          <div className="space-y-3">
            <button className="btn-secondary text-sm w-full">Change Password</button>
            <button className="btn-secondary text-sm w-full">Enable 2FA</button>
          </div>
        </div>
      </div>
    </div>
  );
}
