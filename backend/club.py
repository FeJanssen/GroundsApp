"""Vereins-Registrierung, -Login und -Verwaltung (Plätze, Stripe Connect)."""
import logging
import os
import uuid

import stripe
from dotenv import load_dotenv

from db import get_supabase

load_dotenv()
log = logging.getLogger("club")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
APP_URL = os.getenv("APP_URL", "http://localhost:8082")


def _sb():
    sb = get_supabase()
    if sb is None:
        raise RuntimeError("Supabase nicht verfügbar")
    return sb


def _clean(v):
    return None if v in (None, "NULL", "") else v


def _club_out(v: dict) -> dict:
    return {
        "id": v["id"],
        "name": v["name"],
        "email": _clean(v.get("email")),
        "city": _clean(v.get("city")),
        "phone": _clean(v.get("phone")),
        "stripe_account_id": _clean(v.get("stripe_account_id")),
    }


# ---------- Auth ----------

def register(name: str, email: str, password: str, city: str | None, phone: str | None) -> dict:
    sb = _sb()
    existing = sb.table("verein").select("id").eq("email", email).execute().data
    if existing:
        raise ValueError("Es existiert bereits ein Verein mit dieser E-Mail")
    row = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "vereinspasswort": password,
        "city": city,
        "phone": phone,
    }
    res = sb.table("verein").insert(row).execute()
    return _club_out(res.data[0])


def login(email: str, password: str) -> dict:
    sb = _sb()
    rows = sb.table("verein").select("*").eq("email", email).execute().data
    if not rows or rows[0].get("vereinspasswort") != password:
        raise ValueError("E-Mail oder Passwort falsch")
    return _club_out(rows[0])


def get_club(club_id: str) -> dict:
    sb = _sb()
    rows = sb.table("verein").select("*").eq("id", club_id).execute().data
    if not rows:
        raise ValueError("Verein nicht gefunden")
    return _club_out(rows[0])


# ---------- Plätze ----------

def get_courts(club_id: str) -> list[dict]:
    sb = _sb()
    courts = sb.table("platz").select("*").eq("verein_id", club_id).execute().data
    out = []
    for c in courts:
        prices = sb.table("preis").select("preis").eq("platz_id", c["id"]).execute().data
        price = min((p["preis"] for p in prices if p.get("preis") is not None), default=0)
        out.append({
            "id": c["id"],
            "name": c["name"],
            "platztyp": _clean(c.get("platztyp")) or "",
            "buchbar_von": (c.get("buchbar_von") or "07:00")[:5],
            "buchbar_bis": (c.get("buchbar_bis") or "22:00")[:5],
            "price": price,
        })
    return out


def add_court(club_id: str, name: str, platztyp: str, price: float,
              von: str = "07:00", bis: str = "22:00") -> dict:
    sb = _sb()
    platz_id = str(uuid.uuid4())
    sb.table("platz").insert({
        "id": platz_id,
        "name": name,
        "platztyp": platztyp,
        "verein_id": club_id,
        "buchbar_von": f"{von}:00+00",
        "buchbar_bis": f"{bis}:00+00",
        "booking_60min": True,
    }).execute()
    # Preis für alle Rollen anlegen (Marktplatz nutzt min. Preis)
    rollen = sb.table("rolle").select("id").execute().data
    for r in rollen or []:
        sb.table("preis").insert({
            "id": str(uuid.uuid4()),
            "platz_id": platz_id,
            "rolle_id": r["id"],
            "preis": price,
            "abrechnungsmodell": "stunde",
            "is_free": price == 0,
        }).execute()
    return {"id": platz_id, "name": name, "platztyp": platztyp,
            "buchbar_von": von, "buchbar_bis": bis, "price": price}


def delete_court(club_id: str, platz_id: str) -> bool:
    sb = _sb()
    sb.table("preis").delete().eq("platz_id", platz_id).execute()
    res = sb.table("platz").delete().eq("id", platz_id).eq("verein_id", club_id).execute()
    return bool(res.data)


# ---------- Stripe Connect Onboarding ----------

def stripe_onboarding(club_id: str) -> dict:
    sb = _sb()
    club = sb.table("verein").select("*").eq("id", club_id).execute().data[0]
    account_id = _clean(club.get("stripe_account_id"))
    if not account_id:
        account = stripe.Account.create(
            email=_clean(club.get("email")),
            country="DE",
            controller={
                "losses": {"payments": "application"},
                "fees": {"payer": "application"},
                "stripe_dashboard": {"type": "express"},
            },
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            # Vorbefüllen, damit der Verein diese Schritte nicht sieht
            business_type="individual",
            business_profile={
                "mcc": "7941",  # Sportvereine & -anlagen
                "name": club.get("name"),
                "product_description": "Platzbuchungen über den JKB Grounds Marktplatz",
                "url": "https://jkb-grounds.com",
            },
        )
        account_id = account.id
        sb.table("verein").update({"stripe_account_id": account_id}).eq("id", club_id).execute()
    link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=f"{APP_URL}/club/manager?id={club_id}",
        return_url=f"{APP_URL}/club/manager?id={club_id}&stripe=done",
        type="account_onboarding",
    )
    return {"onboarding_url": link.url, "account_id": account_id}


def stripe_status(club_id: str) -> dict:
    sb = _sb()
    club = sb.table("verein").select("stripe_account_id").eq("id", club_id).execute().data[0]
    account_id = _clean(club.get("stripe_account_id"))
    if not account_id:
        return {"connected": False, "charges_enabled": False}
    try:
        acct = stripe.Account.retrieve(account_id)
        return {
            "connected": True,
            "charges_enabled": bool(acct.charges_enabled),
            "payouts_enabled": bool(acct.payouts_enabled),
            "account_id": account_id,
        }
    except Exception:  # noqa: BLE001
        return {"connected": True, "charges_enabled": False, "account_id": account_id}
