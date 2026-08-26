import { useState } from 'react';
import type { Product } from '../types';
import GarmentSwatch from './GarmentSwatch';
import RecoloredPhoto from './RecoloredPhoto';
import { useApp } from '../context/AppContext';
import { useOwner } from '../context/OwnerContext';
import { getReferencePhoto } from '../data/catalog';

export default function ProductCard({
  product,
  onTryOn,
}: {
  product: Product;
  onTryOn?: (product: Product) => void;
}) {
  const { addToCart } = useApp();
  const { productImages } = useOwner();
  const photo = getReferencePhoto(product, productImages);
  const [size, setSize] = useState(product.sizes[Math.floor(product.sizes.length / 2)]);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product, size, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-3 bg-white hover:shadow-md transition-shadow">
      <div className="relative">
        {photo?.exact && (
          <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-white rounded-full w-5 h-5 flex items-center justify-center shadow z-10">
            ✨
          </span>
        )}
        {photo ? (
          photo.exact ? (
            <img src={photo.url} alt={product.name} className="w-20 h-20 object-cover rounded-lg border border-slate-100" />
          ) : (
            <RecoloredPhoto
              src={photo.url}
              alt={product.name}
              color={product.colorHex}
              className="w-20 h-20 rounded-lg border border-slate-100"
            />
          )
        ) : (
          <GarmentSwatch type={product.type} colorHex={product.colorHex} />
        )}
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-800 text-sm leading-tight">{product.name}</p>
        <p className="text-xs text-slate-500">{product.brand} · {product.color}</p>
        <p className="font-bold text-indigo-700 mt-1">₹{product.price.toLocaleString('en-IN')}</p>
      </div>

      <select
        value={size}
        onChange={(e) => setSize(e.target.value)}
        className="text-xs border border-slate-300 rounded-md px-2 py-1 w-full"
      >
        {product.sizes.map((s) => (
          <option key={s} value={s}>
            Size {s}
          </option>
        ))}
      </select>

      <div className="flex gap-2 w-full">
        {onTryOn && (
          <button
            onClick={() => onTryOn(product)}
            className="flex-1 text-xs font-medium border border-indigo-300 text-indigo-700 rounded-md py-1.5 hover:bg-indigo-50"
          >
            Try On
          </button>
        )}
        <button
          onClick={handleAdd}
          className={`flex-1 text-xs font-medium rounded-md py-1.5 transition-colors ${
            added ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {added ? 'Added ✓' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
