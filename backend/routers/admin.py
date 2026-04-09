from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from typing import Optional
from health import health as health_store

import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Schemas (admin-only) ──────────────────────────────────────────────────────

class AdminUserUpdate(BaseModel):
    email: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@router.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: int,
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    current_admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    # Prevent admin from demoting themselves
    if user.id == current_admin.id and data.is_admin is False:
        raise HTTPException(400, "Cannot remove your own admin access")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    current_admin: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_admin.id:
        raise HTTPException(400, "Cannot delete your own account via admin panel")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()


# ── Alert regions overview ────────────────────────────────────────────────────

@router.get("/alert-regions")
def list_all_alert_regions(
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    regions = db.query(models.AlertRegion).order_by(models.AlertRegion.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "name": r.name,
            "is_active": r.is_active,
            "min_earthquake_magnitude": float(r.min_earthquake_magnitude),
            "include_volcanoes": r.include_volcanoes,
            "min_volcano_alert_level": r.min_volcano_alert_level,
            "created_at": r.created_at.isoformat(),
        }
        for r in regions
    ]


# ── Sent alerts overview ──────────────────────────────────────────────────────

@router.get("/sent-alerts")
def list_sent_alerts(
    limit: int = 100,
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    alerts = (
        db.query(models.SentAlert)
        .order_by(models.SentAlert.notified_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "alert_region_id": a.alert_region_id,
            "event_type": a.event_type,
            "event_id": a.event_id,
            "event_magnitude": float(a.event_magnitude) if a.event_magnitude else None,
            "event_location": a.event_location,
            "notified_at": a.notified_at.isoformat(),
            "channels_used": a.channels_used,
        }
        for a in alerts
    ]


# ── Settings ──────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=List[schemas.SettingOut])
def get_settings(
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    return db.query(models.Setting).all()


@router.patch("/settings/{key}", response_model=schemas.SettingOut)
def update_setting(
    key: str,
    data: schemas.SettingUpdate,
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    if not setting:
        raise HTTPException(404, f"Setting '{key}' not found")
    setting.value = data.value
    db.commit()
    db.refresh(setting)
    return setting


# ── Email settings + test ─────────────────────────────────────────────────────

class SmtpSettingsUpdate(BaseModel):
    smtp_provider:    str = "smtp"
    smtp_host:        str = ""
    smtp_port:        str = "587"
    smtp_user:        str = ""
    smtp_password:    str = ""
    smtp_from:        str = ""
    smtp_use_tls:     str = "true"
    gmail_address:    str = ""
    gmail_app_password: str = ""


@router.patch("/settings/smtp")
def update_smtp_settings(
    data: SmtpSettingsUpdate,
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    for key, value in data.model_dump().items():
        setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(models.Setting(key=key, value=value))
    db.commit()
    return {"message": "Email settings saved"}

from health import health as health_store

@router.get("/health")
def get_system_health(
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """System health dashboard data."""
    from sqlalchemy import func
    from datetime import datetime, timedelta

    h = health_store.get()

    # Add DB stats
    now = datetime.utcnow()
    h['db'] = {
        'total_users':        db.query(func.count(models.User.id)).scalar(),
        'total_regions':      db.query(func.count(models.AlertRegion.id)).scalar(),
        'total_alerts_sent':  db.query(func.count(models.SentAlert.id)).scalar(),
        'alerts_last_24h':    db.query(func.count(models.SentAlert.id)).filter(
            models.SentAlert.notified_at >= now - timedelta(hours=24)
        ).scalar(),
        'alerts_last_7d':     db.query(func.count(models.SentAlert.id)).filter(
            models.SentAlert.notified_at >= now - timedelta(days=7)
        ).scalar(),
    }

    return h

@router.get("/health")
def get_system_health(
    _: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db),
):
    """System health dashboard."""
    from health import health as health_store
    from sqlalchemy import func
    from datetime import datetime, timedelta

    h = dict(health_store.get())
    now = datetime.utcnow()

    h['db'] = {
        'total_users':       db.query(func.count(models.User.id)).scalar(),
        'total_regions':     db.query(func.count(models.AlertRegion.id)).scalar(),
        'total_alerts_sent': db.query(func.count(models.SentAlert.id)).scalar(),
        'alerts_last_24h':   db.query(func.count(models.SentAlert.id)).filter(
            models.SentAlert.notified_at >= now - timedelta(hours=24)
        ).scalar(),
        'alerts_last_7d':    db.query(func.count(models.SentAlert.id)).filter(
            models.SentAlert.notified_at >= now - timedelta(days=7)
        ).scalar(),
    }
    return h
