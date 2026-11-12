"""Freundschaftssystem (Tabelle: freundschaft).

Spalten: id (uuid), von_nutzer (uuid), an_nutzer (uuid),
         status ('offen' | 'angenommen'), erstellt_am (timestamptz)
"""
import uuid

from db import get_supabase


def _sb():
    sb = get_supabase()
    if sb is None:
        raise RuntimeError("Supabase nicht konfiguriert")
    return sb


def _user_out(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u["name"],
        "avatar_url": u.get("avatar_url"),
        "lieblingssport": u.get("lieblingssport"),
    }


def _load_users(sb, ids: list[str]) -> dict[str, dict]:
    if not ids:
        return {}
    res = sb.table("app_nutzer").select("id,name,avatar_url,lieblingssport").in_("id", list(set(ids))).execute()
    return {u["id"]: _user_out(u) for u in (res.data or [])}


def search_users(query: str, me: str) -> list[dict]:
    """Nutzer per Name/E-Mail suchen, mit Freundschaftsstatus aus meiner Sicht."""
    sb = _sb()
    q = (query or "").strip()
    if len(q) < 2:
        return []
    res = sb.table("app_nutzer").select("id,name,email,avatar_url,lieblingssport") \
        .or_(f"name.ilike.%{q}%,email.ilike.%{q}%").limit(20).execute()
    users = [u for u in (res.data or []) if u["id"] != me]
    rels = _my_relations(sb, me)
    out = []
    for u in users:
        rel = rels.get(u["id"])
        status = "keine"
        if rel:
            if rel["status"] == "angenommen":
                status = "freunde"
            elif rel["von_nutzer"] == me:
                status = "angefragt"
            else:
                status = "anfrage_erhalten"
        d = _user_out(u)
        d["freundschaft"] = status
        out.append(d)
    return out


def _my_relations(sb, me: str) -> dict[str, dict]:
    """Alle Freundschaftszeilen, in denen ich vorkomme → Map anderer Nutzer-ID -> Zeile."""
    res = sb.table("freundschaft").select("*") \
        .or_(f"von_nutzer.eq.{me},an_nutzer.eq.{me}").execute()
    out = {}
    for r in res.data or []:
        other = r["an_nutzer"] if r["von_nutzer"] == me else r["von_nutzer"]
        out[other] = r
    return out


def send_request(me: str, other: str) -> dict:
    sb = _sb()
    if me == other:
        raise ValueError("Du kannst dir selbst keine Anfrage senden")
    rels = _my_relations(sb, me)
    rel = rels.get(other)
    if rel:
        if rel["status"] == "angenommen":
            raise ValueError("Ihr seid bereits Freunde")
        if rel["von_nutzer"] == me:
            raise ValueError("Anfrage bereits gesendet")
        # Gegenseite hat schon angefragt → direkt annehmen
        sb.table("freundschaft").update({"status": "angenommen"}).eq("id", rel["id"]).execute()
        return {"status": "freunde"}
    sb.table("freundschaft").insert({
        "id": str(uuid.uuid4()),
        "von_nutzer": me,
        "an_nutzer": other,
        "status": "offen",
    }).execute()
    return {"status": "angefragt"}


def respond_request(me: str, other: str, accept: bool) -> dict:
    """Anfrage von `other` an mich annehmen oder ablehnen."""
    sb = _sb()
    res = sb.table("freundschaft").select("*") \
        .eq("von_nutzer", other).eq("an_nutzer", me).eq("status", "offen").execute()
    if not res.data:
        raise ValueError("Keine offene Anfrage gefunden")
    rel = res.data[0]
    if accept:
        sb.table("freundschaft").update({"status": "angenommen"}).eq("id", rel["id"]).execute()
        return {"status": "freunde"}
    sb.table("freundschaft").delete().eq("id", rel["id"]).execute()
    return {"status": "abgelehnt"}


def remove_friend(me: str, other: str) -> dict:
    """Freundschaft beenden oder eigene Anfrage zurückziehen."""
    sb = _sb()
    rels = _my_relations(sb, me)
    rel = rels.get(other)
    if not rel:
        raise ValueError("Keine Freundschaft gefunden")
    sb.table("freundschaft").delete().eq("id", rel["id"]).execute()
    return {"status": "entfernt"}


def list_friends(me: str) -> dict:
    """Freunde + eingehende & ausgehende Anfragen."""
    sb = _sb()
    rels = _my_relations(sb, me)
    friend_ids, incoming_ids, outgoing_ids = [], [], []
    for other, r in rels.items():
        if r["status"] == "angenommen":
            friend_ids.append(other)
        elif r["an_nutzer"] == me:
            incoming_ids.append(other)
        else:
            outgoing_ids.append(other)
    users = _load_users(sb, friend_ids + incoming_ids + outgoing_ids)
    return {
        "freunde": [users[i] for i in friend_ids if i in users],
        "anfragen": [users[i] for i in incoming_ids if i in users],
        "gesendet": [users[i] for i in outgoing_ids if i in users],
    }


def _bookings_by_user(sb) -> dict[str, set[str]]:
    """Map: app_nutzer_id -> Set von verein_ids, bei denen gebucht wurde."""
    res = sb.table("buchung").select("app_nutzer_id, platz(verein_id)") \
        .not_.is_("app_nutzer_id", "null").neq("status", "storniert").limit(1000).execute()
    out: dict[str, set[str]] = {}
    for b in res.data or []:
        uid = b.get("app_nutzer_id")
        vid = (b.get("platz") or {}).get("verein_id")
        if uid and vid:
            out.setdefault(uid, set()).add(vid)
    return out


def suggestions(me: str) -> list[dict]:
    """Nutzer vorschlagen, die bei denselben Vereinen gebucht haben wie ich."""
    sb = _sb()
    rels = _my_relations(sb, me)
    by_user = _bookings_by_user(sb)
    my_venues = by_user.get(me, set())

    # Kandidaten mit gemeinsamen Vereinen
    scored: list[tuple[int, str]] = []
    for uid, venues in by_user.items():
        if uid == me or uid in rels:
            continue
        overlap = len(my_venues & venues)
        if overlap > 0:
            scored.append((overlap, uid))
    scored.sort(reverse=True)
    ids = [uid for _, uid in scored[:10]]

    # Vereinsnamen für Begründung laden
    venue_names: dict[str, str] = {}
    shared_map: dict[str, list[str]] = {uid: sorted(my_venues & by_user[uid]) for uid in ids}
    all_vids = {v for vs in shared_map.values() for v in vs}
    if all_vids:
        vres = sb.table("verein").select("id,name").in_("id", list(all_vids)).execute()
        venue_names = {v["id"]: v["name"] for v in (vres.data or [])}

    users = _load_users(sb, ids)
    out = []
    for overlap, uid in scored[:10]:
        if uid not in users:
            continue
        d = users[uid]
        vids = shared_map.get(uid, [])
        d["grund"] = f"Bucht auch bei {venue_names.get(vids[0], 'deinem Verein')}" if vids else "Bucht bei deinem Verein"
        d["gemeinsame_vereine"] = overlap
        out.append(d)

    # Fallback: neue Nutzer, falls (noch) keine Überschneidungen existieren
    if not out:
        res = sb.table("app_nutzer").select("id,name,avatar_url,lieblingssport") \
            .neq("id", me).order("erstellt_am", desc=True).limit(10).execute()
        for u in res.data or []:
            if u["id"] in rels:
                continue
            d = _user_out(u)
            d["grund"] = "Neu bei JKB Grounds"
            d["gemeinsame_vereine"] = 0
            out.append(d)
        out = out[:6]
    return out


def public_profile(user_id: str, viewer: str | None = None) -> dict:
    """Öffentliches Profil inkl. Statistiken und Freundschaftsstatus."""
    sb = _sb()
    res = sb.table("app_nutzer").select("id,name,avatar_url,lieblingssport,erstellt_am").eq("id", user_id).execute()
    if not res.data:
        raise ValueError("Nutzer nicht gefunden")
    u = res.data[0]

    # Buchungen zählen
    bres = sb.table("buchung").select("id", count="exact") \
        .eq("app_nutzer_id", user_id).neq("status", "storniert").execute()
    bookings = bres.count or 0

    # Events zählen (Teilnahme über Namen)
    eres = sb.table("event_teilnehmer").select("id", count="exact").eq("name", u["name"]).execute()
    events = eres.count or 0

    # Freunde zählen
    fres = sb.table("freundschaft").select("id", count="exact") \
        .or_(f"von_nutzer.eq.{user_id},an_nutzer.eq.{user_id}").eq("status", "angenommen").execute()
    friends_n = fres.count or 0

    # Status aus Sicht des Betrachters
    status = "keine"
    if viewer and viewer != user_id:
        rel = _my_relations(sb, viewer).get(user_id)
        if rel:
            if rel["status"] == "angenommen":
                status = "freunde"
            elif rel["von_nutzer"] == viewer:
                status = "angefragt"
            else:
                status = "anfrage_erhalten"

    d = _user_out(u)
    d["erstellt_am"] = u.get("erstellt_am")
    d["stats"] = {"buchungen": bookings, "events": events, "freunde": friends_n}
    d["freundschaft"] = status
    return d
