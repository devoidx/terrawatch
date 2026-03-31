import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
import models, schemas, auth
from database import get_db

logger  = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router  = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
@limiter.limit("5/hour")
def register(request: Request, data: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    user = models.User(
        username=data.username,
        email=data.email,
        password_hash=auth.hash_password(data.password),
    )
    db.add(user)
    db.flush()
    prefs = models.NotificationPreference(user_id=user.id, email_enabled=True)
    db.add(prefs)
    db.commit()
    db.refresh(user)
    logger.info(f"New user registered: username='{user.username}' from IP={get_remote_address(request)}")
    return user


@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form.username).first()
    if not user or not auth.verify_password(form.password, user.password_hash):
        logger.warning(
            f"Failed login attempt for username='{form.username}' "
            f"from IP={get_remote_address(request)}"
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = auth.create_access_token({"sub": user.username})
    logger.info(f"Successful login: username='{user.username}' from IP={get_remote_address(request)}")
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user