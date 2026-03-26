import { useState } from 'react'
import {
  Box, VStack, HStack, Text, Select, Slider, SliderTrack,
  SliderFilledTrack, SliderThumb, Badge, Tooltip, Button, IconButton,
} from '@chakra-ui/react'
import OverlayManager from './OverlayManager'

export default function MapControls({ filters, onChange, onRefresh, onReset, lastUpdated, map }) {
  const [collapsed, setCollapsed] = useState(false)

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
      overflow="hidden"
    >
      {/* Header */}
      <HStack px={3} py={2} justify="space-between">
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
            size="xs"
            variant="ghost"
            color="gray.400"
            icon={<Text fontSize="sm">{collapsed ? '▶' : '◀'}</Text>}
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle filters"
            _hover={{ bg: 'whiteAlpha.100' }}
          />
        </HStack>
      </HStack>

      {/* Content */}
      {!collapsed && (
        <VStack spacing={3} align="stretch" px={3} pb={3}>
          {/* Time range */}
          <VStack spacing={1} align="stretch">
            <Text fontSize="xs" color="gray.500">Time range</Text>
            <Select
              size="sm"
              value={filters.hours}
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
              min={2.5} max={7} step={0.5}
              value={filters.minMag}
              onChange={v => onChange({ minMag: v })}
              colorScheme="brand"
            >
              <SliderTrack bg="gray.700">
                <SliderFilledTrack />
              </SliderTrack>
              <Tooltip label={`M${filters.minMag.toFixed(1)}+`} placement="top">
                <SliderThumb boxSize={4} bg="brand.400" />
              </Tooltip>
            </Slider>
          </VStack>

          {/* Layer toggles */}
          <VStack spacing={1} align="stretch">
            <Text fontSize="xs" color="gray.500">Layers</Text>
            <HStack spacing={2}>
              <Button
                size="sm"
                variant={filters.showEarthquakes ? 'solid' : 'outline'}
                colorScheme="blue"
                onClick={() => onChange({ showEarthquakes: !filters.showEarthquakes })}
                flex={1}
              >
                🌍 Quakes
              </Button>
              <Button
                size="sm"
                variant={filters.showVolcanoes ? 'solid' : 'outline'}
                colorScheme="orange"
                onClick={() => onChange({ showVolcanoes: !filters.showVolcanoes })}
                flex={1}
              >
                🌋 Volcanoes
              </Button>
            </HStack>
            <HStack spacing={2}>
              <Button
                size="sm"
                variant={filters.showRegions ? 'solid' : 'outline'}
                colorScheme="brand"
                onClick={() => onChange({ showRegions: !filters.showRegions })}
                flex={1}
              >
                📍 Regions
              </Button>
              <Button
                size="sm"
                variant={filters.elevatedOnly ? 'solid' : 'outline'}
                colorScheme="yellow"
                onClick={() => onChange({ elevatedOnly: !filters.elevatedOnly })}
                flex={1}
              >
                {filters.elevatedOnly ? '⚠️ Elevated' : '🌋 All'}
              </Button>
            </HStack>
          </VStack>

          {/* Overlays */}
          <OverlayManager map={map} />

          {lastUpdated && (
            <Text fontSize="2xs" color="gray.600" textAlign="right">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </Text>
          )}
        </VStack>
      )}
    </Box>
  )
}