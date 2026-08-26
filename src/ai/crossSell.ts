import type { CartItem, ClothingType, Product } from '../types';
import { CATALOG } from '../data/catalog';

const COMPLEMENTS: Record<string, ClothingType[]> = {
  Shirt: ['Trousers', 'Jeans'],
  'T-Shirt': ['Jeans', 'Trousers'],
  Trousers: ['Shirt'],
  Jeans: ['T-Shirt', 'Shirt'],
  Kurta: ['Trousers'],
  Blazer: ['Shirt', 'Trousers'],
  Suit: ['Shirt'],
};

const ACCESSORY_LABELS = ['Belt', 'Shoes', 'Watch'];

export interface CrossSellSuggestion {
  product: Product;
  reason: string;
}

export function getCrossSellSuggestions(cart: CartItem[]): CrossSellSuggestion[] {
  if (cart.length === 0) return [];

  const cartTypes = new Set(cart.map((c) => c.product.type));
  const cartProductIds = new Set(cart.map((c) => c.product.id));
  const suggestions: CrossSellSuggestion[] = [];

  for (const item of cart) {
    const complementTypes = COMPLEMENTS[item.product.type] || [];
    for (const compType of complementTypes) {
      if (cartTypes.has(compType)) continue;
      const candidate = CATALOG.find(
        (p) =>
          p.type === compType &&
          p.gender === item.product.gender &&
          !cartProductIds.has(p.id)
      );
      if (candidate && !suggestions.some((s) => s.product.id === candidate.id)) {
        suggestions.push({
          product: candidate,
          reason: `Pairs perfectly with your ${item.product.name}.`,
        });
      }
    }
  }

  return suggestions.slice(0, 4);
}

export function getAccessoryLabels(): string[] {
  return ACCESSORY_LABELS;
}

export function buildCompleteLookMessage(cart: CartItem[]): string | null {
  if (cart.length === 0) return null;
  const total = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const potentialSave = Math.round(total * 0.15 / 50) * 50;
  return `Complete your look with a belt, shoes & watch and save ₹${potentialSave}.`;
}
