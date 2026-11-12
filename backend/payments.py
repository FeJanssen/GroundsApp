"""Stripe Connect Zahlungen – 5% Plattform-Provision pro Buchung."""
import os

import stripe
from dotenv import load_dotenv

import repo
from db import get_supabase

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
COMMISSION_RATE = float(os.getenv("STRIPE_COMMISSION_RATE", "0.05"))
APP_URL = os.getenv("APP_URL", "http://localhost:8082")


def get_stripe_account(venue_id: str) -> str | None:
    """Stripe-Connect-Account-ID eines Vereins laden."""
    sb = get_supabase()
    if sb is None:
        return None
    res = sb.table("verein").select("stripe_account_id").eq("id", venue_id).execute()
    if res.data:
        acct = res.data[0].get("stripe_account_id")
        if acct and acct != "NULL":
            return acct
    return None


def create_checkout(
    venue_id: str,
    venue_name: str,
    platz_id: str,
    date: str,
    time: str,
    duration_min: int,
    price: float,
    nutzer_id: str | None = None,
) -> dict:
    """Stripe Checkout Session (Destination Charge + 5% application fee)."""
    account = get_stripe_account(venue_id)
    if not account:
        raise ValueError("Verein hat kein Stripe-Konto hinterlegt")

    amount = int(round(price * 100))  # Cent
    fee = int(round(amount * COMMISSION_RATE))

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "quantity": 1,
            "price_data": {
                "currency": "eur",
                "unit_amount": amount,
                "product_data": {
                    "name": f"{venue_name} – {date} {time}",
                    "description": f"Platzbuchung {duration_min} Min.",
                },
            },
        }],
        payment_intent_data={
            "application_fee_amount": fee,
            "transfer_data": {"destination": account},
        },
        metadata={
            "platz_id": platz_id,
            "date": date,
            "time": time,
            "duration_min": str(duration_min),
            "price": str(price),
            "nutzer_id": nutzer_id or "",
            "venue_id": venue_id,
        },
        success_url=f"{APP_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{APP_URL}/venue/{venue_id}",
    )
    return {"checkout_url": session.url, "session_id": session.id}


def create_event_checkout(event: dict, name: str) -> dict:
    """Stripe Checkout für kostenpflichtige Trainings/Events/Matches."""
    account = get_stripe_account(event["verein_id"])
    if not account:
        raise ValueError("Verein hat kein Stripe-Konto hinterlegt")

    amount = int(round(float(event["preis"]) * 100))
    fee = int(round(amount * COMMISSION_RATE))

    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "quantity": 1,
            "price_data": {
                "currency": "eur",
                "unit_amount": amount,
                "product_data": {
                    "name": f"{event['titel']} – {event['datum']} {event['uhrzeit_von']}",
                    "description": f"{event['typ'].capitalize()} bei {event.get('verein_name', '')}",
                },
            },
        }],
        payment_intent_data={
            "application_fee_amount": fee,
            "transfer_data": {"destination": account},
        },
        metadata={
            "kind": "event",
            "event_id": event["id"],
            "name": name,
        },
        success_url=f"{APP_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{APP_URL}/training/{event['id']}",
    )
    return {"checkout_url": session.url, "session_id": session.id}


def confirm_checkout(session_id: str) -> dict:
    """Nach Redirect: Zahlung prüfen und Buchung in DB anlegen (idempotent)."""
    session = stripe.checkout.Session.retrieve(session_id)
    if session.payment_status != "paid":
        raise ValueError(f"Zahlung nicht abgeschlossen (Status: {session.payment_status})")

    md = session.metadata.to_dict() if session.metadata else {}

    # Event-Teilnahme (Training/Event/Match)
    if md.get("kind") == "event":
        import events as events_repo
        event = events_repo.join_event(md["event_id"], md["name"])
        return {"event": event, "already_booked": False}

    # Idempotenz: wurde diese Session schon verbucht?
    sb = get_supabase()
    if sb is not None:
        existing = (
            sb.table("buchung")
            .select("*")
            .eq("notizen", f"Stripe: {session_id}")
            .execute()
        )
        if existing.data:
            return {"booking": existing.data[0], "already_booked": True}

    booking = repo.create_booking(
        md["platz_id"], md["date"], md["time"],
        int(md.get("duration_min", 60)),
        md.get("nutzer_id") or None,
        float(md.get("price", 0)),
        note=f"Stripe: {session_id}",
    )
    return {"booking": booking, "already_booked": False}
