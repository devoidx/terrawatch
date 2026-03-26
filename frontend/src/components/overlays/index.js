import { TectonicPlatesOverlay } from './TectonicPlates'
import { EarthquakeHeatmapOverlay } from './EarthquakeHeatmap'

// Add future overlays here — they just need id, label, icon, color, and a load(map, L) function
export const OVERLAYS = [
  TectonicPlatesOverlay,
  EarthquakeHeatmapOverlay,
]