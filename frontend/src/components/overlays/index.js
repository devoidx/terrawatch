import { TectonicPlatesOverlay } from './TectonicPlates'
import { EarthquakeHeatmapOverlay } from './EarthquakeHeatmap'
import { TsunamiWarningsOverlay }  from './TsunamiWarnings'
import { DartBuoysOverlay }        from './DartBuoys'

// Add future overlays here — they just need id, label, icon, color, and a load(map, L) function
export const OVERLAYS = [
  TectonicPlatesOverlay,
  EarthquakeHeatmapOverlay,
  TsunamiWarningsOverlay,
  DartBuoysOverlay,
]