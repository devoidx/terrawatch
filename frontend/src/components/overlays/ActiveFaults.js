const SLIP_COLORS = {
  'Normal':           '#60a5fa',  // blue
  'Reverse':          '#f87171',  // red
  'Dextral':          '#fb923c',  // orange
  'Sinistral':        '#a78bfa',  // purple
  'Strike-Slip':      '#fb923c',
  'Thrust':           '#f87171',
  'Oblique-Normal':   '#34d399',
  'Oblique-Reverse':  '#f472b6',
}

function slipColor(slipType) {
  if (!slipType) return '#94a3b8'
  for (const [key, color] of Object.entries(SLIP_COLORS)) {
    if (slipType.toLowerCase().includes(key.toLowerCase())) return color
  }
  return '#94a3b8'
}

export const ActiveFaultsOverlay = {
  id:    'active_faults',
  label: 'Active Faults',
  icon:  '⚡',
  color: '#f87171',

  async load(map, L) {
    const token = localStorage.getItem('tw_token')
    const res = await fetch('/api/data/active-faults', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()

    const layer = L.geoJSON(data, {
      style: (feature) => ({
        color:   slipColor(feature.properties?.slip_type),
        weight:  1.2,
        opacity: 0.7,
      }),
      onEachFeature: (feature, layer) => {
        const p        = feature.properties || {}
        const name     = p.name     || 'Unknown fault'
        const slipType = p.slip_type  || 'Unknown'
        const slipRate = p.slip_rate  ? `${p.slip_rate} mm/yr` : 'Unknown'
        const country  = p.country   || ''
        const color    = slipColor(slipType)

        layer.bindTooltip(name, { sticky: true, className: 'fault-tooltip' })
        layer.bindPopup(`
          <div style="font-family:sans-serif;min-width:180px">
            <div style="font-weight:700;font-size:14px;margin-bottom:6px">
              ⚡ ${name}
            </div>
            <div style="margin-bottom:3px">
              <span style="
                background:${color}22;color:${color};
                border:1px solid ${color}55;
                padding:1px 6px;border-radius:99px;
                font-size:11px;font-weight:600;
              ">${slipType}</span>
            </div>
            <div style="font-size:12px;color:#718096;margin-top:4px">
              Slip rate: <span style="color:#e2e8f0">${slipRate}</span>
            </div>
            ${country ? `<div style="font-size:11px;color:#4a5568;margin-top:2px">${country}</div>` : ''}
          </div>
        `)
      },
    }).addTo(map)

    return layer
  },
}