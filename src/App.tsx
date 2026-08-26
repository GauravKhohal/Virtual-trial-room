import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { OwnerProvider } from './context/OwnerContext';
import NavBar from './components/NavBar';

import OccasionPage from './pages/Occasion';
import DisplayPage from './pages/Display';
import StylePreferencePage from './pages/StylePreference';
import BrandSelectionPage from './pages/BrandSelection';
import StylistPage from './pages/Stylist';
import TrialRoomPage from './pages/TrialRoom';
import ColorAdvisorPage from './pages/ColorAdvisor';
import CatalogPage from './pages/Catalog';
import CartPage from './pages/Cart';
import BookingPage from './pages/Booking';
import CheckoutPage from './pages/Checkout';
import FashionAssistantPage from './pages/FashionAssistant';
import TrendsPage from './pages/Trends';
import SizePredictorPage from './pages/SizePredictor';

import OwnerLayout from './pages/owner/OwnerLayout';
import OwnerOverview from './pages/owner/Overview';
import OwnerInventory from './pages/owner/Inventory';
import OwnerOffers from './pages/owner/Offers';
import OwnerAnalytics from './pages/owner/Analytics';

// The TV display route runs full-screen on a kiosk browser with no sidebar,
// nav, or scroll chrome — it's not part of the customer/staff-facing app shell.
function AppShell() {
  const location = useLocation();
  const isDisplay = location.pathname.startsWith('/display');

  const routes = (
    <Routes>
      <Route path="/display/:room" element={<DisplayPage />} />
      <Route path="/" element={<OccasionPage />} />
      <Route path="/style" element={<StylePreferencePage />} />
      <Route path="/brands" element={<BrandSelectionPage />} />
      <Route path="/stylist" element={<StylistPage />} />
      <Route path="/trial-room" element={<TrialRoomPage />} />
      <Route path="/color-advisor" element={<ColorAdvisorPage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/assistant" element={<FashionAssistantPage />} />
      <Route path="/trends" element={<TrendsPage />} />
      <Route path="/size-predictor" element={<SizePredictorPage />} />

      <Route path="/owner" element={<OwnerLayout />}>
        <Route index element={<OwnerOverview />} />
        <Route path="inventory" element={<OwnerInventory />} />
        <Route path="offers" element={<OwnerOffers />} />
        <Route path="analytics" element={<OwnerAnalytics />} />
      </Route>
    </Routes>
  );

  if (isDisplay) return routes;

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <NavBar />
      <main className="flex-1 min-w-0">{routes}</main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <OwnerProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </OwnerProvider>
    </AppProvider>
  );
}
