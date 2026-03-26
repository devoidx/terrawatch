export const EarthquakeHeatmapOverlay = {
    id: 'earthquake_heatmap',
    label: 'Heatmap',
    icon: '🔥',
    color: '#f97316',

    // Store reference to update function so we can refresh data
    _layer: null,
    _map: null,

    async load(map, L, earthquakeData) {
        // Dynamically load leaflet.heat from CDN
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.heat/0.2.0/leaflet-heat.js')

        const points = this._buildPoints(earthquakeData)

        this._layer = L.heatLayer(points, {
            radius: 25,
            blur: 20,
            maxZoom: 10,
            max: 1.0,
            minOpacity: 0.4,
            gradient: {
                0.0: '#000080',
                0.2: '#0000ff',
                0.4: '#00ffff',
                0.6: '#ffff00',
                0.8: '#ff8000',
                1.0: '#ff0000',
            },
        }).addTo(map)

        // Force heatmap canvas to top
        this._layer.setZIndex?.(500)

        this._map = map
        return this._layer
    },

    update(earthquakeData, L) {
        if (!this._layer) return
        const points = this._buildPoints(earthquakeData)
        this._layer.setLatLngs(points)
    },

    _buildPoints(earthquakeData) {
        if (!earthquakeData?.features) {
            return []
        }
        return earthquakeData.features
            .filter(f => f.geometry?.coordinates)
            .map(f => {
                const [lng, lat] = f.geometry.coordinates
                const mag = f.properties.mag || 0
                const intensity = Math.min(1.0, Math.max(0.05, (mag - 2.5) / 4.5))
                return [lat, lng, intensity]
            })
    },
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
        const s = document.createElement('script')
        s.src = src
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
    })
}