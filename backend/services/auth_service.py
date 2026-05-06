import uuid
import json
from pathlib import Path
from datetime import datetime, timedelta

AUTH_FILE = Path(__file__).parent.parent / "data" / "auth.json"
_sessions: dict = {}


def _load_credentials() -> dict:
    if not AUTH_FILE.exists():
        return {}
    with open(AUTH_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def login(clan: str, password: str) -> str | None:
    creds = _load_credentials()
    if creds.get(clan) == password:
        token = str(uuid.uuid4())
        _sessions[token] = {
            "clan": clan,
            "expires": datetime.now() + timedelta(hours=8),
        }
        return token
    return None


def get_clan(token: str) -> str | None:
    session = _sessions.get(token)
    if not session:
        return None
    if datetime.now() > session["expires"]:
        del _sessions[token]
        return None
    return session["clan"]


def is_admin(clan: str) -> bool:
    return clan == "admin"
