import { TRENDING_BRANDS, TRENDING_COLORS, TRENDING_COMBOS } from '../ai/trends';
import BarList from '../components/BarList';

export default function TrendsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">AI Trend Analysis</h1>
      <p className="text-slate-500 mt-1">What's trending across the store right now.</p>

      <div className="grid sm:grid-cols-2 gap-8 mt-8">
        <div className="border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Most Popular Colors</h2>
          <BarList data={TRENDING_COLORS} color="bg-emerald-500" />
        </div>
        <div className="border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Most Popular Brands</h2>
          <BarList data={TRENDING_BRANDS} />
        </div>
      </div>

      <div className="mt-8 border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-700 mb-4">Trending Combinations</h2>
        <div className="space-y-3">
          {TRENDING_COMBOS.map((c) => (
            <div key={c.label} className="p-3 rounded-lg bg-indigo-50">
              <p className="font-medium text-indigo-800 text-sm">{c.label}</p>
              <p className="text-xs text-indigo-600">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
