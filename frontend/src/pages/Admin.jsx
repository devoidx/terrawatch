import { useState, useRef, useEffect } from 'react'
import {
  Box, VStack, HStack, Text, Button, Badge, useToast,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Switch, Center, Spinner, Input, useDisclosure,
  AlertDialog, AlertDialogBody, AlertDialogFooter,
  AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  Stat, StatLabel, StatNumber, SimpleGrid, Card, CardBody,
  Select, InputGroup, InputRightElement,
} from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminGetUsers, adminUpdateUser, adminDeleteUser,
  adminGetRegions, adminGetSentAlerts, adminGetSettings, adminUpdateSetting,
  adminUpdateSmtp, adminTestSmtp, adminGetHealth
} from '../api'

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const toast        = useToast()
  const queryClient  = useQueryClient()
  const cancelRef    = useRef()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [target, setTarget]   = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'], queryFn: adminGetUsers,
  })

  const toggle = async (user, field) => {
    try {
      await adminUpdateUser(user.id, { [field]: !user[field] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch {
      toast({ title: 'Update failed', status: 'error', duration: 2000 })
    }
  }

  const confirmDelete = (user) => { setTarget(user); onOpen() }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await adminDeleteUser(target.id)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast({ title: 'User deleted', status: 'success', duration: 2000 })
      onClose()
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err.response?.data?.detail || 'Error',
        status: 'error', duration: 3000,
      })
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) return <Center py={8}><Spinner color="brand.400" /></Center>

  return (
    <>
      <TableContainer>
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th color="gray.500" borderColor="whiteAlpha.100">User</Th>
              <Th color="gray.500" borderColor="whiteAlpha.100">Email</Th>
              <Th color="gray.500" borderColor="whiteAlpha.100">Joined</Th>
              <Th color="gray.500" borderColor="whiteAlpha.100">Active</Th>
              <Th color="gray.500" borderColor="whiteAlpha.100">Admin</Th>
              <Th color="gray.500" borderColor="whiteAlpha.100"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {users?.map(u => (
              <Tr key={u.id} _hover={{ bg: 'whiteAlpha.50' }}>
                <Td borderColor="whiteAlpha.100">
                  <Text fontSize="sm" fontWeight="600" color="white">{u.username}</Text>
                </Td>
                <Td borderColor="whiteAlpha.100">
                  <Text fontSize="sm" color="gray.400">{u.email}</Text>
                </Td>
                <Td borderColor="whiteAlpha.100">
                  <Text fontSize="xs" color="gray.500">
                    {new Date(u.created_at).toLocaleDateString('en-GB')}
                  </Text>
                </Td>
                <Td borderColor="whiteAlpha.100">
                  <Switch size="sm" isChecked={u.is_active}
                    onChange={() => toggle(u, 'is_active')} colorScheme="brand" />
                </Td>
                <Td borderColor="whiteAlpha.100">
                  <Switch size="sm" isChecked={u.is_admin}
                    onChange={() => toggle(u, 'is_admin')} colorScheme="brand" />
                </Td>
                <Td borderColor="whiteAlpha.100">
                  <Button size="xs" colorScheme="red" variant="ghost"
                    onClick={() => confirmDelete(u)}>
                    Delete
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay backdropFilter="blur(4px)" bg="blackAlpha.700">
          <AlertDialogContent bg="gray.800" border="1px solid" borderColor="whiteAlpha.200">
            <AlertDialogHeader fontFamily="heading" fontWeight="700">Delete user</AlertDialogHeader>
            <AlertDialogBody color="gray.300">
              Permanently delete <Text as="span" fontWeight="700" color="white">"{target?.username}"</Text>?
              This will remove all their data.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} variant="ghost" color="gray.400" onClick={onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDelete} isLoading={deleting}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}

// ── Alert regions tab ─────────────────────────────────────────────────────────
function RegionsTab() {
  const { data: regions, isLoading } = useQuery({
    queryKey: ['admin-regions'], queryFn: adminGetRegions,
  })

  if (isLoading) return <Center py={8}><Spinner color="brand.400" /></Center>

  return (
    <TableContainer>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th color="gray.500" borderColor="whiteAlpha.100">Region</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">User ID</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Min Mag</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Volcanoes</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Status</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Created</Th>
          </Tr>
        </Thead>
        <Tbody>
          {regions?.map(r => (
            <Tr key={r.id} _hover={{ bg: 'whiteAlpha.50' }}>
              <Td borderColor="whiteAlpha.100">
                <Text fontSize="sm" fontWeight="600" color="white">{r.name}</Text>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <Text fontSize="xs" color="gray.500" fontFamily="mono">#{r.user_id}</Text>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                  M{Number(r.min_earthquake_magnitude).toFixed(1)}+
                </Badge>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <Badge colorScheme={r.include_volcanoes ? 'orange' : 'gray'} variant="subtle" fontSize="xs">
                  {r.include_volcanoes ? r.min_volcano_alert_level + '+' : 'off'}
                </Badge>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <Badge colorScheme={r.is_active ? 'green' : 'gray'} variant="subtle" fontSize="xs">
                  {r.is_active ? 'active' : 'paused'}
                </Badge>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <Text fontSize="xs" color="gray.500">
                  {new Date(r.created_at).toLocaleDateString('en-GB')}
                </Text>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}

// ── Sent alerts tab ───────────────────────────────────────────────────────────
function SentAlertsTab() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['admin-sent-alerts'], queryFn: adminGetSentAlerts,
  })

  if (isLoading) return <Center py={8}><Spinner color="brand.400" /></Center>

  return (
    <TableContainer>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th color="gray.500" borderColor="whiteAlpha.100">Type</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">User</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Event</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Channels</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Sent</Th>
          </Tr>
        </Thead>
        <Tbody>
          {alerts?.map(a => (
            <Tr key={a.id} _hover={{ bg: 'whiteAlpha.50' }}>
              <Td borderColor="whiteAlpha.100">
                <Badge colorScheme={a.event_type === 'earthquake' ? 'blue' : 'orange'} variant="subtle">
                  {a.event_type === 'earthquake' ? '🌍' : '🌋'} {a.event_type}
                </Badge>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <Text fontSize="xs" color="gray.500" fontFamily="mono">#{a.user_id}</Text>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <Text fontSize="xs" color="gray.300">
                  {a.event_magnitude ? `M${Number(a.event_magnitude).toFixed(1)} ` : ''}{a.event_location || '—'}
                </Text>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <HStack spacing={1}>
                  {(a.channels_used || []).map(c => (
                    <Badge key={c} colorScheme="brand" variant="subtle" fontSize="2xs">{c}</Badge>
                  ))}
                </HStack>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <Text fontSize="xs" color="gray.500">
                  {new Date(a.notified_at).toLocaleString()}
                </Text>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'], queryFn: adminGetSettings,
  })

  const [provider, setProvider] = useState('smtp')
  const [smtp, setSmtp] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '',
    smtp_password: '', smtp_from: '', smtp_use_tls: 'true',
  })
  const [gmail, setGmail] = useState({
    gmail_address: '', gmail_app_password: '',
  })
  const [saving, setSaving]   = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPw, setShowPw]   = useState(false)

  useEffect(() => {
    if (!settings) return
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]))
    setProvider(map.smtp_provider || 'smtp')
    setSmtp({
      smtp_host:     map.smtp_host     || '',
      smtp_port:     map.smtp_port     || '587',
      smtp_user:     map.smtp_user     || '',
      smtp_password: map.smtp_password || '',
      smtp_from:     map.smtp_from     || '',
      smtp_use_tls:  map.smtp_use_tls  || 'true',
    })
    setGmail({
      gmail_address:     map.gmail_address     || '',
      gmail_app_password: map.gmail_app_password || '',
    })
  }, [settings])

  const save = async () => {
    setSaving(true)
    try {
      await adminUpdateSmtp({
        smtp_provider: provider,
        ...smtp,
        ...gmail,
      })
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      toast({ title: 'Email settings saved', status: 'success', duration: 2000 })
    } catch {
      toast({ title: 'Save failed', status: 'error', duration: 2000 })
    } finally {
      setSaving(false)
    }
  }

  const testEmail = async () => {
    setTesting(true)
    try {
      const res = await adminTestSmtp()
      toast({ title: res.message, status: 'success', duration: 3000 })
    } catch (err) {
      toast({
        title: 'Test failed',
        description: err.response?.data?.detail || 'Check your settings',
        status: 'error', duration: 4000,
      })
    } finally {
      setTesting(false)
    }
  }

  if (isLoading) return <Center py={8}><Spinner color="brand.400" /></Center>

  return (
    <VStack align="stretch" spacing={5} maxW="500px">
      <Text fontSize="sm" color="gray.400">
        Configure outgoing email for alert notifications.
      </Text>

      {/* Provider toggle */}
      <HStack spacing={3}>
        {['smtp', 'gmail'].map(p => (
          <Button
            key={p}
            size="sm"
            variant={provider === p ? 'solid' : 'outline'}
            colorScheme="brand"
            onClick={() => setProvider(p)}
            textTransform="uppercase"
            letterSpacing="wide"
            fontSize="xs"
          >
            {p === 'gmail' ? '📧 Gmail' : '🔧 SMTP'}
          </Button>
        ))}
      </HStack>

      {/* Gmail fields */}
      {provider === 'gmail' && (
        <VStack spacing={3} align="stretch">
          <Box>
            <Text fontSize="sm" color="gray.300" mb={1}>Gmail address</Text>
            <Input
              value={gmail.gmail_address}
              onChange={e => setGmail(g => ({ ...g, gmail_address: e.target.value }))}
              placeholder="your@gmail.com"
              bg="gray.700" borderColor="whiteAlpha.200"
              _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
            />
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.300" mb={1}>App password</Text>
            <InputGroup>
              <Input
                value={gmail.gmail_app_password}
                onChange={e => setGmail(g => ({ ...g, gmail_app_password: e.target.value }))}
                type={showPw ? 'text' : 'password'}
                placeholder="16-character app password"
                bg="gray.700" borderColor="whiteAlpha.200"
                _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
              />
              <InputRightElement>
                <Button size="xs" variant="ghost" color="gray.400"
                  onClick={() => setShowPw(s => !s)}>
                  {showPw ? '🙈' : '👁️'}
                </Button>
              </InputRightElement>
            </InputGroup>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Generate at myaccount.google.com/apppasswords
            </Text>
          </Box>
        </VStack>
      )}

      {/* SMTP fields */}
      {provider === 'smtp' && (
        <SimpleGrid columns={2} spacing={3}>
          <Box gridColumn="span 2">
            <Text fontSize="sm" color="gray.300" mb={1}>SMTP Host</Text>
            <Input value={smtp.smtp_host}
              onChange={e => setSmtp(s => ({ ...s, smtp_host: e.target.value }))}
              placeholder="smtp.example.com" bg="gray.700" borderColor="whiteAlpha.200"
              _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.300" mb={1}>Port</Text>
            <Input value={smtp.smtp_port}
              onChange={e => setSmtp(s => ({ ...s, smtp_port: e.target.value }))}
              placeholder="587" bg="gray.700" borderColor="whiteAlpha.200"
              _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.300" mb={1}>Use TLS</Text>
            <Select value={smtp.smtp_use_tls}
              onChange={e => setSmtp(s => ({ ...s, smtp_use_tls: e.target.value }))}
              bg="gray.700" borderColor="whiteAlpha.200">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </Box>
          <Box gridColumn="span 2">
            <Text fontSize="sm" color="gray.300" mb={1}>Username</Text>
            <Input value={smtp.smtp_user}
              onChange={e => setSmtp(s => ({ ...s, smtp_user: e.target.value }))}
              placeholder="your@email.com" bg="gray.700" borderColor="whiteAlpha.200"
              _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
          </Box>
          <Box gridColumn="span 2">
            <Text fontSize="sm" color="gray.300" mb={1}>Password</Text>
            <InputGroup>
              <Input value={smtp.smtp_password}
                onChange={e => setSmtp(s => ({ ...s, smtp_password: e.target.value }))}
                type={showPw ? 'text' : 'password'} placeholder="Password"
                bg="gray.700" borderColor="whiteAlpha.200"
                _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
              <InputRightElement>
                <Button size="xs" variant="ghost" color="gray.400"
                  onClick={() => setShowPw(s => !s)}>
                  {showPw ? '🙈' : '👁️'}
                </Button>
              </InputRightElement>
            </InputGroup>
          </Box>
          <Box gridColumn="span 2">
            <Text fontSize="sm" color="gray.300" mb={1}>From address</Text>
            <Input value={smtp.smtp_from}
              onChange={e => setSmtp(s => ({ ...s, smtp_from: e.target.value }))}
              placeholder="TerraWatch <your@email.com>" bg="gray.700" borderColor="whiteAlpha.200"
              _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
          </Box>
        </SimpleGrid>
      )}

      <HStack spacing={3} pt={2}>
        <Button colorScheme="brand" onClick={save} isLoading={saving}>
          Save settings
        </Button>
        <Button variant="outline" colorScheme="brand" onClick={testEmail} isLoading={testing}>
          Send test email
        </Button>
      </HStack>
    </VStack>
  )
}

function StatusDot({ ok, warn }) {
  const color = ok ? 'green.400' : warn ? 'yellow.400' : 'red.400'
  return <Box w="8px" h="8px" borderRadius="full" bg={color} flexShrink={0} />
}

function FeedRow({ label, feed }) {
  const neverPolled = !feed.last_success && feed.consecutive_failures === 0
  const ok   = !!feed.last_success && feed.consecutive_failures === 0
  const warn = feed.consecutive_failures > 0 && feed.consecutive_failures < 3
  const ts   = feed.last_success
    ? new Date(feed.last_success + 'Z').toLocaleTimeString()
    : 'Never'
  return (
    <HStack justify="space-between" py={2}
      borderBottom="1px solid" borderColor="whiteAlpha.50">
      <HStack spacing={3} align="flex-start">
        {neverPolled
          ? <Box w="8px" h="8px" borderRadius="full" bg="gray.600" flexShrink={0} mt="6px" />
          : <StatusDot ok={ok} warn={warn} />
        }
        <Text fontSize="sm" color={neverPolled ? 'gray.500' : 'gray.300'}>{label}</Text>
      </HStack>
      <VStack align="flex-end" spacing={0}>
        <Text fontSize="xs" color={neverPolled ? 'gray.600' : ok ? 'gray.400' : 'red.400'}>
          {neverPolled ? 'Not yet polled' : ok ? `Last OK: ${ts}` : (feed.last_error?.split('—')[1]?.trim() || 'Error')}
        </Text>
        {feed.consecutive_failures > 0 && (
          <Text fontSize="2xs" color="red.400">
            {feed.consecutive_failures} consecutive failure{feed.consecutive_failures !== 1 ? 's' : ''}
          </Text>
        )}
      </VStack>
    </HStack>
  )
}

function HealthTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey:      ['admin-health'],
    queryFn:       adminGetHealth,
    refetchInterval: 30000,
  })

  if (isLoading) return <Center py={8}><Spinner color="brand.400" /></Center>
  if (!data)     return <Text color="red.400">Failed to load health data</Text>

  const { feeds, alert_job, email, alerts_queue, db } = data

  const jobOk   = !!alert_job.last_success && !alert_job.last_error
  const emailOk = email.sent_failed === 0 || (email.sent_ok / Math.max(email.sent_total, 1)) > 0.9

  const FEED_LABELS = {
    usgs_earthquakes: 'USGS Earthquakes',
    usgs_volcanoes:   'USGS Volcanoes (GVP)',
    usgs_hans:        'USGS HANS (Volcano alerts)',
    gvp_eruptions:    'GVP Eruption History',
    noaa_dart:        'NOAA DART Buoys',
    noaa_vaac:        'NOAA VAAC Ash Advisories',
  }

  return (
    <VStack spacing={5} align="stretch">

      {/* Summary cards */}
      <SimpleGrid columns={4} spacing={3}>
        <Card bg="gray.800" border="1px solid" borderColor="whiteAlpha.100">
          <CardBody p={4}>
            <Text fontSize="2xs" color="gray.500" textTransform="uppercase"
              letterSpacing="wider">Alert job</Text>
            <HStack mt={1} spacing={2}>
              <StatusDot ok={jobOk} />
              <Text fontSize="xl" fontWeight="700" color="white">
                {alert_job.runs_ok}/{alert_job.runs_total}
              </Text>
            </HStack>
            <Text fontSize="2xs" color="gray.500">runs ok / total</Text>
            {alert_job.last_success && (
              <Text fontSize="2xs" color="gray.600" mt={1}>
                Last: {new Date(alert_job.last_success).toLocaleTimeString()}
              </Text>
            )}
          </CardBody>
        </Card>

        <Card bg="gray.800" border="1px solid" borderColor="whiteAlpha.100">
          <CardBody p={4}>
            <Text fontSize="2xs" color="gray.500" textTransform="uppercase"
              letterSpacing="wider">Alerts sent</Text>
            <HStack mt={1} spacing={2}>
              <StatusDot ok={emailOk} />
              <Text fontSize="xl" fontWeight="700" color="white">
                {email.sent_ok}
              </Text>
            </HStack>
            <Text fontSize="2xs" color="gray.500">
              {email.sent_failed > 0 ? `${email.sent_failed} failed` : 'No failures'}
            </Text>
            {email.last_sent && (
              <Text fontSize="2xs" color="gray.600" mt={1}>
                Last: {new Date(email.last_sent).toLocaleTimeString()}
              </Text>
            )}
          </CardBody>
        </Card>

        <Card bg="gray.800" border="1px solid" borderColor="whiteAlpha.100">
          <CardBody p={4}>
            <Text fontSize="2xs" color="gray.500" textTransform="uppercase"
              letterSpacing="wider">Alerts (24h / 7d)</Text>
            <Text fontSize="xl" fontWeight="700" color="white" mt={1}>
              {db?.alerts_last_24h} / {db?.alerts_last_7d}
            </Text>
            <Text fontSize="2xs" color="gray.500">
              {db?.total_alerts_sent} total ever
            </Text>
          </CardBody>
        </Card>

        <Card bg="gray.800" border="1px solid" borderColor="whiteAlpha.100">
          <CardBody p={4}>
            <Text fontSize="2xs" color="gray.500" textTransform="uppercase"
              letterSpacing="wider">Users / Regions</Text>
            <Text fontSize="xl" fontWeight="700" color="white" mt={1}>
              {db?.total_users} / {db?.total_regions}
            </Text>
            <Text fontSize="2xs" color="gray.500">registered / configured</Text>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Feed health */}
      <Box bg="gray.800" borderRadius="xl" border="1px solid"
        borderColor="whiteAlpha.100" p={4}>
        <HStack justify="space-between" mb={3}>
          <Text fontSize="xs" color="gray.400" textTransform="uppercase"
            letterSpacing="wider">Data feed health</Text>
          <Button size="xs" variant="ghost" color="gray.500"
            onClick={() => refetch()}>↻ Refresh</Button>
        </HStack>
        <VStack spacing={0} align="stretch">
          {Object.entries(feeds).map(([key, feed]) => (
            <FeedRow key={key} label={FEED_LABELS[key] || key} feed={feed} />
          ))}
        </VStack>
        <Text fontSize="2xs" color="gray.600" mt={3}>
          ⚠ Feed status resets on container restart — shows current session only
        </Text>
      </Box>

      {/* Alert job detail */}
      <Box bg="gray.800" borderRadius="xl" border="1px solid"
        borderColor="whiteAlpha.100" p={4}>
        <Text fontSize="xs" color="gray.400" textTransform="uppercase"
          letterSpacing="wider" mb={3}>Alert job</Text>
        <SimpleGrid columns={2} spacing={4}>
          <VStack align="flex-start" spacing={1}>
            <Text fontSize="2xs" color="gray.500">Last run</Text>
            <Text fontSize="sm" color="gray.300">
              {alert_job.last_run
                ? new Date(alert_job.last_run).toLocaleString()
                : '—'}
            </Text>
          </VStack>
          <VStack align="flex-start" spacing={1}>
            <Text fontSize="2xs" color="gray.500">Last success</Text>
            <Text fontSize="sm" color="gray.300">
              {alert_job.last_success
                ? new Date(alert_job.last_success).toLocaleString()
                : '—'}
            </Text>
          </VStack>
          <VStack align="flex-start" spacing={1}>
            <Text fontSize="2xs" color="gray.500">Alerts processed</Text>
            <Text fontSize="sm" color="gray.300">
              {alerts_queue.processed_total} total
            </Text>
          </VStack>
          <VStack align="flex-start" spacing={1}>
            <Text fontSize="2xs" color="gray.500">Last error</Text>
            <Text fontSize="sm" color={alert_job.last_error ? 'red.400' : 'gray.600'}>
              {alert_job.last_error?.split('—')[1]?.trim() || 'None'}
            </Text>
          </VStack>
        </SimpleGrid>
      </Box>

      {/* Email delivery */}
      <Box bg="gray.800" borderRadius="xl" border="1px solid"
        borderColor="whiteAlpha.100" p={4}>
        <Text fontSize="xs" color="gray.400" textTransform="uppercase"
          letterSpacing="wider" mb={3}>Email delivery</Text>
        <SimpleGrid columns={3} spacing={4}>
          <VStack align="flex-start" spacing={0}>
            <Text fontSize="2xl" fontWeight="700" color="green.400">
              {email.sent_ok}
            </Text>
            <Text fontSize="2xs" color="gray.500">Delivered</Text>
          </VStack>
          <VStack align="flex-start" spacing={0}>
            <Text fontSize="2xl" fontWeight="700"
              color={email.sent_failed > 0 ? 'red.400' : 'gray.600'}>
              {email.sent_failed}
            </Text>
            <Text fontSize="2xs" color="gray.500">Failed</Text>
          </VStack>
          <VStack align="flex-start" spacing={0}>
            <Text fontSize="2xl" fontWeight="700" color="gray.300">
              {email.sent_total > 0
                ? `${Math.round((email.sent_ok / email.sent_total) * 100)}%`
                : '—'}
            </Text>
            <Text fontSize="2xs" color="gray.500">Success rate</Text>
          </VStack>
        </SimpleGrid>
        {email.last_error && (
          <Text fontSize="xs" color="red.400" mt={3}>
            Last error: {email.last_error.split('—')[1]?.trim()}
          </Text>
        )}
      </Box>

    </VStack>
  )
}

// ── Main Admin page ───────────────────────────────────────────────────────────

export default function Admin() {
  const { data: users }   = useQuery({ queryKey: ['admin-users'],   queryFn: adminGetUsers })
  const { data: regions } = useQuery({ queryKey: ['admin-regions'], queryFn: adminGetRegions })
  const { data: alerts }  = useQuery({ queryKey: ['admin-sent-alerts'], queryFn: adminGetSentAlerts })

  return (
    <Box maxW="1200px" mx="auto" px={6} py={8}>
      <VStack align="stretch" spacing={8}>
        {/* Header */}
        <VStack align="start" spacing={1}>
          <Text fontFamily="heading" fontWeight="800" fontSize="2xl" letterSpacing="-0.02em">
            Admin Panel
          </Text>
          <Text color="gray.400" fontSize="sm">Manage users, regions, and system settings</Text>
        </VStack>

        {/* Stats */}
        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
          {[
            { label: 'Total users',   value: users?.length   ?? '—' },
            { label: 'Alert regions', value: regions?.length ?? '—' },
            { label: 'Alerts sent',   value: alerts?.length  ?? '—' },
          ].map(({ label, value }) => (
            <Card key={label} bg="gray.800" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl">
              <CardBody p={4}>
                <Stat>
                  <StatLabel color="gray.400" fontSize="xs">{label}</StatLabel>
                  <StatNumber fontFamily="mono" fontSize="2xl" color="white">{value}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        {/* Tabs */}
        <Tabs variant="line" colorScheme="brand">
          <TabList borderColor="whiteAlpha.100">
            {['Users', 'Alert Regions', 'Sent Alerts', 'Settings', 'Health '].map(t => (
              <Tab key={t} fontSize="sm" color="gray.400"
                _selected={{ color: 'brand.300', borderColor: 'brand.300' }}>
                {t}
              </Tab>
            ))}
          </TabList>
          <TabPanels>
            <TabPanel px={0} pt={6}><UsersTab /></TabPanel>
            <TabPanel px={0} pt={6}><RegionsTab /></TabPanel>
            <TabPanel px={0} pt={6}><SentAlertsTab /></TabPanel>
            <TabPanel px={0} pt={6}><SettingsTab /></TabPanel>
            <TabPanel px={0} pt={6}><HealthTab /></TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  )
}
