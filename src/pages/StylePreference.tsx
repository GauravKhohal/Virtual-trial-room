import { useNavigate } from 'react-router-dom';
import { CLOTHING_TYPES_BY_GENDER, GENDERS } from '../data/catalog';
import { useApp } from '../context/AppContext';
import type { Gender } from '../types';

export default function StylePreferencePage() {
  const { selection, setGender, toggleClothingType, setBudget } = useApp();
  const navigate = useNavigate();

  const types = selection.gender ? CLOTHING_TYPES_BY_GENDER[selection.gender] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Tell us your style preference</h1>
      <p className="text-slate-500 mt-1">Step 2 of 3 — choose gender and clothing types you're interested in.</p>

      <div className="mt-8">
        <h2 className="font-semibold text-slate-700 mb-3">Gender</h2>
        <div className="flex gap-3 flex-wrap">
          {GENDERS.map((g: Gender) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`px-5 py-2.5 rounded-full border font-medium transition-colors ${
                selection.gender === g
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {selection.gender && (
        <div className="mt-8">
          <h2 className="font-semibold text-slate-700 mb-3">Clothing Type (select one or more)</h2>
          <div className="flex gap-3 flex-wrap">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => toggleClothingType(type)}
                className={`px-5 py-2.5 rounded-full border font-medium transition-colors ${
                  selection.clothingTypes.includes(type)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-semibold text-slate-700 mb-3">Budget: ₹{selection.budget.toLocaleString('en-IN')}</h2>
        <input
          type="range"
          min={1000}
          max={20000}
          step={500}
          value={selection.budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full max-w-md"
        />
      </div>

      <div className="mt-10 flex justify-end">
        <button
          disabled={!selection.gender || selection.clothingTypes.length === 0}
          onClick={() => navigate('/brands')}
          className="px-6 py-2.5 rounded-full bg-indigo-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700"
        >
          Continue to Brands →
        </button>
      </div>
    </div>
  );
}
