import { useEffect, useState } from 'react'
import {
  Box, VStack, HStack, Text, Grid, GridItem,
  Stat, StatLabel, StatNumber, StatHelpText,
  Badge, Divider, Spinner, Center,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import api from '../api'

const fetchDashboard = () => api.get('/users/dashboard').then(r => r.data)

function StatCard({ label, value, sub, color = 'brand.400' }) {
  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.100"
      p={4}
    >
      <Stat>
        <StatLabel color="gray.400" fontSize="xs" textTransform="uppercase"
          letterSpacing="wider">{label}</StatLabel>
        <StatNumber fontSize="3xl" fontWeight="800" color={color}>
          {value}
        </StatNumber>
        {sub && <StatHelpText color="gray.500" fontSize="xs">{sub}</StatHelpText>}
      </Stat>
    </Box>
  )
}

function Sparkline({ data }) {
  if (!data?.length) return null
  const max    = Math.max(...data.map(d => d.count), 1)
  const W = 200, H = 40, pad = 4

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - (d.count / max) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <Box>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <polyline points={points} fill="none" stroke="#0967d2"
          strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <HStack justify="space-between" mt={1}>
        {data.map((d, i) => (
          <Text key={i} fontSize="2xs" color="gray.600">{d.date}</Text>
        ))}
      </HStack>
    </Box>
  )
}

function EventTypeBadge({ type }) {
  const colors = { earthquake: 'blue', volcano: 'orange' }
  return (
    <Badge colorScheme={colors[type] || 'gray'} variant="subtle" fontSize="2xs">
      {type}
    </Badge>
  )
}

export default function UserDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  fetchDashboard,
    refetchInterval: 60000,
  })

  if (isLoading) return (
    <Center h="100%" minH="400px">
      <VStack spacing={3}>
        <Spinner color="brand.400" size="lg" />
        <Text color="gray.500" fontSize="sm">Loading your dashboard...</Text>
      </VStack>
    </Center>
  )

  if (error) return (
    <Center h="100%" minH="400px">
      <Text color="red.400">Failed to load dashboard</Text>
    </Center>
  )

  const { user, regions, alerts, recent_alerts, channels } = data

  return (
    <Box p={6} maxW="900px" mx="auto">
      <VStack spacing={6} align="stretch">

        {/* Header */}
        <HStack justify="space-between" align="flex-end">
          <VStack align="flex-start" spacing={0}>
            <Text fontSize="2xl" fontWeight="800" color="white">
              Welcome back, {user.username}
            </Text>
            <Text fontSize="sm" color="gray.500">
              Member since {new Date(user.member_since).toLocaleDateString('en-GB', {
                year: 'numeric', month: 'long'
              })}
            </Text>
          </VStack>
          <HStack spacing={2}>
            {channels.map(c => (
              <Badge key={c} colorScheme="brand" variant="outline" fontSize="xs">
                {c === 'email' ? '📧' : c === 'sms' ? '📱' : '🔔'} {c}
              </Badge>
            ))}
            {channels.length === 0 && (
              <Badge colorScheme="yellow" variant="outline" fontSize="xs">
                ⚠️ No notifications enabled
              </Badge>
            )}
          </HStack>
        </HStack>

        {/* Stats row */}
        <Grid templateColumns="repeat(4, 1fr)" gap={3}>
          <StatCard
            label="Alert Regions"
            value={regions.total}
            sub={`${regions.active} active`}
          />
          <StatCard
            label="Alerts this week"
            value={alerts.this_week}
            sub={`${alerts.last_24h} in last 24h`}
            color={alerts.this_week > 0 ? 'orange.400' : 'gray.400'}
          />
          <StatCard
            label="Largest event"
            value={alerts.largest_event.magnitude
              ? `M${alerts.largest_event.magnitude.toFixed(1)}`
              : '—'}
            sub={alerts.largest_event.location?.split(',').slice(-1)[0]?.trim() || 'No events this week'}
            color={alerts.largest_event.magnitude >= 6 ? 'red.400' :
                   alerts.largest_event.magnitude >= 5 ? 'orange.400' : 'brand.400'}
          />
          <StatCard
            label="Active channels"
            value={channels.length}
            sub={channels.join(', ') || 'None configured'}
          />
        </Grid>

        {/* Alerts sparkline */}
        {alerts.this_week > 0 && (
          <Box
            bg="gray.800"
            borderRadius="xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            p={4}
          >
            <Text fontSize="xs" color="gray.400" textTransform="uppercase"
              letterSpacing="wider" mb={3}>
              Alert activity — last 7 days
            </Text>
            <Sparkline data={alerts.by_day} />
          </Box>
        )}

        {/* Alerts by region */}
        {alerts.by_region.length > 0 && (
          <Box
            bg="gray.800"
            borderRadius="xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            p={4}
          >
            <Text fontSize="xs" color="gray.400" textTransform="uppercase"
              letterSpacing="wider" mb={3}>
              Alerts by region — this week
            </Text>
            <VStack spacing={2} align="stretch">
              {alerts.by_region.map(r => (
                <HStack key={r.region_id} justify="space-between">
                  <HStack spacing={2}>
                    <Box w="6px" h="6px" borderRadius="full"
                      bg={r.is_active ? 'green.400' : 'gray.600'} />
                    <Text fontSize="sm" color={r.is_active ? 'gray.200' : 'gray.500'}>
                      {r.region_name}
                    </Text>
                    {!r.is_active && (
                      <Badge colorScheme="gray" fontSize="2xs">inactive</Badge>
                    )}
                  </HStack>
                  <Badge
                    colorScheme={r.count > 0 ? 'orange' : 'gray'}
                    variant="subtle"
                  >
                    {r.count} alert{r.count !== 1 ? 's' : ''}
                  </Badge>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Recent alerts */}
        <Box
          bg="gray.800"
          borderRadius="xl"
          border="1px solid"
          borderColor="whiteAlpha.100"
          p={4}
        >
          <Text fontSize="xs" color="gray.400" textTransform="uppercase"
            letterSpacing="wider" mb={3}>
            Recent alerts
          </Text>
          {recent_alerts.length === 0 ? (
            <Text fontSize="sm" color="gray.600">
              No alerts sent yet — set up alert regions on the map to get started.
            </Text>
          ) : (
            <VStack spacing={0} align="stretch" divider={
              <Divider borderColor="whiteAlpha.50" />
            }>
              {recent_alerts.map(a => (
                <HStack key={a.id} py={2} justify="space-between">
                  <HStack spacing={3}>
                    <EventTypeBadge type={a.event_type} />
                    <VStack align="flex-start" spacing={0}>
                      <Text fontSize="sm" color="gray.200">
                        {a.magnitude ? `M${a.magnitude.toFixed(1)} — ` : ''}
                        {a.location || 'Unknown location'}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">
                        {new Date(a.time).toLocaleString()}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack spacing={1}>
                    {a.channels?.map(c => (
                      <Text key={c} fontSize="xs">
                        {c === 'email' ? '📧' : c === 'sms' ? '📱' : '🔔'}
                      </Text>
                    ))}
                  </HStack>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>

      </VStack>
    </Box>
  )
}