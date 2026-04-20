const ALERT_COLORS = {
  'Tsunami Warning':  { color: '#f56565', fill: '#f5656533', label: 'WARNING' },
  'Tsunami Watch':    { color: '#ed8936', fill: '#ed893633', label: 'WATCH' },
  'Tsunami Advisory': { color: '#ecc94b', fill: '#ecc94b33', label: 'ADVISORY' },
  'Warning':          { color: '#f56565', fill: '#f5656533', label: 'WARNING' },
  'Watch':            { color: '#ed8936', fill: '#ed893633', label: 'WATCH' },
  'Advisory':         { color: '#ecc94b', fill: '#ecc94b33', label: 'ADVISORY' },
  'Information':      { color: '#48bb78', fill: '#48bb7833', label: 'INFO' },
}

// Parse PTWC/NTWC CAP XML feed and extract active tsunami alerts
async function fetchCAPAlerts(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const text = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'application/xml')
    const entries = Array.from(doc.querySelectorAll('entry, item'))
    const alerts = []
    for (const entry of entries) {
      const title   = entry.querySelector('title')?.textContent || ''
      const summary = entry.querySelector('summary')?.textContent || ''
      const link    = entry.querySelector('link')?.getAttribute('href') ||
                      entry.querySelector('link')?.textContent || ''

      // Only include active warnings/watches/advisories — skip cancellations/info
      const lowerTitle = title.toLowerCase()
      if (lowerTitle.includes('cancel') || lowerTitle.includes('all clear')) continue
      if (!lowerTitle.includes('warning') && !lowerTitle.includes('watch') &&
          !lowerTitle.includes('advisory') && !lowerTitle.includes('threat')) continue

      let alertType = 'Tsunami Warning'
      if (lowerTitle.includes('watch'))    alertType = 'Tsunami Watch'
      if (lowerTitle.includes('advisory')) alertType = 'Tsunami Advisory'

      // Extract affected areas from title/summary
      const areaMatch = summary.match(/for\s+([^.]+)\./i)
      const area = areaMatch ? areaMatch[1].trim() : ''

      // Extract coordinates from georss or CAP polygon if present
      const point = entry.querySelector('point')?.textContent?.trim()
      let lat = null, lng = null
      if (point) {
        const parts = point.split(/\s+/)
        if (parts.length >= 2) { lat = parseFloat(parts[0]); lng = parseFloat(parts[1]) }
      }

      alerts.push({ title, summary, link, alertType, area, lat, lng })
    }
    return alerts
  } catch (e) {
    console.warn('CAP feed error:', e)
    return []
  }
}

export const TsunamiWarningsOverlay = {
  id:    'tsunami_warnings',
  label: 'Tsunami Alerts (US)',
  icon:  '🌊',
  color: '#3b82f6',

  async load(map, L) {
    const group = L.layerGroup()

    // Fetch all three sources in parallel
    const [nwsData, phebAlerts, paaqAlerts] = await Promise.allSettled([
      // US NWS API (US territories only)
      fetch('https://api.weather.gov/alerts/active?event=Tsunami%20Warning,Tsunami%20Watch,Tsunami%20Advisory')
        .then(r => r.json()).then(d => d.features || []).catch(() => []),
      // Pacific Tsunami Warning Center CAP (Pacific/Indian Ocean)
      fetchCAPAlerts('https://www.tsunami.gov/events/xml/PHEBAtom.xml'),
      // National Tsunami Warning Center CAP (Alaska/Atlantic)
      fetchCAPAlerts('https://www.tsunami.gov/events/xml/PAAQAtom.xml'),
    ])

    const nwsFeatures = nwsData.status === 'fulfilled' ? nwsData.value : []
    const phebItems   = phebAlerts.status === 'fulfilled' ? phebAlerts.value : []
    const paaqItems   = paaqAlerts.status === 'fulfilled' ? paaqAlerts.value : []

    // ── NWS alerts (have GeoJSON geometry) ────────────────────────────────
    nwsFeatures.forEach(f => {
      const event    = f.properties?.event || 'Tsunami Warning'
      const style    = ALERT_COLORS[event] || ALERT_COLORS['Tsunami Warning']
      const headline = f.properties?.headline || event
      const areas    = f.properties?.areaDesc || ''
      const sent     = f.properties?.sent
        ? new Date(f.properties.sent).toLocaleString() : ''

      if (f.geometry) {
        L.geoJSON(f.geometry, {
          style: {
            color:       style.color,
            weight:      2,
            fillColor:   style.fill,
            fillOpacity: 1,
            dashArray:   '4 3',
          },
        }).bindPopup(_popup(style, headline, areas, sent, null)).addTo(group)
      }
    })

    // ── CAP feed alerts (point-based — show marker + radius circle) ────────
    const capItems = [...phebItems, ...paaqItems]
    capItems.forEach(alert => {
      const style = ALERT_COLORS[alert.alertType] || ALERT_COLORS['Tsunami Warning']
      const popup = _popup(style, alert.title, alert.area, '', alert.link)

      if (alert.lat !== null && alert.lng !== null) {
        // Circle around the source point
        L.circle([alert.lat, alert.lng], {
          radius:      500000,  // 500km indicative radius
          color:       style.color,
          weight:      2,
          fillColor:   style.fill,
          fillOpacity: 0.15,
          dashArray:   '6 4',
        }).bindPopup(popup).addTo(group)

        // Marker at epicentre
        const icon = L.divIcon({
          className: '',
          html: `<div style="font-size:20px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8))">🌊</div>`,
          iconSize:   [24, 24],
          iconAnchor: [12, 12],
        })
        L.marker([alert.lat, alert.lng], { icon })
          .bindPopup(popup)
          .addTo(group)
      } else {
        // No coordinates — show floating label in center of map
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            background:${style.color}22;border:1.5px solid ${style.color};
            border-radius:6px;padding:3px 8px;color:${style.color};
            font-size:11px;font-family:sans-serif;font-weight:700;white-space:nowrap;
          ">🌊 ${style.label}: ${alert.area || alert.title.slice(0, 40)}</div>`,
          iconAnchor: [100, 10],
        })
        L.marker([10, -160], { icon, interactive: true })
          .bindPopup(popup)
          .addTo(group)
      }
    })

    group.addTo(map)
    return group
  },
}

function _popup(style, headline, areas, sent, link) {
  return `
    <div style="font-family:sans-serif;min-width:220px">
      <div style="background:${style.color}22;border-left:3px solid ${style.color};
        padding:6px 10px;margin-bottom:8px;">
        <div style="font-weight:700;font-size:14px;color:${style.color}">
          🌊 TSUNAMI ${style.label}
        </div>
      </div>
      <div style="font-size:12px;color:#e2e8f0;margin-bottom:4px">${headline}</div>
      ${areas ? `<div style="font-size:11px;color:#718096;margin-bottom:4px">${areas}</div>` : ''}
      ${sent  ? `<div style="font-size:11px;color:#718096">Issued: ${sent}</div>` : ''}
      ${link  ? `<div style="margin-top:6px"><a href="${link}" target="_blank"
        style="font-size:11px;color:#63b3ed">View bulletin →</a></div>` : ''}
    </div>
  `
}
