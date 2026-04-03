from fastapi import Request, APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
import httpx
import logging
from datetime import datetime, timedelta
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi.responses import Response

import auth, models

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

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
@limiter.limit("30/minute")

async def get_dart_buoys(request: Request,
    
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
    
@router.get("/dart-buoy/{station_id}")
async def get_dart_buoy_detail(
    station_id: str,
    current_user: models.User = Depends(auth.get_current_user),
):
    """Fetch water column height readings for a DART buoy — last 24 hours."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"https://www.ndbc.noaa.gov/data/realtime2/{station_id}.dart"
            )
            if r.status_code == 404:
                return {"station_id": station_id, "status": "no_data", "readings": []}
            r.raise_for_status()

        readings = []
        lines = [l for l in r.text.split('\n') if l.strip() and not l.startswith('#')]

        for line in lines[:96]:  # 96 x 15min = 24 hours
            parts = line.split()
            if len(parts) < 8:
                continue
            try:
                yr, mo, dy, hr, mn = parts[0], parts[1], parts[2], parts[3], parts[4]
                height = float(parts[7])
                readings.append({
                    "time":   f"{yr}-{mo}-{dy} {hr}:{mn} UTC",
                    "height": height,
                })
            except (ValueError, IndexError):
                continue

        if not readings:
            return {"station_id": station_id, "status": "no_data", "readings": []}

        return {
            "station_id": station_id,
            "status":     "ok",
            "readings":   readings,  # newest first
        }

    except Exception as e:
        logger.error(f"DART buoy detail error for {station_id}: {e}")
        return {"station_id": station_id, "status": "error", "readings": []}

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
    
@router.get("/active-faults")
@limiter.limit("10/hour")   # expensive — proxies 10MB from GitHub
async def get_active_faults(
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
):
    """Fetch GEM Global Active Faults GeoJSON, simplified for web display."""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(
                "https://raw.githubusercontent.com/GEMScienceTools/gem-global-active-faults/master/geojson/gem_active_faults_harmonized.geojson"
            )
            r.raise_for_status()

        data = r.json()

        # Strip heavy properties, keep only what we need for display
        simplified_features = []
        for f in data.get("features", []):
            props = f.get("properties", {})
            simplified_features.append({
                "type": "Feature",
                "geometry": f.get("geometry"),
                "properties": {
                    "name":       props.get("name", ""),
                    "slip_type":  props.get("slip_type", ""),
                    "slip_rate":  props.get("slip_rate_preferred", ""),
                    "country":    props.get("country", ""),
                }
            })

        return {
            "type":     "FeatureCollection",
            "features": simplified_features,
        }

    except httpx.HTTPError as e:
        logger.error(f"Active faults fetch error: {e}")
        raise HTTPException(502, "Failed to fetch active faults data")
    
@router.get("/vaac-advisories")
@limiter.limit("20/hour")

async def get_vaac_advisories(request: Request,
    
    current_user: models.User = Depends(auth.get_current_user),
):
    """Fetch and parse current volcanic ash advisories from NOAA Washington VAAC."""
    import xml.etree.ElementTree as ET
    import re

    try:
        # Fetch the current advisories page to get XML links
        async with httpx.AsyncClient(timeout=30) as client:
            page = await client.get(
                "https://www.ospo.noaa.gov/products/atmosphere/vaac/messages.html"
            )
            page.raise_for_status()

        # Extract XML URLs from page - get the most recent per volcano
        xml_urls = re.findall(
            r'https://www\.ospo\.noaa\.gov/products/atmosphere/vaac/volcanoes/xml_files/[^"]+\.xml',
            page.text
        )

        # Deduplicate by volcano (keep first/most recent per filename prefix)
        seen_volcanoes = set()
        unique_urls = []
        for url in xml_urls:
            filename = url.split('/')[-1]
            # FVXX20, FVXX21 etc are volcano codes
            code = filename[:6]
            if code not in seen_volcanoes:
                seen_volcanoes.add(code)
                unique_urls.append(url)
            if len(unique_urls) >= 20:
                break

        advisories = []

        async with httpx.AsyncClient(timeout=20) as client:
            for url in unique_urls:
                try:
                    r = await client.get(url)
                    if r.status_code != 200:
                        continue

                    root = ET.fromstring(r.text)
                    ns = {
                        'iwxxm': 'http://icao.int/iwxxm/3.0',
                        'gml':   'http://www.opengis.net/gml/3.2',
                    }

                    def find_text(el, path):
                        found = el.find(path, ns)
                        return found.text.strip() if found is not None and found.text else ''

                    # Volcano info
                    vol_el    = root.find('.//iwxxm:EruptingVolcano', ns)
                    if vol_el is None:
                        continue

                    vol_name  = find_text(vol_el, 'iwxxm:name').split(' ')[0]
                    pos_text  = find_text(vol_el, './/gml:pos')
                    region    = find_text(root, './/iwxxm:stateOrRegion')
                    eruption  = find_text(root, './/iwxxm:eruptionDetails')
                    issue_time = find_text(root, './/iwxxm:issueTime//gml:timePosition')
                    elev      = find_text(vol_el, 'iwxxm:summitElevation')

                    if not pos_text:
                        continue
                    lat, lng = [float(x) for x in pos_text.split()]

                    def parse_polygon(el):
                        pos = el.find('.//gml:posList', ns)
                        if pos is None or not pos.text:
                            return None
                        coords = [float(x) for x in pos.text.strip().split()]
                        # GML is lat lng pairs, GeoJSON needs [lng, lat]
                        pairs = [[coords[i+1], coords[i]] for i in range(0, len(coords)-1, 2)]
                        if pairs and pairs[0] != pairs[-1]:
                            pairs.append(pairs[0])
                        return pairs

                    # Observed ash cloud
                    obs_el  = root.find('.//iwxxm:observation', ns)
                    obs_poly = None
                    obs_upper = ''
                    obs_lower = ''
                    if obs_el is not None:
                        obs_poly  = parse_polygon(obs_el)
                        obs_upper = find_text(obs_el, './/iwxxm:upperLimit')
                        obs_lower = find_text(obs_el, './/iwxxm:lowerLimit')

                    # Forecast polygons (6h, 12h, 18h)
                    forecasts = []
                    for fc in root.findall('.//iwxxm:forecast', ns):
                        fc_time = find_text(fc, './/gml:timePosition')
                        fc_poly = parse_polygon(fc)
                        no_ash  = fc.find('.//iwxxm:noVolcanicAshExpected', ns) is not None
                        if fc_poly or no_ash:
                            forecasts.append({
                                'time':   fc_time,
                                'polygon': fc_poly,
                                'no_ash': no_ash,
                            })

                    advisories.append({
                        'volcano':    vol_name,
                        'region':     region,
                        'lat':        lat,
                        'lng':        lng,
                        'elevation':  elev,
                        'eruption':   eruption,
                        'issue_time': issue_time,
                        'obs_polygon': obs_poly,
                        'obs_upper':  obs_upper,
                        'obs_lower':  obs_lower,
                        'forecasts':  forecasts,
                    })

                except Exception as e:
                    logger.warning(f"Failed to parse VAAC XML {url}: {e}")
                    continue

        return {'advisories': advisories, 'count': len(advisories)}

    except Exception as e:
        logger.error(f"VAAC advisories error: {e}")
        raise HTTPException(502, "Failed to fetch VAAC advisories")
    
@router.get("/volcano/{vnum}")
async def get_volcano_detail(
    vnum: str,
    current_user: models.User = Depends(auth.get_current_user),
):
    import re
    from datetime import datetime, timedelta
    results = {}

    async with httpx.AsyncClient(timeout=20) as client:

        # ── GVP volcano profile ───────────────────────────────────────────
        try:
            r = await client.get(
                "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs",
                params={
                    "service":     "WFS",
                    "version":     "2.0.0",
                    "request":     "GetFeature",
                    "typeNames":   "GVP-VOTW:E3WebApp_HoloceneVolcanoes",
                    "outputFormat":"application/json",
                    "CQL_FILTER":  f"VolcanoNumber={vnum}",
                }
            )
            if r.status_code == 200:
                feats = r.json().get("features", [])
                if feats:
                    p = feats[0]["properties"]
                    # Build image URL if available
                    img = p.get("VPImageFileName")
                    img_url = f"https://volcano.si.edu/gallery/ShowImage.cfm?photo={img}" if img else None
                    results["profile"] = {
                        "name":           p.get("VolcanoName"),
                        "country":        p.get("Country"),
                        "description":    p.get("Remarks", ""),
                        "type":           p.get("VolcanoType", ""),
                        "last_eruption":  p.get("LastEruption"),
                        "elevation":      p.get("Elevation"),
                        "tectonic":       p.get("TectonicSetting"),
                        "pop_5km":        p.get("Within_5km"),
                        "pop_10km":       p.get("Within_10km"),
                        "pop_30km":       p.get("Within_30km"),
                        "pop_100km":      p.get("Within_100km"),
                        "image_url":      img_url,
                        "image_caption":  p.get("VPImageCaption"),
                        "image_credit":   p.get("VPImageCredit"),
                        "lat":            p.get("LatitudeDecimal"),
                        "lng":            p.get("LongitudeDecimal"),
                        "gvp_url":        f"https://volcano.si.edu/volcano.cfm?vn={vnum}",
                    }
        except Exception as e:
            logger.warning(f"GVP profile error for {vnum}: {e}")

        # ── GVP eruption history since 1960 ───────────────────────────────
        try:
            r = await client.get(
                "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs",
                params={
                    "service":     "WFS",
                    "version":     "2.0.0",
                    "request":     "GetFeature",
                    "typeNames":   "GVP-VOTW:E3WebApp_Eruptions1960",
                    "outputFormat":"application/json",
                    "CQL_FILTER":  f"VolcanoNumber={vnum}",
                    "sortBy":      "StartDateYear D",
                }
            )
            if r.status_code == 200:
                feats = r.json().get("features", [])
                results["eruptions"] = [
                    {
                        "start_year":  f["properties"].get("StartDateYear"),
                        "start_month": f["properties"].get("StartDateMonth"),
                        "start_day":   f["properties"].get("StartDateDay"),
                        "end_year":    f["properties"].get("EndDateYear"),
                        "end_month":   f["properties"].get("EndDateMonth"),
                        "end_day":     f["properties"].get("EndDateDay"),
                        "vei":         f["properties"].get("ExplosivityIndexMax"),
                        "continuing":  f["properties"].get("ContinuingEruption") == "True",
                    }
                    for f in feats
                ]
        except Exception as e:
            logger.warning(f"GVP eruptions error for {vnum}: {e}")
            results["eruptions"] = []

        # ── Nearby earthquakes (USGS, last 30 days, within 100km) ─────────
        try:
            profile = results.get("profile", {})
            lat = profile.get("lat")
            lng = profile.get("lng")
            if lat and lng:
                start = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%S")
                r = await client.get(
                    "https://earthquake.usgs.gov/fdsnws/event/1/query",
                    params={
                        "format":       "geojson",
                        "latitude":     lat,
                        "longitude":    lng,
                        "maxradiuskm":  100,
                        "minmagnitude": 2.5,
                        "starttime":    start,
                        "orderby":      "time",
                        "limit":        20,
                    }
                )
                if r.status_code == 200:
                    feats = r.json().get("features", [])
                    results["nearby_earthquakes"] = [
                        {
                            "magnitude": f["properties"].get("mag"),
                            "place":     f["properties"].get("place"),
                            "time":      f["properties"].get("time"),
                            "depth":     f["geometry"]["coordinates"][2],
                            "url":       f["properties"].get("url"),
                        }
                        for f in feats
                    ]
        except Exception as e:
            logger.warning(f"Nearby earthquakes error for {vnum}: {e}")

        # ── USGS HANS — US volcanoes only ─────────────────────────────────
        try:
            r = await client.get(
                f"https://volcanoes.usgs.gov/hans-public/api/volcano/getVolcano/{vnum}"
            )
            if r.status_code == 200:
                d = r.json()
                webcam_links = re.findall(
                    r'href="(https?://[^"]+webcam[^"]*)"',
                    d.get("boilerplate", "")
                )
                results["monitoring"] = {
                    "observatory":  d.get("obs_fullname"),
                    "obs_abbr":     d.get("obs_abbr"),
                    "volcano_url":  d.get("volcano_url"),
                    "image_url":    d.get("volcano_image_url"),
                    "nvews_threat": d.get("nvews_threat"),
                    "webcam_links": webcam_links,
                }
        except Exception as e:
            logger.warning(f"HANS error for {vnum}: {e}")

        # ── USGS HANS latest notice ───────────────────────────────────────
        try:
            r = await client.get(
                f"https://volcanoes.usgs.gov/hans-public/api/volcano/newestForVolcano/{vnum}"
            )
            if r.status_code == 200:
                d = r.json()
                results["latest_notice"] = {
                    "title":       d.get("noticeTitle"),
                    "type":        d.get("noticeType"),
                    "sent":        d.get("sentUtc"),
                    "alert_level": d.get("noticeHighestAlertLevel"),
                    "color_code":  d.get("noticeHighestColorCode"),
                    "url":         d.get("noticeUrl"),
                    "html":        d.get("noticeHtml", "")[:2000],
                }
        except Exception as e:
            logger.warning(f"HANS notice error for {vnum}: {e}")

    return results



@router.get("/volcano-image/{image_id}")
async def get_volcano_image(image_id: str):
    """Proxy GVP volcano images — public endpoint."""
    import re
    if not re.match(r'^GVP-\d+$', image_id):
        raise HTTPException(400, "Invalid image ID")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://volcano.si.edu/gallery/photos/{image_id}.jpg",
                headers={"Referer": "https://volcano.si.edu/"}
            )
            if r.status_code == 200:
                return Response(
                    content=r.content,
                    media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=86400"}
                )
            raise HTTPException(404, "Image not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Volcano image proxy error for {image_id}: {e}")
        raise HTTPException(502, "Failed to fetch image")