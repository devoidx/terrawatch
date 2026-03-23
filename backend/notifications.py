import os
import json
import logging
import asyncio
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


def get_smtp_config(db=None):
    cfg = {
        'provider':       'smtp',
        'host':           os.getenv('SMTP_HOST', ''),
        'port':           int(os.getenv('SMTP_PORT', '587')),
        'user':           os.getenv('SMTP_USER', ''),
        'password':       os.getenv('SMTP_PASSWORD', ''),
        'from':           os.getenv('SMTP_FROM', ''),
        'use_tls':        True,
        'gmail_address':  os.getenv('GMAIL_ADDRESS', ''),
        'gmail_password': os.getenv('GMAIL_APP_PASSWORD', ''),
    }
    if db:
        try:
            from models import Setting
            s = {row.key: row.value for row in db.query(Setting).all()}
            cfg['provider']       = s.get('smtp_provider', 'smtp')
            cfg['host']           = s.get('smtp_host') or cfg['host']
            cfg['port']           = int(s.get('smtp_port') or cfg['port'])
            cfg['user']           = s.get('smtp_user') or cfg['user']
            cfg['password']       = s.get('smtp_password') or cfg['password']
            cfg['from']           = s.get('smtp_from') or cfg['from']
            cfg['use_tls']        = (s.get('smtp_use_tls', 'true')).lower() == 'true'
            cfg['gmail_address']  = s.get('gmail_address') or cfg['gmail_address']
            cfg['gmail_password'] = s.get('gmail_app_password') or cfg['gmail_password']
        except Exception:
            pass
    return cfg


async def send_email(to_address: str, subject: str, body_html: str, db=None) -> bool:
    cfg = get_smtp_config(db)
    provider = cfg['provider']

    if provider == 'gmail':
        host     = 'smtp.gmail.com'
        port     = 587
        user     = cfg['gmail_address']
        password = cfg['gmail_password']
        from_addr = f"TerraWatch <{user}>"
        use_tls  = True
    else:
        host     = cfg['host']
        port     = cfg['port']
        user     = cfg['user']
        password = cfg['password']
        from_addr = cfg['from'] or user
        use_tls  = cfg['use_tls']

    if not host or not user:
        logger.warning("Email not configured, skipping")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = to_address
    msg.attach(MIMEText(body_html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=host,
            port=port,
            username=user,
            password=password,
            start_tls=use_tls,
        )
        logger.info(f"Email sent to {to_address} via {provider}")
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
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
