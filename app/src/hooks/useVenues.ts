import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Venue } from '../data/mock';

/** Lädt die Vereine aus der echten API (Supabase). */
export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getVenues()
      .then((data) => {
        if (active) setVenues(data);
      })
      .catch((e) => active && setError(String(e?.message ?? e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { venues, loading, error };
}
