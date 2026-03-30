// USGS National Seismic Hazard Map tile layer
// Peak Ground Acceleration, 10% probability of exceedance in 50 years (2014 model)
// Coverage: Conterminous United States only

export const SeismicHazardUSOverlay = {
  id:    'seismic_hazard_us',
  label: 'Seismic Hazard (US)',
  icon:  '🟥',
  color: '#ef4444',

  async load(map, L) {
    // USGS ArcGIS tile service — US only, white background tiles
    // We use opacity to blend with the dark basemap
    const layer = L.tileLayer(
      'https://earthquake.usgs.gov/arcgis/rest/services/haz/USpga050_2014/MapServer/tile/{z}/{y}/{x}',
      {
        opacity:     0.55,
        minZoom:     3,
        maxZoom:     12,
        attribution: 'USGS National Seismic Hazard Map (2014)',
        // Tile errors are expected outside the US — suppress them
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      }
    ).addTo(map)

    return layer
  },
}