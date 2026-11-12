/**
 * API-Client für das FastAPI-Backend (mit Supabase-Anbindung).
 * Mappt die Backend-Felder (snake_case) auf die Frontend-Typen.
 */
import { Venue } from '../data/mock';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export type ApiSlot = {
  id: string;
  venue_id: string;
  platz_id?: string;
  platz_name?: string;
  date: string;
  time: string;
  duration_min: number;
  price: number;
  available: boolean;
};

export type ApiBooking = {
  id: string;
  venue_id: string | null;
  venue_name: string;
  date: string;
  time: string;
  duration_min: number;
  price: number;
  status: 'confirmed' | 'cancelled';
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  lieblingssport: string | null;
};

export type ClubAnalytics = {
  revenue_total: number;
  revenue_bookings: number;
  revenue_events: number;
  revenue_online: number;
  commission: number;
  revenue_net: number;
  bookings_total: number;
  bookings_cancelled: number;
  event_participants: number;
  by_court: { platz_id: string; name: string; revenue: number; count: number }[];
  by_month: { month: string; revenue: number; count: number }[];
  news: {
    type: 'buchung' | 'event';
    title: string;
    sub: string;
    date: string;
    time: string;
    price: number;
    cancelled: boolean;
  }[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

function mapVenue(v: any): Venue {
  return {
    id: v.id,
    name: v.name,
    category: v.category ?? 'tennis',
    city: v.city ?? '—',
    address: v.address ?? '',
    rating: v.rating ?? 4.5,
    reviews: v.reviews ?? 0,
    pricePerHour: v.price_per_hour ?? 20,
    image: v.image,
    description: v.description ?? '',
    amenities: v.amenities ?? [],
  };
}

export const api = {
  async getVenues(params?: { category?: string; city?: string; q?: string }): Promise<Venue[]> {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    const data = await request<any[]>(`/venues${qs ? `?${qs}` : ''}`);
    return data.map(mapVenue);
  },

  async getVenue(id: string): Promise<Venue> {
    return mapVenue(await request<any>(`/venues/${id}`));
  },

  getSlots(venueId: string, date: string): Promise<ApiSlot[]> {
    return request<ApiSlot[]>(`/venues/${venueId}/slots?date=${date}`);
  },

  createBooking(b: { platz_id: string; date: string; time: string; duration_min?: number; price?: number; nutzer_id?: string }) {
    return request<any>('/bookings', { method: 'POST', body: JSON.stringify(b) });
  },

  getBookings(userId?: string): Promise<ApiBooking[]> {
    return request<ApiBooking[]>(`/bookings${userId ? `?user_id=${userId}` : ''}`);
  },

  cancelBooking(id: string) {
    return request<any>(`/bookings/${id}`, { method: 'DELETE' });
  },

  /** Stripe Checkout starten (5% Plattform-Provision). */
  createCheckout(b: {
    venue_id: string;
    venue_name: string;
    platz_id: string;
    date: string;
    time: string;
    duration_min?: number;
    price: number;
    nutzer_id?: string;
  }): Promise<{ checkout_url: string; session_id: string }> {
    return request('/payments/checkout', { method: 'POST', body: JSON.stringify(b) });
  },

  /** Nach Stripe-Redirect: Zahlung prüfen + Buchung anlegen. */
  confirmPayment(sessionId: string): Promise<{ booking: any; already_booked: boolean }> {
    return request(`/payments/confirm?session_id=${encodeURIComponent(sessionId)}`);
  },

  // ---------- Vereins-Verwaltung ----------
  clubRegister(b: { name: string; email: string; password: string; city?: string; phone?: string }): Promise<Club> {
    return request('/club/register', { method: 'POST', body: JSON.stringify(b) });
  },
  clubLogin(b: { email: string; password: string }): Promise<Club> {
    return request('/club/login', { method: 'POST', body: JSON.stringify(b) });
  },
  getClub(id: string): Promise<Club> {
    return request(`/club/${id}`);
  },
  getCourts(clubId: string): Promise<Court[]> {
    return request(`/club/${clubId}/courts`);
  },
  addCourt(clubId: string, b: { name: string; platztyp?: string; price: number; buchbar_von?: string; buchbar_bis?: string }): Promise<Court> {
    return request(`/club/${clubId}/courts`, { method: 'POST', body: JSON.stringify(b) });
  },
  deleteCourt(clubId: string, platzId: string) {
    return request<any>(`/club/${clubId}/courts/${platzId}`, { method: 'DELETE' });
  },
  stripeOnboarding(clubId: string): Promise<{ onboarding_url: string; account_id: string }> {
    return request(`/club/${clubId}/stripe/onboarding`, { method: 'POST' });
  },
  stripeStatus(clubId: string): Promise<{ connected: boolean; charges_enabled: boolean; payouts_enabled?: boolean }> {
    return request(`/club/${clubId}/stripe/status`);
  },
  getClubAnalytics(clubId: string): Promise<ClubAnalytics> {
    return request(`/club/${clubId}/analytics`);
  },

  // ---------- Trainings / Events / Matches ----------
  getEvents(typ?: 'training' | 'event' | 'match', vereinId?: string): Promise<ApiEvent[]> {
    const qs = new URLSearchParams();
    if (typ) qs.set('typ', typ);
    if (vereinId) qs.set('verein_id', vereinId);
    const q = qs.toString();
    return request(`/events${q ? `?${q}` : ''}`);
  },
  getEvent(id: string): Promise<ApiEvent> {
    return request(`/events/${id}`);
  },
  createEvent(clubId: string, b: Partial<ApiEvent> & { titel: string; datum: string; uhrzeit_von: string }): Promise<ApiEvent> {
    return request(`/club/${clubId}/events`, { method: 'POST', body: JSON.stringify(b) });
  },
  deleteEvent(clubId: string, eventId: string) {
    return request<any>(`/club/${clubId}/events/${eventId}`, { method: 'DELETE' });
  },
  joinEvent(eventId: string, name: string): Promise<ApiEvent> {
    return request(`/events/${eventId}/join`, { method: 'POST', body: JSON.stringify({ name }) });
  },
  eventCheckout(eventId: string, name: string): Promise<{ checkout_url: string; session_id: string }> {
    return request(`/events/${eventId}/checkout`, { method: 'POST', body: JSON.stringify({ name }) });
  },
  leaveEvent(eventId: string, name: string): Promise<ApiEvent> {
    return request(`/events/${eventId}/leave`, { method: 'POST', body: JSON.stringify({ name }) });
  },

  // ---------- App-Nutzer (Auth & Profil) ----------
  authRegister(name: string, email: string, passwort: string): Promise<AppUser> {
    return request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, passwort }) });
  },
  authLogin(email: string, passwort: string): Promise<AppUser> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, passwort }) });
  },
  getUser(userId: string): Promise<AppUser> {
    return request(`/users/${userId}`);
  },
  updateUser(userId: string, patch: Partial<Pick<AppUser, 'name' | 'avatar_url' | 'lieblingssport'>>): Promise<AppUser> {
    return request(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  // ---------- Freunde ----------
  getFriends(userId: string): Promise<FriendsData> {
    return request(`/users/${userId}/friends`);
  },
  searchFriends(userId: string, q: string): Promise<FriendUser[]> {
    return request(`/users/${userId}/friends/search?q=${encodeURIComponent(q)}`);
  },
  sendFriendRequest(userId: string, otherId: string): Promise<{ status: string }> {
    return request('/friends/request', { method: 'POST', body: JSON.stringify({ user_id: userId, other_id: otherId }) });
  },
  acceptFriendRequest(userId: string, otherId: string): Promise<{ status: string }> {
    return request('/friends/accept', { method: 'POST', body: JSON.stringify({ user_id: userId, other_id: otherId }) });
  },
  declineFriendRequest(userId: string, otherId: string): Promise<{ status: string }> {
    return request('/friends/decline', { method: 'POST', body: JSON.stringify({ user_id: userId, other_id: otherId }) });
  },
  removeFriend(userId: string, otherId: string): Promise<{ status: string }> {
    return request('/friends/remove', { method: 'POST', body: JSON.stringify({ user_id: userId, other_id: otherId }) });
  },
  getFriendSuggestions(userId: string): Promise<FriendSuggestion[]> {
    return request(`/users/${userId}/friends/suggestions`);
  },
  getPublicProfile(userId: string, viewerId?: string): Promise<PublicProfile> {
    return request(`/users/${userId}/profile${viewerId ? `?viewer=${viewerId}` : ''}`);
  },

  // ---------- Benachrichtigungen & Suche ----------
  getNotifications(userId: string): Promise<AppNotification[]> {
    return request(`/users/${userId}/notifications`);
  },
  async searchVenues(params: { q?: string; near?: string; radius_km?: number }): Promise<(Venue & { distance_km: number | null })[]> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.near) qs.set('near', params.near);
    if (params.radius_km) qs.set('radius_km', String(params.radius_km));
    const data = await request<any[]>(`/search/venues?${qs.toString()}`);
    return data.map((v) => ({ ...mapVenue(v), distance_km: v.distance_km ?? null }));
  },
};

export type AppNotification = {
  type: 'friend_request' | 'booking' | 'event';
  icon: string;
  title: string;
  text: string;
  link: string;
  ts: string;
};

export type FriendSuggestion = FriendUser & {
  grund: string;
  gemeinsame_vereine: number;
};

export type PublicProfile = FriendUser & {
  erstellt_am?: string;
  stats: { buchungen: number; events: number; freunde: number };
  freundschaft: 'keine' | 'angefragt' | 'anfrage_erhalten' | 'freunde';
};

export type FriendUser = {
  id: string;
  name: string;
  avatar_url: string | null;
  lieblingssport: string | null;
  freundschaft?: 'keine' | 'angefragt' | 'anfrage_erhalten' | 'freunde';
};

export type FriendsData = {
  freunde: FriendUser[];
  anfragen: FriendUser[];
  gesendet: FriendUser[];
};

export type ApiEvent = {
  id: string;
  typ: 'training' | 'event' | 'match';
  titel: string;
  beschreibung: string;
  datum: string;
  uhrzeit_von: string;
  dauer_min: number;
  max_teilnehmer: number;
  preis: number;
  level: string;
  trainer: string;
  verein_id: string | null;
  verein_name: string;
  teilnehmer: string[];
};

export type Club = {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  phone: string | null;
  stripe_account_id: string | null;
};

export type Court = {
  id: string;
  name: string;
  platztyp: string;
  buchbar_von: string;
  buchbar_bis: string;
  price: number;
};
