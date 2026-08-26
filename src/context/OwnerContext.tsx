import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CATALOG, setExtraProducts } from '../data/catalog';
import { OFFERS as INITIAL_OFFERS } from '../data/offers';
import type { Offer, Product } from '../types';

// VITE_API_BASE must be set at deploy time (Vite env vars are baked in at
// build time, not read at runtime) — falls back to localhost for local dev.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5500';

interface InventoryEntry {
  product: Product;
  stock: number;
}

// Stock for owner-added products is tracked here only (not persisted to the
// backend) — same as the mock catalog's stock, which is also just in-memory
// React state. Only the product data itself (name/brand/price/etc.) and its
// photo are actually persisted server-side.
const DEFAULT_CUSTOM_STOCK = 20;

interface OwnerContextValue {
  inventory: InventoryEntry[];
  updateStock: (productId: string, stock: number) => void;

  offers: Offer[];
  addOffer: (offer: Offer) => void;
  removeOffer: (offerId: string) => void;

  productImages: Record<string, string>;
  setProductImage: (productId: string, file: File) => Promise<void>;
  removeProductImage: (productId: string) => Promise<void>;
  imagesLoaded: boolean;

  // Real products the store owner adds — on top of the generated mock
  // CATALOG, since a real store's inventory won't match the demo data.
  customProducts: Product[];
  addCustomProduct: (input: Omit<Product, 'id'>) => Promise<Product>;
  removeCustomProduct: (id: string) => Promise<void>;
}

const OwnerContext = createContext<OwnerContextValue | undefined>(undefined);

function seedInventory(): InventoryEntry[] {
  // deterministic pseudo-stock per product so numbers stay stable across renders
  return CATALOG.map((product, idx) => ({
    product,
    stock: 5 + ((idx * 7) % 40),
  }));
}

export function OwnerProvider({ children }: { children: ReactNode }) {
  const [mockInventory, setMockInventory] = useState<InventoryEntry[]>(seedInventory);
  const [offers, setOffers] = useState<Offer[]>(INITIAL_OFFERS);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [customStock, setCustomStock] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/products/images`)
      .then((res) => res.json())
      .then((map: Record<string, string>) => {
        const absolute = Object.fromEntries(Object.entries(map).map(([id, url]) => [id, `${API_BASE}${url}`]));
        setProductImages(absolute);
      })
      .catch(() => {
        // backend not running — real-photo features stay unavailable, rest of the app still works
      })
      .finally(() => setImagesLoaded(true));

    fetch(`${API_BASE}/api/custom-products`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((products: unknown) => setCustomProducts(Array.isArray(products) ? (products as Product[]) : []))
      .catch(() => {
        // backend not running, or (e.g. no DATABASE_URL configured locally) returned an
        // error body instead of an array — owner-added products just won't be available
        // this session rather than crashing the whole app on customProducts.map() below
      });
  }, []);

  // Every page that browses products (Catalog, Trial Room, AI Stylist, Color
  // Advisor, Trends) calls getProducts()/getProductById() from data/catalog.ts
  // directly — this makes owner-added products show up there automatically
  // instead of needing every call site updated to merge two lists.
  useEffect(() => {
    setExtraProducts(customProducts);
  }, [customProducts]);

  const inventory = useMemo(
    () => [...mockInventory, ...customProducts.map((product) => ({ product, stock: customStock[product.id] ?? DEFAULT_CUSTOM_STOCK }))],
    [mockInventory, customProducts, customStock]
  );

  const updateStock = (productId: string, stock: number) => {
    if (mockInventory.some((e) => e.product.id === productId)) {
      setMockInventory((prev) => prev.map((e) => (e.product.id === productId ? { ...e, stock: Math.max(0, stock) } : e)));
    } else {
      setCustomStock((prev) => ({ ...prev, [productId]: Math.max(0, stock) }));
    }
  };

  const addOffer = (offer: Offer) => setOffers((prev) => [...prev, offer]);
  const removeOffer = (offerId: string) => setOffers((prev) => prev.filter((o) => o.id !== offerId));

  const setProductImage = async (productId: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`${API_BASE}/api/products/${productId}/image`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Photo upload failed');
    const json = await res.json();
    setProductImages((prev) => ({ ...prev, [productId]: `${API_BASE}${json.url}` }));
  };

  const removeProductImage = async (productId: string) => {
    await fetch(`${API_BASE}/api/products/${productId}/image`, { method: 'DELETE' });
    setProductImages((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const addCustomProduct = async (input: Omit<Product, 'id'>): Promise<Product> => {
    const res = await fetch(`${API_BASE}/api/custom-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to add product');
    setCustomProducts((prev) => [...prev, json]);
    return json as Product;
  };

  const removeCustomProduct = async (id: string) => {
    await fetch(`${API_BASE}/api/custom-products/${id}`, { method: 'DELETE' });
    setCustomProducts((prev) => prev.filter((p) => p.id !== id));
    setCustomStock((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setProductImages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <OwnerContext.Provider
      value={{
        inventory,
        updateStock,
        offers,
        addOffer,
        removeOffer,
        productImages,
        setProductImage,
        removeProductImage,
        imagesLoaded,
        customProducts,
        addCustomProduct,
        removeCustomProduct,
      }}
    >
      {children}
    </OwnerContext.Provider>
  );
}

export function useOwner() {
  const ctx = useContext(OwnerContext);
  if (!ctx) throw new Error('useOwner must be used within OwnerProvider');
  return ctx;
}
