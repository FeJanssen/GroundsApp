"""Trainings, Events & Matches (Tabelle: event + event_teilnehmer)."""
import logging
import uuid
from datetime import date as _date

from db import get_supabase

log = logging.getLogger("events")


def _sb():
    sb = get_supabase()
    if sb is None:
        raise RuntimeError("Supabase nicht verfügbar")
    return sb


def _out(e: dict) -> dict:
    verein = e.get("verein") or {}
    teilnehmer = [t["name"] for t in (e.get("event_teilnehmer") or [])]
    return {
        "id": e["id"],
        "typ": e["typ"],
        "titel": e["titel"],
        "beschreibung": e.get("beschreibung") or "",
        "datum": str(e.get("datum") or ""),
        "uhrzeit_von": (e.get("uhrzeit_von") or "")[:5],
        "dauer_min": e.get("dauer_min") or 60,
        "max_teilnehmer": e.get("max_teilnehmer") or 8,
        "preis": float(e.get("preis") or 0),
        "level": e.get("level") or "",
        "trainer": e.get("trainer") or "",
        "verein_id": e.get("verein_id"),
        "verein_name": verein.get("name") or "",
        "teilnehmer": teilnehmer,
    }


_SELECT = "*, verein(name), event_teilnehmer(name)"


def list_events(typ: str | None = None, verein_id: str | None = None) -> list[dict]:
    sb = _sb()
    q = sb.table("event").select(_SELECT).gte("datum", _date.today().isoformat())
    if typ:
        q = q.eq("typ", typ)
    if verein_id:
        q = q.eq("verein_id", verein_id)
    rows = q.order("datum").execute().data
    return [_out(e) for e in rows]


def get_event(event_id: str) -> dict | None:
    sb = _sb()
    rows = sb.table("event").select(_SELECT).eq("id", event_id).execute().data
    return _out(rows[0]) if rows else None


def create_event(verein_id: str, typ: str, titel: str, datum: str, uhrzeit_von: str,
                 dauer_min: int, max_teilnehmer: int, preis: float,
                 level: str = "", trainer: str = "", beschreibung: str = "") -> dict:
    sb = _sb()
    row = {
        "id": str(uuid.uuid4()),
        "verein_id": verein_id,
        "typ": typ,
        "titel": titel,
        "beschreibung": beschreibung,
        "datum": datum,
        "uhrzeit_von": uhrzeit_von,
        "dauer_min": dauer_min,
        "max_teilnehmer": max_teilnehmer,
        "preis": preis,
        "level": level,
        "trainer": trainer,
    }
    sb.table("event").insert(row).execute()
    return get_event(row["id"])


def delete_event(verein_id: str, event_id: str) -> bool:
    sb = _sb()
    res = sb.table("event").delete().eq("id", event_id).eq("verein_id", verein_id).execute()
    return bool(res.data)


def join_event(event_id: str, name: str) -> dict:
    sb = _sb()
    event = get_event(event_id)
    if event is None:
        raise ValueError("Event nicht gefunden")
    if name in event["teilnehmer"]:
        return event
    if len(event["teilnehmer"]) >= event["max_teilnehmer"]:
        raise ValueError("Event ist bereits voll")
    sb.table("event_teilnehmer").insert({
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "name": name,
    }).execute()
    return get_event(event_id)


def leave_event(event_id: str, name: str) -> dict:
    sb = _sb()
    sb.table("event_teilnehmer").delete().eq("event_id", event_id).eq("name", name).execute()
    event = get_event(event_id)
    if event is None:
        raise ValueError("Event nicht gefunden")
    return event
