from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/regions", response_model=List[schemas.AlertRegionOut])
def list_regions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.AlertRegion)
        .filter(models.AlertRegion.user_id == current_user.id)
        .order_by(models.AlertRegion.created_at.desc())
        .all()
    )


@router.post("/regions", response_model=schemas.AlertRegionOut, status_code=201)
def create_region(
    data: schemas.AlertRegionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if data.lat_min >= data.lat_max:
        raise HTTPException(400, "lat_min must be less than lat_max")
    if data.lng_min >= data.lng_max:
        raise HTTPException(400, "lng_min must be less than lng_max")
    if data.min_volcano_alert_level not in ["normal", "advisory", "watch", "warning"]:
        raise HTTPException(400, "Invalid volcano alert level")

    region = models.AlertRegion(user_id=current_user.id, **data.model_dump())
    db.add(region)
    db.commit()
    db.refresh(region)
    return region


@router.get("/regions/{region_id}", response_model=schemas.AlertRegionOut)
def get_region(
    region_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    region = _get_owned_region(region_id, current_user.id, db)
    return region


@router.patch("/regions/{region_id}", response_model=schemas.AlertRegionOut)
def update_region(
    region_id: int,
    data: schemas.AlertRegionUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    region = _get_owned_region(region_id, current_user.id, db)

    if data.min_volcano_alert_level and data.min_volcano_alert_level not in [
        "normal", "advisory", "watch", "warning"
    ]:
        raise HTTPException(400, "Invalid volcano alert level")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(region, field, value)

    db.commit()
    db.refresh(region)
    return region


@router.delete("/regions/{region_id}", status_code=204)
def delete_region(
    region_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    region = _get_owned_region(region_id, current_user.id, db)
    db.delete(region)
    db.commit()


@router.get("/history", response_model=List[schemas.SentAlertOut])
def alert_history(
    limit: int = 50,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.SentAlert)
        .filter(models.SentAlert.user_id == current_user.id)
        .order_by(models.SentAlert.notified_at.desc())
        .limit(limit)
        .all()
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_owned_region(region_id: int, user_id: int, db: Session) -> models.AlertRegion:
    region = db.query(models.AlertRegion).filter(
        models.AlertRegion.id == region_id,
        models.AlertRegion.user_id == user_id,
    ).first()
    if not region:
        raise HTTPException(404, "Alert region not found")
    return region
