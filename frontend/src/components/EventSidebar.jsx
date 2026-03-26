import {
  Box, VStack, HStack, Text, Badge, Divider, Spinner,
  Center, Tabs, TabList, Tab, TabPanels, TabPanel,
} from '@chakra-ui/react'

const MAG_COLOR = (mag) => {
  if (mag >= 7)   return 'red'
  if (mag >= 6)   return 'orange'
  if (mag >= 5)   return 'yellow'
  if (mag >= 4)   return 'green'
  return 'gray'
}

const VOLCANO_COLOR = { normal: 'green', advisory: 'yellow', watch: 'orange', warning: 'red' }

function TimeAgo({ timestamp }) {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 60)  return <Text as="span" fontSize="xs" color="gray.500">{mins}m ago</Text>
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return <Text as="span" fontSize="xs" color="gray.500">{hrs}h ago</Text>
  return <Text as="span" fontSize="xs" color="gray.500">{Math.floor(hrs/24)}d ago</Text>
}

function EqItem({ feature, onSelect }) {
  const mag   = feature.properties.mag || 0
  const place = feature.properties.place || 'Unknown location'
  const time  = feature.properties.time

  return (
    <Box
      px={3} py={2.5}
      _hover={{ bg: 'whiteAlpha.100', cursor: 'pointer' }}
      borderRadius="md"
      transition="background 0.15s"
      onClick={() => onSelect(feature)}
    >
      <HStack justify="space-between" align="flex-start">
        <HStack align="flex-start" spacing={2.5} flex={1}>
          <Badge
            colorScheme={MAG_COLOR(mag)}
            variant="solid"
            fontSize="xs"
            minW="40px"
            textAlign="center"
            mt="1px"
          >
            M{mag.toFixed(1)}
          </Badge>
          <Text fontSize="xs" color="gray.300" lineHeight="1.4" flex={1} noOfLines={2}>
            {place}
          </Text>
        </HStack>
        <TimeAgo timestamp={time} />
      </HStack>
    </Box>
  )
}

function VolcItem({ volcano, onSelect }) {
  return (
    <Box
      px={3} py={2.5}
      _hover={{ bg: 'whiteAlpha.100', cursor: 'pointer' }}
      borderRadius="md"
      transition="background 0.15s"
      onClick={() => onSelect(volcano)}
    >
      <HStack justify="space-between" align="flex-start">
        <HStack align="flex-start" spacing={2.5} flex={1}>
          <svg width="12" height="11" viewBox="0 0 20 18" style={{ flexShrink: 0, marginTop: 2 }}>
            <polygon points="10,1 19,17 1,17"
              fill={volcano.alert_level === 'warning' ? '#f56565' :
                    volcano.alert_level === 'watch'   ? '#ed8936' :
                    volcano.alert_level === 'advisory' ? '#ecc94b' : '#48bb78'}
              stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
          </svg>
          <VStack align="start" spacing={0} flex={1}>
            <Text fontSize="xs" color="gray.200" fontWeight="600" noOfLines={1}>
              {volcano.name}
            </Text>
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {volcano.location || '—'}
            </Text>
          </VStack>
        </HStack>
        <Badge
          colorScheme={VOLCANO_COLOR[volcano.alert_level] || 'gray'}
          variant="subtle"
          fontSize="2xs"
          textTransform="uppercase"
          letterSpacing="wide"
          flexShrink={0}
        >
          {volcano.alert_level}
        </Badge>
      </HStack>
    </Box>
  )
}

export default function EventSidebar({
  earthquakes, volcanoes, eqLoading, volcLoading, stats,
  onEarthquakeSelect, onVolcanoSelect,
}) {
  const eqFeatures = earthquakes?.features || []
  const volcList   = volcanoes?.volcanoes   || []
  const elevated   = volcList.filter(v => v.alert_level !== 'normal')

  return (
    <Box
      w="300px"
      flexShrink={0}
      bg="gray.850"
      borderLeft="1px solid"
      borderColor="whiteAlpha.100"
      display="flex"
      flexDir="column"
      overflow="hidden"
    >
      {/* Stats strip */}
      {stats && (
        <HStack
          px={3} py={2}
          spacing={3}
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
          wrap="wrap"
        >
          {Object.entries(stats.bands || {}).map(([band, count]) => (
            <VStack key={band} spacing={0} align="center" flex={1}>
              <Text fontSize="lg" fontWeight="700" color="white" fontFamily="mono">
                {count}
              </Text>
              <Text fontSize="2xs" color="gray.500" whiteSpace="nowrap">M{band}</Text>
            </VStack>
          ))}
        </HStack>
      )}

      <Tabs variant="line" colorScheme="brand" flex={1} display="flex" flexDir="column" overflow="hidden">
        <TabList borderColor="whiteAlpha.100" px={3} flexShrink={0}>
          <Tab fontSize="xs" fontWeight="600" color="gray.400"
            _selected={{ color: 'brand.300', borderColor: 'brand.300' }}>
            Earthquakes ({eqFeatures.length})
          </Tab>
          <Tab fontSize="xs" fontWeight="600" color="gray.400"
            _selected={{ color: 'brand.300', borderColor: 'brand.300' }}>
            Volcanoes ({elevated.length})
          </Tab>
        </TabList>

        <TabPanels flex={1} overflow="hidden">
          {/* Earthquakes — scrollable */}
          <TabPanel p={0} h="100%" overflowY="auto">
            {eqLoading ? (
              <Center py={8}><Spinner size="sm" color="brand.400" /></Center>
            ) : eqFeatures.length === 0 ? (
              <Center py={8}>
                <Text fontSize="sm" color="gray.500">No earthquakes found</Text>
              </Center>
            ) : (
              <VStack spacing={0} align="stretch" py={1}>
                {eqFeatures.map(f => (
                  <EqItem
                    key={f.id}
                    feature={f}
                    onSelect={onEarthquakeSelect}
                  />
                ))}
              </VStack>
            )}
          </TabPanel>

          {/* Volcanoes — elevated only, scrollable */}
          <TabPanel p={0} h="100%" overflowY="auto">
            {volcLoading ? (
              <Center py={8}><Spinner size="sm" color="brand.400" /></Center>
            ) : elevated.length === 0 ? (
              <Center py={8}>
                <Text fontSize="sm" color="gray.500">No elevated volcanoes</Text>
              </Center>
            ) : (
              <VStack spacing={0} align="stretch" py={1}>
                {elevated
                  .sort((a, b) => {
                    const order = { warning: 0, watch: 1, advisory: 2 }
                    return (order[a.alert_level] ?? 3) - (order[b.alert_level] ?? 3)
                  })
                  .map(v => (
                    <VolcItem
                      key={v.id}
                      volcano={v}
                      onSelect={onVolcanoSelect}
                    />
                  ))
                }
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
