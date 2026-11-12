"""JKB Grounds – Marktplatz Backend (FastAPI).

Aktuell: Mock-/Testdaten im Speicher.
Später: Supabase-Anbindung über db.py (SUPABASE_URL / SUPABASE_KEY in .env).
"""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data import CATEGORIES
import repo

app = FastAPI(title="JKB Grounds API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: in Produktion einschränken
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Models ----------

class BookingCreate(BaseModel):
    venue_id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:mm
    duration_min: int
    user_id: str = "demo"


class Booking(BookingCreate):
    id: str
    venue_name: str
    price: float
    status: str = "confirmed"
    created_at: str


# In-Memory "DB" – wird später durch Supabase ersetzt
BOOKINGS: list[Booking] = []


# ---------- Routes ----------

@app.get("/")
def health():
    return {"status": "ok", "service": "jkb-grounds-api"}


@app.get("/categories")
def get_categories():
    return CATEGORIES


@app.get("/venues")
def get_venues(category: Optional[str] = None, city: Optional[str] = None, q: Optional[str] = None):
    result = repo.get_venues()
    if category:
        result = [v for v in result if v["category"] == category]
    if city:
        result = [v for v in result if v["city"].lower() == city.lower()]
    if q:
        result = [v for v in result if q.lower() in v["name"].lower()]
    return result


@app.get("/venues/{venue_id}")
def get_venue(venue_id: str):
    venue = repo.get_venue(venue_id)
    if not venue:
        raise HTTPException(404, "Venue nicht gefunden")
    return venue


@app.get("/search/venues")
def search_venues(q: str = "", near: str = "", radius_km: float = 25):
    import geo
    try:
        return geo.search_venues(q, near, radius_km)
    except Exception as e:
        raise HTTPException(500, f"Suche fehlgeschlagen: {e}")


@app.get("/venues/{venue_id}/slots")
def get_slots(venue_id: str, date: str):
    if not repo.get_venue(venue_id):
        raise HTTPException(404, "Venue nicht gefunden")
    return repo.get_slots(venue_id, date)


class SupabaseBookingCreate(BaseModel):
    platz_id: str
    date: str          # YYYY-MM-DD
    time: str          # HH:mm
    duration_min: int = 60
    price: float = 20
    nutzer_id: Optional[str] = None


@app.post("/bookings")
def create_booking(payload: SupabaseBookingCreate):
    try:
        return repo.create_booking(
            payload.platz_id, payload.date, payload.time,
            payload.duration_min, payload.nutzer_id, payload.price,
        )
    except Exception as e:
        raise HTTPException(500, f"Buchung fehlgeschlagen: {e}")


@app.get("/bookings")
def list_bookings(user_id: Optional[str] = None):
    return repo.get_bookings(user_id)


@app.delete("/bookings/{booking_id}")
def cancel_booking(booking_id: str):
    result = repo.cancel_booking(booking_id)
    if not result:
        raise HTTPException(404, "Buchung nicht gefunden")
    return result


# ---------- Zahlungen (Stripe Connect, 5% Provision) ----------

class CheckoutCreate(BaseModel):
    venue_id: str
    venue_name: str
    platz_id: str
    date: str
    time: str
    duration_min: int = 60
    price: float
    nutzer_id: Optional[str] = None


@app.post("/payments/checkout")
def payments_checkout(payload: CheckoutCreate):
    import payments
    try:
        return payments.create_checkout(
            payload.venue_id, payload.venue_name, payload.platz_id,
            payload.date, payload.time, payload.duration_min,
            payload.price, payload.nutzer_id,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Stripe-Fehler: {e}")


@app.get("/payments/confirm")
def payments_confirm(session_id: str):
    import payments
    try:
        return payments.confirm_checkout(session_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Bestätigung fehlgeschlagen: {e}")


# ---------- Vereins-Verwaltung ----------

class ClubRegister(BaseModel):
    name: str
    email: str
    password: str
    city: Optional[str] = None
    phone: Optional[str] = None


class ClubLogin(BaseModel):
    email: str
    password: str


class CourtCreate(BaseModel):
    name: str
    platztyp: str = ""
    price: float = 20
    buchbar_von: str = "07:00"
    buchbar_bis: str = "22:00"


@app.post("/club/register")
def club_register(payload: ClubRegister):
    import club
    try:
        return club.register(payload.name, payload.email, payload.password, payload.city, payload.phone)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/club/login")
def club_login(payload: ClubLogin):
    import club
    try:
        return club.login(payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(401, str(e))


@app.get("/club/{club_id}")
def club_get(club_id: str):
    import club
    try:
        return club.get_club(club_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@app.get("/club/{club_id}/courts")
def club_courts(club_id: str):
    import club
    return club.get_courts(club_id)


@app.post("/club/{club_id}/courts")
def club_add_court(club_id: str, payload: CourtCreate):
    import club
    return club.add_court(club_id, payload.name, payload.platztyp, payload.price,
                          payload.buchbar_von, payload.buchbar_bis)


@app.delete("/club/{club_id}/courts/{platz_id}")
def club_delete_court(club_id: str, platz_id: str):
    import club
    if not club.delete_court(club_id, platz_id):
        raise HTTPException(404, "Platz nicht gefunden")
    return {"ok": True}


@app.post("/club/{club_id}/stripe/onboarding")
def club_stripe_onboarding(club_id: str):
    import club
    try:
        return club.stripe_onboarding(club_id)
    except Exception as e:
        raise HTTPException(500, f"Stripe-Fehler: {e}")


@app.get("/club/{club_id}/stripe/status")
def club_stripe_status(club_id: str):
    import club
    return club.stripe_status(club_id)


@app.get("/club/{club_id}/analytics")
def club_analytics(club_id: str):
    import analytics
    try:
        return analytics.get_analytics(club_id)
    except Exception as e:
        raise HTTPException(500, f"Analyse-Fehler: {e}")


# ---------- App-Nutzer (Auth & Profil) ----------

class UserRegister(BaseModel):
    name: str
    email: str
    passwort: str


class UserLogin(BaseModel):
    email: str
    passwort: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    lieblingssport: Optional[str] = None


@app.post("/auth/register")
def auth_register(payload: UserRegister):
    import users
    try:
        return users.register(payload.name, payload.email, payload.passwort)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/auth/login")
def auth_login(payload: UserLogin):
    import users
    try:
        return users.login(payload.email, payload.passwort)
    except ValueError as e:
        raise HTTPException(401, str(e))


@app.get("/users/{user_id}")
def users_get(user_id: str):
    import users
    u = users.get_user(user_id)
    if u is None:
        raise HTTPException(404, "Nutzer nicht gefunden")
    return u


@app.patch("/users/{user_id}")
def users_update(user_id: str, payload: UserUpdate):
    import users
    try:
        return users.update_user(user_id, payload.name, payload.avatar_url, payload.lieblingssport)
    except ValueError as e:
        raise HTTPException(404, str(e))


# ---------- Freunde ----------

class FriendAction(BaseModel):
    user_id: str      # ich
    other_id: str     # der/die andere


@app.get("/users/{user_id}/friends")
def friends_list(user_id: str):
    import friends
    try:
        return friends.list_friends(user_id)
    except Exception as e:
        raise HTTPException(500, f"Freunde-Fehler: {e}")


@app.get("/users/{user_id}/friends/search")
def friends_search(user_id: str, q: str = ""):
    import friends
    try:
        return friends.search_users(q, user_id)
    except Exception as e:
        raise HTTPException(500, f"Suche fehlgeschlagen: {e}")


@app.get("/users/{user_id}/friends/suggestions")
def friends_suggestions(user_id: str):
    import friends
    try:
        return friends.suggestions(user_id)
    except Exception as e:
        raise HTTPException(500, f"Vorschläge fehlgeschlagen: {e}")


@app.get("/users/{user_id}/notifications")
def user_notifications(user_id: str):
    import notifications
    try:
        return notifications.get_notifications(user_id)
    except Exception as e:
        raise HTTPException(500, f"Benachrichtigungen fehlgeschlagen: {e}")


@app.get("/users/{user_id}/profile")
def users_public_profile(user_id: str, viewer: Optional[str] = None):
    import friends
    try:
        return friends.public_profile(user_id, viewer)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Profil-Fehler: {e}")


@app.post("/friends/request")
def friends_request(payload: FriendAction):
    import friends
    try:
        return friends.send_request(payload.user_id, payload.other_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/friends/accept")
def friends_accept(payload: FriendAction):
    import friends
    try:
        return friends.respond_request(payload.user_id, payload.other_id, True)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/friends/decline")
def friends_decline(payload: FriendAction):
    import friends
    try:
        return friends.respond_request(payload.user_id, payload.other_id, False)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/friends/remove")
def friends_remove(payload: FriendAction):
    import friends
    try:
        return friends.remove_friend(payload.user_id, payload.other_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ---------- Trainings / Events / Matches (Supabase) ----------

class EventCreate(BaseModel):
    typ: str = "training"  # training | event | match
    titel: str
    beschreibung: str = ""
    datum: str             # YYYY-MM-DD
    uhrzeit_von: str       # HH:mm
    dauer_min: int = 60
    max_teilnehmer: int = 8
    preis: float = 0
    level: str = ""
    trainer: str = ""


class EventJoin(BaseModel):
    name: str


@app.get("/events")
def events_list(typ: Optional[str] = None, verein_id: Optional[str] = None):
    import events
    return events.list_events(typ, verein_id)


@app.get("/events/{event_id}")
def events_get(event_id: str):
    import events
    e = events.get_event(event_id)
    if e is None:
        raise HTTPException(404, "Event nicht gefunden")
    return e


@app.post("/club/{club_id}/events")
def events_create(club_id: str, payload: EventCreate):
    import events
    return events.create_event(
        club_id, payload.typ, payload.titel, payload.datum, payload.uhrzeit_von,
        payload.dauer_min, payload.max_teilnehmer, payload.preis,
        payload.level, payload.trainer, payload.beschreibung,
    )


@app.delete("/club/{club_id}/events/{event_id}")
def events_delete(club_id: str, event_id: str):
    import events
    if not events.delete_event(club_id, event_id):
        raise HTTPException(404, "Event nicht gefunden")
    return {"ok": True}


@app.post("/events/{event_id}/join")
def events_join(event_id: str, payload: EventJoin):
    import events
    try:
        return events.join_event(event_id, payload.name)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/events/{event_id}/checkout")
def events_checkout(event_id: str, payload: EventJoin):
    """Stripe Checkout für kostenpflichtige Trainings/Events/Matches."""
    import events
    import payments
    event = events.get_event(event_id)
    if event is None:
        raise HTTPException(404, "Event nicht gefunden")
    if payload.name in event["teilnehmer"]:
        raise HTTPException(400, "Bereits angemeldet")
    if len(event["teilnehmer"]) >= event["max_teilnehmer"]:
        raise HTTPException(400, "Event ist bereits voll")
    if float(event["preis"]) <= 0:
        raise HTTPException(400, "Event ist kostenlos – direkt beitreten")
    try:
        return payments.create_event_checkout(event, payload.name)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Stripe-Fehler: {e}")


@app.post("/events/{event_id}/leave")
def events_leave(event_id: str, payload: EventJoin):
    import events
    try:
        return events.leave_event(event_id, payload.name)
    except ValueError as e:
        raise HTTPException(400, str(e))
