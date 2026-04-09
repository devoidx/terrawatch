// GEM Global Seismic Hazard Map (v2023.1)
// PGA with 10% probability of exceedance in 50 years (475-year return period)
// Source: https://maps.openquake.org / CC BY-NC-SA 4.0

export const GEMHazardOverlay = {
  id:    'gem_hazard',
  label: 'Seismic Hazard (Global)',
  icon:  '🟠',
  color: '#f97316',

  async load(map, L) {
    const layer = L.tileLayer(
      'https://maps.openquake.org/tiles/ghm/wmts/seismic-hazard-pga-g/webmercator/{z}/{x}/{y}.png',
      {
        opacity:     0.7,
        attribution: '© GEM Foundation, CC BY-NC-SA 4.0',
        maxZoom:     12,
      }
    ).addTo(map)

    return layer
  },
}