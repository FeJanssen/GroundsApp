import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { api, AppUser } from '../api/client';

const STORAGE_KEY = 'jkb_grounds_user';

type AppState = {
  user: AppUser | null;
  ready: boolean;
  signInEmail: (email: string, passwort: string) => Promise<AppUser>;
  registerEmail: (name: string, email: string, passwort: string) => Promise<AppUser>;
  updateProfile: (patch: Partial<Pick<AppUser, 'name' | 'avatar_url' | 'lieblingssport'>>) => Promise<AppUser>;
  signOut: () => void;
};

const Ctx = createContext<AppState>(null as any);

function persist(user: AppUser | null) {
  if (Platform.OS !== 'web') return;
  try {
    if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorieren
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

  // Session wiederherstellen (Web: localStorage)
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as AppUser;
          setUser(stored);
          // Frische Daten vom Server nachladen
          api.getUser(stored.id)
            .then((fresh) => { setUser(fresh); persist(fresh); })
            .catch(() => {});
        }
      } catch {
        // ignorieren
      }
    }
    setReady(true);
  }, []);

  const signInEmail = useCallback(async (email: string, passwort: string) => {
    const u = await api.authLogin(email, passwort);
    setUser(u);
    persist(u);
    return u;
  }, []);

  const registerEmail = useCallback(async (name: string, email: string, passwort: string) => {
    const u = await api.authRegister(name, email, passwort);
    setUser(u);
    persist(u);
    return u;
  }, []);

  const updateProfile = useCallback(async (patch: Partial<Pick<AppUser, 'name' | 'avatar_url' | 'lieblingssport'>>) => {
    if (!user) throw new Error('Nicht angemeldet');
    const u = await api.updateUser(user.id, patch);
    setUser(u);
    persist(u);
    return u;
  }, [user]);

  const signOut = useCallback(() => {
    setUser(null);
    persist(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, ready, signInEmail, registerEmail, updateProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
