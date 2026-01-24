import csv
import logging
import urllib.request
import urllib.error
from io import StringIO
from pathlib import Path
from typing import Iterable, Mapping

from sqlalchemy import create_engine, text

from app.core.config import settings
from app.db.conexion import normalize_db_url

logger = logging.getLogger(__name__)

DATA_FILE_NAME = "Lista_Ubigeos_INEI.csv"
LOCAL_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / DATA_FILE_NAME
REMOTE_URL = "https://raw.githubusercontent.com/pe-datos/ubigeo/master/ubigeo.csv"


def _normalize_db_url() -> str:
    return normalize_db_url(settings.DATABASE_URL)


def _create_tables(conn):
    statements = [
        """
        CREATE TABLE IF NOT EXISTS ubigeo_peru_departments (
            id VARCHAR(2) PRIMARY KEY,
            name VARCHAR(80) NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ubigeo_peru_provinces (
            id VARCHAR(4) PRIMARY KEY,
            department_id VARCHAR(2) NOT NULL REFERENCES ubigeo_peru_departments(id),
            name VARCHAR(80) NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS ubigeo_peru_districts (
            id VARCHAR(6) PRIMARY KEY,
            province_id VARCHAR(4) REFERENCES ubigeo_peru_provinces(id),
            department_id VARCHAR(2) REFERENCES ubigeo_peru_departments(id),
            name VARCHAR(80)
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_ubigeo_provinces_department ON ubigeo_peru_provinces (department_id)",
        "CREATE INDEX IF NOT EXISTS idx_ubigeo_districts_province ON ubigeo_peru_districts (province_id)",
    ]

    for sql in statements:
        conn.execute(text(sql))


def _maybe_load_source_text() -> str:
    if LOCAL_DATA_PATH.exists():
        logger.info("Loading ubigeo data from local file %s", LOCAL_DATA_PATH)
        return LOCAL_DATA_PATH.read_text(encoding="utf-8", errors="ignore")

    logger.info("Downloading ubigeo data from %s", REMOTE_URL)
    try:
        with urllib.request.urlopen(REMOTE_URL, timeout=60) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as exc:
        logger.warning("Failed to download ubigeo data (%s). Will skip import.", exc)
        return ""
    except urllib.error.URLError as exc:
        logger.warning("Failed to download ubigeo data (%s). Will skip import.", exc)
        return ""


def _extract_code(row: Mapping[str, str]) -> str | None:
    for key in ("ubigeo", "codigo", "codigo_ubigeo", "cod_ubigeo", "ID", "id"):
        value = row.get(key) or row.get(key.upper())
        if value:
            cleaned = "".join(ch for ch in value if ch.isdigit())
            if cleaned:
                return cleaned.zfill(6)[:6]
    return None


def _extract_name(row: Mapping[str, str], *candidates: str) -> str | None:
    for key in candidates:
        value = row.get(key) or row.get(key.upper())
        if value:
            cleaned = value.strip()
            if cleaned:
                return cleaned
    return None


def _parse_rows(text: str):
    lines = text.splitlines()
    if not lines:
        return []

    delimiter = ";" if ";" in lines[0] and lines[0].count(";") >= lines[0].count(",") else ","
    reader = csv.DictReader(StringIO("\n".join(lines)), delimiter=delimiter)
    parsed = []
    for row in reader:
        parsed.append({k.strip(): (v or "").strip() for k, v in row.items()})
    return parsed


def _gather_ubigeo(parsed: Iterable[Mapping[str, str]]):
    departments: dict[str, str] = {}
    provinces: dict[str, tuple[str, str]] = {}
    districts: dict[str, tuple[str, str, str | None]] = {}

    for row in parsed:
        code = _extract_code(row)
        if not code or len(code) < 2:
            continue

        dept_id = code[:2]
        prov_id = code[:4] if len(code) >= 4 else code[:2] + "00"
        dist_id = code[:6] if len(code) >= 6 else code.ljust(6, "0")

        dept_name = _extract_name(
            row,
            "departamento",
            "departamento_nombre",
            "department",
            "DEPTO",
            "DEPARTAMENTO",
        )
        prov_name = _extract_name(
            row,
            "provincia",
            "provincia_nombre",
            "province",
            "PROVINCIA",
        )
        dist_name = _extract_name(
            row,
            "distrito",
            "distrito_nombre",
            "district",
            "distrito_nombre",
        )

        if dept_name:
            departments[dept_id] = dept_name

        if prov_name:
            provinces[prov_id] = (prov_name, dept_id)

        districts[dist_id] = (dist_name or "", prov_id, dept_id)

    return departments, provinces, districts


def _insert_data(conn, departments, provinces, districts):
    insert_dept = text(
        """
        INSERT INTO ubigeo_peru_departments (id, name)
        VALUES (:id, :name)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        """
    )
    insert_prov = text(
        """
        INSERT INTO ubigeo_peru_provinces (id, department_id, name)
        VALUES (:id, :department_id, :name)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, department_id = EXCLUDED.department_id
        """
    )
    insert_dist = text(
        """
        INSERT INTO ubigeo_peru_districts (id, province_id, department_id, name)
        VALUES (:id, :province_id, :department_id, :name)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            province_id = EXCLUDED.province_id,
            department_id = EXCLUDED.department_id
        """
    )

    dept_count = 0
    for dept_id, name in departments.items():
        if not dept_id or not name:
            continue
        conn.execute(insert_dept, {"id": dept_id, "name": name})
        dept_count += 1

    prov_count = 0
    for prov_id, (name, dept_id) in provinces.items():
        if not prov_id or not name or not dept_id:
            continue
        conn.execute(insert_prov, {"id": prov_id, "department_id": dept_id, "name": name})
        prov_count += 1

    dist_count = 0
    for dist_id, (name, prov_id, dept_id) in districts.items():
        if not dist_id or not (prov_id or dept_id):
            continue
        conn.execute(
            insert_dist,
            {
                "id": dist_id,
                "province_id": prov_id,
                "department_id": dept_id,
                "name": name or None,
            },
        )
        dist_count += 1

    logger.info("Ubigeo data applied: departments=%d, provinces=%d, districts=%d", dept_count, prov_count, dist_count)


def bootstrap_ubigeo() -> None:
    db_url = _normalize_db_url()
    engine = create_engine(db_url, future=True, pool_pre_ping=True)

    with engine.begin() as conn:
        _create_tables(conn)
        existing = conn.scalar(text("SELECT COUNT(1) FROM ubigeo_peru_departments"))
        if existing and existing > 0:
            logger.info("Ubigeo already seeded (%d departments)", existing)
            return

    content = _maybe_load_source_text()
    parsed = _parse_rows(content)
    departments, provinces, districts = _gather_ubigeo(parsed)

    if not (departments or provinces or districts):
        logger.warning("No ubigeo data found to insert")
        return

    with engine.begin() as conn:
        _insert_data(conn, departments, provinces, districts)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        bootstrap_ubigeo()
    except Exception as exc:  # pragma: no cover
        logger.exception("Error bootstrapping ubigeo", exc_info=exc)
        raise
