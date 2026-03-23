import { useEffect, useRef, useCallback } from 'react'
import { Box } from '@chakra-ui/react'
import L from 'leaflet'
import 'leaflet'

// Fix default marker icon path in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const EQ_COLORS = {
  minor:    '#48bb78',
  light:    '#ecc94b',
  moderate: '#ed8936',
  strong:   '#f56565',
  major:    '#9b2c2c',
}

const VOLCANO_COLORS = {
  normal:   '#48bb78',
  advisory: '#ecc94b',
  watch:    '#ed8936',
  warning:  '#f56565',
}

function magColor(mag) {
  if (mag >= 7)   return EQ_COLORS.major
  if (mag >= 6)   return EQ_COLORS.strong
  if (mag >= 5)   return EQ_COLORS.moderate
  if (mag >= 4)   return EQ_COLORS.light
  return EQ_COLORS.minor
}

function magRadius(mag) {
  return Math.max(5, mag * 3.5)
}

export default function TerraMap({
  earthquakes,
  volcanoes,
  alertRegions = [],
  drawMode = false,
  onRegionDrawn,
}) {
  const mapRef      = useRef(null)
  const mapObj      = useRef(null)
  const eqLayer     = useRef(null)
  const volcLayer   = useRef(null)
  const regionLayer = useRef(null)
  const drawCtrl    = useRef(null)

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapObj.current) return

    mapObj.current = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(mapObj.current)

    eqLayer.current     = L.layerGroup().addTo(mapObj.current)
    volcLayer.current   = L.layerGroup().addTo(mapObj.current)
    regionLayer.current = L.featureGroup().addTo(mapObj.current)

    return () => {
      mapObj.current?.remove()
      mapObj.current = null
    }
  }, [])

  // ── Earthquakes layer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!eqLayer.current || !earthquakes) return
    eqLayer.current.clearLayers()

    const features = earthquakes.features || []
    features.forEach(f => {
      const [lng, lat] = f.geometry.coordinates
      const mag  = f.properties.mag || 0
      const place = f.properties.place || 'Unknown'
      const time  = new Date(f.properties.time).toLocaleString()

      L.circleMarker([lat, lng], {
        radius:      magRadius(mag),
        fillColor:   magColor(mag),
        color:       'rgba(0,0,0,0.4)',
        weight:      1,
        opacity:     1,
        fillOpacity: 0.75,
      })
        .bindPopup(`
          <div style="font-family: 'DM Sans', sans-serif; min-width:200px">
            <div style="font-weight:700; font-size:15px; margin-bottom:4px">
              M${mag.toFixed(1)} Earthquake
            </div>
            <div style="color:#a0aec0; font-size:13px; margin-bottom:6px">${place}</div>
            <div style="font-size:12px; color:#718096">${time}</div>
            ${f.properties.url ? `<a href="${f.properties.url}" target="_blank"
              style="font-size:12px; color:#4299e1; display:block; margin-top:6px">
              View on USGS →</a>` : ''}
          </div>
        `)
        .addTo(eqLayer.current)
    })
  }, [earthquakes])

  // ── Volcanoes layer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!volcLayer.current || !volcanoes) return
    volcLayer.current.clearLayers()

    const list = volcanoes.volcanoes || []
    list.forEach(v => {
      const color = VOLCANO_COLORS[v.alert_level] || VOLCANO_COLORS.normal
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:18px; height:18px; border-radius:3px;
          background:${color}; border:2px solid rgba(0,0,0,0.5);
          display:flex; align-items:center; justify-content:center;
          font-size:10px; line-height:1;
        ">🌋</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      L.marker([v.lat, v.lng], { icon })
        .bindPopup(`
          <div style="font-family:'DM Sans',sans-serif; min-width:180px">
            <div style="font-weight:700; font-size:15px; margin-bottom:4px">
              🌋 ${v.name}
            </div>
            <div style="margin-bottom:4px">
              <span style="
                background:${color}22; color:${color};
                border:1px solid ${color}55;
                padding:2px 8px; border-radius:99px;
                font-size:12px; font-weight:600;
                text-transform:uppercase;
              ">${v.alert_level}</span>
            </div>
            ${v.location ? `<div style="color:#718096;font-size:12px">${v.location}</div>` : ''}
          </div>
        `)
        .addTo(volcLayer.current)
    })
  }, [volcanoes])

  // ── Alert region overlays ──────────────────────────────────────────────────
  useEffect(() => {
    if (!regionLayer.current) return
    regionLayer.current.clearLayers()

    alertRegions.forEach(r => {
      const bounds = [[r.lat_min, r.lng_min], [r.lat_max, r.lng_max]]
      L.rectangle(bounds, {
        color:       '#0967d2',
        weight:      2,
        fillColor:   '#0967d2',
        fillOpacity: 0.1,
        dashArray:   '6 4',
      })
        .bindTooltip(r.name, {
          permanent: false,
          direction: 'center',
          className: 'region-tooltip',
        })
        .addTo(regionLayer.current)
    })
  }, [alertRegions])

  // ── Draw mode ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapObj.current || !regionLayer.current) return

    if (drawMode) {
      // Dynamically import leaflet-draw only when needed
      import('leaflet-draw').then(() => {
        if (drawCtrl.current) return
        drawCtrl.current = new L.Control.Draw({
          draw: {
            rectangle: { shapeOptions: { color: '#0967d2', fillOpacity: 0.15 } },
            polygon:   false,
            polyline:  false,
            circle:    false,
            marker:    false,
            circlemarker: false,
          },
          edit: { featureGroup: regionLayer.current, remove: false },
        })
        mapObj.current.addControl(drawCtrl.current)

        mapObj.current.on(L.Draw.Event.CREATED, (e) => {
          const bounds = e.layer.getBounds()
          onRegionDrawn?.({
            lat_min: bounds.getSouth(),
            lat_max: bounds.getNorth(),
            lng_min: bounds.getWest(),
            lng_max: bounds.getEast(),
          })
        })
      })
    } else {
      if (drawCtrl.current) {
        mapObj.current.removeControl(drawCtrl.current)
        drawCtrl.current = null
      }
    }
  }, [drawMode, onRegionDrawn])

  return <Box ref={mapRef} w="100%" h="100%" />
}
