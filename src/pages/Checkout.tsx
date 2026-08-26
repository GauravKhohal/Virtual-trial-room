import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

type DeliveryOption = 'Home Delivery' | 'Store Pickup' | 'Try at Store First';

const OPTIONS: { id: DeliveryOption; desc: string; emoji: string }[] = [
  { id: 'Home Delivery', desc: 'Get your order delivered to your doorstep.', emoji: '🚚' },
  { id: 'Store Pickup', desc: 'Pick up your order from the nearest store.', emoji: '🏬' },
  { id: 'Try at Store First', desc: 'Try the apparel at the store before you pay.', emoji: '🧍' },
];

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<DeliveryOption | null>(null);
  const [placed, setPlaced] = useState(false);

  if (placed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-slate-900">Order Placed!</h1>
        <p className="text-slate-500 mt-2">Your order via "{selected}" has been confirmed.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-5 py-2.5 rounded-full bg-indigo-600 text-white">
          Back to Home
        </button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">Your cart is empty.</p>
        <button onClick={() => navigate('/catalog')} className="mt-4 px-5 py-2 rounded-full bg-indigo-600 text-white">
          Browse Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
      <p className="text-slate-500 mt-1">Total: ₹{cartTotal.toLocaleString('en-IN')} for {cart.length} item(s)</p>

      <div className="grid gap-4 mt-8">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            className={`p-5 rounded-2xl border text-left flex items-center gap-4 transition-all ${
              selected === opt.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 bg-white'
            }`}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <div>
              <div className="font-semibold text-slate-800">{opt.id}</div>
              <div className="text-xs text-slate-500">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        disabled={!selected}
        onClick={() => {
          setPlaced(true);
          clearCart();
        }}
        className="mt-8 w-full px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700"
      >
        Place Order
      </button>
    </div>
  );
}
