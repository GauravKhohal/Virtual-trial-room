import type { Gender, Occasion, OutfitLook, Product } from '../types';
import { getProducts } from '../data/catalog';

const LOOK_TEMPLATES: Record<Gender, { title: string; types: string[]; blurb: string }[]> = {
  Male: [
    {
      title: 'Classic Sharp Look',
      types: ['Blazer', 'Shirt', 'Trousers'],
      blurb: 'Customers attending weddings usually prefer this combination.',
    },
    {
      title: 'Traditional Elegance',
      types: ['Kurta', 'Trousers'],
      blurb: 'A premium kurta-pajama set is a festival and wedding favorite.',
    },
    {
      title: 'Smart Casual',
      types: ['Shirt', 'Jeans'],
      blurb: 'Great for date nights and casual outings alike.',
    },
    {
      title: 'Office Ready',
      types: ['Shirt', 'Trousers'],
      blurb: 'Crisp and professional — ideal for interviews and office days.',
    },
  ],
  Female: [
    {
      title: 'Festive Glam',
      types: ['Lehenga'],
      blurb: 'A top pick for weddings and traditional functions this season.',
    },
    {
      title: 'Elegant Drape',
      types: ['Saree'],
      blurb: 'Customers attending weddings usually prefer this combination.',
    },
    {
      title: 'Easy Breezy',
      types: ['T-Shirt', 'Jeans'],
      blurb: 'Comfortable yet stylish for casual days and vacations.',
    },
  ],
  Kids: [
    {
      title: 'Mini Festive',
      types: ['Kurta'],
      blurb: 'Perfect for festivals and family functions.',
    },
    {
      title: 'Everyday Fun',
      types: ['T-Shirt', 'Jeans'],
      blurb: 'Durable and comfortable for everyday play.',
    },
  ],
};

export function generateLooks(params: {
  occasion: Occasion | null;
  gender: Gender | null;
  brands?: string[];
  budget?: number;
}): OutfitLook[] {
  const { occasion, gender, brands, budget } = params;
  if (!gender) return [];

  const templates = LOOK_TEMPLATES[gender];
  const looks: OutfitLook[] = [];

  templates.forEach((template, idx) => {
    const items: Product[] = [];
    template.types.forEach((type) => {
      const candidates = getProducts({
        occasion,
        gender,
        types: [type as never],
        brands: brands as never,
      });
      const pool = candidates.length > 0 ? candidates : getProducts({ gender, types: [type as never] });
      if (pool.length > 0) {
        items.push(pool[idx % pool.length]);
      }
    });

    if (items.length === 0) return;

    const total = items.reduce((sum, p) => sum + p.price, 0);
    if (budget && total > budget * 1.3) return;

    looks.push({
      id: `look-${idx}`,
      title: template.title,
      items,
      blurb: template.blurb,
    });
  });

  return looks.slice(0, 4);
}
