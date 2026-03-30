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
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            # Global volcano list with coordinates (worldwide)
            r1 = await client.get(
                "https://volcanoes.usgs.gov/vsc/api/volcanoApi/volcanoesGVP"
            )
            r1.raise_for_status()

            # Current US alert status
            r2 = await client.get(
                "https://volcanoes.usgs.gov/hans-public/api/volcano/getMonitoredVolcanoes"
            )
            r2.raise_for_status()

        # Build alert status lookup keyed by vnum
        alert_lookup = {}
        for v in r2.json():
            vnum = v.get("vnum")
            if vnum:
                alert_lookup[str(vnum)] = {
                    "alert_level": (v.get("alert_level") or "NORMAL").lower(),
                    "color_code":  (v.get("color_code")  or "GREEN").lower(),
                }

        results = []
        for v in r1.json():
            lat  = v.get("latitude")
            lng  = v.get("longitude")
            vnum = str(v.get("vnum") or "")
            if lat is None or lng is None:
                continue

            status = alert_lookup.get(vnum, {
                "alert_level": "normal",
                "color_code":  "green",
            })
            alert_level = status["alert_level"]

            if elevated_only and alert_level == "normal":
                continue

            results.append({
                "id":          f"volcano-{vnum}",
                "name":        v.get("vName", "Unknown"),
                "lat":         float(lat),
                "lng":         float(lng),
                "alert_level": alert_level,
                "color_code":  status["color_code"],
                "location":    f"{v.get('subregion', '')}, {v.get('country', '')}".strip(", "),
                "vnum":        vnum,
                "country":     v.get("country", ""),
            })

        return {"volcanoes": results, "count": len(results)}

    except httpx.HTTPError as e:
        logger.error(f"Volcano fetch error: {e}")
        raise HTTPException(502, "Failed to fetch volcano data from USGS") 
    
@router.get("/dart-buoys")
async def get_dart_buoys(
    current_user: models.User = Depends(auth.get_current_user),
):
    """Fetch and parse NOAA DART buoy station list."""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(
                "https://www.ndbc.noaa.gov/data/stations/station_table.txt"
            )
            r.raise_for_status()

        stations = []
        for line in r.text.split('\n'):
            if not line.strip() or line.startswith('#'):
                continue
            if 'dart' not in line.lower():
                continue

            # Parse coordinates: "30.487 N 152.124 E"
            import re
            coord = re.search(
                r'(-?\d+\.?\d*)\s+([NS])\s+(-?\d+\.?\d*)\s+([EW])', line
            )
            if not coord:
                continue

            lat = float(coord.group(1)) * (-1 if coord.group(2) == 'S' else 1)
            lng = float(coord.group(3)) * (-1 if coord.group(4) == 'W' else 1)
            parts = line.split('|')
            sid  = parts[0].strip() if parts else ''
            name = parts[4].strip()[:60] if len(parts) > 4 else 'DART Buoy'

            if sid and not (lat == 0 and lng == 0):
                stations.append({
                    'id':   sid,
                    'name': name,
                    'lat':  lat,
                    'lng':  lng,
                })

        return {'stations': stations, 'count': len(stations)}

    except httpx.HTTPError as e:
        logger.error(f"DART buoy fetch error: {e}")
        raise HTTPException(502, "Failed to fetch DART buoy data from NOAA")

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
