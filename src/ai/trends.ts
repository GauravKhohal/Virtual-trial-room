export interface TrendDatum {
  label: string;
  value: number;
}

export const TRENDING_COLORS: TrendDatum[] = [
  { label: 'Navy Blue', value: 34 },
  { label: 'White', value: 27 },
  { label: 'Olive Green', value: 18 },
  { label: 'Maroon', value: 14 },
  { label: 'Black', value: 12 },
];

export const TRENDING_BRANDS: TrendDatum[] = [
  { label: "Levi's", value: 29 },
  { label: 'Van Heusen', value: 24 },
  { label: 'Louis Philippe', value: 21 },
  { label: 'Allen Solly', value: 17 },
  { label: 'Peter England', value: 15 },
  { label: 'Numero Uno', value: 11 },
];

export const TRENDING_COMBOS: { label: string; description: string }[] = [
  { label: 'Navy Blazer + White Shirt + Beige Chinos', description: 'Most booked wedding-guest look this month.' },
  { label: 'Premium Kurta + Nehru Jacket', description: 'Top traditional-function pick.' },
  { label: 'White Tee + Blue Jeans', description: 'Go-to casual combo for weekend shoppers.' },
];
