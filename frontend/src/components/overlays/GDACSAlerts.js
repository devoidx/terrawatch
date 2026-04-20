// GDACS — Global Disaster Alert and Coordination System
// UN/EU system covering earthquakes with tsunami potential, cyclones, floods, volcanoes
// Free for non-commercial use with attribution
// https://www.gdacs.org

const ALERT_COLORS = {
  Red:    { color: '#f56565', fill: '#f5656544', label: 'RED' },
  Orange: { color: '#ed8936', fill: '#ed893644', label: 'ORANGE' },
  Green:  { color: '#48bb78', fill: '#48bb7844', label: 'GREEN' },
}

const EVENT_ICONS = {
  EQ: '🌍',
  TS: '🌊',
  TC: '🌀',
  FL: '🌧️',
  VO: '🌋',
  WF: '🔥',
  DR: '☀️',
}

const EVENT_LABELS = {
  EQ: 'Earthquake',
  TS: 'Tsunami',
  TC: 'Tropical Cyclone',
  FL: 'Flood',
  VO: 'Volcano',
  WF: 'Wildfire',
  DR: 'Drought',
}

export const GDACSAlertsOverlay = {
  id:    'gdacs_alerts',
  label: 'GDACS Global Alerts',
  icon:  '🚨',
  color: '#9f7aea',

  async load(map, L) {
    const group = L.layerGroup()

    // Fetch last 7 days of orange+red alerts globally
    const today = new Date()
    const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000)
    const fmt = d => d.toISOString().split('T')[0]

    try {
      const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH` +
        `?eventlist=EQ,TS,TC,FL,VO` +
        `&fromdate=${fmt(weekAgo)}&todate=${fmt(today)}` +
        `&alertlevel=Orange,Red` +
        `&pagesize=50`

      const res = await fetch(url)
      if (!res.ok) throw new Error(`GDACS API: ${res.status}`)
      const data = await res.json()
      const features = data.features || []

      features.forEach(f => {
        const p = f.properties || {}
        const eventType  = p.eventtype || 'EQ'
        const alertLevel = p.alertlevel || 'Green'
        const style      = ALERT_COLORS[alertLevel] || ALERT_COLORS['Green']
        const icon       = EVENT_ICONS[eventType]  || '⚠️'
        const label      = EVENT_LABELS[eventType] || eventType
        const name       = p.name || label
        const country    = p.country || ''
        const fromDate   = p.fromdate ? new Date(p.fromdate).toLocaleDateString() : ''
        const toDate     = p.todate   ? new Date(p.todate).toLocaleDateString()   : ''
        const population = p.population ? Number(p.population).toLocaleString()   : ''
        const url        = p.url?.report || `https://www.gdacs.org`
        const severity   = p.severity?.severitytext || ''

        // Get coordinates
        const geom = f.geometry
        let lat = null, lng = null
        if (geom?.type === 'Point') {
          [lng, lat] = geom.coordinates
        } else if (geom?.type === 'Polygon') {
          // Use centroid of bounding box
          const coords = geom.coordinates[0]
          lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
          lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
        }

        if (lat === null || lng === null) return

        const popupHtml = `
          <div style="font-family:sans-serif;min-width:220px">
            <div style="background:${style.color}22;border-left:3px solid ${style.color};
              padding:6px 10px;margin-bottom:8px;">
              <div style="font-weight:700;font-size:14px;color:${style.color}">
                ${icon} ${style.label} ALERT — ${label}
              </div>
            </div>
            <div style="font-size:13px;color:#e2e8f0;font-weight:600;margin-bottom:4px">
              ${name}
            </div>
            ${country ? `<div style="font-size:11px;color:#718096;margin-bottom:3px">
              📍 ${country}</div>` : ''}
            ${severity ? `<div style="font-size:11px;color:#718096;margin-bottom:3px">
              ${severity}</div>` : ''}
            ${population ? `<div style="font-size:11px;color:#718096;margin-bottom:3px">
              👥 Population affected: ${population}</div>` : ''}
            ${fromDate ? `<div style="font-size:11px;color:#718096;margin-bottom:6px">
              📅 ${fromDate}${toDate && toDate !== fromDate ? ` → ${toDate}` : ''}</div>` : ''}
            <a href="${url}" target="_blank"
              style="font-size:11px;color:#63b3ed">View on GDACS →</a>
          </div>
        `

        // Circle marker
        L.circleMarker([lat, lng], {
          radius:      alertLevel === 'Red' ? 14 : 10,
          color:       style.color,
          weight:      2,
          fillColor:   style.fill,
          fillOpacity: 0.7,
        }).bindPopup(popupHtml).addTo(group)

        // Icon label
        const divIcon = L.divIcon({
          className: '',
          html: `<div style="font-size:14px;margin-top:-7px;margin-left:-5px;
            filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">${icon}</div>`,
          iconSize:   [20, 20],
          iconAnchor: [10, 10],
        })
        L.marker([lat, lng], { icon: divIcon, interactive: false }).addTo(group)
      })

      if (features.length === 0) {
        // No orange/red alerts this week
      }

    } catch (e) {
      console.error('GDACS fetch error:', e)
    }

    group.addTo(map)
    return group
  },
}