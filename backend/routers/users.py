from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=schemas.UserOut)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.get("/dashboard")
def get_dashboard(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Per-user dashboard stats."""
    from datetime import datetime, timedelta
    from sqlalchemy import func

    now     = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    day_ago  = now - timedelta(days=1)

    # Alert regions
    regions = db.query(models.AlertRegion).filter(
        models.AlertRegion.user_id == current_user.id
    ).all()
    active_regions  = [r for r in regions if r.is_active]

    # Sent alerts this week
    alerts_this_week = db.query(models.SentAlert).filter(
        models.SentAlert.user_id == current_user.id,
        models.SentAlert.notified_at >= week_ago,
    ).order_by(models.SentAlert.notified_at.desc()).all()

    # Alerts by day for sparkline (last 7 days)
    alerts_by_day = []
    for i in range(6, -1, -1):
        day_start = now - timedelta(days=i+1)
        day_end   = now - timedelta(days=i)
        count = db.query(func.count(models.SentAlert.id)).filter(
            models.SentAlert.user_id == current_user.id,
            models.SentAlert.notified_at >= day_start,
            models.SentAlert.notified_at < day_end,
        ).scalar()
        alerts_by_day.append({
            'date':  (now - timedelta(days=i)).strftime('%a'),
            'count': count,
        })

    # Alerts by region this week
    alerts_by_region = []
    for region in regions:
        count = db.query(func.count(models.SentAlert.id)).filter(
            models.SentAlert.user_id    == current_user.id,
            models.SentAlert.alert_region_id == region.id,
            models.SentAlert.notified_at >= week_ago,
        ).scalar()
        alerts_by_region.append({
            'region_id':   region.id,
            'region_name': region.name,
            'count':       count,
            'is_active':   region.is_active,
        })

    # Largest event this week
    largest = db.query(models.SentAlert).filter(
        models.SentAlert.user_id == current_user.id,
        models.SentAlert.notified_at >= week_ago,
        models.SentAlert.event_magnitude.isnot(None),
    ).order_by(models.SentAlert.event_magnitude.desc()).first()

    # Recent alerts (last 10)
    recent_alerts = db.query(models.SentAlert).filter(
        models.SentAlert.user_id == current_user.id,
    ).order_by(models.SentAlert.notified_at.desc()).limit(10).all()

    # Notification channels enabled
    prefs = current_user.notification_prefs
    channels = []
    if prefs:
        if prefs.email_enabled: channels.append('email')
        if prefs.sms_enabled:   channels.append('sms')
        if prefs.push_enabled:  channels.append('push')

    return {
        'user': {
            'username':   current_user.username,
            'email':      current_user.email,
            'member_since': current_user.created_at.isoformat(),
        },
        'regions': {
            'total':  len(regions),
            'active': len(active_regions),
        },
        'alerts': {
            'this_week':  len(alerts_this_week),
            'last_24h':   sum(1 for a in alerts_this_week if a.notified_at >= day_ago),
            'by_day':     alerts_by_day,
            'by_region':  alerts_by_region,
            'largest_event': {
                'magnitude': float(largest.event_magnitude) if largest else None,
                'location':  largest.event_location if largest else None,
                'time':      largest.notified_at.isoformat() if largest else None,
            },
        },
        'recent_alerts': [
            {
                'id':         a.id,
                'event_type': a.event_type,
                'magnitude':  float(a.event_magnitude) if a.event_magnitude else None,
                'location':   a.event_location,
                'time':       a.notified_at.isoformat(),
                'channels':   a.channels_used,
            }
            for a in recent_alerts
        ],
        'channels': channels,
    }

@router.patch("/me/email")
def update_email(
    data: schemas.EmailUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(models.User).filter(
        models.User.email == data.email,
        models.User.id != current_user.id
    ).first():
        raise HTTPException(400, "Email already in use")
    current_user.email = data.email
    db.commit()
    return {"message": "Email updated"}


@router.patch("/me/password")
def change_password(
    data: schemas.PasswordChange,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth.verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    current_user.password_hash = auth.hash_password(data.new_password)
    db.commit()
    return {"message": "Password updated"}


@router.get("/me/notifications", response_model=schemas.NotificationPrefsOut)
def get_notification_prefs(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.notification_prefs:
        raise HTTPException(404, "Notification preferences not found")
    return current_user.notification_prefs


@router.patch("/me/notifications", response_model=schemas.NotificationPrefsOut)
def update_notification_prefs(
    data: schemas.NotificationPrefsUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    prefs = current_user.notification_prefs
    if not prefs:
        prefs = models.NotificationPreference(user_id=current_user.id)
        db.add(prefs)

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(prefs, field, value)

    db.commit()
    db.refresh(prefs)
    return prefs
