const ALERT_COLORS = {
  'Tsunami Warning':  { color: '#f56565', fill: '#f5656533', label: 'WARNING' },
  'Tsunami Watch':    { color: '#ed8936', fill: '#ed893633', label: 'WATCH' },
  'Tsunami Advisory': { color: '#ecc94b', fill: '#ecc94b33', label: 'ADVISORY' },
}

export const TsunamiWarningsOverlay = {
  id:    'tsunami_warnings',
  label: 'Tsunami Alerts',
  icon:  '🌊',
  color: '#3b82f6',

  _noAlertMarker: null,

  async load(map, L) {
    const res = await fetch(
      'https://api.weather.gov/alerts/active?event=Tsunami%20Warning,Tsunami%20Watch,Tsunami%20Advisory'
    )
    const data = await res.json()
    const features = data.features || []
    const group = L.layerGroup()

    if (features.length === 0) {
      // No active alerts — overlay is active but empty, which is correct
      // Button label will show it's on, user knows no alerts = good news
    } else {
      features.forEach(f => {
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
          }).bindPopup(`
            <div style="font-family:sans-serif;min-width:220px">
              <div style="
                background:${style.color}22;
                border-left:3px solid ${style.color};
                padding:6px 10px;
                margin-bottom:8px;
              ">
                <div style="font-weight:700;font-size:14px;color:${style.color}">
                  🌊 TSUNAMI ${style.label}
                </div>
              </div>
              <div style="font-size:12px;color:#e2e8f0;margin-bottom:4px">${headline}</div>
              ${areas ? `<div style="font-size:11px;color:#718096;margin-bottom:4px">${areas}</div>` : ''}
              ${sent ? `<div style="font-size:11px;color:#718096">Issued: ${sent}</div>` : ''}
            </div>
          `).addTo(group)
        }
      })
    }

    group.addTo(map)
    return group
  },
}