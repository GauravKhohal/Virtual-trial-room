export type Gender = 'Male' | 'Female' | 'Kids';

export type Occasion =
  | 'Wedding'
  | 'Party'
  | 'Office'
  | 'Casual'
  | 'Festival'
  | 'Date Night'
  | 'Interview'
  | 'Vacation'
  | 'Traditional Function';

// Plain string, not a fixed union — the 9 values in data/catalog.ts's
// CLOTHING_TYPES are just the mock catalog's known types. A real store may
// carry Sherwani, Dupatta, Anarkali, Palazzo, Hoodie, etc. — all should work
// as Product.type via the "Add Product" form's free-text type input.
export type ClothingType = string;

// Plain string, not a fixed union — the curated 6 in data/catalog.ts's BRANDS
// are just the mock catalog's demo brands, not the only valid values. A real
// store owner's own brand (or a local brand the mock list doesn't cover) needs
// to work as a Product.brand too, via the "Add Product" form.
export type Brand = string;

export interface Product {
  id: string;
  name: string;
  brand: Brand;
  type: ClothingType;
  gender: Gender;
  price: number;
  color: string;
  colorHex: string;
  sizes: string[];
  occasions: Occasion[];
  tags?: string[];
}

export interface OutfitLook {
  id: string;
  title: string;
  items: Product[];
  blurb: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  type: 'percent' | 'flat' | 'bundle';
  value: number;
  appliesTo?: ClothingType[];
  minItems?: number;
}

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

export interface StoreVisitBooking {
  id: string;
  date: string;
  time: string;
  reservedItems: Product[];
  customerName: string;
  phone: string;
  createdAt: string;
}

// One AI try-on the customer generated in Trial Room — kept around for the
// rest of their visit so they can compare a few garments (e.g. 3 shirts)
// side by side before deciding, instead of only ever seeing the latest one.
export interface TriedLook {
  id: string;
  resultUrl: string;
  topProduct?: Product;
  bottomProduct?: Product;
  createdAt: number;
}

export interface SelectionState {
  occasion: Occasion | null;
  gender: Gender | null;
  clothingTypes: ClothingType[];
  brands: Brand[];
  budget: number;
}
