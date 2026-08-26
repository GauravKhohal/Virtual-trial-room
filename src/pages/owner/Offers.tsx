import { useState } from 'react';
import { useOwner } from '../../context/OwnerContext';
import type { ClothingType, Offer } from '../../types';

const ALL_TYPES: ClothingType[] = ['Shirt', 'T-Shirt', 'Jeans', 'Trousers', 'Kurta', 'Suit', 'Blazer', 'Saree', 'Lehenga'];

export default function OwnerOffers() {
  const { offers, addOffer, removeOffer } = useOwner();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Offer['type']>('percent');
  const [value, setValue] = useState(10);
  const [minItems, setMinItems] = useState(2);
  const [appliesTo, setAppliesTo] = useState<ClothingType[]>([]);

  const toggleType = (t: ClothingType) =>
    setAppliesTo((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || appliesTo.length === 0) return;
    addOffer({
      id: `offer-${Date.now()}`,
      title,
      description,
      type,
      value,
      minItems,
      appliesTo,
    });
    setTitle('');
    setDescription('');
    setValue(10);
    setMinItems(2);
    setAppliesTo([]);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h2 className="font-semibold text-slate-700 mb-3">Active Offers</h2>
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-start">
              <div>
                <p className="font-medium text-slate-800 text-sm">{o.title}</p>
                <p className="text-xs text-slate-500">{o.description}</p>
                <p className="text-xs text-indigo-600 mt-1">Applies to: {o.appliesTo?.join(', ')}</p>
              </div>
              <button onClick={() => removeOffer(o.id)} className="text-rose-500 text-xs font-medium hover:underline">
                Delete
              </button>
            </div>
          ))}
          {offers.length === 0 && <p className="text-slate-400 text-sm">No offers yet.</p>}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-700 mb-3">Create New Offer</h2>
        <form onSubmit={handleCreate} className="space-y-3 border border-slate-200 rounded-xl p-4">
          <input
            placeholder="Offer title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <select value={type} onChange={(e) => setType(e.target.value as Offer['type'])} className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1">
              <option value="percent">% Off</option>
              <option value="flat">Flat ₹ Off</option>
              <option value="bundle">Bundle Save ₹</option>
            </select>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-24"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Minimum items to qualify</label>
            <input
              type="number"
              min={1}
              value={minItems}
              onChange={(e) => setMinItems(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-24"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-2">Applies to</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    appliesTo.includes(t) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Create Offer
          </button>
        </form>
      </div>
    </div>
  );
}
