import { useCallback, useState } from 'react';

// Persists which fitting-room code this tablet is linked to, so it doesn't
// need re-entering every time the app reloads.
const STORAGE_KEY = 'vtr_display_room';

export function useDisplayRoom() {
  const [room, setRoomState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const setRoom = useCallback((next: string) => {
    setRoomState(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable (private mode, etc.) — room just won't persist across reloads
    }
  }, []);

  return { room, setRoom };
}
