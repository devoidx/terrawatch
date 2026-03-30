export const DartBuoysOverlay = {
  id:    'dart_buoys',
  label: 'DART Buoys',
  icon:  '🔵',
  color: '#06b6d4',

  async load(map, L) {
    // Fetch via TerraWatch backend to avoid CORS issues
    const res = await fetch('/api/data/dart-buoys', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('tw_token')}`,
      },
    })
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
        iconSize:   [12, 12],
        iconAnchor: [6, 6],
      })

      L.marker([station.lat, station.lng], { icon })
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:180px">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">
              🔵 DART Buoy ${station.id}
            </div>
            <div style="font-size:12px;color:#e2e8f0;margin-bottom:6px">
              ${station.name}
            </div>
            <div style="font-size:11px;color:#718096;margin-bottom:4px">
              ${station.lat.toFixed(3)}°, ${station.lng.toFixed(3)}°
            </div>
            <a href="https://www.ndbc.noaa.gov/station_page.php?station=${station.id}"
              target="_blank"
              style="font-size:11px;color:#06b6d4;display:block;">
              View live data on NOAA →
            </a>
          </div>
        `)
        .addTo(group)
    })

    const legendIcon = L.divIcon({
      className: '',
      html: `<div style="
        background:rgba(6,182,212,0.1);
        border:1px solid rgba(6,182,212,0.4);
        border-radius:6px;
        padding:3px 7px;
        color:#67e8f9;
        font-size:10px;
        font-family:sans-serif;
        white-space:nowrap;
        font-weight:600;
      ">🔵 ${stations.length} DART buoys</div>`,
      iconAnchor: [0, 0],
    })
    L.marker([55, -170], { icon: legendIcon, interactive: false }).addTo(group)

    group.addTo(map)
    return group
  },
}