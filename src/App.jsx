import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Subscription from './pages/Subscription';
import AdminDashboard from './pages/admin/AdminDashboard';
import CashierPOS from './pages/cashier/CashierPOS';
import CashierSettings from './pages/cashier/CashierSettings';
import MainAdmin from './pages/MainAdmin';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) return <Navigate to="/" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/cashier" />;
  
  return children;
}

function DashboardRouter() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Redirect based on role and subscription
  if (!user?.active) return <Navigate to="/subscription" replace />;
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  return <Navigate to="/cashier" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/cashier" element={<ProtectedRoute><CashierPOS /></ProtectedRoute>} />
          <Route path="/cashier/settings" element={<ProtectedRoute><CashierSettings /></ProtectedRoute>} />
          <Route path="/main.admin" element={<MainAdmin />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
