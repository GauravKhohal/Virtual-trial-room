import type { Gender } from '../types';
import { generateLooks } from './stylist';
import { OCCASIONS } from '../data/catalog';

export function answerFashionQuery(query: string, gender: Gender | null): string {
  const lower = query.toLowerCase();
  const matchedOccasion = OCCASIONS.find((o) => lower.includes(o.toLowerCase()));

  if (matchedOccasion) {
    const looks = generateLooks({ occasion: matchedOccasion, gender: gender ?? 'Male' });
    if (looks.length > 0) {
      const look = looks[0];
      const itemNames = look.items.map((i) => i.name).join(', ');
      return `For ${matchedOccasion}, I'd recommend the "${look.title}": ${itemNames}. ${look.blurb}`;
    }
  }

  if (lower.includes('color') || lower.includes('colour')) {
    return 'Try the AI Color Advisor — upload a photo and I\'ll suggest the best colors for your skin tone.';
  }

  if (lower.includes('size')) {
    return 'Head to the AI Size Predictor — enter your height and weight and I\'ll estimate your shirt and pant size.';
  }

  return `I'd love to help you pick an outfit! Try asking something like "What should I wear for a wedding?" or pick an occasion from the home screen.`;
}
