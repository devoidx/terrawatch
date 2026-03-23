from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, ARRAY, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    notification_prefs = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete")
    alert_regions = relationship("AlertRegion", back_populates="user", cascade="all, delete")
    sent_alerts = relationship("SentAlert", back_populates="user", cascade="all, delete")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    push_enabled = Column(Boolean, default=False)
    phone_number = Column(String(20), nullable=True)
    push_subscription = Column(JSON, nullable=True)

    user = relationship("User", back_populates="notification_prefs")


class AlertRegion(Base):
    __tablename__ = "alert_regions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    lat_min = Column(Numeric(9, 6), nullable=False)
    lat_max = Column(Numeric(9, 6), nullable=False)
    lng_min = Column(Numeric(9, 6), nullable=False)
    lng_max = Column(Numeric(9, 6), nullable=False)
    min_earthquake_magnitude = Column(Numeric(4, 2), default=4.0)
    include_volcanoes = Column(Boolean, default=True)
    min_volcano_alert_level = Column(String(20), default="advisory")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="alert_regions")
    sent_alerts = relationship("SentAlert", back_populates="alert_region", cascade="all, delete")


class SentAlert(Base):
    __tablename__ = "sent_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    alert_region_id = Column(Integer, ForeignKey("alert_regions.id", ondelete="CASCADE"))
    event_type = Column(String(20), nullable=False)
    event_id = Column(String(100), nullable=False)
    event_magnitude = Column(Numeric(4, 2), nullable=True)
    event_location = Column(Text, nullable=True)
    notified_at = Column(DateTime, server_default=func.now())
    channels_used = Column(ARRAY(Text))

    user = relationship("User", back_populates="sent_alerts")
    alert_region = relationship("AlertRegion", back_populates="sent_alerts")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
