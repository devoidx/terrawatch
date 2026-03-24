import httpx
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

import models
import notifications

logger = logging.getLogger(__name__)

USGS_EARTHQUAKE_URL = (
    "https://earthquake.usgs.gov/fdsnws/event/1/query"
    "?format=geojson&orderby=time&limit=100&minmagnitude=2.5"
    "&starttime={start}"
)
USGS_VOLCANO_URL = "https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes"

VOLCANO_LEVEL_ORDER = ["normal", "advisory", "watch", "warning"]


def level_index(level: str) -> int:
    try:
        return VOLCANO_LEVEL_ORDER.index(level.lower())
    except ValueError:
        return 0


async def fetch_earthquakes() -> list[dict]:
    start = (datetime.utcnow() - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S")
    url = USGS_EARTHQUAKE_URL.format(start=start)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            r.raise_for_status()
            features = r.json().get("features", [])
            return [
                {
                    "id": f["id"],
                    "type": "earthquake",
                    "magnitude": f["properties"].get("mag"),
                    "location": f["properties"].get("place", "Unknown"),
                    "lat": f["geometry"]["coordinates"][1],
                    "lng": f["geometry"]["coordinates"][0],
                    "time": f["properties"].get("time"),
                    "url": f["properties"].get("url"),
                }
                for f in features
                if f.get("geometry") and f["geometry"].get("coordinates")
            ]
    except Exception as e:
        logger.error(f"Earthquake fetch failed: {e}")
        return []


async def fetch_volcanoes() -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r1 = await client.get(
                "https://volcanoes.usgs.gov/vsc/api/volcanoApi/volcanoesGVP"
            )
            r1.raise_for_status()
            r2 = await client.get(
                "https://volcanoes.usgs.gov/hans-public/api/volcano/getMonitoredVolcanoes"
            )
            r2.raise_for_status()

        alert_lookup = {}
        for v in r2.json():
            vnum = v.get("vnum")
            if vnum:
                alert_lookup[str(vnum)] = (v.get("alert_level") or "NORMAL").lower()

        results = []
        for v in r1.json():
            lat  = v.get("latitude")
            lng  = v.get("longitude")
            vnum = str(v.get("vnum") or "")
            if lat is None or lng is None:
                continue
            alert_level = alert_lookup.get(vnum, "normal")
            results.append({
                "id":          f"volcano-{vnum}",
                "type":        "volcano",
                "name":        v.get("vName", "Unknown"),
                "alert_level": alert_level,
                "lat":         float(lat),
                "lng":         float(lng),
                "location":    f"{v.get('subregion', '')}, {v.get('country', '')}".strip(", "),
                "country":     v.get("country", ""),
            })
        return results
    except Exception as e:
        logger.error(f"Volcano fetch failed: {e}")
        return []


def event_in_region(event: dict, region: models.AlertRegion) -> bool:
    lat, lng = event["lat"], event["lng"]
    return (
        float(region.lat_min) <= lat <= float(region.lat_max)
        and float(region.lng_min) <= lng <= float(region.lng_max)
    )


async def check_and_notify(db: Session):
    earthquakes = await fetch_earthquakes()
    volcanoes = await fetch_volcanoes()
    all_events = earthquakes + volcanoes

    if not all_events:
        return

    # Load all active regions with user + prefs
    regions = (
        db.query(models.AlertRegion)
        .filter(models.AlertRegion.is_active == True)
        .all()
    )

    for region in regions:
        user = db.query(models.User).filter(models.User.id == region.user_id).first()
        if not user or not user.is_active:
            continue
        prefs = user.notification_prefs
        if not prefs:
            continue

        for event in all_events:
            # Skip if already notified
            existing = db.query(models.SentAlert).filter_by(
                user_id=user.id, event_id=event["id"]
            ).first()
            if existing:
                continue

            if not event_in_region(event, region):
                continue

            # Apply threshold filters
            if event["type"] == "earthquake":
                mag = event.get("magnitude") or 0
                if mag < float(region.min_earthquake_magnitude):
                    continue
                subject = f"🌍 TerraWatch: M{mag:.1f} Earthquake — {region.name}"
                email_html = f"""
                <h2>Earthquake Alert — {region.name}</h2>
                <p><strong>Magnitude:</strong> {mag}</p>
                <p><strong>Location:</strong> {event['location']}</p>
                <p><a href="{event.get('url', '#')}">View on USGS</a></p>
                """
                sms_text = f"TerraWatch: M{mag:.1f} earthquake near {region.name}. {event['location']}"
                push_title = f"M{mag:.1f} Earthquake"
                push_body = event["location"]

            elif event["type"] == "volcano":
                if not region.include_volcanoes:
                    continue
                event_level = event.get("alert_level", "advisory")
                if level_index(event_level) < level_index(region.min_volcano_alert_level):
                    continue
                subject = f"🌋 TerraWatch: Volcano Alert ({event_level.upper()}) — {region.name}"
                email_html = f"""
                <h2>Volcano Alert — {region.name}</h2>
                <p><strong>Volcano:</strong> {event['name']}</p>
                <p><strong>Alert Level:</strong> {event_level.upper()}</p>
                <p><strong>Location:</strong> {event.get('location', '')}</p>
                """
                sms_text = f"TerraWatch: {event['name']} at {event_level.upper()} alert near {region.name}"
                push_title = f"Volcano: {event['name']}"
                push_body = f"Alert level: {event_level.upper()}"
            else:
                continue

            channels = await notifications.dispatch_alert(
                user.email, prefs, subject, email_html, sms_text, push_title, push_body
            )

            if channels:
                sent = models.SentAlert(
                    user_id=user.id,
                    alert_region_id=region.id,
                    event_type=event["type"],
                    event_id=event["id"],
                    event_magnitude=event.get("magnitude"),
                    event_location=event.get("location") or event.get("name"),
                    channels_used=channels,
                )
                db.add(sent)

    db.commit()
    logger.info("Alert check complete")
