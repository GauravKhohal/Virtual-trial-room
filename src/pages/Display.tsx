import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchDisplayState, type DisplayState } from '../ai/display';

const POLL_MS = 1500;

// Meant to run full-screen on a TV/kiosk browser, not to be navigated by a
// person — a customer never opens this, a store associate points the TV's
// browser at it once per fitting room and leaves it there.
export default function DisplayPage() {
  const { room = '' } = useParams();
  const [state, setState] = useState<DisplayState | null>(null);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const next = await fetchDisplayState(room);
        if (!cancelled) {
          setState(next);
          setConnectionError(false);
        }
      } catch {
        if (!cancelled) setConnectionError(true);
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    };
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [room]);

  const phase = state?.phase ?? 'idle';

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden select-none">
      {connectionError && (
        <p className="absolute top-4 inset-x-0 text-center text-xs text-rose-300">
          Lost connection to the server — retrying...
        </p>
      )}

      {phase === 'result' && state?.resultUrl ? (
        <>
          <img src={state.resultUrl} alt="Try-on result" className="max-h-screen max-w-full object-contain" />
          {(state.topName || state.bottomName) && (
            <div className="absolute bottom-8 inset-x-0 text-center">
              <p className="inline-block px-6 py-2 rounded-full bg-black/50 text-lg font-medium">
                {[state.topName, state.bottomName].filter(Boolean).join(' + ')}
              </p>
            </div>
          )}
        </>
      ) : phase === 'loading' ? (
        <>
          {state?.selfieUrl && (
            <img src={state.selfieUrl} alt="Your photo" className="max-h-screen max-w-full object-contain opacity-40" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-xl font-medium">{state?.step || 'Generating your look...'}</p>
          </div>
        </>
      ) : phase === 'selfie' && state?.selfieUrl ? (
        <img src={state.selfieUrl} alt="Your photo" className="max-h-screen max-w-full object-contain" />
      ) : phase === 'error' ? (
        <div className="text-center px-8">
          <p className="text-2xl font-semibold text-rose-300 mb-2">Something went wrong</p>
          <p className="text-slate-400">{state?.error || 'Please try again from the tablet.'}</p>
        </div>
      ) : (
        <div className="text-center px-8">
          <p className="text-3xl font-bold mb-3">✨ VirtualTrail</p>
          <p className="text-slate-400">Waiting for a customer to start in fitting room "{room}"...</p>
        </div>
      )}
    </div>
  );
}
