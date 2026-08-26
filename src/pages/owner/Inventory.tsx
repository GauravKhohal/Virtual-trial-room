import { useRef, useState } from 'react';
import { useOwner } from '../../context/OwnerContext';
import GarmentSwatch from '../../components/GarmentSwatch';
import { GENDERS, SIZE_SETS, KNOWN_CLOTHING_TYPES, occasionsForType } from '../../data/catalog';
import type { Gender } from '../../types';

function AddProductForm({ onAdded }: { onAdded: (name: string) => void }) {
  const { addCustomProduct, setProductImage } = useOwner();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState<string>('Shirt');
  const [gender, setGender] = useState<Gender>('Male');
  const [price, setPrice] = useState('');
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#1b2a4a');
  const [sizes, setSizes] = useState<string[]>(SIZE_SETS.Male);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenderChange = (g: Gender) => {
    setGender(g);
    setSizes(SIZE_SETS[g]); // reset to that gender's default size run when switching
  };

  const toggleSize = (s: string) => {
    setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !brand.trim() || !price || !colorName.trim() || sizes.length === 0) {
      setError('Name, brand, price, colour, and at least one size are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const product = await addCustomProduct({
        name: name.trim(),
        brand: brand.trim(),
        type,
        gender,
        price: Number(price),
        color: colorName.trim(),
        colorHex,
        sizes,
        occasions: occasionsForType(type),
      });
      // Upload the photo immediately if one was chosen — so the customer can
      // already see it in Trial Room without a separate upload step afterward.
      if (photoFile) {
        await setProductImage(product.id, photoFile);
      }
      onAdded(name.trim());
      setName('');
      setBrand('');
      setPrice('');
      setColorName('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add product — is the backend server running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-sm font-semibold text-indigo-800">Add a new product</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Product name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Classic Cotton Shirt"
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Brand</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Your store's own brand name"
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">
            Type
            <span className="text-slate-400 font-normal ml-1">(pick a suggestion or type your own)</span>
          </label>
          <input
            value={type}
            onChange={(e) => setType(e.target.value)}
            list="clothing-type-suggestions"
            placeholder="e.g. Shirt, Sherwani, Dupatta…"
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
          <datalist id="clothing-type-suggestions">
            {KNOWN_CLOTHING_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => handleGenderChange(e.target.value as Gender)}
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Price (₹)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1999"
            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Colour</label>
          <div className="flex gap-2">
            <input
              value={colorName}
              onChange={(e) => setColorName(e.target.value)}
              placeholder="e.g. Sky Blue"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            />
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-10 h-9 border border-slate-300 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Sizes</label>
        <div className="flex gap-2 flex-wrap">
          {SIZE_SETS[gender].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`text-xs px-3 py-1 rounded-full border font-medium ${
                sizes.includes(s) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">
          Product Photo
          <span className="text-slate-400 font-normal ml-1">(optional — enables AI Try-On immediately after adding)</span>
        </label>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setPhotoFile(file);
            setPhotoPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        {photoPreview ? (
          <div className="flex items-center gap-3">
            <img src={photoPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="text-xs text-indigo-600 font-medium hover:underline"
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="text-xs text-rose-500 font-medium hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-full border border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50"
          >
            Choose Photo
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
      >
        {submitting ? (photoFile ? 'Adding & uploading photo…' : 'Adding...') : 'Add Product'}
      </button>
    </div>
  );
}

export default function OwnerInventory() {
  const { inventory, updateStock, productImages, setProductImage, removeProductImage, removeCustomProduct } = useOwner();
  const [search, setSearch] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const filtered = inventory.filter((e) => e.product.name.toLowerCase().includes(search.toLowerCase()));

  const handlePhotoUpload = async (productId: string, file: File) => {
    setUploadingId(productId);
    setUploadError(null);
    try {
      await setProductImage(productId, file);
    } catch {
      setUploadError('Upload failed — is the backend server (server/index.js) running on port 5500?');
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product name..."
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full max-w-sm"
        />
        <button
          onClick={() => setShowAddForm((s) => !s)}
          className="text-sm font-medium px-4 py-2 rounded-full border border-indigo-300 text-indigo-700 hover:bg-indigo-50 shrink-0"
        >
          {showAddForm ? 'Cancel' : '+ Add New Product'}
        </button>
      </div>

      {showAddForm && (
        <AddProductForm
          onAdded={(name) => {
            setShowAddForm(false);
            setSearch(name);
          }}
        />
      )}

      <p className="text-xs text-slate-500 mb-1">
        Upload a real product photo for an item to enable real AI try-on for it in the Virtual Trial Room. Photos are
        stored on the backend server, not in your browser.
      </p>
      {uploadError && <p className="text-xs text-rose-600 mb-4">{uploadError}</p>}

      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[600px] overflow-y-auto mt-3">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr className="text-left text-slate-500">
              <th className="p-3">Product</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Color</th>
              <th className="p-3">Sizes</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">AI Photo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((entry) => {
              const id = entry.product.id;
              const isCustom = id.startsWith('owner-');
              const inputId = `photo-upload-${id}`;
              const photo = productImages[id];
              const isUploading = uploadingId === id;
              return (
                <tr key={id} className="border-t border-slate-100">
                  <td className="p-3 flex items-center gap-2">
                    <GarmentSwatch type={entry.product.type} colorHex={entry.product.colorHex} size="sm" />
                    {entry.product.name}
                    {isCustom && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Yours</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{entry.product.brand}</td>
                  <td className="p-3 text-slate-600">{entry.product.color}</td>
                  <td className="p-3 text-slate-600">{entry.product.sizes.join(', ')}</td>
                  <td className="p-3 text-slate-600">₹{entry.product.price.toLocaleString('en-IN')}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={entry.stock}
                      onChange={(e) => updateStock(id, Number(e.target.value))}
                      className={`w-20 border rounded-md px-2 py-1 ${
                        entry.stock < 10 ? 'border-rose-300 text-rose-600' : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      id={inputId}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePhotoUpload(id, e.target.files[0])}
                    />
                    {isUploading ? (
                      <span className="text-xs text-slate-400">Uploading...</span>
                    ) : photo ? (
                      <div className="flex items-center gap-2">
                        <img src={photo} alt="" className="w-10 h-10 object-cover rounded-md border border-slate-200" />
                        <div className="flex flex-col gap-1">
                          <label htmlFor={inputId} className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer">
                            Replace
                          </label>
                          <button onClick={() => removeProductImage(id)} className="text-xs text-rose-500 font-medium hover:underline">
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor={inputId}
                        className="text-xs px-3 py-1.5 rounded-full border border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50 cursor-pointer inline-block"
                      >
                        Upload Photo
                      </label>
                    )}
                  </td>
                  <td className="p-3">
                    {isCustom && (
                      <button onClick={() => removeCustomProduct(id)} className="text-xs text-rose-500 font-medium hover:underline">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
