import { useState } from 'react'
import {
  Box, VStack, HStack, Text, Button, Badge, Switch,
  Card, CardBody, IconButton, useDisclosure, useToast,
  SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  Divider, Center, Spinner, AlertDialog, AlertDialogBody,
  AlertDialogFooter, AlertDialogHeader, AlertDialogContent,
  AlertDialogOverlay, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Tabs, TabList, Tab, TabPanels, TabPanel,
} from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import {
  getAlertRegions, deleteAlertRegion, updateAlertRegion,
  getAlertHistory, getNotifPrefs, updateNotifPrefs,
} from '../api'
import AlertRegionModal from '../components/AlertRegionModal'

const VOLCANO_COLOR = { normal: 'green', advisory: 'yellow', watch: 'orange', warning: 'red' }

function RegionCard({ region, onEdit, onDelete, onToggle }) {
  return (
    <Card bg="gray.800" border="1px solid" borderColor="whiteAlpha.100" shadow="md" borderRadius="xl">
      <CardBody p={4}>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <VStack align="start" spacing={0}>
              <Text fontWeight="700" fontSize="md" color="white">{region.name}</Text>
              <Text fontSize="xs" color="gray.500" fontFamily="mono">
                {Number(region.lat_min).toFixed(1)}°–{Number(region.lat_max).toFixed(1)}°N,{' '}
                {Number(region.lng_min).toFixed(1)}°–{Number(region.lng_max).toFixed(1)}°E
              </Text>
            </VStack>
            <Switch
              isChecked={region.is_active}
              onChange={() => onToggle(region)}
              colorScheme="brand"
              size="sm"
            />
          </HStack>

          <Divider borderColor="whiteAlpha.100" />

          <SimpleGrid columns={2} spacing={2}>
            <Box bg="gray.750" borderRadius="lg" p={2.5}>
              <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={1}>
                Earthquake
              </Text>
              <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                M{Number(region.min_earthquake_magnitude).toFixed(1)}+
              </Badge>
            </Box>
            <Box bg="gray.750" borderRadius="lg" p={2.5}>
              <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={1}>
                Volcano
              </Text>
              {region.include_volcanoes ? (
                <Badge colorScheme={VOLCANO_COLOR[region.min_volcano_alert_level] || 'gray'} variant="subtle" fontSize="xs">
                  {region.min_volcano_alert_level}+
                </Badge>
              ) : (
                <Badge colorScheme="gray" variant="subtle" fontSize="xs">Off</Badge>
              )}
            </Box>
          </SimpleGrid>

          <HStack spacing={2} justify="flex-end">
            <Button size="xs" variant="ghost" color="gray.400" onClick={() => onEdit(region)}
              _hover={{ bg: 'whiteAlpha.100' }}>
              Edit
            </Button>
            <Button size="xs" variant="ghost" color="red.400" onClick={() => onDelete(region)}
              _hover={{ bg: 'red.900' }}>
              Delete
            </Button>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  )
}

function NotifPrefsPanel() {
  const toast = useToast()
  const { data: prefs, refetch } = useQuery({ queryKey: ['notif-prefs'], queryFn: getNotifPrefs })
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState(null)

  const current = local ?? prefs ?? {}
  const set = (k, v) => setLocal(p => ({ ...(p ?? prefs ?? {}), [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await updateNotifPrefs(local)
      await refetch()
      setLocal(null)
      toast({ title: 'Preferences saved', status: 'success', duration: 2000 })
    } catch {
      toast({ title: 'Save failed', status: 'error', duration: 2000 })
    } finally {
      setSaving(false)
    }
  }

  if (!prefs) return <Center py={8}><Spinner size="sm" color="brand.400" /></Center>

  return (
    <VStack align="stretch" spacing={4} maxW="480px">
      <Text fontSize="sm" color="gray.400">
        Choose how you want to be notified when activity occurs in your alert regions.
      </Text>

      {[
        { key: 'email_enabled',   label: 'Email notifications',        desc: 'Sent to your registered email address' },
        { key: 'sms_enabled',     label: 'SMS / text notifications',   desc: 'Requires a phone number below' },
        { key: 'push_enabled',    label: 'Browser push notifications', desc: 'Requires browser permission' },
      ].map(({ key, label, desc }) => (
        <HStack key={key} justify="space-between" p={3} bg="gray.750" borderRadius="lg"
          border="1px solid" borderColor="whiteAlpha.100">
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight="600" color="white">{label}</Text>
            <Text fontSize="xs" color="gray.500">{desc}</Text>
          </VStack>
          <Switch isChecked={!!current[key]} onChange={e => set(key, e.target.checked)} colorScheme="brand" />
        </HStack>
      ))}

      {current.sms_enabled && (
        <Box>
          <Text fontSize="sm" color="gray.300" mb={1}>Phone number</Text>
          <input
            value={current.phone_number || ''}
            onChange={e => set('phone_number', e.target.value)}
            placeholder="+44 7700 900000"
            style={{
              width: '100%', background: '#2D3748', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '14px',
              outline: 'none',
            }}
          />
        </Box>
      )}

      {local && (
        <Button colorScheme="brand" size="sm" onClick={save} isLoading={saving} alignSelf="flex-end">
          Save preferences
        </Button>
      )}
    </VStack>
  )
}

function AlertHistoryTable() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['alert-history'],
    queryFn: getAlertHistory,
  })

  if (isLoading) return <Center py={8}><Spinner size="sm" color="brand.400" /></Center>
  if (!history?.length) return (
    <Center py={12}>
      <VStack spacing={2}>
        <Text fontSize="2xl">🔕</Text>
        <Text color="gray.500" fontSize="sm">No alerts sent yet</Text>
      </VStack>
    </Center>
  )

  return (
    <TableContainer>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th color="gray.500" borderColor="whiteAlpha.100">Type</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Event</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Channels</Th>
            <Th color="gray.500" borderColor="whiteAlpha.100">Sent</Th>
          </Tr>
        </Thead>
        <Tbody>
          {history.map(a => (
            <Tr key={a.id} _hover={{ bg: 'whiteAlpha.50' }}>
              <Td borderColor="whiteAlpha.100">
                <Badge colorScheme={a.event_type === 'earthquake' ? 'blue' : 'orange'} variant="subtle">
                  {a.event_type === 'earthquake' ? '🌍' : '🌋'} {a.event_type}
                </Badge>
              </Td>
              <Td borderColor="whiteAlpha.100">
                <VStack align="start" spacing={0}>
                  <Text fontSize="xs" color="gray.300">
                    {a.event_magnitude ? `M${Number(a.event_magnitude).toFixed(1)} — ` : ''}{a.event_location || '—'}
                  </Text>
                </VStack>
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

export default function AlertsPage() {
  const toast        = useToast()
  const queryClient  = useQueryClient()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const cancelRef    = useRef()

  const [selectedRegion, setSelectedRegion] = useState(null)
  const [deleting, setDeleting]             = useState(false)

  const { data: regions, isLoading } = useQuery({
    queryKey: ['alert-regions'],
    queryFn:  getAlertRegions,
  })

  const handleEdit = (region) => { setSelectedRegion(region); onEditOpen() }
  const handleDeleteClick = (region) => { setSelectedRegion(region); onDeleteOpen() }

  const handleToggle = async (region) => {
    try {
      await updateAlertRegion(region.id, { is_active: !region.is_active })
      queryClient.invalidateQueries({ queryKey: ['alert-regions'] })
    } catch {
      toast({ title: 'Update failed', status: 'error', duration: 2000 })
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAlertRegion(selectedRegion.id)
      queryClient.invalidateQueries({ queryKey: ['alert-regions'] })
      toast({ title: 'Region deleted', status: 'success', duration: 2000 })
      onDeleteClose()
    } catch {
      toast({ title: 'Delete failed', status: 'error', duration: 2000 })
    } finally {
      setDeleting(false)
    }
  }

  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ['alert-regions'] })

  return (
    <Box maxW="1100px" mx="auto" px={6} py={8}>
      <VStack align="stretch" spacing={8}>
        {/* Header */}
        <HStack justify="space-between" align="flex-end">
          <VStack align="start" spacing={1}>
            <Text fontFamily="heading" fontWeight="800" fontSize="2xl" letterSpacing="-0.02em">
              Alert Regions
            </Text>
            <Text color="gray.400" fontSize="sm">
              Monitor specific areas for seismic and volcanic activity
            </Text>
          </VStack>
          <Button colorScheme="brand" size="sm" onClick={() => window.location.href = '/'}>
            + Draw region on map
          </Button>
        </HStack>

        <Tabs variant="line" colorScheme="brand">
          <TabList borderColor="whiteAlpha.100">
            <Tab fontSize="sm" color="gray.400" _selected={{ color: 'brand.300', borderColor: 'brand.300' }}>
              My Regions ({regions?.length ?? 0})
            </Tab>
            <Tab fontSize="sm" color="gray.400" _selected={{ color: 'brand.300', borderColor: 'brand.300' }}>
              Notification Settings
            </Tab>
            <Tab fontSize="sm" color="gray.400" _selected={{ color: 'brand.300', borderColor: 'brand.300' }}>
              Alert History
            </Tab>
          </TabList>

          <TabPanels>
            {/* Regions list */}
            <TabPanel px={0} pt={6}>
              {isLoading ? (
                <Center py={12}><Spinner color="brand.400" /></Center>
              ) : !regions?.length ? (
                <Center py={16}>
                  <VStack spacing={3}>
                    <Text fontSize="4xl">📍</Text>
                    <Text fontWeight="600" color="gray.300">No alert regions yet</Text>
                    <Text fontSize="sm" color="gray.500">
                      Go to the map and draw a rectangle to define a monitoring area
                    </Text>
                    <Button colorScheme="brand" size="sm" mt={2} onClick={() => window.location.href = '/'}>
                      Open map
                    </Button>
                  </VStack>
                </Center>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {regions.map(r => (
                    <RegionCard
                      key={r.id}
                      region={r}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                      onToggle={handleToggle}
                    />
                  ))}
                </SimpleGrid>
              )}
            </TabPanel>

            {/* Notification prefs */}
            <TabPanel px={0} pt={6}>
              <NotifPrefsPanel />
            </TabPanel>

            {/* History */}
            <TabPanel px={0} pt={6}>
              <AlertHistoryTable />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Edit modal */}
      <AlertRegionModal
        isOpen={isEditOpen}
        onClose={onEditClose}
        onSaved={handleSaved}
        region={selectedRegion}
        drawnBounds={null}
      />

      {/* Delete confirm */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose}>
        <AlertDialogOverlay backdropFilter="blur(4px)" bg="blackAlpha.700">
          <AlertDialogContent bg="gray.800" border="1px solid" borderColor="whiteAlpha.200">
            <AlertDialogHeader fontFamily="heading" fontWeight="700">Delete region</AlertDialogHeader>
            <AlertDialogBody color="gray.300">
              Delete <Text as="span" fontWeight="700" color="white">"{selectedRegion?.name}"</Text>?
              You'll stop receiving alerts for this area.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} variant="ghost" color="gray.400" onClick={onDeleteClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDelete} isLoading={deleting}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}
