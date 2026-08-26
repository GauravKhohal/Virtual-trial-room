import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { generateLooks } from '../ai/stylist';
import GarmentSwatch from '../components/GarmentSwatch';
import { TRIAL_ROOM_TOP_TYPES, TRIAL_ROOM_BOTTOM_TYPES } from '../data/catalog';
import type { ClothingType, Product } from '../types';

export default function StylistPage() {
  const { selection, addToCart, setPendingTryOn } = useApp();
  const navigate = useNavigate();

  const looks = useMemo(
    () =>
      generateLooks({
        occasion: selection.occasion,
        gender: selection.gender,
        brands: selection.brands,
        budget: selection.budget,
      }),
    [selection]
  );

  const handleAddLook = (lookItems: ReturnType<typeof generateLooks>[number]['items']) => {
    lookItems.forEach((item) => addToCart(item, item.sizes[Math.floor(item.sizes.length / 2)], 1));
  };

  const handleTryLook = (lookItems: Product[]) => {
    const top = lookItems.find((i) => (TRIAL_ROOM_TOP_TYPES as ClothingType[]).includes(i.type));
    const bottom = lookItems.find((i) => (TRIAL_ROOM_BOTTOM_TYPES as ClothingType[]).includes(i.type));
    setPendingTryOn({ top, bottom });
    navigate('/trial-room');
  };

  if (!selection.gender) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">Please select your style preferences first.</p>
        <button onClick={() => navigate('/style')} className="mt-4 px-5 py-2 rounded-full bg-indigo-600 text-white">
          Go to Style Preference
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Your AI Personal Stylist Picks</h1>
      <p className="text-slate-500 mt-1">
        Based on {selection.occasion ?? 'your style'}, {selection.gender}
        {selection.brands.length > 0 ? `, and ${selection.brands.join(', ')}` : ''}.
      </p>

      {looks.length === 0 && (
        <p className="mt-8 text-slate-500">No matching looks yet — try widening your brand selection or budget.</p>
      )}

      <div className="grid sm:grid-cols-2 gap-6 mt-8">
        {looks.map((look) => {
          const total = look.items.reduce((s, i) => s + i.price, 0);
          return (
            <div key={look.id} className="border border-slate-200 rounded-2xl p-5 bg-white">
              <h2 className="font-bold text-lg text-slate-800">{look.title}</h2>
              <p className="text-sm text-indigo-600 italic mt-1">"{look.blurb}"</p>

              <div className="flex gap-3 mt-4 flex-wrap">
                {look.items.map((item) => (
                  <div key={item.id} className="flex flex-col items-center gap-1 w-24 text-center">
                    <GarmentSwatch type={item.type} colorHex={item.colorHex} size="sm" />
                    <span className="text-[11px] text-slate-600 leading-tight">{item.color} {item.type}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-5">
                <span className="font-bold text-slate-800">₹{total.toLocaleString('en-IN')}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTryLook(look.items)}
                    className="text-xs font-medium border border-indigo-300 text-indigo-700 rounded-full px-3 py-1.5 hover:bg-indigo-50"
                  >
                    Try This Look
                  </button>
                  <button
                    onClick={() => handleAddLook(look.items)}
                    className="text-xs font-medium bg-indigo-600 text-white rounded-full px-3 py-1.5 hover:bg-indigo-700"
                  >
                    Add Look to Cart
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex justify-between">
        <button onClick={() => navigate('/brands')} className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
          ← Back
        </button>
        <button onClick={() => navigate('/trial-room')} className="px-6 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700">
          Try in Virtual Trial Room →
        </button>
      </div>
    </div>
  );
}
