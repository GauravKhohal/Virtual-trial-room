import { MOCK_ANALYTICS } from '../../data/analytics';
import { useOwner } from '../../context/OwnerContext';
import { useApp } from '../../context/AppContext';

export default function OwnerOverview() {
  const { inventory, offers } = useOwner();
  const { bookings } = useApp();
  const lowStock = inventory.filter((e) => e.stock < 10).length;

  const cards = [
    { label: 'Revenue (mock)', value: `₹${MOCK_ANALYTICS.totalRevenue.toLocaleString('en-IN')}` },
    { label: 'Conversion Rate', value: `${MOCK_ANALYTICS.conversionRate}%` },
    { label: 'Store Visits', value: MOCK_ANALYTICS.totalVisits.toLocaleString('en-IN') },
    { label: 'Trial Bookings', value: bookings.length || MOCK_ANALYTICS.totalBookings },
    { label: 'Active Offers', value: offers.length },
    { label: 'Low Stock Items', value: lowStock },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">{c.label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
