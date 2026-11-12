"""Benachrichtigungen: kommende Buchungen, Freundschaftsanfragen, Events."""
from datetime import datetime, timedelta

from db import get_supabase


def _sb():
    sb = get_supabase()
    if sb is None:
        raise RuntimeError("Supabase nicht konfiguriert")
    return sb


def _fmt_delta(dt: datetime) -> str:
    now = datetime.now()
    delta = dt - now
    mins = int(delta.total_seconds() // 60)
    if mins < 0:
        return "jetzt"
    if mins < 60:
        return f"in {mins} Min."
    if mins < 48 * 60:
        hours = round(mins / 60)
        return f"in {hours} Std." if hours < 24 else "morgen"
    return f"am {dt.strftime('%d.%m.')}"


def get_notifications(user_id: str) -> list[dict]:
    sb = _sb()
    out: list[dict] = []
    now = datetime.now()

    # Nutzername laden (für Event-Teilnahmen)
    ures = sb.table("app_nutzer").select("name").eq("id", user_id).execute()
    my_name = ures.data[0]["name"] if ures.data else None

    # 1) Offene Freundschaftsanfragen an mich
    fres = sb.table("freundschaft").select("von_nutzer, erstellt_am") \
        .eq("an_nutzer", user_id).eq("status", "offen").execute()
    if fres.data:
        sender_ids = [r["von_nutzer"] for r in fres.data]
        nres = sb.table("app_nutzer").select("id,name").in_("id", sender_ids).execute()
        names = {u["id"]: u["name"] for u in (nres.data or [])}
        for r in fres.data:
            out.append({
                "type": "friend_request",
                "icon": "person-add",
                "title": "Neue Freundschaftsanfrage",
                "text": f"{names.get(r['von_nutzer'], 'Jemand')} möchte dein Freund sein",
                "link": "/friends",
                "ts": r.get("erstellt_am") or now.isoformat(),
            })

    # 2) Kommende Buchungen (nächste 7 Tage)
    bres = sb.table("buchung").select("datum, uhrzeit_von, platz(name, verein(name))") \
        .eq("app_nutzer_id", user_id).neq("status", "storniert") \
        .gte("datum", now.strftime("%Y-%m-%dT00:00:00+00:00")).limit(20).execute()
    for b in bres.data or []:
        try:
            d = (b.get("datum") or "")[:10]
            t = (b.get("uhrzeit_von") or "")[:5]
            dt = datetime.strptime(f"{d} {t}", "%Y-%m-%d %H:%M")
        except ValueError:
            continue
        if dt < now or dt > now + timedelta(days=7):
            continue
        platz = b.get("platz") or {}
        verein = (platz.get("verein") or {}).get("name") or platz.get("name") or "Platz"
        out.append({
            "type": "booking",
            "icon": "calendar",
            "title": f"Buchung {_fmt_delta(dt)}",
            "text": f"{verein} – {dt.strftime('%d.%m.')} um {t} Uhr",
            "link": "/(tabs)/bookings",
            "ts": dt.isoformat(),
        })

    # 3) Kommende Events, bei denen ich teilnehme
    if my_name:
        eres = sb.table("event_teilnehmer").select("event(id, titel, typ, datum, uhrzeit_von)") \
            .eq("name", my_name).limit(30).execute()
        for row in eres.data or []:
            ev = row.get("event") or {}
            try:
                dt = datetime.strptime(f"{ev.get('datum')} {ev.get('uhrzeit_von', '00:00')[:5]}", "%Y-%m-%d %H:%M")
            except (ValueError, TypeError):
                continue
            if dt < now or dt > now + timedelta(days=7):
                continue
            typ = {"training": "Training", "match": "Match"}.get(ev.get("typ"), "Event")
            out.append({
                "type": "event",
                "icon": "fitness",
                "title": f"{typ} {_fmt_delta(dt)}",
                "text": f"{ev.get('titel')} – {dt.strftime('%d.%m.')} um {ev.get('uhrzeit_von', '')[:5]} Uhr",
                "link": f"/training/{ev.get('id')}",
                "ts": dt.isoformat(),
            })

    # Anfragen zuerst, dann nach Zeitpunkt
    out.sort(key=lambda n: (n["type"] != "friend_request", n["ts"]))
    return out
