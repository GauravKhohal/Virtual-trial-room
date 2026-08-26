import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import GarmentSwatch from '../components/GarmentSwatch';

export default function BookingPage() {
  const { cart, addBooking, clearCart } = useApp();
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBooking({
      id: `b-${Date.now()}`,
      date,
      time,
      reservedItems: cart.map((c) => c.product),
      customerName: name,
      phone,
      createdAt: new Date().toISOString(),
    });
    setConfirmed(true);
    clearCart();
  };

  if (confirmed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-slate-900">Trial Reserved!</h1>
        <p className="text-slate-500 mt-2">
          We'll keep your selected apparel ready on {date} at {time}. No searching in store needed.
        </p>
        <button onClick={() => navigate('/')} className="mt-6 px-5 py-2.5 rounded-full bg-indigo-600 text-white">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Reserve For Trial</h1>
      <p className="text-slate-500 mt-1">Book a date & time — the store will keep your selected apparel ready.</p>

      {cart.length > 0 && (
        <div className="mt-6 flex gap-3 flex-wrap">
          {cart.map((c) => (
            <GarmentSwatch key={`${c.product.id}-${c.size}`} type={c.product.type} colorHex={c.product.colorHex} size="sm" />
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Your Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Phone Number</label>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Date</label>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Time</label>
            <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
        </div>
        <button type="submit" className="w-full px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700">
          Confirm Booking
        </button>
      </form>
    </div>
  );
}
