import { useRef, useState } from 'react';
import { analyzeSkinToneAndColors, type ColorAdviceResult } from '../ai/colorAdvisor';

export default function ColorAdvisorPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ColorAdviceResult | null>(null);

  const handleUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setPhoto(url);
    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const advice = await analyzeSkinToneAndColors(String(reader.result));
      setResult(advice);
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">AI Color Advisor</h1>
      <p className="text-slate-500 mt-1">Upload a photo and we'll suggest the best colors for you.</p>

      <div className="mt-8 grid sm:grid-cols-2 gap-8 items-start">
        <div>
          <div className="aspect-square rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {photo ? (
              <img src={photo} alt="Uploaded" className="w-full h-full object-cover" />
            ) : (
              <p className="text-slate-400 text-sm px-6 text-center">No photo uploaded yet</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 w-full px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Upload Photo
          </button>
        </div>

        <div>
          {loading && <p className="text-slate-500 text-sm">Analyzing skin tone & colors...</p>}

          {result && (
            <div className="space-y-5">
              <p className="text-sm text-slate-600">
                Detected skin tone: <strong>{result.skinTone}</strong>
              </p>

              <div>
                <h3 className="font-semibold text-emerald-700 mb-2">Best Colors</h3>
                <div className="flex flex-wrap gap-3">
                  {result.best.map((c) => (
                    <div key={c.name} className="flex flex-col items-center gap-1 text-xs text-slate-600">
                      <div className="w-10 h-10 rounded-full ring-2 ring-emerald-300" style={{ backgroundColor: c.hex }} />
                      ✔ {c.name}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-rose-700 mb-2">Avoid</h3>
                <div className="flex flex-wrap gap-3">
                  {result.avoid.map((c) => (
                    <div key={c.name} className="flex flex-col items-center gap-1 text-xs text-slate-600">
                      <div className="w-10 h-10 rounded-full ring-2 ring-rose-300" style={{ backgroundColor: c.hex }} />
                      ❌ {c.name}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400">This significantly increases purchase confidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
