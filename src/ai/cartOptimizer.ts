import type { CartItem } from '../types';

const DISCOUNT_TIERS = [
  { threshold: 5000, discountPercent: 20 },
  { threshold: 3000, discountPercent: 10 },
];

export interface OptimizerNudge {
  message: string;
  amountToAdd: number;
  unlockedDiscountPercent: number;
}

export function getOptimizerNudge(cart: CartItem[]): OptimizerNudge | null {
  if (cart.length === 0) return null;
  const total = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);

  for (const tier of DISCOUNT_TIERS) {
    if (total < tier.threshold) {
      const gap = tier.threshold - total;
      return {
        message: `Add ₹${gap} more worth of items and unlock ${tier.discountPercent}% discount.`,
        amountToAdd: gap,
        unlockedDiscountPercent: tier.discountPercent,
      };
    }
  }

  return {
    message: `You've unlocked the maximum ${DISCOUNT_TIERS[0].discountPercent}% discount tier!`,
    amountToAdd: 0,
    unlockedDiscountPercent: DISCOUNT_TIERS[0].discountPercent,
  };
}
