"""Geocoding (Nominatim/OpenStreetMap) + Umkreissuche für Vereine."""
import logging
import math
import time as _time

import httpx

import repo

log = logging.getLogger("geo")

_CACHE: dict[str, tuple[float, float] | None] = {}
_LAST_REQ = 0.0


def geocode(query: str) -> tuple[float, float] | None:
    """Adresse/Ort -> (lat, lon). Gecacht, max. 1 Request/Sek. (Nominatim-Policy)."""
    global _LAST_REQ
    key = query.strip().lower()
    if not key:
        return None
    if key in _CACHE:
        return _CACHE[key]
    wait = 1.0 - (_time.time() - _LAST_REQ)
    if wait > 0:
        _time.sleep(wait)
    try:
        r = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "de,at,ch"},
            headers={"User-Agent": "jkb-grounds-app/1.0"},
            timeout=6,
        )
        _LAST_REQ = _time.time()
        data = r.json()
        coords = (float(data[0]["lat"]), float(data[0]["lon"])) if data else None
    except Exception as e:  # noqa: BLE001
        log.warning("Geocoding fehlgeschlagen für %s: %s", query, e)
        coords = None
    _CACHE[key] = coords
    return coords


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def search_venues(q: str = "", near: str = "", radius_km: float = 25) -> list[dict]:
    """Vereine nach Text und/oder Umkreis filtern. Ergebnis enthält distance_km."""
    venues = repo.get_venues()

    if q:
        ql = q.lower()
        venues = [v for v in venues if ql in v["name"].lower() or ql in (v.get("city") or "").lower()]

    if near:
        center = geocode(near)
        if center is None:
            # Ort nicht gefunden → Textfilter auf Stadt als Fallback
            nl = near.lower()
            return [dict(v, distance_km=None) for v in venues if nl in (v.get("city") or "").lower()]
        out = []
        for v in venues:
            addr = f"{v.get('address') or ''}, {v.get('city') or ''}".strip(", ")
            coords = geocode(addr) or geocode(v.get("city") or "")
            if coords is None:
                continue
            dist = haversine_km(center, coords)
            if dist <= radius_km:
                out.append(dict(v, distance_km=round(dist, 1)))
        out.sort(key=lambda x: x["distance_km"])
        return out

    return [dict(v, distance_km=None) for v in venues]
