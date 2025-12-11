import { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';

export default function DiscountSelector({ originalPrice, onApply }) {
  const [discounts, setDiscounts] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5001/api';
      const res = await fetch(`${API_URL}/discounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const now = new Date();
      setDiscounts(data.filter(d => d.active && new Date(d.validFrom) <= now && new Date(d.validTo) >= now));
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
    }
  };

  const applyDiscount = (discount) => {
    setSelected(discount);
    const discountAmount = (originalPrice * discount.percentage) / 100;
    const newPrice = originalPrice - discountAmount;
    onApply({ discount, newPrice, discountAmount });
  };

  return (
    <div className="space-y-2">
      {discounts.map(discount => {
        const newPrice = originalPrice - (originalPrice * discount.percentage / 100);
        return (
          <button
            key={discount.id}
            onClick={() => applyDiscount(discount)}
            className={`w-full p-4 rounded-lg border-2 transition ${
              selected?.id === discount.id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="text-red-500" size={20} />
                <span className="font-bold">{discount.name}</span>
                <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                  {discount.percentage}% OFF
                </span>
              </div>
              <div className="text-right">
                <p className="text-gray-400 line-through text-sm">${originalPrice.toFixed(2)}</p>
                <p className="text-green-600 font-bold text-lg">${newPrice.toFixed(2)}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
