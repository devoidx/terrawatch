import {
  Box, VStack, HStack, Text, Badge, Divider, Spinner,
  Center, Tabs, TabList, Tab, TabPanels, TabPanel, Icon
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

function EqItem({ feature }) {
  const mag   = feature.properties.mag || 0
  const place = feature.properties.place || 'Unknown location'
  const time  = feature.properties.time

  return (
    <Box
      px={3} py={2.5}
      _hover={{ bg: 'whiteAlpha.50' }}
      cursor="pointer"
      borderRadius="md"
      transition="background 0.15s"
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

function VolcItem({ volcano }) {
  return (
    <Box
      px={3} py={2.5}
      _hover={{ bg: 'whiteAlpha.50' }}
      cursor="pointer"
      borderRadius="md"
      transition="background 0.15s"
    >
      <HStack justify="space-between" align="flex-start">
        <HStack align="flex-start" spacing={2.5} flex={1}>
          <Text fontSize="md" mt="-1px">🌋</Text>
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

export default function EventSidebar({ earthquakes, volcanoes, eqLoading, volcLoading, stats }) {
  const eqFeatures   = earthquakes?.features || []
  const volcList     = volcanoes?.volcanoes   || []
  const elevated     = volcList.filter(v => v.alert_level !== 'normal')

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

      <Tabs variant="line" colorScheme="brand" flex={1} display="flex" flexDir="column">
        <TabList borderColor="whiteAlpha.100" px={3}>
          <Tab fontSize="xs" fontWeight="600" color="gray.400" _selected={{ color: 'brand.300', borderColor: 'brand.300' }}>
            Earthquakes ({eqFeatures.length})
          </Tab>
          <Tab fontSize="xs" fontWeight="600" color="gray.400" _selected={{ color: 'brand.300', borderColor: 'brand.300' }}>
            Volcanoes ({elevated.length} active)
          </Tab>
        </TabList>

        <TabPanels flex={1} overflow="hidden">
          <TabPanel p={0} h="100%" overflow="auto">
            {eqLoading ? (
              <Center py={8}><Spinner size="sm" color="brand.400" /></Center>
            ) : eqFeatures.length === 0 ? (
              <Center py={8}><Text fontSize="sm" color="gray.500">No earthquakes found</Text></Center>
            ) : (
              <VStack spacing={0} align="stretch" py={1}>
                {eqFeatures.map(f => <EqItem key={f.id} feature={f} />)}
              </VStack>
            )}
          </TabPanel>

          <TabPanel p={0} h="100%" overflow="auto">
            {volcLoading ? (
              <Center py={8}><Spinner size="sm" color="brand.400" /></Center>
            ) : (
              <VStack spacing={0} align="stretch" py={1}>
                {elevated.length > 0 && (
                  <>
                    <Text px={3} pt={2} pb={1} fontSize="2xs" fontWeight="700"
                      color="orange.400" textTransform="uppercase" letterSpacing="wider">
                      Elevated Alert
                    </Text>
                    {elevated.map(v => <VolcItem key={v.id} volcano={v} />)}
                    <Divider borderColor="whiteAlpha.100" my={1} />
                  </>
                )}
                <Text px={3} pt={2} pb={1} fontSize="2xs" fontWeight="700"
                  color="gray.500" textTransform="uppercase" letterSpacing="wider">
                  All Monitored ({volcList.length})
                </Text>
                {volcList.filter(v => v.alert_level === 'normal').map(v => (
                  <VolcItem key={v.id} volcano={v} />
                ))}
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
