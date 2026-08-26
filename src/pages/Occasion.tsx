import { useNavigate } from 'react-router-dom';
import { OCCASIONS } from '../data/catalog';
import { useApp } from '../context/AppContext';
import type { Occasion } from '../types';

const EMOJI: Record<Occasion, string> = {
  Wedding: '💍',
  Party: '🎉',
  Office: '💼',
  Casual: '👟',
  Festival: '🪔',
  'Date Night': '🌹',
  Interview: '📋',
  Vacation: '🏖️',
  'Traditional Function': '🙏',
};

export default function OccasionPage() {
  const { selection, setOccasion } = useApp();
  const navigate = useNavigate();

  const handleSelect = (occasion: Occasion) => {
    setOccasion(occasion);
    navigate('/style');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">What are you shopping for today?</h1>
      <p className="text-slate-500 mt-1">Step 1 of 3 — pick an occasion to get personalized recommendations.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
        {OCCASIONS.map((occasion) => (
          <button
            key={occasion}
            onClick={() => handleSelect(occasion)}
            className={`p-5 rounded-2xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
              selection.occasion === occasion
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="text-3xl mb-2">{EMOJI[occasion]}</div>
            <div className="font-semibold text-slate-800">{occasion}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
