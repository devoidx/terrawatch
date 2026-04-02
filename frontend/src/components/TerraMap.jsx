import { useEffect, useRef } from 'react'
import { Box } from '@chakra-ui/react'
//import L from 'leaflet'

const L = window.L

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const VOLCANO_COLORS = {
  normal: '#48bb78',
  advisory: '#ecc94b',
  watch: '#ed8936',
  warning: '#f56565',
}

function magColor(mag) {
  if (mag >= 7) return '#9b2c2c'
  if (mag >= 6) return '#f56565'
  if (mag >= 5) return '#ed8936'
  if (mag >= 4) return '#ecc94b'
  if (mag >= 2.5) return '#48bb78'
  return '#a0aec0'  // micro — grey
}

function depthColor(depth) {
  if (depth <= 10) return '#ff4444'  // very shallow — red
  if (depth <= 35) return '#ff8c00'  // shallow — orange
  if (depth <= 70) return '#ffd700'  // intermediate — yellow
  if (depth <= 150) return '#00bcd4'  // deep — cyan
  return '#7c3aed'                    // very deep — purple
}

function depthLabel(depth) {
  if (depth <= 10) return 'Very shallow'
  if (depth <= 35) return 'Shallow'
  if (depth <= 70) return 'Intermediate'
  if (depth <= 150) return 'Deep'
  return 'Very deep'
}

function magRadius(mag) { return Math.max(5, mag * 3.5) }

function eventOpacity(timestamp, hoursWindow) {
  const ageMs = Date.now() - timestamp
  const windowMs = hoursWindow * 60 * 60 * 1000
  const ratio = Math.max(0, Math.min(1, 1 - ageMs / windowMs))
  return 0.15 + ratio * 0.75
}

function isRecent(timestamp) {
  return Date.now() - timestamp < 30 * 60 * 1000
}

function createEqLayer(cluster) {
  const WL = window.L
  if (cluster && WL?.markerClusterGroup) {
    return WL.markerClusterGroup({
      maxClusterRadius: 60,
      disableClusteringAtZoom: 6,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cl) => {
        const count = cl.getChildCount()
        const bg = count < 10 ? '#0967d2' : count < 50 ? '#ed8936' : '#f56565'
        return L.divIcon({
          html: `<div style="
            width:40px;height:40px;border-radius:50%;
            background:${bg}cc;
            border:3px solid white;
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:13px;
            font-family:'DM Sans',sans-serif;
            box-shadow:0 0 0 2px ${bg}, 0 2px 8px rgba(0,0,0,0.5);">
            ${count}
          </div>`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        })
      },
    })
  }
  return L.layerGroup()
}

export default function TerraMap({
  earthquakes, volcanoes, alertRegions = [],
  drawMode = false, onRegionDrawn,
  hoursWindow = 24, onMapReady,
  clusterMarkers = true,
  depthMode = false,
}) {
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const eqLayer = useRef(null)
  const volcLayer = useRef(null)
  const regionLayer = useRef(null)
  const drawState = useRef({ active: false, startLatLng: null, rect: null })
  const onRegionDrawnRef = useRef(onRegionDrawn)

  useEffect(() => { onRegionDrawnRef.current = onRegionDrawn }, [onRegionDrawn])

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapObj.current) return

    mapObj.current = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: false,
      minZoom: 3,
      worldCopyJump: true,
    })

    L.control.zoom({ position: 'topright' }).addTo(mapObj.current)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
      minZoom: 3,
    }).addTo(mapObj.current)

    eqLayer.current = createEqLayer(true)
    eqLayer.current.addTo(mapObj.current)
    volcLayer.current = L.layerGroup().addTo(mapObj.current)
    regionLayer.current = L.featureGroup().addTo(mapObj.current)

    onMapReady?.(mapObj.current)

    return () => { mapObj.current?.remove(); mapObj.current = null }
  }, [])

  // ── Draw mode ──────────────────────────────────────────────────────────────
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
            color: '#0967d2',
            weight: 2,
            fillColor: '#0967d2',
            fillOpacity: 0.15,
            dashArray: '6 4',
          }).addTo(map)
        }
      }

      const onMouseUp = (e) => {
        if (!state.active || !state.startLatLng) return
        state.active = false
        const bounds = L.latLngBounds(state.startLatLng, e.latlng)
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()

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
      map.on('mouseup', onMouseUp)

      return () => {
        map.off('mousedown', onMouseDown)
        map.off('mousemove', onMouseMove)
        map.off('mouseup', onMouseUp)
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
    if (!mapObj.current) return

    // Nuclear option — remove everything from the map that isn't a tile,
    // volcano, or region layer, then rebuild
    if (eqLayer.current) {
      eqLayer.current.clearLayers()
      mapObj.current.removeLayer(eqLayer.current)
      eqLayer.current = null
    }

    const layer = createEqLayer(clusterMarkers)

    mapObj.current.addLayer(layer)
    eqLayer.current = layer

    const features = earthquakes?.features || []
    features.forEach(f => {
      const [lng, lat, depth] = f.geometry.coordinates
      const mag = f.properties.mag || 0
      const place = f.properties.place || 'Unknown'
      const time = f.properties.time
      const timeStr = new Date(time).toLocaleString()
      const opacity = eventOpacity(time, hoursWindow)
      const recent = isRecent(time)
      const depthKm = Math.round(depth || 0)

      // Colour by depth if depthMode, otherwise colour by magnitude
      const color = depthMode ? depthColor(depthKm) : magColor(mag)
      const radius = magRadius(mag)
      const size = radius * 2

      if (recent) {
        const pulseSize = size + 20
        const pulseIcon = L.divIcon({
          className: '',
          html: `<div style="width:${pulseSize}px;height:${pulseSize}px;display:flex;align-items:center;justify-content:center;pointer-events:none;"><div style="width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${color};animation:eq-pulse 2s ease-out infinite;transform-origin:center center;"></div></div>`,
          iconSize: [pulseSize, pulseSize],
          iconAnchor: [pulseSize / 2, pulseSize / 2],
        })
        L.marker([lat, lng], { icon: pulseIcon, interactive: false, zIndexOffset: -100 })
          .addTo(eqLayer.current)
      }

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:${opacity};border:1.5px solid rgba(0,0,0,0.5);box-sizing:border-box;"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })

      L.marker([lat, lng], { icon })
        .bindPopup(`
  <div style="font-family:sans-serif;min-width:200px">
    <div style="font-weight:700;font-size:15px;margin-bottom:4px">
      M${mag.toFixed(1)} Earthquake
      ${recent ? '<span style="color:#48bb78;font-size:11px;margin-left:6px">● RECENT</span>' : ''}
    </div>
    <div style="color:#718096;font-size:13px;margin-bottom:4px">${place}</div>
    <div style="font-size:12px;color:#718096;margin-bottom:2px">
      Depth: <span style="color:#e2e8f0;font-weight:600">${depthKm} km</span>
      — ${depthLabel(depthKm)}
    </div>
    <div style="font-size:12px;color:#718096">${timeStr}</div>
    ${f.properties.url ? `<a href="${f.properties.url}" target="_blank"
      style="font-size:12px;color:#4299e1;display:block;margin-top:6px">
      View on USGS →</a>` : ''}
  </div>
`)
        .addTo(eqLayer.current)
    })
  }, [earthquakes, hoursWindow, clusterMarkers, depthMode])

  // ── Volcanoes ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!volcLayer.current) return
    volcLayer.current.clearLayers()
    const list = volcanoes?.volcanoes || []
    list.forEach(v => {
      const color = VOLCANO_COLORS[v.alert_level] || VOLCANO_COLORS.normal
      const icon = L.divIcon({
        className: '',
        html: `<svg width="20" height="18" viewBox="0 0 20 18"
          xmlns="http://www.w3.org/2000/svg"
          style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8))">
          <polygon points="10,1 19,17 1,17"
            fill="${color}"
            stroke="rgba(0,0,0,0.5)"
            stroke-width="1.5"
            stroke-linejoin="round"/>
        </svg>`,
        iconSize: [20, 18],
        iconAnchor: [10, 9],
      })
      L.marker([v.lat, v.lng], { icon })
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:180px">
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">
              🌋 ${v.name}
            </div>
            <span style="
              background:${color}22;color:${color};
              border:1px solid ${color}55;
              padding:2px 8px;border-radius:99px;
              font-size:12px;font-weight:600;text-transform:uppercase">
              ${v.alert_level}
            </span>
            ${v.location ? `<div style="color:#718096;font-size:12px;margin-top:4px">
              ${v.location}</div>` : ''}
          </div>
          <a href="/volcano/${v.vnum || v.id}"
            style="font-size:12px;color:#ed8936;display:block;margin-top:6px;text-decoration:none;">
              View details →
          </a>
        `)
        .addTo(volcLayer.current)
    })
  }, [volcanoes])

  // ── Alert regions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!regionLayer.current) return
    regionLayer.current.clearLayers()
    alertRegions.forEach(r => {
      L.rectangle([[r.lat_min, r.lng_min], [r.lat_max, r.lng_max]], {
        color: '#0967d2',
        weight: 2,
        fillColor: '#0967d2',
        fillOpacity: 0.1,
        dashArray: '6 4',
      })
        .bindTooltip(r.name, { permanent: false, direction: 'center' })
        .addTo(regionLayer.current)
    })
  }, [alertRegions])

  return <Box ref={mapRef} w="100%" h="100%" />
}