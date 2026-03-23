import os
import json
import logging
import asyncio
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

logger = logging.getLogger(__name__)


# ── Email ────────────────────────────────────────────────────────────────────

async def send_email(to_address: str, subject: str, body_html: str) -> bool:
    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("SMTP_FROM", user)

    if not host or not user:
        logger.warning("SMTP not configured, skipping email")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_address
    msg.attach(MIMEText(body_html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=host,
            port=port,
            username=user,
            password=password,
            start_tls=True,
        )
        logger.info(f"Email sent to {to_address}")
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False


# ── SMS (Twilio) ──────────────────────────────────────────────────────────────

def send_sms(to_number: str, message: str) -> bool:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    from_number = os.getenv("TWILIO_FROM_NUMBER", "")

    if not account_sid or not auth_token:
        logger.warning("Twilio not configured, skipping SMS")
        return False

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        client.messages.create(body=message, from_=from_number, to=to_number)
        logger.info(f"SMS sent to {to_number}")
        return True
    except Exception as e:
        logger.error(f"SMS failed: {e}")
        return False


# ── Web Push ──────────────────────────────────────────────────────────────────

def send_push(subscription: dict, title: str, body: str, url: str = "/") -> bool:
    vapid_private = os.getenv("VAPID_PRIVATE_KEY", "")
    vapid_contact = os.getenv("VAPID_CONTACT_EMAIL", "admin@terrawatch.local")

    if not vapid_private:
        logger.warning("VAPID keys not configured, skipping push")
        return False

    try:
        from pywebpush import webpush, WebPushException
        payload = json.dumps({"title": title, "body": body, "url": url})
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=vapid_private,
            vapid_claims={"sub": f"mailto:{vapid_contact}"},
        )
        logger.info("Push notification sent")
        return True
    except Exception as e:
        logger.error(f"Push failed: {e}")
        return False


# ── Dispatcher ────────────────────────────────────────────────────────────────

async def dispatch_alert(
    user_email: str,
    prefs,
    subject: str,
    email_html: str,
    sms_text: str,
    push_title: str,
    push_body: str,
) -> list[str]:
    """Send alert via all enabled channels. Returns list of channels used."""
    channels = []

    if prefs.email_enabled and user_email:
        ok = await send_email(user_email, subject, email_html)
        if ok:
            channels.append("email")

    if prefs.sms_enabled and prefs.phone_number:
        ok = await asyncio.get_event_loop().run_in_executor(
            None, send_sms, prefs.phone_number, sms_text
        )
        if ok:
            channels.append("sms")

    if prefs.push_enabled and prefs.push_subscription:
        ok = await asyncio.get_event_loop().run_in_executor(
            None, send_push, prefs.push_subscription, push_title, push_body
        )
        if ok:
            channels.append("push")

    return channels
