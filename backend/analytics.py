"""Analyse & Umsatz für den Vereins-Manager."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime

from db import get_supabase

COMMISSION_RATE = 0.05


def _sb():
    sb = get_supabase()
    if sb is None:
        raise RuntimeError("Supabase nicht konfiguriert")
    return sb


def get_analytics(verein_id: str) -> dict:
    sb = _sb()

    # Plätze des Vereins
    plaetze = sb.table("platz").select("id, name").eq("verein_id", verein_id).execute().data
    platz_ids = [p["id"] for p in plaetze]
    platz_name = {p["id"]: p["name"] for p in plaetze}

    # Buchungen (über die App entstanden)
    buchungen = []
    if platz_ids:
        buchungen = (
            sb.table("buchung")
            .select("id, platz_id, datum, uhrzeit_von, preis, status, notizen")
            .in_("platz_id", platz_ids)
            .or_("notizen.like.Stripe:%,notizen.like.Buchung über JKB Grounds%")
            .order("datum", desc=True)
            .limit(500)
            .execute()
            .data
        )

    # Events des Vereins inkl. Teilnehmer
    events = (
        sb.table("event")
        .select("id, typ, titel, datum, uhrzeit_von, preis, event_teilnehmer(name)")
        .eq("verein_id", verein_id)
        .order("datum", desc=True)
        .limit(200)
        .execute()
        .data
    )

    aktiv = [b for b in buchungen if b.get("status") != "storniert"]
    storniert_count = len(buchungen) - len(aktiv)

    # Umsatz Buchungen
    umsatz_buchungen = sum(float(b.get("preis") or 0) for b in aktiv)
    bezahlt_online = sum(
        float(b.get("preis") or 0) for b in aktiv
        if (b.get("notizen") or "").startswith("Stripe:")
    )

    # Umsatz Events (Preis × Teilnehmer)
    umsatz_events = 0.0
    event_teilnahmen = 0
    for e in events:
        tn = len(e.get("event_teilnehmer") or [])
        event_teilnahmen += tn
        umsatz_events += float(e.get("preis") or 0) * tn

    umsatz_gesamt = umsatz_buchungen + umsatz_events
    online_gesamt = bezahlt_online + umsatz_events  # Events laufen immer über Stripe
    provision = round(online_gesamt * COMMISSION_RATE, 2)

    # Pro Platz
    by_court_map: dict[str, dict] = defaultdict(lambda: {"revenue": 0.0, "count": 0})
    for b in aktiv:
        pid = b["platz_id"]
        by_court_map[pid]["revenue"] += float(b.get("preis") or 0)
        by_court_map[pid]["count"] += 1
    by_court = [
        {
            "platz_id": pid,
            "name": platz_name.get(pid, "Platz"),
            "revenue": round(v["revenue"], 2),
            "count": v["count"],
        }
        for pid, v in by_court_map.items()
    ]
    # Plätze ohne Buchungen auch zeigen
    for p in plaetze:
        if p["id"] not in by_court_map:
            by_court.append({"platz_id": p["id"], "name": p["name"], "revenue": 0.0, "count": 0})
    by_court.sort(key=lambda x: -x["revenue"])

    # Pro Monat (letzte 6)
    by_month_map: dict[str, dict] = defaultdict(lambda: {"revenue": 0.0, "count": 0})
    for b in aktiv:
        month = (b.get("datum") or "")[:7]
        if month:
            by_month_map[month]["revenue"] += float(b.get("preis") or 0)
            by_month_map[month]["count"] += 1
    for e in events:
        tn = len(e.get("event_teilnehmer") or [])
        if tn and e.get("datum"):
            month = e["datum"][:7]
            by_month_map[month]["revenue"] += float(e.get("preis") or 0) * tn
    by_month = [
        {"month": m, "revenue": round(v["revenue"], 2), "count": v["count"]}
        for m, v in sorted(by_month_map.items(), reverse=True)[:6]
    ]

    # Neuigkeiten-Feed: Buchungen + Event-Anmeldungen
    news: list[dict] = []
    for b in buchungen[:25]:
        online = (b.get("notizen") or "").startswith("Stripe:")
        news.append({
            "type": "buchung",
            "title": f"{platz_name.get(b['platz_id'], 'Platz')} gebucht",
            "sub": "Online bezahlt" if online else "Zahlung vor Ort",
            "date": (b.get("datum") or "")[:10],
            "time": (b.get("uhrzeit_von") or "")[:5],
            "price": float(b.get("preis") or 0),
            "cancelled": b.get("status") == "storniert",
        })
    for e in events:
        for t in (e.get("event_teilnehmer") or []):
            news.append({
                "type": "event",
                "title": f"{t['name']} → {e['titel']}",
                "sub": {"training": "Training", "match": "Match"}.get(e.get("typ"), "Event"),
                "date": (e.get("datum") or "")[:10],
                "time": (e.get("uhrzeit_von") or "")[:5],
                "price": float(e.get("preis") or 0),
                "cancelled": False,
            })
    news.sort(key=lambda n: (n["date"], n["time"]), reverse=True)

    return {
        "revenue_total": round(umsatz_gesamt, 2),
        "revenue_bookings": round(umsatz_buchungen, 2),
        "revenue_events": round(umsatz_events, 2),
        "revenue_online": round(online_gesamt, 2),
        "commission": provision,
        "revenue_net": round(umsatz_gesamt - provision, 2),
        "bookings_total": len(aktiv),
        "bookings_cancelled": storniert_count,
        "event_participants": event_teilnahmen,
        "by_court": by_court,
        "by_month": by_month,
        "news": news[:30],
    }
