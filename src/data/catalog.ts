import type { Brand, ClothingType, Gender, Occasion, Product } from '../types';

export const OCCASIONS: Occasion[] = [
  'Wedding',
  'Party',
  'Office',
  'Casual',
  'Festival',
  'Date Night',
  'Interview',
  'Vacation',
  'Traditional Function',
];

export const GENDERS: Gender[] = ['Male', 'Female', 'Kids'];

// Trial Room's "top"/"bottom" split — which clothing types go in which picker slot.
// Saree/Lehenga are full-body garments but slot into "Tops" since Trial Room only
// has two picker slots and they're mutually exclusive with Shirt/Kurta/etc anyway.
export const TRIAL_ROOM_TOP_TYPES: ClothingType[] = ['Shirt', 'T-Shirt', 'Kurta', 'Blazer', 'Saree', 'Lehenga'];
export const TRIAL_ROOM_BOTTOM_TYPES: ClothingType[] = ['Trousers', 'Jeans'];

export const CLOTHING_TYPES_BY_GENDER: Record<Gender, ClothingType[]> = {
  Male: ['Shirt', 'T-Shirt', 'Jeans', 'Trousers', 'Kurta', 'Suit', 'Blazer'],
  Female: ['Saree', 'Lehenga', 'Kurta', 'T-Shirt', 'Jeans', 'Trousers'],
  Kids: ['T-Shirt', 'Jeans', 'Kurta'],
};

// All unique clothing types across genders in the demo catalog — exported for
// use as datalist suggestions in the "Add Product" form so store owners can
// quickly pick a known type OR type a free custom one (Sherwani, Dupatta, etc.)
export const KNOWN_CLOTHING_TYPES: string[] = [
  ...new Set(Object.values(CLOTHING_TYPES_BY_GENDER).flat()),
];

export const BRANDS: { name: Brand; tagline: string }[] = [
  { name: "Levi's", tagline: 'Iconic denim & casuals' },
  { name: 'Numero Uno', tagline: 'Smart casual wear' },
  { name: 'Peter England', tagline: 'Gentleman essentials' },
  { name: 'Louis Philippe', tagline: 'Premium formal & ethnic' },
  { name: 'Allen Solly', tagline: 'Friday dressing, redefined' },
  { name: 'Van Heusen', tagline: 'Sharp professional wear' },
];

const COLORS: { name: string; hex: string }[] = [
  { name: 'Navy Blue', hex: '#1b2a4a' },
  { name: 'White', hex: '#f8f8f6' },
  { name: 'Black', hex: '#111111' },
  { name: 'Olive Green', hex: '#5c5f2e' },
  { name: 'Beige', hex: '#e3d2b4' },
  { name: 'Maroon', hex: '#6e1f2a' },
  { name: 'Red', hex: '#b3202c' },
  { name: 'Royal Blue', hex: '#1f4e96' },
  { name: 'Mustard', hex: '#c79a2b' },
  { name: 'Pastel Pink', hex: '#e9b9c4' },
  { name: 'Charcoal Grey', hex: '#3a3a3c' },
  { name: 'Emerald Green', hex: '#1f5c46' },
];

const BASE_PRICE: Partial<Record<string, number>> = {
  Shirt: 1800,
  'T-Shirt': 900,
  Jeans: 2200,
  Trousers: 1900,
  Kurta: 2400,
  Suit: 8500,
  Blazer: 4200,
  Saree: 5200,
  Lehenga: 9800,
};

export const SIZE_SETS: Record<Gender, string[]> = {
  Male: ['S', 'M', 'L', 'XL', 'XXL'],
  Female: ['XS', 'S', 'M', 'L', 'XL'],
  Kids: ['4-5Y', '6-7Y', '8-9Y', '10-11Y'],
};

export function occasionsForType(type: ClothingType): Occasion[] {
  switch (type) {
    case 'Suit':
    case 'Blazer':
      return ['Wedding', 'Office', 'Interview', 'Party'];
    case 'Kurta':
      return ['Wedding', 'Festival', 'Traditional Function', 'Casual'];
    case 'Saree':
    case 'Lehenga':
      return ['Wedding', 'Festival', 'Traditional Function', 'Party'];
    case 'Shirt':
      return ['Office', 'Interview', 'Date Night', 'Party', 'Casual'];
    case 'T-Shirt':
      return ['Casual', 'Vacation', 'Date Night'];
    case 'Jeans':
      return ['Casual', 'Vacation', 'Date Night', 'Party'];
    case 'Trousers':
      return ['Office', 'Interview', 'Wedding', 'Party'];
    default:
      return ['Casual'];
  }
}

function buildCatalog(): Product[] {
  const products: Product[] = [];
  let counter = 1;

  (Object.keys(CLOTHING_TYPES_BY_GENDER) as Gender[]).forEach((gender) => {
    const types = CLOTHING_TYPES_BY_GENDER[gender];
    types.forEach((type) => {
      BRANDS.forEach((brand, brandIdx) => {
        // not every brand carries every type/gender; pick 2-3 colors per brand+type
        const colorPicks = [
          COLORS[(brandIdx * 2) % COLORS.length],
          COLORS[(brandIdx * 2 + 1) % COLORS.length],
        ];
        colorPicks.forEach((color) => {
          const id = `p${counter++}`;
          const priceVariance = 1 + ((brandIdx % 3) * 0.12);
          products.push({
            id,
            name: `${brand.name} ${color.name} ${type}`,
            brand: brand.name,
            type,
            gender,
            price: Math.round(((BASE_PRICE[type] ?? 1500) * priceVariance) / 10) * 10,
            color: color.name,
            colorHex: color.hex,
            sizes: SIZE_SETS[gender],
            occasions: occasionsForType(type),
          });
        });
      });
    });
  });

  return products;
}

export const CATALOG: Product[] = buildCatalog();

// Real products the store owner adds via the Owner Dashboard ("Add Product"),
// on top of the generated mock CATALOG above. Set once by OwnerContext after
// it fetches them from the backend — module-level rather than threaded through
// every getProducts()/getProductById() call site (Catalog, Trial Room, AI
// Stylist, Color Advisor, Trends all call these directly), so owner-added
// products show up everywhere automatically with zero changes to those pages.
let EXTRA_PRODUCTS: Product[] = [];
export function setExtraProducts(products: Product[]): void {
  EXTRA_PRODUCTS = products;
}
function allProducts(): Product[] {
  // Owner-added products go first, not last — several pages (Trial Room's
  // top/bottom pickers, AI Stylist) cap results with .slice(0, N) for display,
  // and a real store's own products should never get buried behind dozens of
  // generated mock SKUs of the same type/gender as a result of list order.
  return EXTRA_PRODUCTS.length > 0 ? [...EXTRA_PRODUCTS, ...CATALOG] : CATALOG;
}

export function getProducts(filters: {
  occasion?: Occasion | null;
  gender?: Gender | null;
  types?: ClothingType[];
  brands?: Brand[];
}): Product[] {
  return allProducts().filter((p) => {
    if (filters.gender && p.gender !== filters.gender) return false;
    if (filters.occasion && !p.occasions.includes(filters.occasion)) return false;
    if (filters.types && filters.types.length > 0 && !filters.types.includes(p.type)) return false;
    if (filters.brands && filters.brands.length > 0 && !filters.brands.includes(p.brand)) return false;
    return true;
  });
}

export function getProductById(id: string): Product | undefined {
  return allProducts().find((p) => p.id === id);
}

// Most colour/brand variants of a given garment type will never get an
// individually-uploaded photo — there are hundreds of SKUs. Rather than show a
// flat generic icon for all of them, borrow whichever real photo exists for the
// same gender+type and let the UI recolor it (see RecoloredPhoto) — a tinted
// real photo reads as "an actual garment" far better than a vector icon, even
// though it isn't a photo of that exact colour/brand.
export function getReferencePhoto(
  product: Pick<Product, 'id' | 'gender' | 'type'>,
  productImages: Record<string, string>
): { url: string; exact: boolean } | undefined {
  if (productImages[product.id]) return { url: productImages[product.id], exact: true };
  const match = allProducts().find((p) => p.gender === product.gender && p.type === product.type && productImages[p.id]);
  return match ? { url: productImages[match.id], exact: false } : undefined;
}
