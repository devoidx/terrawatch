from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class EmailUpdate(BaseModel):
    email: EmailStr


# ── Notification Preferences ─────────────────────────────────────────────────

class NotificationPrefsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    phone_number: Optional[str] = None
    push_subscription: Optional[dict] = None


class NotificationPrefsOut(BaseModel):
    email_enabled: bool
    sms_enabled: bool
    push_enabled: bool
    phone_number: Optional[str]
    push_subscription: Optional[dict]

    class Config:
        from_attributes = True


# ── Alert Regions ─────────────────────────────────────────────────────────────

VOLCANO_ALERT_LEVELS = ["normal", "advisory", "watch", "warning"]


class AlertRegionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    lat_min: float = Field(..., ge=-90, le=90)
    lat_max: float = Field(..., ge=-90, le=90)
    lng_min: float = Field(..., ge=-180, le=180)
    lng_max: float = Field(..., ge=-180, le=180)
    min_earthquake_magnitude: float = Field(4.0, ge=0.0, le=10.0)
    include_volcanoes: bool = True
    min_volcano_alert_level: str = "advisory"
    is_active: bool = True


class AlertRegionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    min_earthquake_magnitude: Optional[float] = Field(None, ge=0.0, le=10.0)
    include_volcanoes: Optional[bool] = None
    min_volcano_alert_level: Optional[str] = None
    is_active: Optional[bool] = None


class AlertRegionOut(BaseModel):
    id: int
    name: str
    lat_min: float
    lat_max: float
    lng_min: float
    lng_max: float
    min_earthquake_magnitude: float
    include_volcanoes: bool
    min_volcano_alert_level: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Sent Alerts ──────────────────────────────────────────────────────────────

class SentAlertOut(BaseModel):
    id: int
    event_type: str
    event_id: str
    event_magnitude: Optional[float]
    event_location: Optional[str]
    notified_at: datetime
    channels_used: List[str]

    class Config:
        from_attributes = True


# ── Settings ──────────────────────────────────────────────────────────────────

class SettingUpdate(BaseModel):
    value: str


class SettingOut(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True
