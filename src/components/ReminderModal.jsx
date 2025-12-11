import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export default function ReminderModal({ onClose }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';
      const res = await fetch(`${API_URL}/reminders/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setReminders(data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const markFulfilled = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';
      await fetch(`${API_URL}/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'fulfilled' })
      });
      fetchReminders();
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  };

  if (loading || reminders.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold">Today's Reminders</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {reminders.map(reminder => (
            <div key={reminder.id} className="mb-4 p-4 border-l-4 border-red-500 bg-red-50 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-800">{reminder.customerName}</p>
                <p className="text-sm text-gray-600">Product ID: {reminder.productId}</p>
                <p className="text-xs text-gray-500">{reminder.frequency}</p>
              </div>
              <button
                onClick={() => markFulfilled(reminder.id)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                <CheckCircle size={18} />
                Mark Done
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
