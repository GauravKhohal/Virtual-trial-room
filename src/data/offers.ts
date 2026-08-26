import type { Offer } from '../types';

export const OFFERS: Offer[] = [
  {
    id: 'o1',
    title: 'Buy 2 Shirts, Get 10% Off',
    description: 'Add any 2 shirts to your cart to unlock 10% off on them.',
    type: 'percent',
    value: 10,
    appliesTo: ['Shirt'],
    minItems: 2,
  },
  {
    id: 'o2',
    title: 'Shirt + Trouser Combo: ₹500 Off',
    description: 'Buy a shirt and trouser together and save ₹500 flat.',
    type: 'flat',
    value: 500,
    appliesTo: ['Shirt', 'Trousers'],
    minItems: 2,
  },
  {
    id: 'o3',
    title: 'Wedding Package: Save ₹1500',
    description: 'Kurta + Blazer/Suit + Trousers bundle — save ₹1500 on the set.',
    type: 'bundle',
    value: 1500,
    appliesTo: ['Kurta', 'Blazer', 'Suit', 'Trousers'],
    minItems: 3,
  },
];

export function calculateOfferSavings(itemTypes: string[], offers: Offer[] = OFFERS): {
  applicable: Offer[];
  totalSavings: number;
} {
  const applicable: Offer[] = [];
  let totalSavings = 0;

  for (const offer of offers) {
    if (!offer.appliesTo) continue;
    const matchingCount = itemTypes.filter((t) => offer.appliesTo!.includes(t as never)).length;
    if (offer.minItems && matchingCount >= offer.minItems) {
      applicable.push(offer);
      if (offer.type === 'flat' || offer.type === 'bundle') {
        totalSavings += offer.value;
      }
    }
  }

  return { applicable, totalSavings };
}
