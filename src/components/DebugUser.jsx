import { useAuth } from '../context/AuthContext';

export default function DebugUser() {
  const { user, loading } = useAuth();
  
  // Only show in development
  if (import.meta.env.PROD) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-xs z-50">
      <h3 className="font-bold mb-2">Debug Info:</h3>
      <div className="space-y-1">
        <p>Loading: {loading ? 'Yes' : 'No'}</p>
        <p>User: {user ? 'Logged in' : 'Not logged in'}</p>
        {user && (
          <>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
            <p>Plan: {user.plan}</p>
            <p>Active: {user.active ? 'Yes' : 'No'}</p>
            <p>Price: {user.price}</p>
          </>
        )}
      </div>
    </div>
  );
}