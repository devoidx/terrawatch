import { useState, useCallback } from 'react'
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, FormControl, FormLabel, Input, Select,
  Switch, VStack, HStack, Text, Box, Badge, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, useToast, Divider, Alert, AlertIcon,
} from '@chakra-ui/react'
import { createAlertRegion, updateAlertRegion } from '../api'

const DEFAULT_FORM = {
  name: '',
  min_earthquake_magnitude: 4.0,
  include_volcanoes: true,
  min_volcano_alert_level: 'advisory',
  is_active: true,
}

export default function AlertRegionModal({ isOpen, onClose, onSaved, region, drawnBounds }) {
  const isEdit = !!region
  const toast  = useToast()
  const [form, setForm]       = useState(region ? {
    name: region.name,
    min_earthquake_magnitude: region.min_earthquake_magnitude,
    include_volcanoes: region.include_volcanoes,
    min_volcano_alert_level: region.min_volcano_alert_level,
    is_active: region.is_active,
  } : DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', status: 'warning', duration: 2000 })
      return
    }
    if (!isEdit && !drawnBounds) {
      toast({ title: 'Draw a region on the map first', status: 'warning', duration: 3000 })
      return
    }
    setSaving(true)
    try {
      const payload = isEdit
        ? form
        : { ...form, ...drawnBounds }

      const saved = isEdit
        ? await updateAlertRegion(region.id, payload)
        : await createAlertRegion(payload)

      toast({ title: isEdit ? 'Region updated' : 'Alert region created!', status: 'success', duration: 2500 })
      onSaved?.(saved)
      onClose()
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err.response?.data?.detail || 'Unknown error',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay backdropFilter="blur(4px)" bg="blackAlpha.700" />
      <ModalContent bg="gray.800" border="1px solid" borderColor="whiteAlpha.200">
        <ModalHeader fontFamily="heading" fontWeight="700">
          {isEdit ? 'Edit Alert Region' : 'New Alert Region'}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {!isEdit && !drawnBounds && (
              <Alert status="info" borderRadius="md" bg="blue.900" borderColor="blue.700" border="1px solid">
                <AlertIcon color="blue.300" />
                <Text fontSize="sm" color="blue.200">
                  Draw a rectangle on the map, then save the region here.
                </Text>
              </Alert>
            )}

            {!isEdit && drawnBounds && (
              <Box bg="green.900" border="1px solid" borderColor="green.700" borderRadius="md" p={2}>
                <Text fontSize="xs" color="green.300" fontWeight="600">✓ Region drawn on map</Text>
                <Text fontSize="2xs" color="green.500" fontFamily="mono">
                  {drawnBounds.lat_min.toFixed(2)}°–{drawnBounds.lat_max.toFixed(2)}° N,{' '}
                  {drawnBounds.lng_min.toFixed(2)}°–{drawnBounds.lng_max.toFixed(2)}° E
                </Text>
              </Box>
            )}

            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.300">Region name</FormLabel>
              <Input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Pacific Northwest"
                bg="gray.700"
                borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'brand.500' }}
                _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
              />
            </FormControl>

            <Divider borderColor="whiteAlpha.100" />

            <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider">
              Earthquake Alerts
            </Text>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.300">Minimum magnitude</FormLabel>
              <NumberInput
                value={form.min_earthquake_magnitude}
                onChange={(_, v) => set('min_earthquake_magnitude', v)}
                min={2.5} max={9} step={0.5}
                precision={1}
              >
                <NumberInputField bg="gray.700" borderColor="whiteAlpha.200" />
                <NumberInputStepper>
                  <NumberIncrementStepper borderColor="whiteAlpha.200" />
                  <NumberDecrementStepper borderColor="whiteAlpha.200" />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>

            <Divider borderColor="whiteAlpha.100" />

            <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider">
              Volcano Alerts
            </Text>

            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="sm" color="gray.300" mb={0}>Include volcano alerts</FormLabel>
                <Switch
                  isChecked={form.include_volcanoes}
                  onChange={e => set('include_volcanoes', e.target.checked)}
                  colorScheme="brand"
                />
              </HStack>
            </FormControl>

            {form.include_volcanoes && (
              <FormControl>
                <FormLabel fontSize="sm" color="gray.300">Minimum alert level</FormLabel>
                <Select
                  value={form.min_volcano_alert_level}
                  onChange={e => set('min_volcano_alert_level', e.target.value)}
                  bg="gray.700"
                  borderColor="whiteAlpha.200"
                >
                  <option value="normal">Normal (all activity)</option>
                  <option value="advisory">Advisory</option>
                  <option value="watch">Watch</option>
                  <option value="warning">Warning only</option>
                </Select>
              </FormControl>
            )}

            <Divider borderColor="whiteAlpha.100" />

            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="sm" color="gray.300" mb={0}>Active</FormLabel>
                <Switch
                  isChecked={form.is_active}
                  onChange={e => set('is_active', e.target.checked)}
                  colorScheme="brand"
                />
              </HStack>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose} color="gray.400">Cancel</Button>
          <Button
            colorScheme="brand"
            onClick={handleSave}
            isLoading={saving}
            isDisabled={!isEdit && !drawnBounds}
          >
            {isEdit ? 'Save changes' : 'Create region'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
