from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.modelos.modelos import UbigeoDepartment, UbigeoProvince, UbigeoDistrict
from app.esquemas.esquemas import UbigeoDepartmentOut, UbigeoProvinceOut, UbigeoDistrictOut

router = APIRouter(prefix="/ubigeo", tags=["ubigeo"])


@router.get("/departamentos", response_model=list[UbigeoDepartmentOut])
def listar_departamentos(db: Session = Depends(get_db)):
    return db.query(UbigeoDepartment).order_by(UbigeoDepartment.name.asc()).all()


@router.get("/provincias", response_model=list[UbigeoProvinceOut])
def listar_provincias(
    department_id: str = Query(..., min_length=2, max_length=2),
    db: Session = Depends(get_db),
):
    return (
        db.query(UbigeoProvince)
        .filter(UbigeoProvince.department_id == department_id)
        .order_by(UbigeoProvince.name.asc())
        .all()
    )


@router.get("/distritos", response_model=list[UbigeoDistrictOut])
def listar_distritos(
    province_id: str = Query(..., min_length=4, max_length=4),
    db: Session = Depends(get_db),
):
    # OJO: tu tabla permite NULL, así que filtramos por provincia_id
    return (
        db.query(UbigeoDistrict)
        .filter(UbigeoDistrict.province_id == province_id)
        .order_by(UbigeoDistrict.name.asc().nullslast())
        .all()
    )
