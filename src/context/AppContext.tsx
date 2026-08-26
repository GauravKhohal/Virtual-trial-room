import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
  Brand,
  CartItem,
  ClothingType,
  Gender,
  Occasion,
  Product,
  SelectionState,
  StoreVisitBooking,
} from '../types';

interface AppContextValue {
  selection: SelectionState;
  setOccasion: (occasion: Occasion | null) => void;
  setGender: (gender: Gender) => void;
  toggleClothingType: (type: ClothingType) => void;
  toggleBrand: (brand: Brand) => void;
  clearBrands: () => void;
  setBudget: (budget: number) => void;
  resetSelection: () => void;

  cart: CartItem[];
  addToCart: (product: Product, size: string, quantity?: number) => void;
  removeFromCart: (productId: string, size: string) => void;
  updateCartQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;

  bookings: StoreVisitBooking[];
  addBooking: (booking: StoreVisitBooking) => void;

  lastUploadedSelfie: string | null;
  setLastUploadedSelfie: (data: string | null) => void;

  // Bridges Catalog's "Try On" button and AI Stylist's "Try This Look" into the
  // Trial Room's own product picker, which otherwise has no link to anything
  // selected elsewhere in the app.
  pendingTryOn: { top?: Product; bottom?: Product } | null;
  setPendingTryOn: (items: { top?: Product; bottom?: Product } | null) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const initialSelection: SelectionState = {
  occasion: null,
  gender: null,
  clothingTypes: [],
  brands: [],
  budget: 10000,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<SelectionState>(initialSelection);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bookings, setBookings] = useState<StoreVisitBooking[]>([]);
  const [lastUploadedSelfie, setLastUploadedSelfie] = useState<string | null>(null);
  const [pendingTryOn, setPendingTryOn] = useState<{ top?: Product; bottom?: Product } | null>(null);

  const setOccasion = (occasion: Occasion | null) => setSelection((s) => ({ ...s, occasion }));
  const setGender = (gender: Gender) => setSelection((s) => ({ ...s, gender, clothingTypes: [] }));
  const toggleClothingType = (type: ClothingType) =>
    setSelection((s) => ({
      ...s,
      clothingTypes: s.clothingTypes.includes(type)
        ? s.clothingTypes.filter((t) => t !== type)
        : [...s.clothingTypes, type],
    }));
  const toggleBrand = (brand: Brand) =>
    setSelection((s) => ({
      ...s,
      brands: s.brands.includes(brand) ? s.brands.filter((b) => b !== brand) : [...s.brands, brand],
    }));
  // "Any Brand" — for a customer whose preferred brand isn't in our fixed
  // list (a local brand, etc). An empty `brands` array already means "no
  // brand filter, show everything" everywhere brand filtering happens
  // (getProducts, Trial Room's panel), so this doesn't need a fake "Other"
  // value in the Brand union — just clears specific picks back to that state.
  const clearBrands = () => setSelection((s) => ({ ...s, brands: [] }));
  const setBudget = (budget: number) => setSelection((s) => ({ ...s, budget }));
  const resetSelection = () => setSelection(initialSelection);

  const addToCart = (product: Product, size: string, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id && c.size === size);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id && c.size === size ? { ...c, quantity: c.quantity + quantity } : c
        );
      }
      return [...prev, { product, size, quantity }];
    });
  };

  const removeFromCart = (productId: string, size: string) => {
    setCart((prev) => prev.filter((c) => !(c.product.id === productId && c.size === size)));
  };

  const updateCartQuantity = (productId: string, size: string, quantity: number) => {
    setCart((prev) =>
      prev.map((c) => (c.product.id === productId && c.size === size ? { ...c, quantity: Math.max(1, quantity) } : c))
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0),
    [cart]
  );

  const addBooking = (booking: StoreVisitBooking) => setBookings((prev) => [...prev, booking]);

  const value: AppContextValue = {
    selection,
    setOccasion,
    setGender,
    toggleClothingType,
    toggleBrand,
    clearBrands,
    setBudget,
    resetSelection,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartTotal,
    bookings,
    addBooking,
    lastUploadedSelfie,
    setLastUploadedSelfie,
    pendingTryOn,
    setPendingTryOn,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
