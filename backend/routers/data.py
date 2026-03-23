from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional

import auth, models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data", tags=["data"])

USGS_EQ_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
USGS_VOLCANO_ELEVATED = "https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes"
USGS_VOLCANO_MONITORED = "https://volcanoes.usgs.gov/hans-public/api/volcano/getMonitoredVolcanoes"


@router.get("/earthquakes")
async def get_earthquakes(
    hours: int = Query(24, ge=1, le=168),
    min_magnitude: float = Query(2.5, ge=0.0, le=10.0),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Fetch recent earthquakes from USGS and return as GeoJSON."""
    start = (datetime.utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%S")
    params = {
        "format": "geojson",
        "starttime": start,
        "minmagnitude": min_magnitude,
        "orderby": "time",
        "limit": 500,
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(USGS_EQ_URL, params=params)
            r.raise_for_status()
            return JSONResponse(content=r.json())
    except httpx.HTTPError as e:
        logger.error(f"USGS earthquake fetch error: {e}")
        raise HTTPException(502, "Failed to fetch earthquake data from USGS")


@router.get("/volcanoes")
async def get_volcanoes(
    elevated_only: bool = Query(False),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Fetch volcano data from USGS HANS API."""
    url = USGS_VOLCANO_ELEVATED if elevated_only else USGS_VOLCANO_MONITORED
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(url)
            r.raise_for_status()
            raw = r.json()

        # Normalise into a consistent shape regardless of USGS response format
        volcanoes = []
        for v in raw:
            lat = v.get("latitude") or v.get("lat")
            lng = v.get("longitude") or v.get("lon") or v.get("lng")
            if lat is None or lng is None:
                continue
            volcanoes.append({
                "id": f"volcano-{v.get('vnum') or v.get('id', '')}",
                "name": v.get("name", "Unknown"),
                "lat": float(lat),
                "lng": float(lng),
                "alert_level": (v.get("alertLevel") or v.get("alert_level") or "normal").lower(),
                "color_code": (v.get("colorCode") or v.get("color_code") or "green").lower(),
                "location": v.get("location") or v.get("state") or "",
                "vnum": v.get("vnum") or v.get("id"),
            })

        return {"volcanoes": volcanoes, "count": len(volcanoes)}

    except httpx.HTTPError as e:
        logger.error(f"USGS volcano fetch error: {e}")
        raise HTTPException(502, "Failed to fetch volcano data from USGS")


@router.get("/earthquakes/stats")
async def earthquake_stats(
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return summary counts for the last 24 hours, split by magnitude band."""
    start = (datetime.utcnow() - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")
    params = {
        "format": "geojson",
        "starttime": start,
        "minmagnitude": 2.5,
        "orderby": "time",
        "limit": 1000,
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(USGS_EQ_URL, params=params)
            r.raise_for_status()
            features = r.json().get("features", [])

        bands = {"2.5-3.9": 0, "4.0-4.9": 0, "5.0-5.9": 0, "6.0+": 0}
        for f in features:
            mag = f["properties"].get("mag") or 0
            if mag >= 6.0:
                bands["6.0+"] += 1
            elif mag >= 5.0:
                bands["5.0-5.9"] += 1
            elif mag >= 4.0:
                bands["4.0-4.9"] += 1
            else:
                bands["2.5-3.9"] += 1

        return {"total": len(features), "bands": bands}

    except httpx.HTTPError as e:
        logger.error(f"Stats fetch error: {e}")
        raise HTTPException(502, "Failed to fetch stats from USGS")
