import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRANDS, CLOTHING_TYPES_BY_GENDER, getProducts, TRIAL_ROOM_BOTTOM_TYPES } from '../data/catalog';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import type { Brand, ClothingType, Product } from '../types';

export default function CatalogPage() {
  const { selection, setPendingTryOn } = useApp();
  const navigate = useNavigate();

  const handleTryOn = (product: Product) => {
    const isBottom = (TRIAL_ROOM_BOTTOM_TYPES as ClothingType[]).includes(product.type);
    setPendingTryOn(isBottom ? { bottom: product } : { top: product });
    navigate('/trial-room');
  };
  const [typeFilter, setTypeFilter] = useState<ClothingType | 'All'>('All');
  const [brandFilter, setBrandFilter] = useState<Brand | 'All'>('All');

  const allTypes = selection.gender ? CLOTHING_TYPES_BY_GENDER[selection.gender] : [];

  const products = useMemo(
    () =>
      getProducts({
        gender: selection.gender,
        types: typeFilter === 'All' ? undefined : [typeFilter],
        brands: brandFilter === 'All' ? undefined : [brandFilter],
      }),
    [selection.gender, typeFilter, brandFilter]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Browse Catalog</h1>
      {!selection.gender && (
        <p className="text-sm text-amber-600 mt-1">
          Tip: <button className="underline" onClick={() => navigate('/style')}>set your style preference</button> to see relevant items first.
        </p>
      )}

      <div className="flex gap-3 flex-wrap mt-6">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ClothingType | 'All')}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="All">All Types</option>
          {(allTypes.length > 0 ? allTypes : ['Shirt', 'T-Shirt', 'Jeans', 'Trousers', 'Kurta', 'Suit', 'Blazer', 'Saree', 'Lehenga']).map(
            (t) => (
              <option key={t} value={t}>
                {t}
              </option>
            )
          )}
        </select>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value as Brand | 'All')}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="All">All Brands</option>
          {BRANDS.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
        {products.slice(0, 60).map((product) => (
          <ProductCard key={product.id} product={product} onTryOn={handleTryOn} />
        ))}
      </div>

      {products.length === 0 && <p className="text-slate-500 mt-8">No products match these filters.</p>}
    </div>
  );
}
