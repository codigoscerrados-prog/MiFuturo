from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

PERU_TZ = ZoneInfo("America/Lima")


def now_peru() -> datetime:
    return datetime.now(PERU_TZ)
