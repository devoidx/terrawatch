export const DartBuoysOverlay = {
    id: 'dart_buoys',
    label: 'DART Buoys',
    icon: '🔵',
    color: '#06b6d4',

    async load(map, L) {
        const token = localStorage.getItem('tw_token')
        const headers = { 'Authorization': `Bearer ${token}` }

        // Fetch live station list from backend (proxied from NOAA)
        const res = await fetch('/api/data/dart-buoys', { headers })
        const data = await res.json()
        const stations = data.stations || []

        const group = L.layerGroup()

        stations.forEach(station => {
            const icon = L.divIcon({
                className: '',
                html: `<div style="
          width:12px;height:12px;
          border-radius:50%;
          background:#06b6d4;
          border:2px solid white;
          box-shadow:0 0 0 1px #06b6d4, 0 0 6px rgba(6,182,212,0.6);
        "></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6],
            })

            const marker = L.marker([station.lat, station.lng], { icon })

            // Bind popup with lazy-loaded water column height
            marker.bindPopup(() => {
                const container = document.createElement('div')
                container.style.cssText = 'font-family:sans-serif;min-width:200px'
                container.innerHTML = `
    <div style="font-weight:700;font-size:14px;margin-bottom:4px">
      🔵 DART Buoy ${station.id}
    </div>
    <div style="font-size:12px;color:#e2e8f0;margin-bottom:4px">${station.name}</div>
    <div style="font-size:11px;color:#718096;margin-bottom:6px">
      ${station.lat.toFixed(3)}°, ${station.lng.toFixed(3)}°
    </div>
    <div id="dart-reading-${station.id}" style="
      background:rgba(6,182,212,0.1);
      border:1px solid rgba(6,182,212,0.3);
      border-radius:6px;
      padding:6px 8px;
      margin-bottom:6px;
      font-size:12px;
    ">
      <span style="color:#718096">Loading...</span>
    </div>
    <a href="https://www.ndbc.noaa.gov/station_page.php?station=${station.id}"
      target="_blank"
      style="font-size:11px;color:#06b6d4;display:block;">
      View full data on NOAA →
    </a>
  `
                return container
            })

            // Use popupopen event — fires after popup is in the DOM
            marker.on('popupopen', () => {
                fetch(`/api/data/dart-buoy/${station.id}`, { headers })
                    .then(r => r.json())
                    .then(d => {
                        const el = document.getElementById(`dart-reading-${station.id}`)
                        if (!el) return

                        if (d.status === 'ok' && d.readings?.length > 0) {
                            const readings = [...d.readings].reverse() // oldest first for chart
                            const heights = readings.map(r => r.height)
                            const latest = d.readings[0]
                            const min = Math.min(...heights)
                            const max = Math.max(...heights)
                            const range = max - min || 0.001
                            const W = 220, H = 50, pad = 4

                            // Build SVG polyline points
                            const points = heights.map((h, i) => {
                                const x = pad + (i / (heights.length - 1)) * (W - pad * 2)
                                const y = H - pad - ((h - min) / range) * (H - pad * 2)
                                return `${x.toFixed(1)},${y.toFixed(1)}`
                            }).join(' ')

                            // Anomaly detection — flag if latest deviates > 0.5m from mean
                            const mean = heights.reduce((a, b) => a + b, 0) / heights.length
                            const dev = Math.abs(latest.height - mean)
                            const anomaly = dev > 0.5
                            const color = anomaly ? '#f56565' : '#06b6d4'
                            const label = anomaly
                                ? `⚠️ Anomaly detected (+${dev.toFixed(3)}m from mean)`
                                : `Stable (±${dev.toFixed(3)}m from mean)`
                            const labelCol = anomaly ? '#f56565' : '#718096'

                            el.innerHTML = `
          <div style="color:${color};font-weight:700;font-size:13px;margin-bottom:2px">
            ${latest.height.toFixed(3)} m
          </div>
          <div style="color:#718096;font-size:10px;margin-bottom:6px">
            Updated: ${latest.time}
          </div>
          <svg width="${W}" height="${H}" style="display:block;margin-bottom:4px">
            <polyline
              points="${points}"
              fill="none"
              stroke="${color}"
              stroke-width="1.5"
              stroke-linejoin="round"
              opacity="0.9"
            />
            <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}"
              stroke="#2d3748" stroke-width="1"/>
          </svg>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:#4a5568;margin-bottom:4px">
            <span>24h ago</span>
            <span>now</span>
          </div>
          <div style="font-size:10px;color:${labelCol}">${label}</div>
          <div style="font-size:9px;color:#4a5568;margin-top:2px">
            min ${min.toFixed(3)}m / max ${max.toFixed(3)}m
          </div>
        `
                        } else {
                            el.innerHTML = `
          <div style="color:#718096;font-size:11px">
            📴 Buoy offline or in maintenance
          </div>
          <div style="color:#4a5568;font-size:10px;margin-top:2px">
            No realtime data available
          </div>
        `
                        }
                    })
                    .catch(() => {
                        const el = document.getElementById(`dart-reading-${station.id}`)
                        if (el) el.innerHTML = `<span style="color:#718096">Could not load data</span>`
                    })
            })

            marker.addTo(group)
        })

        group.addTo(map)
        return group
    },
}