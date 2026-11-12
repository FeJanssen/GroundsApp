"""App-Endnutzer: Registrierung, Login, Profil (Tabelle: app_nutzer)."""
import uuid

import bcrypt

from db import get_supabase


def _sb():
    sb = get_supabase()
    if sb is None:
        raise RuntimeError("Supabase nicht konfiguriert")
    return sb


def _out(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u["name"],
        "email": u["email"],
        "avatar_url": u.get("avatar_url"),
        "lieblingssport": u.get("lieblingssport"),
    }


def register(name: str, email: str, passwort: str) -> dict:
    sb = _sb()
    email = email.strip().lower()
    existing = sb.table("app_nutzer").select("id").eq("email", email).execute()
    if existing.data:
        raise ValueError("E-Mail ist bereits registriert")
    hashed = bcrypt.hashpw(passwort.encode(), bcrypt.gensalt()).decode()
    res = sb.table("app_nutzer").insert({
        "id": str(uuid.uuid4()),
        "name": name.strip(),
        "email": email,
        "passwort": hashed,
    }).execute()
    return _out(res.data[0])


def login(email: str, passwort: str) -> dict:
    sb = _sb()
    res = sb.table("app_nutzer").select("*").eq("email", email.strip().lower()).execute()
    if not res.data:
        raise ValueError("E-Mail oder Passwort falsch")
    u = res.data[0]
    if not bcrypt.checkpw(passwort.encode(), u["passwort"].encode()):
        raise ValueError("E-Mail oder Passwort falsch")
    return _out(u)


def get_user(user_id: str) -> dict | None:
    sb = _sb()
    res = sb.table("app_nutzer").select("*").eq("id", user_id).execute()
    return _out(res.data[0]) if res.data else None


def update_user(user_id: str, name: str | None = None,
                avatar_url: str | None = None,
                lieblingssport: str | None = None) -> dict:
    sb = _sb()
    patch = {}
    if name is not None:
        patch["name"] = name.strip()
    if avatar_url is not None:
        patch["avatar_url"] = avatar_url
    if lieblingssport is not None:
        patch["lieblingssport"] = lieblingssport
    if not patch:
        u = get_user(user_id)
        if u is None:
            raise ValueError("Nutzer nicht gefunden")
        return u
    res = sb.table("app_nutzer").update(patch).eq("id", user_id).execute()
    if not res.data:
        raise ValueError("Nutzer nicht gefunden")
    return _out(res.data[0])
