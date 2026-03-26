export const TectonicPlatesOverlay = {
  id:    'tectonic_plates',
  label: 'Tectonic Plates',
  icon:  '🗺️',
  color: '#a78bfa',

  async load(map, L) {
    const res = await fetch(
      'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json'
    )
    const data = await res.json()

    return L.geoJSON(data, {
      style: {
        color:     '#a78bfa',
        weight:    1.5,
        opacity:   0.6,
        dashArray: '4 4',
        fillColor: 'transparent',
      },
      onEachFeature: (feature, layer) => {
        const type = feature.properties?.Type || 'Plate boundary'
        layer.bindTooltip(type, { sticky: true, className: 'plate-tooltip' })
      },
    }).addTo(map)
  },
}