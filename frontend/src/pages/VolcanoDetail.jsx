import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box, VStack, HStack, Text, Badge, Divider,
  Grid, GridItem, Spinner, Center, Button,
  Table, Thead, Tbody, Tr, Th, Td,
} from '@chakra-ui/react'
import { getVolcanoDetail } from '../api'

const ALERT_COLORS = {
  WARNING:  'red',
  WATCH:    'orange',
  ADVISORY: 'yellow',
  NORMAL:   'green',
}

const VEI_COLORS = ['gray', 'gray', 'blue', 'teal', 'yellow', 'orange', 'red', 'red', 'purple']

function VeiBadge({ vei }) {
  if (!vei && vei !== 0) return <Text color="gray.500" fontSize="xs">Unknown</Text>
  const color = VEI_COLORS[Math.min(vei, 8)] || 'gray'
  return (
    <Badge colorScheme={color} variant="subtle" fontSize="xs">
      VEI {vei}
    </Badge>
  )
}

function formatEruptionDate(year, month, day) {
  if (!year) return '—'
  if (!month) return String(year)
  const date = new Date(year, month - 1, day || 1)
  return day
    ? date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
    : date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
}

export default function VolcanoDetail() {
  const { vnum }    = useParams()
  const navigate    = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey:  ['volcano', vnum],
    queryFn:   () => getVolcanoDetail(vnum),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return (
    <Center h="100%" minH="400px">
      <VStack spacing={3}>
        <Spinner color="orange.400" size="lg" />
        <Text color="gray.500" fontSize="sm">Loading volcano data...</Text>
      </VStack>
    </Center>
  )

  if (error) return (
    <Center h="100%" minH="400px">
      <Text color="red.400">Failed to load volcano data</Text>
    </Center>
  )

  const { profile, eruptions = [], monitoring, latest_notice } = data

  const ongoingEruption = eruptions.find(e => e.continuing)
  const alertColor      = ALERT_COLORS[latest_notice?.alert_level] || 'gray'

  return (
    <Box p={6} maxW="900px" mx="auto">
      <VStack spacing={6} align="stretch">

        {/* Header */}
        <HStack justify="space-between" align="flex-start">
          <VStack align="flex-start" spacing={1}>
            <HStack spacing={3}>
              <Text fontSize="3xl" fontWeight="800" color="white">
                🌋 {profile?.name || `Volcano ${vnum}`}
              </Text>
              {latest_notice && (
                <Badge colorScheme={alertColor} fontSize="sm" px={2} py={1}>
                  {latest_notice.alert_level}
                </Badge>
              )}
              {ongoingEruption && (
                <Badge colorScheme="red" variant="solid" fontSize="xs"
                  animation="pulse 2s infinite">
                  ● ERUPTING
                </Badge>
              )}
            </HStack>
            <HStack spacing={3} color="gray.400" fontSize="sm">
              {profile?.country && <Text>{profile.country}</Text>}
              {profile?.type && (
                <>
                  <Text>·</Text>
                  <Text>{profile.type}</Text>
                </>
              )}
            </HStack>
          </VStack>
          <Button size="sm" variant="ghost" color="gray.500"
            onClick={() => navigate('/')} _hover={{ color: 'white' }}>
            ← Back to map
          </Button>
        </HStack>

        {/* Volcano image if available */}
        {monitoring?.image_url && (
          <Box borderRadius="xl" overflow="hidden" maxH="300px">
            <img
              src={monitoring.image_url}
              alt={profile?.name}
              style={{ width: '100%', objectFit: 'cover', maxHeight: '300px' }}
            />
          </Box>
        )}

        {/* Current status */}
        {latest_notice && (
          <Box
            bg="gray.800"
            borderRadius="xl"
            border="1px solid"
            borderColor={`${alertColor}.800`}
            p={4}
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" color="gray.400" textTransform="uppercase"
                letterSpacing="wider">
                Latest monitoring notice
              </Text>
              <Text fontSize="xs" color="gray.500">
                {latest_notice.sent}
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.200" mb={3}>
              {latest_notice.title}
            </Text>
            <Box
              fontSize="xs"
              color="gray.400"
              dangerouslySetInnerHTML={{ __html: latest_notice.html }}
              sx={{
                'b': { color: 'gray.200' },
                'a': { color: 'brand.400' },
              }}
            />
            {latest_notice.url && (
              <Button
                as="a"
                href={latest_notice.url}
                target="_blank"
                size="xs"
                variant="outline"
                colorScheme="brand"
                mt={3}
              >
                View full notice →
              </Button>
            )}
          </Box>
        )}

        {/* Description */}
        {profile?.description && (
          <Box
            bg="gray.800"
            borderRadius="xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            p={4}
          >
            <Text fontSize="xs" color="gray.400" textTransform="uppercase"
              letterSpacing="wider" mb={2}>
              About this volcano
            </Text>
            <Text fontSize="sm" color="gray.300" lineHeight="1.7">
              {profile.description.slice(0, 600)}
              {profile.description.length > 600 ? '...' : ''}
            </Text>
          </Box>
        )}

        {/* Monitoring & Webcams — US only */}
        {monitoring && (
          <Box
            bg="gray.800"
            borderRadius="xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            p={4}
          >
            <Text fontSize="xs" color="gray.400" textTransform="uppercase"
              letterSpacing="wider" mb={3}>
              Monitoring
            </Text>
            <VStack spacing={2} align="stretch">
              {monitoring.observatory && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.400">Observatory</Text>
                  <Text fontSize="sm" color="gray.200">{monitoring.observatory}</Text>
                </HStack>
              )}
              {monitoring.nvews_threat && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.400">Threat level</Text>
                  <Badge colorScheme="orange" variant="subtle">
                    {monitoring.nvews_threat}
                  </Badge>
                </HStack>
              )}
              {monitoring.volcano_url && (
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.400">USGS page</Text>
                  <Button as="a" href={monitoring.volcano_url} target="_blank"
                    size="xs" variant="ghost" color="brand.400">
                    {monitoring.volcano_url.split('/').pop()} →
                  </Button>
                </HStack>
              )}
              {monitoring.webcam_links?.length > 0 && (
                <>
                  <Divider borderColor="whiteAlpha.100" />
                  <Text fontSize="xs" color="gray.500">📷 Webcams</Text>
                  {monitoring.webcam_links.map((url, i) => (
                    <Button
                      key={i}
                      as="a"
                      href={url}
                      target="_blank"
                      size="sm"
                      variant="outline"
                      colorScheme="orange"
                      justifyContent="flex-start"
                    >
                      📷 Live webcam {monitoring.webcam_links.length > 1 ? i + 1 : ''}
                    </Button>
                  ))}
                </>
              )}
            </VStack>
          </Box>
        )}

        {/* Eruption history */}
        <Box
          bg="gray.800"
          borderRadius="xl"
          border="1px solid"
          borderColor="whiteAlpha.100"
          p={4}
        >
          <HStack justify="space-between" mb={3}>
            <Text fontSize="xs" color="gray.400" textTransform="uppercase"
              letterSpacing="wider">
              Eruption history since 1960
            </Text>
            <Badge colorScheme="gray" variant="subtle">
              {eruptions.length} recorded
            </Badge>
          </HStack>

          {eruptions.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              No eruptions recorded since 1960
            </Text>
          ) : (
            <Table size="sm" variant="unstyled">
              <Thead>
                <Tr>
                  <Th color="gray.500" fontSize="2xs" px={2}>Start</Th>
                  <Th color="gray.500" fontSize="2xs" px={2}>End</Th>
                  <Th color="gray.500" fontSize="2xs" px={2}>VEI</Th>
                  <Th color="gray.500" fontSize="2xs" px={2}>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {eruptions.map((e, i) => (
                  <Tr key={i} _hover={{ bg: 'whiteAlpha.50' }}>
                    <Td px={2} py={1.5} fontSize="xs" color="gray.300">
                      {formatEruptionDate(e.start_year, e.start_month, e.start_day)}
                    </Td>
                    <Td px={2} py={1.5} fontSize="xs" color="gray.400">
                      {e.continuing
                        ? <Badge colorScheme="red" variant="subtle" fontSize="2xs">Ongoing</Badge>
                        : formatEruptionDate(e.end_year, e.end_month, e.end_day)
                      }
                    </Td>
                    <Td px={2} py={1.5}>
                      <VeiBadge vei={e.vei} />
                    </Td>
                    <Td px={2} py={1.5}>
                      {e.continuing && (
                        <Badge colorScheme="red" fontSize="2xs">Active</Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        {/* Source attribution */}
        <Text fontSize="2xs" color="gray.600" textAlign="center">
          Data: Smithsonian Global Volcanism Program · USGS Volcano Hazards Program
        </Text>

      </VStack>
    </Box>
  )
}