import { useNavigate } from 'react-router-dom';
import { BRANDS } from '../data/catalog';
import { useApp } from '../context/AppContext';

export default function BrandSelectionPage() {
  const { selection, toggleBrand, clearBrands } = useApp();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Pick your favorite brands</h1>
      <p className="text-slate-500 mt-1">Step 3 of 3 — brands available in store. Select as many as you like.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
        <button
          onClick={clearBrands}
          title="No specific brand preference — includes local brands or anything not listed here"
          className={`p-5 rounded-2xl border text-left transition-all hover:shadow-md col-span-2 sm:col-span-3 ${
            selection.brands.length === 0
              ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div className="font-semibold text-slate-800">✨ Any Brand</div>
          <div className="text-xs text-slate-500 mt-1">No preference — including local brands or anything not listed below</div>
        </button>
        {BRANDS.map((brand) => (
          <button
            key={brand.name}
            onClick={() => toggleBrand(brand.name)}
            className={`p-5 rounded-2xl border text-left transition-all hover:shadow-md ${
              selection.brands.includes(brand.name)
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="font-semibold text-slate-800">{brand.name}</div>
            <div className="text-xs text-slate-500 mt-1">{brand.tagline}</div>
          </button>
        ))}
      </div>

      <div className="mt-10 flex justify-between">
        <button onClick={() => navigate('/style')} className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
          ← Back
        </button>
        <button
          onClick={() => navigate('/stylist')}
          className="px-6 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          See AI Stylist Picks →
        </button>
      </div>
    </div>
  );
}
