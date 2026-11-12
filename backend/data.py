"""Testdaten für JKB Grounds – wird später durch Supabase ersetzt."""

CATEGORIES = [
    {"id": "tennis", "name": "Tennis", "icon": "tennisball"},
    {"id": "padel", "name": "Padel", "icon": "baseball"},
    {"id": "soccer", "name": "Fußball", "icon": "football"},
    {"id": "barber", "name": "Friseur", "icon": "cut"},
    {"id": "fitness", "name": "Fitness", "icon": "barbell"},
    {"id": "wellness", "name": "Wellness", "icon": "flower"},
]

VENUES = [
    {
        "id": "v1", "name": "JKB Tennis Center", "category": "tennis", "city": "Wien",
        "address": "Sportplatzweg 12, 1220 Wien", "rating": 4.8, "reviews": 214,
        "price_per_hour": 24,
        "image": "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800",
        "description": "6 Sandplätze & 2 Hallenplätze. Flutlicht, Umkleiden und Gastro direkt am Platz.",
        "amenities": ["Flutlicht", "Umkleide", "Duschen", "Parkplatz", "Leihausrüstung"],
    },
    {
        "id": "v2", "name": "Padel Club Donau", "category": "padel", "city": "Wien",
        "address": "Donauuferstraße 5, 1210 Wien", "rating": 4.9, "reviews": 341,
        "price_per_hour": 32,
        "image": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800",
        "description": "4 Panorama-Padelcourts (Indoor). Turniere, Trainings und freies Spiel.",
        "amenities": ["Indoor", "Klimatisiert", "Shop", "Bar", "Coaching"],
    },
    {
        "id": "v3", "name": "Grounds Barbershop", "category": "barber", "city": "Wien",
        "address": "Mariahilfer Straße 88, 1070 Wien", "rating": 4.7, "reviews": 128,
        "price_per_hour": 35,
        "image": "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800",
        "description": "Premium Cuts, Bartpflege & Styling. Online buchen, ohne Wartezeit.",
        "amenities": ["Bartpflege", "Haarschnitt", "Styling", "Getränke inkl."],
    },
    {
        "id": "v4", "name": "Arena Soccer Five", "category": "soccer", "city": "Graz",
        "address": "Messendorfer Str. 20, 8041 Graz", "rating": 4.6, "reviews": 97,
        "price_per_hour": 60,
        "image": "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800",
        "description": "3 Indoor-Kunstrasenplätze für 5 vs. 5. Ideal für Firmenevents.",
        "amenities": ["Indoor", "Kunstrasen", "Umkleide", "Bälle inklusive"],
    },
    {
        "id": "v5", "name": "Padel Point Linz", "category": "padel", "city": "Linz",
        "address": "Industriezeile 47, 4020 Linz", "rating": 4.5, "reviews": 76,
        "price_per_hour": 28,
        "image": "https://images.unsplash.com/photo-1612534847738-b3af9bc31f0c?w=800",
        "description": "2 Outdoor- und 2 Indoor-Courts. Anfängerkurse jeden Samstag.",
        "amenities": ["Indoor & Outdoor", "Kurse", "Leihschläger", "Parkplatz"],
    },
    {
        "id": "v6", "name": "City Tennis Graz", "category": "tennis", "city": "Graz",
        "address": "Stadionallee 3, 8010 Graz", "rating": 4.4, "reviews": 65,
        "price_per_hour": 20,
        "image": "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800",
        "description": "4 Sandplätze mitten in der Stadt – perfekt für die Feierabendrunde.",
        "amenities": ["Flutlicht", "Umkleide", "Vereinsheim"],
    },
]

_TIMES = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]


def generate_slots(venue_id: str, date: str) -> list[dict]:
    venue = next(v for v in VENUES if v["id"] == venue_id)
    duration = 45 if venue["category"] == "barber" else 60

    def h(s: str) -> int:
        return sum(ord(c) for c in s)

    return [
        {
            "id": f"{venue_id}-{date}-{t}",
            "venue_id": venue_id,
            "date": date,
            "time": t,
            "duration_min": duration,
            "price": venue["price_per_hour"],
            "available": (h(venue_id + date + t) + i) % 3 != 0,
        }
        for i, t in enumerate(_TIMES)
    ]


TRAININGS = [
    {
        "id": "t1", "period": "13. Okt – 17. Okt", "title": "Beginner – Einzeltraining",
        "description": "Individuelles Einzeltraining für Einsteiger. Grundschläge, Beinarbeit und Ballgefühl.",
        "level": "Beginner", "gender": "Gemischt", "date": "13.10.", "time": "17:00",
        "duration_min": 60, "max_participants": 6,
        "participants": [
            {"id": "p1", "name": "Lukas M.", "avatar": "https://i.pravatar.cc/100?img=12"},
            {"id": "p2", "name": "Sarah K.", "avatar": "https://i.pravatar.cc/100?img=47"},
            {"id": "p3", "name": "David H.", "avatar": "https://i.pravatar.cc/100?img=33"},
        ],
        "venue_id": "v1", "club": "JKB Tennis Center", "location": "Wien",
        "price": 45, "coach": "Coach Markus T.",
    },
    {
        "id": "t2", "period": "14. Okt – 14. Okt", "title": "Fortgeschritten – Gruppentraining",
        "description": "Intensives Gruppentraining. Matchsituationen, Taktik und Netzspiel.",
        "level": "Fortgeschritten", "gender": "Männlich", "date": "14.10.", "time": "19:00",
        "duration_min": 90, "max_participants": 8,
        "participants": [
            {"id": "p4", "name": "Felix W.", "avatar": "https://i.pravatar.cc/100?img=59"},
            {"id": "p5", "name": "Jonas R.", "avatar": "https://i.pravatar.cc/100?img=15"},
            {"id": "p6", "name": "Tim B.", "avatar": "https://i.pravatar.cc/100?img=18"},
            {"id": "p7", "name": "Paul S.", "avatar": "https://i.pravatar.cc/100?img=61"},
            {"id": "p8", "name": "Max L.", "avatar": "https://i.pravatar.cc/100?img=68"},
        ],
        "venue_id": "v2", "club": "Padel Club Donau", "location": "Wien",
        "price": 25, "coach": "Coach Elena P.",
    },
    {
        "id": "t3", "period": "15. Okt – 19. Okt", "title": "Beginner – Padelkurs",
        "description": "5-tägiger Padelkurs für Anfängerinnen. Regeln, Technik und erste Spiele.",
        "level": "Beginner", "gender": "Weiblich", "date": "15.10.", "time": "18:00",
        "duration_min": 75, "max_participants": 6,
        "participants": [
            {"id": "p9", "name": "Anna B.", "avatar": "https://i.pravatar.cc/100?img=25"},
            {"id": "p10", "name": "Lena S.", "avatar": "https://i.pravatar.cc/100?img=44"},
        ],
        "venue_id": "v5", "club": "Padel Point Linz", "location": "Linz",
        "price": 39, "coach": "Coach Nina H.",
    },
    {
        "id": "t4", "period": "16. Okt – 16. Okt", "title": "Kids – Tennistraining",
        "description": "Spielerisches Tennistraining für Kinder von 6–12 Jahren.",
        "level": "Kids", "gender": "Gemischt", "date": "16.10.", "time": "15:30",
        "duration_min": 60, "max_participants": 10,
        "participants": [
            {"id": "p11", "name": "Emil K.", "avatar": "https://i.pravatar.cc/100?img=8"},
            {"id": "p12", "name": "Mia F.", "avatar": "https://i.pravatar.cc/100?img=32"},
            {"id": "p13", "name": "Ben T.", "avatar": "https://i.pravatar.cc/100?img=52"},
            {"id": "p14", "name": "Lea W.", "avatar": "https://i.pravatar.cc/100?img=38"},
            {"id": "p15", "name": "Noah P.", "avatar": "https://i.pravatar.cc/100?img=64"},
            {"id": "p16", "name": "Ida M.", "avatar": "https://i.pravatar.cc/100?img=41"},
        ],
        "venue_id": "v6", "club": "City Tennis Graz", "location": "Graz",
        "price": 19, "coach": "Coach Stefan G.",
    },
]

EVENTS = [
    {"id": "e1", "title": "Padel Night Turnier", "date": "18.10.", "time": "19:00", "club": "Padel Club Donau", "location": "Wien", "price": 15, "participants": 18, "max_participants": 24},
    {"id": "e2", "title": "Herbst-Doppelturnier", "date": "20.10.", "time": "10:00", "club": "JKB Tennis Center", "location": "Wien", "price": 20, "participants": 12, "max_participants": 16},
    {"id": "e3", "title": "After-Work Mixed Open", "date": "22.10.", "time": "18:30", "club": "City Tennis Graz", "location": "Graz", "price": 10, "participants": 9, "max_participants": 20},
]

MATCHES = [
    {
        "id": "m1", "sport": "Padel", "level": "Mittel", "date": "13.10.", "time": "20:00",
        "club": "Padel Club Donau", "location": "Wien", "max_players": 4, "price_per_player": 8,
        "players": [
            {"id": "p1", "name": "Lukas M.", "avatar": "https://i.pravatar.cc/100?img=12"},
            {"id": "p4", "name": "Felix W.", "avatar": "https://i.pravatar.cc/100?img=59"},
            {"id": "p5", "name": "Jonas R.", "avatar": "https://i.pravatar.cc/100?img=15"},
        ],
    },
    {
        "id": "m2", "sport": "Tennis", "level": "Beginner", "date": "14.10.", "time": "17:00",
        "club": "JKB Tennis Center", "location": "Wien", "max_players": 2, "price_per_player": 12,
        "players": [{"id": "p2", "name": "Sarah K.", "avatar": "https://i.pravatar.cc/100?img=47"}],
    },
    {
        "id": "m3", "sport": "Padel", "level": "Fortgeschritten", "date": "15.10.", "time": "19:30",
        "club": "Padel Point Linz", "location": "Linz", "max_players": 4, "price_per_player": 7,
        "players": [
            {"id": "p9", "name": "Anna B.", "avatar": "https://i.pravatar.cc/100?img=25"},
            {"id": "p10", "name": "Lena S.", "avatar": "https://i.pravatar.cc/100?img=44"},
        ],
    },
]
