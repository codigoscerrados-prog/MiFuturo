import csv
import json
import logging
from io import StringIO
from typing import Any

from fastapi import APIRouter, Body, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.modelos.modelos import UbigeoDepartment, UbigeoProvince, UbigeoDistrict

router = APIRouter(prefix="/admin/ubigeo", tags=["admin-ubigeo"])
logger = logging.getLogger(__name__)


def _to_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _map_type(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized in {"department", "departamento", "departamentos"}:
        return "departments"
    if normalized in {"province", "provincia", "provincias"}:
        return "provinces"
    if normalized in {"district", "distrito", "distritos"}:
        return "districts"
    if normalized in {"region", "región", "regiones"}:
        return "departments"
    return None


def _guess_type_from_id(value: str) -> str | None:
    length = len(value or "")
    if length == 2:
        return "departments"
    if length == 4:
        return "provinces"
    if length >= 6:
        return "districts"
    return None


def _collect_lists(raw: Any) -> dict[str, list[dict[str, Any]]]:
    result = {"departments": [], "provinces": [], "districts": []}
    if isinstance(raw, dict):
        for key, value in raw.items():
            target = _map_type(key)
            if isinstance(value, list) and target:
                for item in value:
                    if isinstance(item, dict):
                        normalized = {k.strip(): v for k, v in item.items()}
                        result[target].append(normalized)
    return result


def _parse_csv(text: str) -> dict[str, list[dict[str, Any]]]:
    reader = csv.DictReader(StringIO(text))
    result = {"departments": [], "provinces": [], "districts": []}
    for row in reader:
        normalized = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()}
        row_type = _map_type(normalized.get("type") or normalized.get("nivel") or normalized.get("level") or normalized.get("level_type"))
        target = row_type or _guess_type_from_id(_to_str(normalized.get("id")))
        if target and target in result:
            result[target].append(normalized)
    return result


async def _gather_payload(file: UploadFile | None, payload: Any) -> dict[str, list[dict[str, Any]]]:
    if file:
        content = await file.read()
        text = content.decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = _parse_csv(text)
    elif payload:
        parsed = payload
    else:
        parsed = {}

    return _collect_lists(parsed)


def _ensure_department_id(row: dict[str, Any], fallback: str | None = None) -> str:
    candidate = _to_str(row.get("department_id") or row.get("departamento_id"))
    if candidate:
        return candidate
    candidate = _to_str(row.get("province_id") or row.get("provincia_id"))
    if len(candidate) >= 2:
        return candidate[:2]
    if fallback:
        return fallback[:2]
    return ""


def _ensure_province_id(row: dict[str, Any], fallback: str | None = None) -> str:
    candidate = _to_str(row.get("province_id") or row.get("provincia_id"))
    if candidate:
        return candidate
    if fallback and len(fallback) >= 4:
        return fallback[:4]
    return ""


def _upsert_department(db: Session, row: dict[str, Any]) -> bool:
    dept_id = _to_str(row.get("id") or row.get("codigo") or row.get("department_id"))
    name = _to_str(row.get("name") or row.get("nombre"))
    if not dept_id or not name:
        return False
    obj = db.get(UbigeoDepartment, dept_id)
    if obj:
        obj.name = name
        return False
    db.add(UbigeoDepartment(id=dept_id, name=name))
    return True


def _upsert_province(db: Session, row: dict[str, Any]) -> bool:
    province_id = _to_str(row.get("id") or row.get("codigo"))
    name = _to_str(row.get("name") or row.get("nombre"))
    if not province_id or not name:
        return False
    dept_id = _ensure_department_id(row, province_id)
    if len(dept_id) != 2:
        return False
    obj = db.get(UbigeoProvince, province_id)
    if obj:
        obj.name = name
        obj.department_id = dept_id
        return False
    db.add(UbigeoProvince(id=province_id, name=name, department_id=dept_id))
    return True


def _upsert_district(db: Session, row: dict[str, Any]) -> bool:
    district_id = _to_str(row.get("id") or row.get("codigo"))
    if not district_id:
        return False
    name = _to_str(row.get("name") or row.get("nombre"))
    province_id = _ensure_province_id(row, district_id)
    department_id = _ensure_department_id(row, district_id)
    obj = db.get(UbigeoDistrict, district_id)
    if obj:
        if name:
            obj.name = name
        if province_id:
            obj.province_id = province_id
        if department_id:
            obj.department_id = department_id
        return False

    db.add(
        UbigeoDistrict(
            id=district_id,
            name=name or None,
            province_id=province_id or None,
            department_id=department_id or None,
        )
    )
    return True


@router.post("/import", dependencies=[Depends(require_role("admin"))])
async def importar_ubigeo(
    *,
    file: UploadFile | None = File(None),
    payload: Any = Body(None),
    replace: bool = Query(False, description="Si es true, reemplaza los registros actuales"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    data = await _gather_payload(file, payload)
    if not any(data.values()):
        raise HTTPException(400, "Se necesita data de ubigeo para importar")

    if replace:
        db.query(UbigeoDistrict).delete(synchronize_session=False)
        db.query(UbigeoProvince).delete(synchronize_session=False)
        db.query(UbigeoDepartment).delete(synchronize_session=False)
        db.commit()
        logger.info("Ubigeo total borrado antes de la importación")

    stats = {"departments": 0, "provinces": 0, "districts": 0}

    for row in data.get("departments", []):
        if _upsert_department(db, row):
            stats["departments"] += 1

    for row in data.get("provinces", []):
        if _upsert_province(db, row):
            stats["provinces"] += 1

    for row in data.get("districts", []):
        if _upsert_district(db, row):
            stats["districts"] += 1

    db.commit()
    logger.info(
        "Importación de ubigeo completada; departamentos=%d provincias=%d distritos=%d",
        stats["departments"],
        stats["provinces"],
        stats["districts"],
    )
    return {
        "imported": stats,
        "replace": replace,
    }
