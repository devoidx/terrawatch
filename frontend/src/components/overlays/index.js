import { TectonicPlatesOverlay }   from './TectonicPlates'
import { EarthquakeHeatmapOverlay } from './EarthquakeHeatmap'
import { TsunamiWarningsOverlay }  from './TsunamiWarnings'
import { DartBuoysOverlay }        from './DartBuoys'
import { ActiveFaultsOverlay }     from './ActiveFaults'
import { SeismicHazardUSOverlay }  from './SeismicHazardUS'
import { VaacAdvisoriesOverlay }   from './VaacAdvisories'
import { USGSFaultsOverlay }       from './USGSFaults'
import { GEMHazardOverlay } from './GEMHazard'

export const OVERLAYS = [
  TectonicPlatesOverlay,
  EarthquakeHeatmapOverlay,
  TsunamiWarningsOverlay,
  DartBuoysOverlay,
  ActiveFaultsOverlay,
  SeismicHazardUSOverlay,
  GEMHazardOverlay,        // ← add here
  VaacAdvisoriesOverlay,
  USGSFaultsOverlay,
]