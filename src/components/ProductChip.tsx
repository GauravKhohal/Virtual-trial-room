import type { Product } from '../types';
import GarmentSwatch from './GarmentSwatch';
import RecoloredPhoto from './RecoloredPhoto';

export default function ProductChip({
  product,
  selected,
  photo,
  onClick,
}: {
  product: Product;
  selected: boolean;
  photo?: { url: string; exact: boolean };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={photo?.exact ? `${product.name} (real AI try-on available)` : product.name}
      className={`relative w-24 shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
        selected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {photo?.exact && (
        <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-white rounded-full w-5 h-5 flex items-center justify-center shadow z-10">
          ✨
        </span>
      )}
      {photo ? (
        photo.exact ? (
          <img src={photo.url} alt={product.name} className="w-14 h-14 object-cover rounded-lg border border-slate-100" />
        ) : (
          <RecoloredPhoto
            src={photo.url}
            alt={product.name}
            color={product.colorHex}
            className="w-14 h-14 rounded-lg border border-slate-100"
          />
        )
      ) : (
        <GarmentSwatch type={product.type} colorHex={product.colorHex} size="sm" />
      )}
      <span className="text-[11px] text-slate-700 text-center leading-tight truncate w-full">{product.color}</span>
      <span className="text-[10px] font-semibold text-indigo-700">₹{product.price.toLocaleString('en-IN')}</span>
    </button>
  );
}
