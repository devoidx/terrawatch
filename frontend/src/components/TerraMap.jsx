import { useEffect, useRef } from 'react'
import { Box } from '@chakra-ui/react'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const VOLCANO_COLORS = {
  normal: '#48bb78', advisory: '#ecc94b', watch: '#ed8936', warning: '#f56565',
}

function magColor(mag) {
  if (mag >= 7) return '#9b2c2c'
  if (mag >= 6) return '#f56565'
  if (mag >= 5) return '#ed8936'
  if (mag >= 4) return '#ecc94b'
  return '#48bb78'
}

function magRadius(mag) { return Math.max(5, mag * 3.5) }

export default function TerraMap({
  earthquakes, volcanoes, alertRegions = [], drawMode = false, onRegionDrawn,
}) {
  const mapRef           = useRef(null)
  const mapObj           = useRef(null)
  const eqLayer          = useRef(null)
  const volcLayer        = useRef(null)
  const regionLayer      = useRef(null)
  const onRegionDrawnRef = useRef(onRegionDrawn)
  const drawState        = useRef({ active: false, startLatLng: null, rect: null })

  useEffect(() => { onRegionDrawnRef.current = onRegionDrawn }, [onRegionDrawn])

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapObj.current) return

    mapObj.current = L.map(mapRef.current, { center: [20, 0], zoom: 3 })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(mapObj.current)

    eqLayer.current     = L.layerGroup().addTo(mapObj.current)
    volcLayer.current   = L.layerGroup().addTo(mapObj.current)
    regionLayer.current = L.featureGroup().addTo(mapObj.current)

    return () => { mapObj.current?.remove(); mapObj.current = null }
  }, [])

  // ── Custom draw mode using mouse events ────────────────────────────────────
  useEffect(() => {
    const map = mapObj.current
    if (!map) return

    const state = drawState.current

    if (drawMode) {
      map.dragging.disable()
      map.getContainer().style.cursor = 'crosshair'

      const onMouseDown = (e) => {
        state.active = true
        state.startLatLng = e.latlng
        if (state.rect) { map.removeLayer(state.rect); state.rect = null }
      }

      const onMouseMove = (e) => {
        if (!state.active || !state.startLatLng) return
        const bounds = L.latLngBounds(state.startLatLng, e.latlng)
        if (state.rect) {
          state.rect.setBounds(bounds)
        } else {
          state.rect = L.rectangle(bounds, {
            color: '#0967d2', weight: 2,
            fillColor: '#0967d2', fillOpacity: 0.15, dashArray: '6 4',
          }).addTo(map)
        }
      }

      const onMouseUp = (e) => {
        if (!state.active || !state.startLatLng) return
        state.active = false
        const bounds = L.latLngBounds(state.startLatLng, e.latlng)
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()

        // Ignore tiny clicks
        if (Math.abs(ne.lat - sw.lat) < 0.5 || Math.abs(ne.lng - sw.lng) < 0.5) {
          if (state.rect) { map.removeLayer(state.rect); state.rect = null }
          state.startLatLng = null
          return
        }

        onRegionDrawnRef.current?.({
          lat_min: sw.lat, lat_max: ne.lat,
          lng_min: sw.lng, lng_max: ne.lng,
        })
        state.startLatLng = null
      }

      map.on('mousedown', onMouseDown)
      map.on('mousemove', onMouseMove)
      map.on('mouseup',   onMouseUp)

      return () => {
        map.off('mousedown', onMouseDown)
        map.off('mousemove', onMouseMove)
        map.off('mouseup',   onMouseUp)
        map.dragging.enable()
        map.getContainer().style.cursor = ''
        if (state.rect) { map.removeLayer(state.rect); state.rect = null }
        state.active = false
        state.startLatLng = null
      }
    } else {
      map.dragging.enable()
      map.getContainer().style.cursor = ''
    }
  }, [drawMode])

  // ── Earthquakes ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eqLayer.current) return
    eqLayer.current.clearLayers()
    const features = earthquakes?.features || []
    features.forEach(f => {
      const [lng, lat] = f.geometry.coordinates
      const mag   = f.properties.mag || 0
      const place = f.properties.place || 'Unknown'
      const time  = new Date(f.properties.time).toLocaleString()
      L.circleMarker([lat, lng], {
        radius: magRadius(mag), fillColor: magColor(mag),
        color: 'rgba(0,0,0,0.4)', weight: 1, fillOpacity: 0.75,
      }).bindPopup(`
        <div style="font-family:sans-serif;min-width:200px">
          <div style="font-weight:700;font-size:15px;margin-bottom:4px">
            M${mag.toFixed(1)} Earthquake
          </div>
          <div style="color:#718096;font-size:13px;margin-bottom:6px">${place}</div>
          <div style="font-size:12px;color:#718096">${time}</div>
          ${f.properties.url ? `<a href="${f.properties.url}" target="_blank"
            style="font-size:12px;color:#4299e1;display:block;margin-top:6px">
            View on USGS →</a>` : ''}
        </div>
      `).addTo(eqLayer.current)
    })
  }, [earthquakes])

  // ── Volcanoes ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!volcLayer.current) return
    volcLayer.current.clearLayers()
    const list = volcanoes?.volcanoes || []
    list.forEach(v => {
      const color = VOLCANO_COLORS[v.alert_level] || VOLCANO_COLORS.normal
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:3px;background:${color};
          border:2px solid rgba(0,0,0,0.5);display:flex;align-items:center;
          justify-content:center;font-size:10px">🌋</div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      })
      L.marker([v.lat, v.lng], { icon }).bindPopup(`
        <div style="font-family:sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:15px;margin-bottom:4px">🌋 ${v.name}</div>
          <span style="background:${color}22;color:${color};border:1px solid ${color}55;
            padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600;
            text-transform:uppercase">${v.alert_level}</span>
          ${v.location ? `<div style="color:#718096;font-size:12px;margin-top:4px">
            ${v.location}</div>` : ''}
        </div>
      `).addTo(volcLayer.current)
    })
  }, [volcanoes])

  // ── Alert regions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!regionLayer.current) return
    regionLayer.current.clearLayers()
    alertRegions.forEach(r => {
      L.rectangle([[r.lat_min, r.lng_min], [r.lat_max, r.lng_max]], {
        color: '#0967d2', weight: 2,
        fillColor: '#0967d2', fillOpacity: 0.1, dashArray: '6 4',
      }).bindTooltip(r.name, { permanent: false, direction: 'center' })
        .addTo(regionLayer.current)
    })
  }, [alertRegions])

  return <Box ref={mapRef} w="100%" h="100%" />
}