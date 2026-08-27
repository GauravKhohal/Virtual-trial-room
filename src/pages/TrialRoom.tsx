import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useOwner } from '../context/OwnerContext';
import {
  getProducts,
  getReferencePhoto,
  OCCASIONS,
  GENDERS,
  BRANDS,
  TRIAL_ROOM_TOP_TYPES,
  TRIAL_ROOM_BOTTOM_TYPES,
  CLOTHING_TYPES_BY_GENDER,
} from '../data/catalog';
import type { ClothingType, Product } from '../types';
import { useDraggableRect } from '../hooks/useDraggableRect';
import TintBox from '../components/TintBox';
import LiveTryOn, { type OverlayTopType } from '../components/LiveTryOn';
import ProductChip from '../components/ProductChip';
import ZoomableImage from '../components/ZoomableImage';
import RecoloredPhoto from '../components/RecoloredPhoto';
import GarmentSwatch from '../components/GarmentSwatch';
import { blobUrlToDataUrl, requestFashnTryOn } from '../ai/realTryOn';
import { pushDisplayState } from '../ai/display';
import { useDisplayRoom } from '../hooks/useDisplayRoom';

const BODY_SHAPES = ['Rectangle', 'Athletic', 'Oval', 'Triangle', 'Inverted Triangle'];
const DEFAULT_TOP_RECT = { x: 21, y: 18, w: 58, h: 28 };
const DEFAULT_BOTTOM_RECT = { x: 25, y: 50, w: 50, h: 38 };

// A lehenga/saree is one complete outfit, not a "top" you pair with a bottom —
// it needs the full-outfit AI path (CatVTON "overall"), not the upper-body
// IDM-VTON chain, and there's no separate bottom to pick alongside it.
function isFullOutfitType(type: ClothingType): boolean {
  return type === 'Saree' || type === 'Lehenga';
}

// Shown the moment a chip is clicked, before any try-on happens — a clear,
// uncropped (object-contain) look at the actual item so the customer can
// narrow down their choice rather than judging a 56px cropped chip thumbnail.
function LookPreviewCard({ product, productImages }: { product: Product; productImages: Record<string, string> }) {
  const photo = getReferencePhoto(product, productImages);
  return (
    <div className="flex-1 min-w-0">
      <div className="w-full h-48 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
        {photo ? (
          photo.exact ? (
            <img src={photo.url} alt={product.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <RecoloredPhoto src={photo.url} alt={product.name} color={product.colorHex} fit="contain" maxHeightPx={192} />
          )
        ) : (
          <GarmentSwatch type={product.type} colorHex={product.colorHex} />
        )}
      </div>
      <p className="text-xs text-slate-600 mt-2 text-center truncate">{product.name}</p>
      <p className="text-xs font-semibold text-indigo-700 text-center">₹{product.price.toLocaleString('en-IN')}</p>
    </div>
  );
}

const TOP_TYPES = TRIAL_ROOM_TOP_TYPES;
const BOTTOM_TYPES = TRIAL_ROOM_BOTTOM_TYPES;

type RealTryOnState =
  | { status: 'idle' }
  | { status: 'loading'; step: string }
  | { status: 'done'; resultUrl: string }
  | { status: 'error'; error: string };

export default function TrialRoomPage() {
  const {
    selection,
    setOccasion,
    setGender,
    toggleBrand,
    clearBrands,
    lastUploadedSelfie,
    setLastUploadedSelfie,
    addToCart,
    pendingTryOn,
    setPendingTryOn,
    triedLooks,
    addTriedLook,
    removeTriedLook,
    clearTriedLooks,
  } = useApp();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { productImages } = useOwner();
  const { room, setRoom } = useDisplayRoom();
  const [tvOpen, setTvOpen] = useState(false);
  const [roomInput, setRoomInput] = useState(room);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoFrameRef = useRef<HTMLDivElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [bodyShape, setBodyShape] = useState<string | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null);
  const [topProduct, setTopProduct] = useState<Product | null>(null);
  const [bottomProduct, setBottomProduct] = useState<Product | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [topTypeFilter, setTopTypeFilter] = useState<ClothingType>('Shirt');
  const [bottomTypeFilter, setBottomTypeFilter] = useState<ClothingType>('Jeans');
  const [realTryOn, setRealTryOn] = useState<RealTryOnState>({ status: 'idle' });
  const [viewingLookId, setViewingLookId] = useState<string | null>(null);
  const [mode, setMode] = useState<'live' | 'static'>('live');
  // A frame captured from Live Preview already has the garment baked into the
  // pixels — the manual drag-box tool below is only needed (and only sensible)
  // for a plain uploaded/camera photo that has no overlay applied yet.
  const [selfieSource, setSelfieSource] = useState<'upload' | 'live-capture' | null>(null);

  const topBox = useDraggableRect(DEFAULT_TOP_RECT, photoFrameRef);
  const bottomBox = useDraggableRect(DEFAULT_BOTTOM_RECT, photoFrameRef);

  // Pick up whatever was queued by Catalog's "Try On" button or AI Stylist's
  // "Try This Look" — otherwise Trial Room has no link to anything chosen elsewhere.
  useEffect(() => {
    if (!pendingTryOn) return;
    if (pendingTryOn.top) {
      setTopTypeFilter(pendingTryOn.top.type);
      setTopProduct(pendingTryOn.top);
    }
    if (pendingTryOn.bottom) {
      setBottomTypeFilter(pendingTryOn.bottom.type);
      setBottomProduct(pendingTryOn.bottom);
    }
    setPendingTryOn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't show type pills the selected gender doesn't actually carry (e.g. "Shirt"/
  // "Blazer" for Female, "Saree"/"Lehenga" for Male, "Trousers"/"Blazer" for Kids) —
  // fall back to the full list when no gender is selected yet.
  const availableTopTypes = useMemo(() => {
    if (!selection.gender) return TOP_TYPES;
    const allowed = CLOTHING_TYPES_BY_GENDER[selection.gender];
    const filtered = TOP_TYPES.filter((t) => allowed.includes(t));
    return filtered.length > 0 ? filtered : TOP_TYPES;
  }, [selection.gender]);
  const availableBottomTypes = useMemo(() => {
    if (!selection.gender) return BOTTOM_TYPES;
    const allowed = CLOTHING_TYPES_BY_GENDER[selection.gender];
    const filtered = BOTTOM_TYPES.filter((t) => allowed.includes(t));
    return filtered.length > 0 ? filtered : BOTTOM_TYPES;
  }, [selection.gender]);

  // If switching gender makes the current type pill invalid (e.g. was on "Shirt",
  // switched to Female), jump to the first type that gender actually has instead
  // of silently keeping a filter that matches nothing.
  useEffect(() => {
    if (!availableTopTypes.includes(topTypeFilter)) {
      setTopTypeFilter(availableTopTypes[0]);
      setTopProduct(null);
    }
    if (!availableBottomTypes.includes(bottomTypeFilter)) {
      setBottomTypeFilter(availableBottomTypes[0]);
      setBottomProduct(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTopTypes, availableBottomTypes]);

  // Live Preview only knows how to draw vector silhouettes for Shirt/T-Shirt/
  // Kurta/Blazer — a Saree or Lehenga's drape can't be approximated that way,
  // so route those straight to the real-photo "Try AI" path instead of
  // silently drawing a shirt-shaped outline over them.
  const liveUnsupported = topTypeFilter === 'Saree' || topTypeFilter === 'Lehenga';
  useEffect(() => {
    if (liveUnsupported && mode === 'live') {
      stopCamera();
      setMode('static');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveUnsupported]);

  // Excludes Saree/Lehenga catalog picks — those are handled by fullOutfitPhoto
  // below instead, so the two paths stay mutually exclusive rather than both
  // firing (which is exactly how the old broken split-top result happened).
  const topPhoto = topProduct && !isFullOutfitType(topProduct.type) ? productImages[topProduct.id] : undefined;
  const bottomPhoto = bottomProduct ? productImages[bottomProduct.id] : undefined;
  // A full outfit comes from the catalog (Saree/Lehenga product) — bypasses
  // the top/bottom slots entirely.
  const fullOutfitPhoto = topProduct && isFullOutfitType(topProduct.type) ? productImages[topProduct.id] : undefined;
  // Drives hiding the (irrelevant) Bottoms picker and simplifying the
  // "Your selection" preview to a single card when a one-piece outfit is active.
  const fullOutfitActive = Boolean(topProduct && isFullOutfitType(topProduct.type));

  useEffect(() => {
    setRealTryOn({ status: 'idle' });
  }, [topProduct, bottomProduct, lastUploadedSelfie]);

  // Mirrors whatever's currently on this tablet to the paired TV, if one is
  // linked. Best-effort and silent — a customer with no TV in their fitting
  // room, or a flaky connection, must never affect the tablet's own flow.
  useEffect(() => {
    if (!room) return;
    let cancelled = false;

    (async () => {
      if (realTryOn.status === 'done') {
        pushDisplayState(room, {
          phase: 'result',
          resultUrl: realTryOn.resultUrl,
          topName: topProduct?.name,
          bottomName: bottomProduct?.name,
        });
        return;
      }
      if (realTryOn.status === 'loading') {
        pushDisplayState(room, { phase: 'loading', step: realTryOn.step });
        return;
      }
      if (realTryOn.status === 'error') {
        pushDisplayState(room, { phase: 'error', error: realTryOn.error });
        return;
      }
      if (lastUploadedSelfie) {
        try {
          // The tablet's photo is a blob: URL, valid only in this tab — the TV
          // (a different device entirely) needs a data URL it can actually load.
          const dataUrl = await blobUrlToDataUrl(lastUploadedSelfie);
          if (!cancelled) pushDisplayState(room, { phase: 'selfie', selfieUrl: dataUrl });
        } catch {
          // conversion failing just means the TV keeps showing its last state
        }
        return;
      }
      pushDisplayState(room, { phase: 'idle' });
    })();

    return () => {
      cancelled = true;
    };
  }, [room, realTryOn, lastUploadedSelfie, topProduct, bottomProduct]);

  // Maps our ClothingType to Fashn.ai's explicit category parameter, which
  // tells the model exactly what body region to target — solving the "shirt
  // applied but jeans ignored" bug that happened with the old IDM-VTON model
  // (upper-body only, couldn't handle bottoms at all).
  function fashnCategory(type: string): 'tops' | 'bottoms' | 'one-pieces' | 'auto' {
    if (['Jeans', 'Trousers'].includes(type)) return 'bottoms';
    if (['Saree', 'Lehenga'].includes(type)) return 'one-pieces';
    return 'tops'; // Shirt, T-Shirt, Kurta, Blazer, Suit, and custom types
  }

  const handleRealTryOn = async () => {
    if (!lastUploadedSelfie || (!topPhoto && !bottomPhoto && !fullOutfitPhoto)) return;
    try {
      let currentPerson = await blobUrlToDataUrl(lastUploadedSelfie);

      if (fullOutfitPhoto) {
        // Saree/Lehenga: single-pass with "one-pieces" category so Fashn.ai
        // applies the full outfit in one generation (no top+bottom split).
        setRealTryOn({ status: 'loading', step: 'Generating full-outfit try-on via Fashn.ai...' });
        // Sent as a data URL, not the bare backend URL — Fashn.ai's servers
        // fetch garment URLs themselves, which fails whenever our backend
        // isn't on the public internet (localhost, a LAN IP during on-site
        // testing, etc). Embedding the bytes sidesteps that entirely, the
        // same way the customer's selfie already does a few lines up.
        currentPerson = await requestFashnTryOn(currentPerson, await blobUrlToDataUrl(fullOutfitPhoto), 'one-pieces');
      } else {
        if (topPhoto) {
          setRealTryOn({ status: 'loading', step: bottomPhoto ? 'Step 1 of 2: applying top...' : 'Generating try-on via Fashn.ai...' });
          currentPerson = await requestFashnTryOn(currentPerson, await blobUrlToDataUrl(topPhoto), fashnCategory(topProduct?.type ?? ''));
        }
        if (bottomPhoto) {
          setRealTryOn({ status: 'loading', step: topPhoto ? 'Step 2 of 2: applying bottom...' : 'Generating try-on via Fashn.ai...' });
          currentPerson = await requestFashnTryOn(currentPerson, await blobUrlToDataUrl(bottomPhoto), 'bottoms');
        }
      }

      setRealTryOn({ status: 'done', resultUrl: currentPerson });
      // Saved for the rest of the visit (see AppContext) so the customer can
      // come back and compare this against other garments they try, instead
      // of this result being gone the moment they generate the next one.
      addTriedLook(currentPerson, topProduct ?? undefined, bottomProduct ?? undefined);
    } catch (err) {
      setRealTryOn({ status: 'error', error: err instanceof Error ? err.message : 'Something went wrong.' });
    }
  };

  // Trial Room can optionally narrow by Occasion/Brand (via the filter panel
  // below), but never lets that silently hide everything — a Wedding occasion
  // hiding all Shirts with no obvious way to undo it here was a real bug. If the
  // narrowed query comes up empty, fall back to the unnarrowed list and say so.
  const topOptionsNarrowed = useMemo(
    () =>
      getProducts({
        occasion: selection.occasion,
        gender: selection.gender,
        types: [topTypeFilter],
        brands: selection.brands,
      }).slice(0, 8),
    [selection, topTypeFilter]
  );
  const topOptionsAll = useMemo(
    () => getProducts({ gender: selection.gender, types: [topTypeFilter] }).slice(0, 8),
    [selection.gender, topTypeFilter]
  );
  const topOptions = topOptionsNarrowed.length > 0 ? topOptionsNarrowed : topOptionsAll;
  const topOptionsWereNarrowedAway = topOptionsNarrowed.length === 0 && topOptionsAll.length > 0;

  const bottomOptionsNarrowed = useMemo(
    () =>
      getProducts({
        occasion: selection.occasion,
        gender: selection.gender,
        types: [bottomTypeFilter],
        brands: selection.brands,
      }).slice(0, 8),
    [selection, bottomTypeFilter]
  );
  const bottomOptionsAll = useMemo(
    () => getProducts({ gender: selection.gender, types: [bottomTypeFilter] }).slice(0, 8),
    [selection.gender, bottomTypeFilter]
  );
  const bottomOptions = bottomOptionsNarrowed.length > 0 ? bottomOptionsNarrowed : bottomOptionsAll;
  const bottomOptionsWereNarrowedAway = bottomOptionsNarrowed.length === 0 && bottomOptionsAll.length > 0;

  const processSelfie = (url: string, sizeSeed: number, source: 'upload' | 'live-capture') => {
    setLastUploadedSelfie(url);
    setSelfieSource(source);
    setAnalyzing(true);
    setBodyShape(null);
    setEstimatedSize(null);
    topBox.reset();
    bottomBox.reset();
    // A fresh selfie means a new customer (or the same one retaking their
    // photo) — either way, past try-on results were generated against a
    // photo that's no longer current, so don't carry them forward. This is
    // also what keeps one customer's try-ons from bleeding into the next
    // person's session on a shared tablet.
    clearTriedLooks();

    setTimeout(() => {
      setBodyShape(BODY_SHAPES[sizeSeed % BODY_SHAPES.length]);
      setEstimatedSize(['S', 'M', 'L', 'XL'][sizeSeed % 4]);
      setAnalyzing(false);
    }, 1200);
  };

  const handleUpload = (file: File) => {
    processSelfie(URL.createObjectURL(file), file.size, 'upload');
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  const startCamera = async () => {
    setCameraError(null);
    // Camera access requires a secure context (https://, or localhost) — on
    // http:// (e.g. testing over a local network IP from a phone) the browser
    // doesn't expose navigator.mediaDevices at all, which previously surfaced
    // as the same generic "check permissions" message as an actual denial.
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        window.location.protocol === 'https:'
          ? 'Camera access is not available in this browser.'
          : 'Camera access needs a secure connection (https://) — it won\'t work over plain http://, even on a local network. Use Upload Selfie instead, or access this page via https://.'
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      const message =
        name === 'NotAllowedError'
          ? 'Camera permission was denied. Check your browser\'s site settings (usually a camera icon in the address bar) and allow camera access for this site, then try again.'
          : name === 'NotFoundError'
            ? 'No camera was found on this device. Use Upload Selfie instead.'
            : name === 'NotReadableError'
              ? 'Your camera is already in use by another app or browser tab — close it and try again.'
              : name === 'OverconstrainedError'
                ? 'Your camera doesn\'t support the requested settings. Use Upload Selfie instead.'
                : `Could not access your camera${name ? ` (${name})` : ''}. Check browser permissions, or use Upload Selfie instead.`;
      setCameraError(message);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    stopCamera();
    processSelfie(dataUrl, dataUrl.length, 'upload');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Virtual Trial Room</h1>
      <p className="text-slate-500 mt-1">Upload a selfie or use your camera, then try outfits virtually — no changing rooms needed.</p>

      <div className="mt-5 border border-slate-200 rounded-2xl bg-white">
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
        >
          <span>
            🎯 Occasion, Style &amp; Brand
            <span className="text-slate-400 font-normal ml-2">
              {[selection.occasion, selection.gender, selection.brands.length > 0 ? `${selection.brands.length} brand(s)` : null]
                .filter(Boolean)
                .join(' · ') || 'Any — click to narrow down options'}
            </span>
          </span>
          <span className="text-slate-400">{filtersOpen ? '▲' : '▼'}</span>
        </button>
        {filtersOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Occasion</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setOccasion(null)}
                  className={`text-xs px-3 py-1 rounded-full border font-medium ${
                    !selection.occasion ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
                  }`}
                >
                  Any
                </button>
                {OCCASIONS.map((o) => (
                  <button
                    key={o}
                    onClick={() => setOccasion(o)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      selection.occasion === o ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Gender</p>
              <div className="flex gap-2 flex-wrap">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      selection.gender === g ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Brands</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={clearBrands}
                  title="No specific brand preference — includes local brands or anything not listed here"
                  className={`text-xs px-3 py-1 rounded-full border font-medium ${
                    selection.brands.length === 0 ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
                  }`}
                >
                  Any
                </button>
                {BRANDS.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => toggleBrand(b.name)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      selection.brands.includes(b.name) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              These narrow the color options below when there's a match — if a combination has nothing available, all
              options are shown instead rather than leaving you with an empty list.
            </p>
            <button
              onClick={() => setFiltersOpen(false)}
              className="w-full text-sm font-semibold bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700"
            >
              Apply &amp; Continue
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 border border-slate-200 rounded-2xl bg-white">
        <button
          onClick={() => setTvOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700"
        >
          <span>
            📺 TV Display
            <span className="text-slate-400 font-normal ml-2">
              {room ? `Linked to fitting room "${room}"` : 'Not linked — click to set up'}
            </span>
          </span>
          <span className="text-slate-400">{tvOpen ? '▲' : '▼'}</span>
        </button>
        {tvOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Give this fitting room a short code (e.g. "room-1"). Open that same code once on the TV's browser at{' '}
              <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700">/display/room-1</code> — from then
              on, whatever this tablet captures shows up full-screen on that TV.
            </p>
            <div className="flex gap-2">
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                placeholder="e.g. room-1"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <button
                onClick={() => setRoom(roomInput)}
                disabled={!roomInput}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                Save
              </button>
            </div>
            {room && (
              <a
                href={`/display/${encodeURIComponent(room)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-indigo-600 font-medium hover:underline"
              >
                Open TV view ↗ (for testing on this device)
              </a>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => !liveUnsupported && setMode('live')}
              disabled={liveUnsupported}
              title={liveUnsupported ? 'Live Preview can\'t draw a Saree/Lehenga drape yet — use Try AI for a real photo result.' : undefined}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium ${
                liveUnsupported
                  ? 'border border-slate-200 text-slate-300 cursor-not-allowed'
                  : mode === 'live'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-300 text-slate-600'
              }`}
            >
              🔴 Live Preview
            </button>
            <button
              onClick={() => {
                stopCamera();
                setMode('static');
              }}
              className={`flex-1 px-4 py-2 rounded-full text-sm font-medium ${
                mode === 'static' ? 'bg-indigo-600 text-white' : 'border border-slate-300 text-slate-600'
              }`}
            >
              ✨ Try AI
            </button>
          </div>
          {liveUnsupported && (
            <p className="text-[11px] text-amber-600 -mt-2 mb-4">
              Live Preview can only sketch Shirt/T-Shirt/Kurta/Blazer shapes — for a Saree or Lehenga, use{' '}
              <strong>✨ Try AI</strong> for a real photo result instead.
            </p>
          )}

          {mode === 'live' ? (
            <LiveTryOn
              topItem={topProduct ? { color: topProduct.colorHex, imageUrl: topPhoto, type: topProduct.type as OverlayTopType } : null}
              bottomItem={bottomProduct ? { color: bottomProduct.colorHex, imageUrl: bottomPhoto } : null}
              onCapture={(dataUrl) => {
                processSelfie(dataUrl, dataUrl.length, 'live-capture');
                setMode('static');
              }}
            />
          ) : (
            <>
          {lastUploadedSelfie && !cameraOpen && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              {selfieSource === 'live-capture' ? (
                <>
                  📷 This is a <strong>snapshot from Live Preview</strong> — your look is already baked into the
                  photo, no dragging needed. Click <strong>"🔴 Live Preview"</strong> above to keep browsing live.
                </>
              ) : (
                <>
                  📷 You're viewing a <strong>captured snapshot</strong>, not the live camera. Items here must be
                  dragged into place manually. Click <strong>"🔴 Live Preview"</strong> above to go back to the
                  automatic live view.
                </>
              )}
            </div>
          )}
          <div
            ref={photoFrameRef}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center"
          >
            {cameraOpen ? (
              <>
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover -scale-x-100" />
                <div className="absolute inset-6 border-2 border-dashed border-white/80 rounded-[40%/20%] pointer-events-none" />
                <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white bg-black/40 py-1">
                  Frame your full body within the guide for best results
                </p>
              </>
            ) : lastUploadedSelfie ? (
              <>
                <img src={lastUploadedSelfie} alt="Your selfie" className="w-full h-full object-cover pointer-events-none" />
                {selfieSource === 'upload' && topProduct && (
                  <TintBox
                    rect={topBox.rect}
                    color={topProduct.colorHex}
                    onMovePointerDown={topBox.onMoveHandlePointerDown}
                    onResizePointerDown={topBox.onResizeHandlePointerDown}
                  />
                )}
                {selfieSource === 'upload' && bottomProduct && (
                  <TintBox
                    rect={bottomBox.rect}
                    color={bottomProduct.colorHex}
                    onMovePointerDown={bottomBox.onMoveHandlePointerDown}
                    onResizePointerDown={bottomBox.onResizeHandlePointerDown}
                  />
                )}
                {analyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                    Analyzing body shape & size...
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <p className="text-slate-500 text-sm font-medium">Try AI on a photo of yourself</p>
                <div className="flex gap-3">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    Use Camera
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-4 py-2 rounded-full border border-indigo-300 text-indigo-700 text-sm font-medium hover:bg-indigo-50"
                  >
                    Upload Selfie
                  </button>
                </div>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {selfieSource === 'upload' && lastUploadedSelfie && !cameraOpen && (topProduct || bottomProduct) && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-500">Drag a color box onto your body; drag its corner dot to resize.</p>
              <button
                onClick={() => {
                  topBox.reset();
                  bottomBox.reset();
                }}
                className="text-xs text-indigo-600 font-medium hover:underline shrink-0 ml-2"
              >
                Reset Position
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />

          {cameraOpen ? (
            <div className="flex gap-3 mt-4">
              <button onClick={capturePhoto} className="flex-1 px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700">
                Capture Photo
              </button>
              <button onClick={stopCamera} className="px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">
                Cancel
              </button>
            </div>
          ) : lastUploadedSelfie ? (
            <div className="flex gap-3 mt-4">
              <button
                onClick={startCamera}
                className="flex-1 px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >
                Retake with Camera
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 px-5 py-2.5 rounded-full border border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50"
              >
                Upload a Different Selfie
              </button>
            </div>
          ) : null}

          {cameraError && <p className="text-xs text-rose-500 mt-2">{cameraError}</p>}

          {bodyShape && estimatedSize && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
              <p>✔ Detected body shape: <strong>{bodyShape}</strong></p>
              <p>✔ Estimated size: <strong>{estimatedSize}</strong></p>
            </div>
          )}
            </>
          )}

          {lastUploadedSelfie && !cameraOpen && (topPhoto || bottomPhoto || fullOutfitPhoto) && (
            <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50">
              <p className="text-sm font-semibold text-indigo-800 mb-1">✨ Real AI Try-On available</p>
              <p className="text-xs text-indigo-600 mb-3">
                {fullOutfitPhoto
                  ? 'Generate a photorealistic preview wearing this full outfit via Fashn.ai (~10-15s).'
                  : topPhoto && bottomPhoto
                    ? 'Generate a photorealistic preview wearing both items via Fashn.ai (2 steps, ~20-30s total).'
                    : 'Generate a photorealistic preview wearing this item via Fashn.ai (~10-15s).'}
              </p>
              <button
                onClick={handleRealTryOn}
                disabled={realTryOn.status === 'loading'}
                className="w-full px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {realTryOn.status === 'loading' ? realTryOn.step : 'Generate Real AI Try-On'}
              </button>
              {realTryOn.status === 'error' && <p className="text-xs text-rose-600 mt-2">{realTryOn.error}</p>}
            </div>
          )}

          {realTryOn.status === 'done' && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2 font-medium">AI Try-On Result:</p>
              <ZoomableImage src={realTryOn.resultUrl} alt="AI try-on result" />
            </div>
          )}

          {triedLooks.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-700">
                  👗 Your Try-Ons This Visit <span className="text-slate-400 font-normal">({triedLooks.length})</span>
                </p>
                <button onClick={clearTriedLooks} className="text-xs text-slate-400 font-medium hover:text-rose-600 hover:underline">
                  Clear All
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Saved for the rest of your visit — tap one to compare, then finalize whichever you like best.
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {triedLooks.map((look) => (
                  <div key={look.id} className="relative shrink-0 w-24">
                    <button
                      onClick={() => setViewingLookId(look.id)}
                      className="block w-24 h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img src={look.resultUrl} alt="Tried look" className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => removeTriedLook(look.id)}
                      aria-label="Remove this try-on"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white text-xs leading-none flex items-center justify-center hover:bg-rose-600"
                    >
                      ×
                    </button>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      {[look.topProduct?.name, look.bottomProduct?.name].filter(Boolean).join(' + ') || 'Look'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          {(topProduct || bottomProduct) && (
            <div className="mb-6 p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60">
              <p className="text-xs font-semibold text-indigo-700 mb-3">
                👀 Your selection — see the actual look before trying it on
              </p>
              {fullOutfitActive && (
                <p className="text-[11px] text-indigo-500 -mt-1 mb-3">
                  A full outfit is worn as one piece — no separate top/bottom needed.
                </p>
              )}
              <div className="flex gap-4">
                {fullOutfitActive
                  ? topProduct && <LookPreviewCard product={topProduct} productImages={productImages} />
                  : (
                    <>
                      {topProduct && <LookPreviewCard product={topProduct} productImages={productImages} />}
                      {bottomProduct && <LookPreviewCard product={bottomProduct} productImages={productImages} />}
                    </>
                  )}
              </div>
            </div>
          )}

          <h2 className="font-semibold text-slate-700 mb-2">Try Different Tops</h2>
          <div className="flex gap-2 flex-wrap mb-2">
            {availableTopTypes.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTopTypeFilter(t);
                  // switching the garment type should drop the old selection — otherwise
                  // a previously-picked Shirt silently keeps rendering under the Kurta filter
                  setTopProduct(null);
                }}
                className={`text-xs px-3 py-1 rounded-full border font-medium ${
                  topTypeFilter === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-3 flex-wrap mb-6">
            {topOptions.map((p) => (
              <ProductChip
                key={p.id}
                product={p}
                selected={topProduct?.id === p.id}
                photo={getReferencePhoto(p, productImages)}
                onClick={() => {
                  setTopProduct(p);
                  // A Saree/Lehenga is worn as a complete outfit — drop any
                  // separately-chosen bottom rather than leaving stale state
                  // that the Bottoms picker (hidden in this case) can't clear.
                  if (isFullOutfitType(p.type)) {
                    setBottomProduct(null);
                  }
                }}
              />
            ))}
            {topOptions.length === 0 && <p className="text-xs text-slate-400">No {topTypeFilter} options match your filters.</p>}
          </div>
          {topOptionsWereNarrowedAway && (
            <p className="text-[11px] text-amber-600 -mt-4 mb-4">
              No {topTypeFilter} matched your Occasion/Brand filters — showing all {topTypeFilter} colors instead.
            </p>
          )}

          {fullOutfitActive ? (
            <p className="text-xs text-slate-400 mb-6">
              {topProduct?.name ?? 'This'} is a full outfit worn as one piece — no separate bottom needed.
            </p>
          ) : (
            <>
              <h2 className="font-semibold text-slate-700 mb-2">Try Different Bottoms</h2>
              <div className="flex gap-2 flex-wrap mb-2">
                {availableBottomTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setBottomTypeFilter(t);
                      setBottomProduct(null);
                    }}
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      bottomTypeFilter === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 flex-wrap mb-6">
                {bottomOptions.map((p) => (
                  <ProductChip
                    key={p.id}
                    product={p}
                    selected={bottomProduct?.id === p.id}
                    photo={getReferencePhoto(p, productImages)}
                    onClick={() => setBottomProduct(p)}
                  />
                ))}
                {bottomOptions.length === 0 && <p className="text-xs text-slate-400">No {bottomTypeFilter} options match your filters.</p>}
              </div>
              {bottomOptionsWereNarrowedAway && (
                <p className="text-[11px] text-amber-600 -mt-4 mb-4">
                  No {bottomTypeFilter} matched your Occasion/Brand filters — showing all {bottomTypeFilter} colors instead.
                </p>
              )}
            </>
          )}

          {(topProduct || bottomProduct) && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <p className="font-medium text-slate-700 mb-2">Current combination:</p>
              {topProduct && <p className="text-slate-600">• {topProduct.name} — ₹{topProduct.price.toLocaleString('en-IN')}</p>}
              {bottomProduct && <p className="text-slate-600">• {bottomProduct.name} — ₹{bottomProduct.price.toLocaleString('en-IN')}</p>}
              <button
                onClick={() => {
                  if (topProduct) addToCart(topProduct, topProduct.sizes[1], 1);
                  if (bottomProduct) addToCart(bottomProduct, bottomProduct.sizes[1], 1);
                }}
                className="mt-3 px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
              >
                Add Combination to Cart
              </button>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-4">
            Note: this is a simulated try-on preview (a draggable color overlay), not photo-realistic garment
            fitting — drag the colored boxes onto your photo to line them up with your actual shirt/pants area.
          </p>
        </div>
      </div>

      {viewingLookId && (() => {
        const look = triedLooks.find((l) => l.id === viewingLookId);
        if (!look) return null;
        const label = [look.topProduct?.name, look.bottomProduct?.name].filter(Boolean).join(' + ') || 'Look';
        const totalPrice = (look.topProduct?.price ?? 0) + (look.bottomProduct?.price ?? 0);
        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4"
            onClick={() => setViewingLookId(null)}
          >
            <div className="max-w-lg w-full bg-white rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <button
                  onClick={() => setViewingLookId(null)}
                  aria-label="Close"
                  className="text-slate-400 hover:text-slate-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <ZoomableImage src={look.resultUrl} alt={label} />
              <div className="flex items-center justify-between mt-4">
                {totalPrice > 0 && <p className="text-sm font-semibold text-indigo-700">₹{totalPrice.toLocaleString('en-IN')}</p>}
                <button
                  onClick={() => {
                    if (look.topProduct) addToCart(look.topProduct, look.topProduct.sizes[1], 1);
                    if (look.bottomProduct) addToCart(look.bottomProduct, look.bottomProduct.sizes[1], 1);
                    setViewingLookId(null);
                  }}
                  className="px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                >
                  Finalize This Look — Add to Cart
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
