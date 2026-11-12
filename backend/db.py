"""Supabase-Anbindung (Vorbereitung).

Nutzung später in main.py:
    from db import get_supabase
    sb = get_supabase()
    sb.table("venues").select("*").execute()

Benötigt .env mit:
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_KEY=eyJ...
"""
import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@lru_cache
def get_supabase():
    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_KEY"]
    return create_client(url, key)
