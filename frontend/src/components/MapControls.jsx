import { useState } from 'react'
import {
  Box, VStack, HStack, Text, Select, Slider, SliderTrack,
  SliderFilledTrack, SliderThumb, Badge, Tooltip, Button,
  IconButton, Divider,
} from '@chakra-ui/react'
import OverlayManager from './OverlayManager'

const EQ_SCALE = [
  { label: 'M1.0–2.4', color: '#a0aec0', desc: 'Micro' },
  { label: 'M2.5–3.9', color: '#48bb78', desc: 'Minor' },
  { label: 'M4.0–4.9', color: '#ecc94b', desc: 'Light' },
  { label: 'M5.0–5.9', color: '#ed8936', desc: 'Moderate' },
  { label: 'M6.0–6.9', color: '#f56565', desc: 'Strong' },
  { label: 'M7.0+', color: '#9b2c2c', desc: 'Major' },
]

const VOLC_SCALE = [
  { label: 'Normal', color: '#48bb78' },
  { label: 'Advisory', color: '#ecc94b' },
  { label: 'Watch', color: '#ed8936' },
  { label: 'Warning', color: '#f56565' },
]

export default function MapControls({
  filters, onChange, onRefresh, onReset, lastUpdated, map, earthquakeData
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [legendExpanded, setLegendExpanded] = useState(false)

  return (
    <Box
      position="absolute"
      top={4}
      left={4}
      zIndex={450}
      bg="gray.900"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.200"
      shadow="xl"
      backdropFilter="blur(12px)"
      minW={collapsed ? 'auto' : '240px'}
      maxH="calc(100vh - 120px)"
      display="flex"
      flexDir="column"
      overflow="hidden"
    >
      {/* Header — always visible, never scrolls */}
      <HStack px={3} py={2} justify="space-between" flexShrink={0}>
        {!collapsed && (
          <Text fontSize="xs" fontWeight="700" color="gray.400"
            textTransform="uppercase" letterSpacing="wider">
            Filters
          </Text>
        )}
        <HStack spacing={1} ml={collapsed ? 0 : 'auto'}>
          {!collapsed && (
            <>
              <Button size="xs" variant="ghost" color="gray.500"
                onClick={onReset} _hover={{ bg: 'whiteAlpha.100' }}>
                ⌂
              </Button>
              <Button size="xs" variant="ghost" color="brand.400"
                onClick={onRefresh} _hover={{ bg: 'whiteAlpha.100' }}>
                ↻ Refresh
              </Button>
            </>
          )}
          <IconButton
            size="xs" variant="ghost" color="gray.400"
            icon={<Text fontSize="sm">{collapsed ? '▶' : '◀'}</Text>}
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle filters"
            _hover={{ bg: 'whiteAlpha.100' }}
          />
        </HStack>
      </HStack>

      {/* Scrollable content area */}
      {!collapsed && (
        <Box
          overflowY="auto"
          flex={1}
          sx={{
            '&::-webkit-scrollbar': { width: '4px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '2px',
            },
          }}
        >
          <VStack spacing={3} align="stretch" px={3} pb={3}>

            {/* Time range */}
            <VStack spacing={1} align="stretch">
              <Text fontSize="xs" color="gray.500">Time range</Text>
              <Select
                size="sm" value={filters.hours}
                onChange={e => onChange({ hours: Number(e.target.value) })}
                bg="gray.800" borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'brand.500' }} fontSize="sm"
              >
                <option value={1}>Last 1 hour</option>
                <option value={6}>Last 6 hours</option>
                <option value={24}>Last 24 hours</option>
                <option value={48}>Last 48 hours</option>
                <option value={168}>Last 7 days</option>
              </Select>
            </VStack>

            {/* Min magnitude */}
            <VStack spacing={1} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.500">Min magnitude</Text>
                <Badge colorScheme="brand" variant="subtle" fontSize="xs" fontFamily="mono">
                  M{filters.minMag.toFixed(1)}+
                </Badge>
              </HStack>
              <Slider
                min={1.0} max={7} step={0.5}
                value={filters.minMag}
                onChange={v => onChange({ minMag: v })}
                colorScheme="brand"
              >
                <SliderTrack bg="gray.700"><SliderFilledTrack /></SliderTrack>
                <Tooltip label={`M${filters.minMag.toFixed(1)}+`} placement="top">
                  <SliderThumb boxSize={4} bg="brand.400" />
                </Tooltip>
              </Slider>
              {filters.minMag < 2.5 && (
                <Text fontSize="2xs" color="orange.400">
                  ⚠️ Below M2.5 only shows events near well-monitored networks (US, Japan etc.)
                </Text>
              )}
            </VStack>

            {/* Layer toggles */}
            <VStack spacing={1} align="stretch">
              <Text fontSize="xs" color="gray.500">Layers</Text>
              <HStack spacing={2}>
                <Button size="sm"
                  variant={filters.showEarthquakes ? 'solid' : 'outline'}
                  colorScheme="blue"
                  onClick={() => onChange({ showEarthquakes: !filters.showEarthquakes })}
                  flex={1}>
                  🌍 Quakes
                </Button>
                <Button size="sm"
                  variant={filters.showVolcanoes ? 'solid' : 'outline'}
                  colorScheme="orange"
                  onClick={() => onChange({ showVolcanoes: !filters.showVolcanoes })}
                  flex={1}>
                  🌋 Volcanoes
                </Button>
              </HStack>
              <HStack spacing={2}>
                <Button size="sm"
                  variant={filters.showRegions ? 'solid' : 'outline'}
                  colorScheme="brand"
                  onClick={() => onChange({ showRegions: !filters.showRegions })}
                  flex={1}>
                  📍 Regions
                </Button>
                <Button size="sm"
                  variant={filters.elevatedOnly ? 'solid' : 'outline'}
                  colorScheme="yellow"
                  onClick={() => onChange({ elevatedOnly: !filters.elevatedOnly })}
                  flex={1}>
                  {filters.elevatedOnly ? '⚠️ Elevated' : '🌋 All'}
                </Button>
              </HStack>
              <Button size="sm"
                variant={filters.clusterMarkers ? 'solid' : 'outline'}
                colorScheme="brand"
                onClick={() => onChange({ clusterMarkers: !filters.clusterMarkers })}
                w="100%">
                {filters.clusterMarkers ? '⬤ Clustering ON' : '○ Clustering OFF'}
              </Button>
              <Button size="sm"
                variant={filters.depthMode ? 'solid' : 'outline'}
                colorScheme="purple"
                onClick={() => onChange({ depthMode: !filters.depthMode })}
                w="100%">
                {filters.depthMode ? '🎨 Colour: Depth' : '🎨 Colour: Magnitude'}
              </Button>
            </VStack>

            {/* Overlays */}
            <OverlayManager map={map} earthquakeData={earthquakeData} />

            <Divider borderColor="whiteAlpha.100" />

            {/* Legend — collapsible */}
            <VStack spacing={0} align="stretch">
              <HStack
                justify="space-between"
                cursor="pointer"
                onClick={() => setLegendExpanded(l => !l)}
                py={1}
                _hover={{ color: 'white' }}
              >
                <Text fontSize="xs" fontWeight="700" color="gray.400"
                  textTransform="uppercase" letterSpacing="wider">
                  Legend
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {legendExpanded ? '▲' : '▼'}
                </Text>
              </HStack>

              {legendExpanded && (
                <VStack spacing={2} align="stretch" pt={2}>
                  <Text fontSize="2xs" fontWeight="700" color="gray.400"
                    textTransform="uppercase" letterSpacing="wider">
                    Earthquakes — {filters.depthMode ? 'by depth' : 'by magnitude'}
                  </Text>

                  {filters.depthMode ? (
                    <>
                      {[
                        { label: '0–10 km', color: '#ff4444', desc: 'Very shallow' },
                        { label: '11–35 km', color: '#ff8c00', desc: 'Shallow' },
                        { label: '36–70 km', color: '#ffd700', desc: 'Intermediate' },
                        { label: '71–150 km', color: '#00bcd4', desc: 'Deep' },
                        { label: '150+ km', color: '#7c3aed', desc: 'Very deep' },
                      ].map(({ label, color, desc }) => (
                        <HStack key={label} spacing={2}>
                          <Box w="10px" h="10px" borderRadius="full"
                            flexShrink={0} bg={color} opacity={0.85} />
                          <Text fontSize="2xs" color="gray.300" fontFamily="mono">{label}</Text>
                          <Text fontSize="2xs" color="gray.500">{desc}</Text>
                        </HStack>
                      ))}
                    </>
                  ) : (
                    <>
                      {EQ_SCALE.map(({ label, color, desc }) => (
                        <HStack key={label} spacing={2}>
                          <Box w="10px" h="10px" borderRadius="full"
                            flexShrink={0} bg={color} opacity={0.85} />
                          <Text fontSize="2xs" color="gray.300" fontFamily="mono">{label}</Text>
                          <Text fontSize="2xs" color="gray.500">{desc}</Text>
                        </HStack>
                      ))}
                    </>
                  )}

                  <Divider borderColor="whiteAlpha.100" mt={1} />

                  <Text fontSize="2xs" fontWeight="700" color="gray.400"
                    textTransform="uppercase" letterSpacing="wider">
                    Volcanoes
                  </Text>
                  {VOLC_SCALE.map(({ label, color }) => (
                    <HStack key={label} spacing={2}>
                      <svg width="12" height="11" viewBox="0 0 20 18"
                        style={{ flexShrink: 0 }}>
                        <polygon points="10,1 19,17 1,17" fill={color}
                          stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
                      </svg>
                      <Text fontSize="2xs" color="gray.300">{label}</Text>
                    </HStack>
                  ))}

                  <Divider borderColor="whiteAlpha.100" mt={1} />

                  <HStack spacing={2}>
                    <Box w="10px" h="10px" borderRadius="full"
                      border="2px solid" borderColor="green.400" flexShrink={0} />
                    <Text fontSize="2xs" color="gray.400">Pulse = last 30 min</Text>
                  </HStack>
                  <Text fontSize="2xs" color="gray.500" pl="14px">
                    Fade = older events
                  </Text>
                </VStack>
              )}
            </VStack>

            {lastUpdated && (
              <Text fontSize="2xs" color="gray.600" textAlign="right">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </Text>
            )}

          </VStack>
        </Box>
      )}
    </Box>
  )
}