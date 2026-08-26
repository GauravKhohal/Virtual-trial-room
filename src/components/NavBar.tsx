import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Shop',
    items: [
      { to: '/', label: 'Occasion', icon: '🎉', end: true },
      { to: '/style', label: 'Style', icon: '👗' },
      { to: '/brands', label: 'Brands', icon: '🏷️' },
      { to: '/catalog', label: 'Catalog', icon: '🛍️' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { to: '/stylist', label: 'AI Stylist', icon: '✨' },
      { to: '/trial-room', label: 'Trial Room', icon: '👕' },
      { to: '/color-advisor', label: 'Color Advisor', icon: '🎨' },
      { to: '/size-predictor', label: 'Size Predictor', icon: '📏' },
      { to: '/assistant', label: 'Ask AI', icon: '💬' },
      { to: '/trends', label: 'Trends', icon: '📈' },
    ],
  },
  {
    label: 'Store',
    items: [{ to: '/booking', label: 'Book Visit', icon: '📅' }],
  },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

function SidebarContent({ cartCount, onNavigate }: { cartCount: number; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <NavLink to="/" onClick={onNavigate} className="font-bold text-lg text-indigo-700 px-4 py-4 shrink-0">
        ✨ VirtualTrail
      </NavLink>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={linkClass}>
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 space-y-2 shrink-0">
        <NavLink
          to="/cart"
          onClick={onNavigate}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
        >
          <span className="flex items-center gap-2.5">🛒 Cart</span>
          {cartCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/owner"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          🏪 Store Owner
        </NavLink>
      </div>
    </div>
  );
}

export default function NavBar() {
  const { cart } = useApp();
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop: fixed-width left sidebar */}
      <aside className="hidden md:block w-60 shrink-0 sticky top-0 h-screen bg-white border-r border-slate-200">
        <SidebarContent cartCount={cartCount} />
      </aside>

      {/* Mobile: slim top bar + slide-in drawer */}
      <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <NavLink to="/" className="font-bold text-lg text-indigo-700">
          ✨ VirtualTrail
        </NavLink>
        <div className="flex items-center gap-2">
          <NavLink to="/cart" className="relative px-3 py-1.5 rounded-full text-sm font-medium bg-slate-900 text-white">
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </NavLink>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-lg border border-slate-300 text-slate-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 p-1.5 text-slate-500 hover:text-slate-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
            <SidebarContent cartCount={cartCount} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
