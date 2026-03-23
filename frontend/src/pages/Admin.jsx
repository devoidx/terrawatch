import { useState, useRef } from 'react'
import {
  Box, VStack, HStack, Text, Button, Badge, useToast,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Switch, Center, Spinner, Input, useDisclosure,
  AlertDialog, AlertDialogBody, AlertDialogFooter,
  AlertDialogHeader, AlertDialogContent, AlertDialogOverlay,
  Stat, StatLabel, StatNumber, SimpleGrid, Card, CardBody,
} from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminGetUsers, adminUpdateUser, adminDeleteUser,
  adminGetRegions, adminGetSentAlerts, adminGetSettings, adminUpdateSetting,
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
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState({})

  const save = async (key) => {
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await adminUpdateSetting(key, { value: edits[key] })
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      setEdits(e => { const n = { ...e }; delete n[key]; return n })
      toast({ title: 'Setting saved', status: 'success', duration: 1500 })
    } catch {
      toast({ title: 'Save failed', status: 'error', duration: 2000 })
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  if (isLoading) return <Center py={8}><Spinner color="brand.400" /></Center>

  return (
    <VStack align="stretch" spacing={3} maxW="480px">
      {settings?.map(s => (
        <HStack key={s.key} justify="space-between" p={3} bg="gray.750"
          borderRadius="lg" border="1px solid" borderColor="whiteAlpha.100">
          <VStack align="start" spacing={0} flex={1}>
            <Text fontSize="xs" color="gray.500" fontFamily="mono">{s.key}</Text>
            <Input
              size="sm" value={edits[s.key] ?? s.value}
              onChange={e => setEdits(ed => ({ ...ed, [s.key]: e.target.value }))}
              bg="transparent" border="none" p={0} h="auto"
              fontSize="sm" color="white" fontFamily="mono"
              _focus={{ boxShadow: 'none' }}
            />
          </VStack>
          {edits[s.key] !== undefined && edits[s.key] !== s.value && (
            <Button size="xs" colorScheme="brand" onClick={() => save(s.key)}
              isLoading={saving[s.key]}>
              Save
            </Button>
          )}
        </HStack>
      ))}
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
            {['Users', 'Alert Regions', 'Sent Alerts', 'Settings'].map(t => (
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
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  )
}
