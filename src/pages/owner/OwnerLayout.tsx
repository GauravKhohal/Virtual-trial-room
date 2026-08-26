import { NavLink, Outlet } from 'react-router-dom';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-full text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`;

export default function OwnerLayout() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Store Owner Dashboard</h1>
      <p className="text-slate-500 mt-1">Manage inventory, offers, and view analytics — no developer needed.</p>

      <div className="flex gap-2 mt-6 border-b border-slate-200 pb-3">
        <NavLink to="/owner" className={tabClass} end>
          Overview
        </NavLink>
        <NavLink to="/owner/inventory" className={tabClass}>
          Inventory
        </NavLink>
        <NavLink to="/owner/offers" className={tabClass}>
          Offers
        </NavLink>
        <NavLink to="/owner/analytics" className={tabClass}>
          Analytics
        </NavLink>
      </div>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
