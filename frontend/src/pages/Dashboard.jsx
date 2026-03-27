import { useState, useCallback, useRef } from 'react'
import {
  Box, HStack, Button, useDisclosure, useToast, Text, Badge,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import TerraMap from '../components/TerraMap'
import EventSidebar from '../components/EventSidebar'
import MapControls from '../components/MapControls'
import AlertRegionModal from '../components/AlertRegionModal'
import { getEarthquakes, getVolcanoes, getEqStats, getAlertRegions } from '../api'
//import L from 'leaflet'

const L = window.L

const DEFAULT_FILTERS = {
  hours: 24,
  minMag: 2.5,
  showEarthquakes: true,
  showVolcanoes: true,
  showRegions: true,
  elevatedOnly: true,
  clusterMarkers: true,
  depthMode: false,
}

export default function Dashboard() {
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [drawMode, setDrawMode] = useState(false)
  const [drawnBounds, setDrawnBounds] = useState(null)
  const [editRegion, setEditRegion] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const updateFilter = (patch) => setFilters(f => ({ ...f, ...patch }))
  const mapInstanceRef = useRef(null)

  // ── Data queries ───────────────────────────────────────────────────────────
  const eqQuery = useQuery({
    queryKey: ['earthquakes', filters.hours, filters.minMag],
    queryFn: () => getEarthquakes({ hours: filters.hours, min_magnitude: filters.minMag }),
    refetchInterval: 120_000, // refresh every 2 min
  })

  const volcQuery = useQuery({
    queryKey: ['volcanoes', filters.elevatedOnly],
    queryFn: () => getVolcanoes({ elevated_only: filters.elevatedOnly }),
    refetchInterval: 300_000,
  })

  const statsQuery = useQuery({
    queryKey: ['eq-stats'],
    queryFn: getEqStats,
    refetchInterval: 120_000,
  })

  const regionsQuery = useQuery({
    queryKey: ['alert-regions'],
    queryFn: getAlertRegions,
  })

  // ── Draw handler ───────────────────────────────────────────────────────────
  const handleRegionDrawn = useCallback((bounds) => {
    setDrawnBounds(bounds)
    setEditRegion(null)
    onOpen()
  }, [onOpen])

  const handleDrawMode = () => {
    setDrawMode(d => !d)
    setDrawnBounds(null)
  }

  const handleModalClose = () => {
    onClose()
    setDrawMode(false)
    setDrawnBounds(null)
    setEditRegion(null)
  }

  const handleSaved = () => {
    regionsQuery.refetch()
    setDrawMode(false)
    setDrawnBounds(null)
  }

  const handleRefresh = () => {
    eqQuery.refetch()
    volcQuery.refetch()
    statsQuery.refetch()
    toast({ title: 'Data refreshed', status: 'success', duration: 1500, isClosable: true })
  }

  const handleReset = useCallback(() => {
    const map = mapInstanceRef.current
    if (map) map.flyTo([20, 0], 3, { duration: 1.2 })
  }, [])

  const handleMapReady = useCallback((mapInstance) => {
    mapInstanceRef.current = mapInstance
  }, [])

  const handleEarthquakeSelect = useCallback((feature) => {
    const [lng, lat] = feature.geometry.coordinates
    const map = mapInstanceRef.current
    if (!map) return
    map.flyTo([lat, lng], 7, { duration: 1.2 })
    // Flash a highlight ring at the location
    const mag = feature.properties.mag || 0
    const color = mag >= 7 ? '#9b2c2c' : mag >= 6 ? '#f56565' :
      mag >= 5 ? '#ed8936' : mag >= 4 ? '#ecc94b' : '#48bb78'
    const ring = L.circleMarker([lat, lng], {
      radius: 30, fillColor: 'transparent',
      color, weight: 3, opacity: 1,
    }).addTo(map)
    setTimeout(() => map.removeLayer(ring), 2500)
  }, [])

  const handleVolcanoSelect = useCallback((volcano) => {
    const map = mapInstanceRef.current
    if (!map) return
    map.flyTo([volcano.lat, volcano.lng], 7, { duration: 1.2 })
    const color = volcano.alert_level === 'warning' ? '#f56565' :
      volcano.alert_level === 'watch' ? '#ed8936' :
        volcano.alert_level === 'advisory' ? '#ecc94b' : '#48bb78'
    const ring = L.circleMarker([volcano.lat, volcano.lng], {
      radius: 30, fillColor: 'transparent',
      color, weight: 3, opacity: 1,
    }).addTo(map)
    setTimeout(() => map.removeLayer(ring), 2500)
  }, [])

  return (
    <Box h="calc(100vh - 57px)" display="flex" flexDir="column" overflow="hidden">
      {/* Draw mode banner */}
      {drawMode && (
        <Box
          bg="brand.700" px={4} py={2}
          display="flex" alignItems="center" justifyContent="space-between"
          flexShrink={0}
        >
          <HStack spacing={2}>
            <Text fontSize="sm" fontWeight="600" color="white">
              ✏️ Draw a rectangle on the map to define your alert region
            </Text>
          </HStack>
          <Button size="xs" variant="outline" colorScheme="whiteAlpha" onClick={handleDrawMode}>
            Cancel
          </Button>
        </Box>
      )}

      {/* Map + sidebar */}
      <HStack spacing={0} flex={1} overflow="hidden" align="stretch">
        {/* Map container */}
        <Box flex={1} position="relative" overflow="hidden">
          <TerraMap
            earthquakes={filters.showEarthquakes ? eqQuery.data : null}
            volcanoes={filters.showVolcanoes ? volcQuery.data : null}
            alertRegions={filters.showRegions ? (regionsQuery.data || []) : []}
            drawMode={drawMode}
            onRegionDrawn={handleRegionDrawn}
            hoursWindow={filters.hours}
            onMapReady={handleMapReady}
            clusterMarkers={filters.clusterMarkers}
            depthMode={filters.depthMode}
          />
          <MapControls
            filters={filters}
            onChange={updateFilter}
            onRefresh={handleRefresh}
            onReset={handleReset}
            lastUpdated={eqQuery.dataUpdatedAt}
            map={mapInstanceRef.current}
            earthquakeData={eqQuery.data}
          />

          {/* Draw region button - bottom left */}
          <Box position="absolute" bottom={4} left={4} zIndex={450}>
            <Button
              size="sm"
              colorScheme={drawMode ? 'orange' : 'brand'}
              variant={drawMode ? 'solid' : 'outline'}
              onClick={handleDrawMode}
              shadow="lg"
              bg={drawMode ? undefined : 'gray.900'}
              _hover={{ bg: drawMode ? undefined : 'gray.800' }}
            >
              {drawMode ? '✕ Cancel draw' : '+ New alert region'}
            </Button>
          </Box>

          {/* Live indicator - bottom right */}
          <Box position="absolute" bottom={4} right={4} zIndex={450}>
            <HStack
              bg="gray.900" border="1px solid" borderColor="whiteAlpha.200"
              borderRadius="full" px={3} py={1.5} spacing={2}
            >
              <Box w="7px" h="7px" borderRadius="full" bg="green.400" />
              <Text fontSize="xs" color="gray.400" fontFamily="mono">LIVE</Text>
              <Badge colorScheme="blue" variant="subtle" fontSize="2xs">
                {eqQuery.data?.features?.length ?? '—'} quakes
              </Badge>
              <Badge colorScheme="orange" variant="subtle" fontSize="2xs">
                {volcQuery.data?.volcanoes?.filter(v => v.alert_level !== 'normal').length ?? '—'} elevated
              </Badge>
            </HStack>
          </Box>
        </Box>

        {/* Sidebar toggle tab — sits between map and sidebar */}
        <Box
          position="relative"
          zIndex={450}
          display="flex"
          alignItems="center"
        >
          <Box
            as="button"
            onClick={() => setSidebarOpen(o => !o)}
            bg="gray.800"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRight="none"
            borderRadius="md 0 0 md"
            px={1}
            py={4}
            color="gray.400"
            fontSize="xs"
            cursor="pointer"
            _hover={{ bg: 'gray.700', color: 'white' }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            h="60px"
          >
            {sidebarOpen ? '›' : '‹'}
          </Box>
        </Box>

        {/* Sidebar */}
        {sidebarOpen && (
          <EventSidebar
            earthquakes={eqQuery.data}
            volcanoes={volcQuery.data}
            eqLoading={eqQuery.isLoading}
            volcLoading={volcQuery.isLoading}
            stats={statsQuery.data}
            onEarthquakeSelect={handleEarthquakeSelect}
            onVolcanoSelect={handleVolcanoSelect}
          />
        )}
      </HStack>

      {/* Alert region modal */}
      <AlertRegionModal
        isOpen={isOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        region={editRegion}
        drawnBounds={drawnBounds}
      />
    </Box>
  )
}
