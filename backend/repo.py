"""Repository-Layer: mappt die Supabase-Tabellen der bestehenden
JKB-Buchungsplattform (verein, platz, buchung, preis, nutzer)
auf die Marktplatz-API dieser App.

Fällt automatisch auf Mock-Daten (data.py) zurück, wenn Supabase
nicht erreichbar ist.
"""
from __future__ import annotations

import logging
from datetime import datetime, time

from db import get_supabase
from data import VENUES as MOCK_VENUES

log = logging.getLogger("repo")

_SLOT_TIMES = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00",
               "16:00", "17:00", "18:00", "19:00", "20:00"]

PLACEHOLDER_IMAGES = {
    "tennis": "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800",
    "padel": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800",
    "default": "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800",
}


def _sb():
    try:
        return get_supabase()
    except Exception as e:  # noqa: BLE001
        log.warning("Supabase nicht verfügbar: %s", e)
        return None


def _clean(v):
    """'NULL'-Strings der Alt-Plattform in None umwandeln."""
    return None if v in (None, "NULL", "") else v


# ---------- Vereine (venues) ----------

def map_verein(v: dict, plaetze_count: int = 0, min_preis: float | None = None) -> dict:
    city = _clean(v.get("city")) or "—"
    street = _clean(v.get("street")) or ""
    nr = _clean(v.get("house_number")) or ""
    return {
        "id": v["id"],
        "name": v["name"],
        "category": "tennis",  # Alt-Plattform hat keine Kategorie – Default
        "city": city,
        "address": f"{street} {nr}".strip() or city,
        "rating": 4.7,          # noch keine Bewertungen in der DB
        "reviews": 0,
        "price_per_hour": min_preis if min_preis is not None else 20,
        "image": PLACEHOLDER_IMAGES["default"],
        "description": f"{plaetze_count} buchbare Plätze bei {v['name']}.",
        "amenities": [],
        "source": "supabase",
    }


def get_venues() -> list[dict]:
    sb = _sb()
    if sb is None:
        return MOCK_VENUES
    try:
        vereine = sb.table("verein").select("*").execute().data
        plaetze = sb.table("platz").select("id, verein_id").execute().data
        preise = sb.table("preis").select("platz_id, preis, is_free").execute().data

        count_by_verein: dict[str, int] = {}
        platz_to_verein = {p["id"]: p["verein_id"] for p in plaetze}
        for p in plaetze:
            count_by_verein[p["verein_id"]] = count_by_verein.get(p["verein_id"], 0) + 1

        min_preis_by_verein: dict[str, float] = {}
        for pr in preise:
            vid = platz_to_verein.get(pr["platz_id"])
            if vid is None:
                continue
            val = 0.0 if pr.get("is_free") else float(pr.get("preis") or 0)
            cur = min_preis_by_verein.get(vid)
            if cur is None or val < cur:
                min_preis_by_verein[vid] = val

        return [
            map_verein(v, count_by_verein.get(v["id"], 0), min_preis_by_verein.get(v["id"]))
            for v in vereine
        ]
    except Exception as e:  # noqa: BLE001
        log.error("Supabase-Fehler (venues): %s – Fallback auf Mock", e)
        return MOCK_VENUES


def get_venue(venue_id: str) -> dict | None:
    for v in get_venues():
        if v["id"] == venue_id:
            return v
    return None


# ---------- Plätze & Slots ----------

def get_plaetze(verein_id: str) -> list[dict]:
    sb = _sb()
    if sb is None:
        return []
    try:
        return sb.table("platz").select("*").eq("verein_id", verein_id).execute().data
    except Exception as e:  # noqa: BLE001
        log.error("Supabase-Fehler (plaetze): %s", e)
        return []


def get_slots(venue_id: str, date: str) -> list[dict]:
    """Echte Slots: buchbar_von/bis des Platzes minus bestehende Buchungen."""
    sb = _sb()
    if sb is None:
        from data import generate_slots
        return generate_slots(venue_id, date)

    plaetze = get_plaetze(venue_id)
    if not plaetze:
        return []

    try:
        bookings = (
            sb.table("buchung")
            .select("platz_id, uhrzeit_von, status, datum")
            .gte("datum", f"{date}T00:00:00")
            .lte("datum", f"{date}T23:59:59")
            .neq("status", "storniert")
            .execute()
            .data
        )
    except Exception as e:  # noqa: BLE001
        log.error("Supabase-Fehler (buchungen): %s", e)
        bookings = []

    booked = {(b["platz_id"], (b["uhrzeit_von"] or "")[:5]) for b in bookings}

    # Echte Preise pro Platz laden (Gast-Preis bevorzugt, sonst höchster Preis)
    price_by_platz: dict[str, float] = {}
    try:
        platz_ids = [p["id"] for p in plaetze]
        gast_rollen = {
            r["id"] for r in sb.table("rolle").select("id, name").execute().data
            if (r.get("name") or "").lower() == "gast"
        }
        preise = (
            sb.table("preis").select("platz_id, preis, is_free, rolle_id")
            .in_("platz_id", platz_ids).execute().data
        )
        gast_price: dict[str, float] = {}
        max_price: dict[str, float] = {}
        for pr in preise:
            val = 0.0 if pr.get("is_free") else float(pr.get("preis") or 0)
            pid = pr["platz_id"]
            if pr.get("rolle_id") in gast_rollen:
                gast_price[pid] = val
            if pid not in max_price or val > max_price[pid]:
                max_price[pid] = val
        for pid in platz_ids:
            price_by_platz[pid] = gast_price.get(pid, max_price.get(pid, 20))
    except Exception as e:  # noqa: BLE001
        log.error("Supabase-Fehler (preise): %s", e)

    slots: list[dict] = []
    for platz in plaetze:
        von = (platz.get("buchbar_von") or "07:00:00")[:5]
        bis = (platz.get("buchbar_bis") or "22:00:00")[:5]
        for t in _SLOT_TIMES:
            if not (von <= t < bis):
                continue
            slots.append({
                "id": f"{platz['id']}-{date}-{t}",
                "venue_id": venue_id,
                "platz_id": platz["id"],
                "platz_name": platz.get("name") or "Platz",
                "date": date,
                "time": t,
                "duration_min": 60,
                "price": price_by_platz.get(platz["id"], 20),
                "available": (platz["id"], t) not in booked,
            })
    return slots


# ---------- Buchungen ----------

def create_booking(platz_id: str, date: str, time_str: str, duration_min: int,
                   nutzer_id: str | None, price: float,
                   note: str | None = None) -> dict:
    sb = _sb()
    if sb is None:
        raise RuntimeError("Supabase nicht verfügbar")
    h, m = map(int, time_str.split(":"))
    ende = time((h + duration_min // 60) % 24, (m + duration_min % 60) % 60)
    import uuid as _uuid
    payload = {
        "id": str(_uuid.uuid4()),
        "datum": f"{date}T00:00:00+00:00",
        "uhrzeit_von": f"{time_str}:00+00",
        "uhrzeit_bis": f"{ende.strftime('%H:%M')}:00+00",
        "preis": price,
        "platz_id": platz_id,
        "status": "gebucht",
        "buchungstyp": "public",
        "notizen": note or "Buchung über JKB Grounds Marktplatz-App",
    }
    if nutzer_id:
        payload["app_nutzer_id"] = nutzer_id
    res = sb.table("buchung").insert(payload).execute()
    return res.data[0]


def get_bookings(nutzer_id: str | None = None) -> list[dict]:
    sb = _sb()
    if sb is None:
        return []
    try:
        q = sb.table("buchung").select("*, platz(name, verein_id, verein(name))")
        if nutzer_id:
            q = q.eq("app_nutzer_id", nutzer_id)
        # Nur Buchungen, die über die Marktplatz-App entstanden sind
        q = q.or_("notizen.like.Stripe:%,notizen.like.Buchung über JKB Grounds%")
        rows = q.order("datum", desc=True).limit(50).execute().data
        out = []
        for b in rows:
            platz = b.get("platz") or {}
            verein = platz.get("verein") or {}
            out.append({
                "id": b["id"],
                "venue_id": platz.get("verein_id"),
                "venue_name": verein.get("name") or platz.get("name") or "Platz",
                "platz_name": platz.get("name") or "",
                "date": (b.get("datum") or "")[:10],
                "time": (b.get("uhrzeit_von") or "")[:5],
                "duration_min": 60,
                "price": b.get("preis") or 0,
                "status": "cancelled" if b.get("status") == "storniert" else "confirmed",
            })
        return out
    except Exception as e:  # noqa: BLE001
        log.error("Supabase-Fehler (get_bookings): %s", e)
        return []


def cancel_booking(booking_id: str) -> dict | None:
    sb = _sb()
    if sb is None:
        return None
    res = sb.table("buchung").update({"status": "storniert"}).eq("id", booking_id).execute()
    return res.data[0] if res.data else None
