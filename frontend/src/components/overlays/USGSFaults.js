// USGS Quaternary Fault and Fold Database (QFaults)
// US-only, higher detail than GEM for US faults
// Source: https://earthquake.usgs.gov/arcgis/services/haz/Qfaults/MapServer/WMSServer

export const USGSFaultsOverlay = {
  id:    'usgs_faults',
  label: 'USGS Faults (US)',
  icon:  '🔴',
  color: '#dc2626',

  async load(map, L) {
    const layer = L.tileLayer.wms(
      'https://earthquake.usgs.gov/arcgis/services/haz/Qfaults/MapServer/WMSServer',
      {
        layers:      '21',       // National Database layer
        format:      'image/png',
        transparent: true,
        opacity:     0.75,
        version:     '1.3.0',
        attribution: 'USGS Quaternary Fault and Fold Database',
      }
    ).addTo(map)

    return layer
  },
}