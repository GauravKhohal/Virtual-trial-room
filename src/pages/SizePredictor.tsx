import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { predictSize, refineSizeWithMeasurement, type SizePrediction } from '../ai/sizePredictor';
import { measureBodyFromImage } from '../ai/bodyMeasurement';
import { recommendJeansSizes, recommendShirtSize } from '../ai/garmentSizeMatcher';
import {
  JEANS_CHART_BRANDS,
  JEANS_FIT_PREFERENCES,
  type JeansFitPreference,
  type ShirtFitPreference,
} from '../data/sizeCharts';

export default function SizePredictorPage() {
  const { selection } = useApp();
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [result, setResult] = useState<SizePrediction | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [measurementWarning, setMeasurementWarning] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [garment, setGarment] = useState<'Jeans' | 'Shirt'>('Jeans');
  const [jeansFit, setJeansFit] = useState<JeansFitPreference>('Slim/Regular');
  const [jeansBrand, setJeansBrand] = useState<string>('');
  const [shirtFit, setShirtFit] = useState<ShirtFitPreference>('Slim Fit');

  const handlePhotoUpload = (file: File) => {
    setPhotoUrl(URL.createObjectURL(file));
    setMeasurementWarning(null);
    setResult(null);
  };

  const handlePredict = async () => {
    const gender = selection.gender ?? 'Male';
    const base = predictSize(height, weight, gender);

    if (!photoUrl) {
      setResult(base);
      return;
    }

    setMeasuring(true);
    setMeasurementWarning(null);
    try {
      const img = new Image();
      img.src = photoUrl;
      await img.decode();
      const measurement = await measureBodyFromImage(img, height);
      if (!measurement) {
        setMeasurementWarning(
          "Couldn't clearly detect your full body in that photo — using height & weight only. Try a photo standing further back with your head and feet both visible, in good lighting."
        );
        setResult(base);
      } else {
        setResult(refineSizeWithMeasurement(base, measurement, gender));
      }
    } catch {
      setMeasurementWarning('Could not analyze that photo — using height & weight only.');
      setResult(base);
    } finally {
      setMeasuring(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">AI Size Predictor</h1>
      <p className="text-slate-500 mt-1">Enter your height & weight to estimate your size — reducing returns.</p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Height (cm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Weight (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
          <p className="text-sm font-medium text-slate-700 mb-1">📷 Scan a selfie for a more accurate fit (optional)</p>
          <p className="text-[11px] text-slate-400 mb-3">
            A full-body photo (head and feet both visible, standing a few steps back) lets us measure your shoulder
            and hip width to refine the height/weight estimate — broad or narrow frames at the same BMI need
            different sizes.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
          />
          {photoUrl ? (
            <div className="flex items-center gap-3">
              <img src={photoUrl} alt="Your uploaded photo" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
              <button onClick={() => fileRef.current?.click()} className="text-xs text-indigo-600 font-medium hover:underline">
                Use a Different Photo
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-full border border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50"
            >
              Upload Full-Body Photo
            </button>
          )}
        </div>

        <button
          onClick={handlePredict}
          disabled={measuring}
          className="w-full px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
        >
          {measuring ? 'Analyzing your photo...' : 'Predict My Size'}
        </button>
        {measurementWarning && <p className="text-xs text-amber-600">{measurementWarning}</p>}
      </div>

      {result && (
        <div className="mt-6 p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm space-y-1">
          <p>👔 Shirt Size: <strong>{result.shirtSize}</strong></p>
          <p>👖 Pant Size: <strong>{result.pantSize}</strong></p>
          <p className="text-xs text-emerald-700 mt-2">
            Confidence: {Math.round(result.confidence * 100)}%
            {result.photoRefined ? ' (height, weight & photo)' : ' (height & weight only)'}
          </p>
          {result.note && <p className="text-xs text-emerald-600 mt-1">{result.note}</p>}
        </div>
      )}

      {result && Number.isFinite(Number(result.pantSize)) && (
        <div className="mt-6 p-5 rounded-xl border border-indigo-200 bg-indigo-50/50">
          <h2 className="font-semibold text-slate-900">🎯 Exact size by brand & fit</h2>
          <p className="text-xs text-slate-500 mt-1">
            The same tag size fits differently across models. This matches your measurements against each
            model's actual garment chart so the piece fits the first time — no size exchange.
          </p>

          <div className="flex gap-2 mt-4">
            {(['Jeans', 'Shirt'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGarment(g)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border ${
                  garment === g
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                }`}
              >
                {g === 'Jeans' ? '👖 Jeans' : '👔 Shirt'}
              </button>
            ))}
          </div>

          {garment === 'Jeans' ? (
            <>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Your fit preference</label>
                  <select
                    value={jeansFit}
                    onChange={(e) => setJeansFit(e.target.value as JeansFitPreference)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    {JEANS_FIT_PREFERENCES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Brand</label>
                  <select
                    value={jeansBrand}
                    onChange={(e) => setJeansBrand(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="">All brands</option>
                    {JEANS_CHART_BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const matches = recommendJeansSizes(Number(result.pantSize), jeansFit, jeansBrand || undefined);
                if (matches.length === 0) {
                  return (
                    <p className="text-xs text-amber-600 mt-4">
                      No stocked model matches this fit{jeansBrand ? ` from ${jeansBrand}` : ''} in your size —
                      try another fit or brand.
                    </p>
                  );
                }
                return (
                  <div className="mt-4 space-y-2">
                    {matches.map((m, i) => (
                      <div
                        key={`${m.brand}-${m.model}`}
                        className={`p-3 rounded-lg border text-sm ${
                          i === 0 ? 'bg-white border-indigo-300 shadow-sm' : 'bg-white/60 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-800">
                            {m.brand} {m.model}
                            {m.rise && <span className="text-slate-400 font-normal"> · {m.rise}</span>}
                            {i === 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">BEST FIT</span>}
                          </p>
                          <p className="font-bold text-indigo-700 whitespace-nowrap">
                            Size {m.sizeLabel}
                            {m.letterSize && <span className="text-slate-400 font-normal text-xs"> ({m.letterSize})</span>}
                          </p>
                        </div>
                        {m.spec ? (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Garment: waist {m.spec.waist}&quot; · hips {m.spec.hips}&quot; · thigh {m.spec.thighs}&quot; ·
                            rise {m.spec.mori}&quot; · length {m.spec.length}&quot;
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-1">Matched by tag size (no garment chart measured for this model yet).</p>
                        )}
                        {m.outOfRange && (
                          <p className="text-[11px] text-amber-600 mt-1">
                            ⚠️ Largest size of this model may still be tight for you — verify in the trial room.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              <div className="mt-4">
                <label className="text-xs font-medium text-slate-600 block mb-1">Your fit preference</label>
                <select
                  value={shirtFit}
                  onChange={(e) => setShirtFit(e.target.value as ShirtFitPreference)}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                >
                  <option value="Slim Fit">Slim Fit</option>
                  <option value="Regular Fit">Regular Fit</option>
                </select>
              </div>

              {(() => {
                const m = recommendShirtSize(result.shirtSize, shirtFit);
                return (
                  <div className="mt-4 p-3 rounded-lg border border-indigo-300 bg-white text-sm shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800">{shirtFit} shirt</p>
                      <p className="font-bold text-indigo-700">Size {m.size}</p>
                    </div>
                    {m.fit === 'Regular Fit' && m.size !== result.shirtSize && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Regular fit is cut roomier — one tag size down from your slim-fit size {result.shirtSize} gives the same room.
                      </p>
                    )}
                    {m.spec && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Levi&apos;s garment: collar {m.spec.tira}&quot; · chest {m.spec.chest}&quot; (flat) ·
                        length {m.spec.length}&quot; · sleeve {m.spec.sleeveLength}&quot; · waist {m.spec.waist}&quot; (flat)
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
