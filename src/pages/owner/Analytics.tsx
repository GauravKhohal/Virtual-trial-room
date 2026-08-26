import { MOCK_ANALYTICS } from '../../data/analytics';
import BarList from '../../components/BarList';

export default function OwnerAnalytics() {
  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Conversion %</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{MOCK_ANALYTICS.conversionRate}%</p>
        </div>
        <div className="border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{MOCK_ANALYTICS.totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Store Visits</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{MOCK_ANALYTICS.totalVisits.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        <div className="border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Most Searched Brands</h2>
          <BarList data={MOCK_ANALYTICS.mostSearchedBrands} />
        </div>
        <div className="border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Most Tried Products</h2>
          <BarList data={MOCK_ANALYTICS.mostTriedProducts} color="bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}
