// USGS Quaternary Fault and Fold Database (QFaults)
// US-only, higher detail than GEM for US faults
// Source: https://earthquake.usgs.gov/arcgis/services/haz/Qfaults/MapServer/WMSServer

export const USGSFaultsOverlay = {
  id:    'usgs_faults',
  label: 'USGS Faults (US)',
  icon:  '🔴',
  color: '#dc2626',

  async load(map, L) {
    // Use WMS with transparent=true — white areas are truly transparent in PNG
    // Remove any blend mode tricks
    const layer = L.tileLayer.wms(
      'https://earthquake.usgs.gov/arcgis/services/haz/Qfaults/MapServer/WMSServer',
      {
        layers:          '0,1',
        format:          'image/png',
        transparent:     true,
        opacity:         0.9,
        version:         '1.3.0',
        bgcolor:         '0x000000',  // black background treated as transparent
        attribution:     'USGS Quaternary Fault and Fold Database',
      }
    ).addTo(map)

    return layer
  },
}