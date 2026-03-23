from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=schemas.UserOut)
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


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
