export const VaacAdvisoriesOverlay = {
  id:    'vaac_advisories',
  label: 'Ash Cloud Advisories',
  icon:  '🌋',
  color: '#d97706',

  async load(map, L) {
    const token = localStorage.getItem('tw_token')
    const res   = await fetch('/api/data/vaac-advisories', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data  = await res.json()
    const group = L.layerGroup()

    const advisories = data.advisories || []

    advisories.forEach(adv => {
      // Observed ash cloud — solid orange polygon
      if (adv.obs_polygon?.length >= 3) {
        const latlngs = adv.obs_polygon.map(([lng, lat]) => [lat, lng])
        L.polygon(latlngs, {
          color:       '#f97316',
          weight:      2,
          fillColor:   '#f97316',
          fillOpacity: 0.3,
          dashArray:   null,
        })
          .bindPopup(_buildPopup(adv, 'observed'))
          .addTo(group)
      }

      // Forecast polygons — progressively more transparent dashed outlines
      const fcastColors = ['#fbbf24', '#fde68a', '#fef3c7']
      adv.forecasts?.forEach((fc, i) => {
        if (!fc.polygon || fc.no_ash) return
        const latlngs = fc.polygon.map(([lng, lat]) => [lat, lng])
        const color   = fcastColors[Math.min(i, fcastColors.length - 1)]
        L.polygon(latlngs, {
          color,
          weight:      1.5,
          fillColor:   color,
          fillOpacity: 0.12 - (i * 0.03),
          dashArray:   '5 4',
        })
          .bindPopup(_buildPopup(adv, 'forecast', fc.time))
          .addTo(group)
      })

      // Volcano source marker
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          font-size:16px;
          filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8));
          cursor:pointer;
        ">🌋</div>`,
        iconSize:   [20, 20],
        iconAnchor: [10, 10],
      })
      L.marker([adv.lat, adv.lng], { icon })
        .bindPopup(_buildPopup(adv, 'source'))
        .addTo(group)
    })

    group.addTo(map)
    return group
  },
}

function _buildPopup(adv, type, fcTime) {
  const timeStr = adv.issue_time
    ? new Date(adv.issue_time).toUTCString().replace(' GMT', ' UTC')
    : ''

  const title = type === 'source'
    ? `🌋 ${adv.volcano} — ${adv.region}`
    : type === 'forecast'
      ? `☁️ Ash Forecast — ${adv.volcano}`
      : `☁️ Observed Ash Cloud — ${adv.volcano}`

  const altText = adv.obs_upper
    ? `FL${adv.obs_lower === 'GND' ? 'GND' : adv.obs_lower}–FL${adv.obs_upper}`
    : ''

  const fcTimeStr = fcTime
    ? `Valid: ${new Date(fcTime).toUTCString().replace(' GMT', ' UTC')}`
    : ''

  return `
    <div style="font-family:sans-serif;min-width:200px">
      <div style="font-weight:700;font-size:14px;margin-bottom:6px;color:#fcd34d">
        ${title}
      </div>
      ${adv.eruption ? `<div style="font-size:12px;color:#e2e8f0;margin-bottom:4px">${adv.eruption}</div>` : ''}
      ${altText ? `<div style="font-size:11px;color:#718096;margin-bottom:2px">
        Altitude: <span style="color:#e2e8f0">${altText}</span>
      </div>` : ''}
      ${adv.elevation ? `<div style="font-size:11px;color:#718096;margin-bottom:2px">
        Summit: <span style="color:#e2e8f0">${parseInt(adv.elevation).toLocaleString()} ft</span>
      </div>` : ''}
      ${fcTimeStr ? `<div style="font-size:11px;color:#fbbf24;margin-bottom:2px">${fcTimeStr}</div>` : ''}
      ${timeStr ? `<div style="font-size:10px;color:#4a5568;margin-top:4px">Issued: ${timeStr}</div>` : ''}
    </div>
  `
}