import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Subscription from './pages/Subscription';
import AdminDashboard from './pages/admin/AdminDashboard';
import CashierPOS from './pages/cashier/CashierPOS';

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
  const { user } = useAuth();
  
  // Redirect based on role and subscription
  if (!user.active) return <Navigate to="/subscription" />;
  
  if (user.role === 'admin') {
    return <Navigate to="/admin" />;
  }
  
  return <Navigate to="/cashier" />;
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
