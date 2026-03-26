import { useEffect, useRef, useState } from 'react'
import { VStack, HStack, Text, Button, Spinner } from '@chakra-ui/react'
import L from 'leaflet'
import { OVERLAYS } from './overlays/index'

export default function OverlayManager({ map }) {
  const [active, setActive]     = useState({})
  const [loading, setLoading]   = useState({})
  const layerRefs               = useRef({})

  const toggle = async (overlay) => {
    if (!map) return
    const { id } = overlay

    if (active[id]) {
      // Remove layer
      if (layerRefs.current[id]) {
        map.removeLayer(layerRefs.current[id])
        delete layerRefs.current[id]
      }
      setActive(a => ({ ...a, [id]: false }))
    } else {
      // Load and add layer
      setLoading(l => ({ ...l, [id]: true }))
      try {
        const layer = await overlay.load(map, L)
        layerRefs.current[id] = layer
        setActive(a => ({ ...a, [id]: true }))
      } catch (err) {
        console.error(`Failed to load overlay ${id}:`, err)
      } finally {
        setLoading(l => ({ ...l, [id]: false }))
      }
    }
  }

  // Clean up all layers when component unmounts
  useEffect(() => {
    return () => {
      Object.values(layerRefs.current).forEach(layer => {
        try { map?.removeLayer(layer) } catch {}
      })
    }
  }, [map])

  return (
    <VStack spacing={1} align="stretch">
      <Text fontSize="xs" color="gray.500">Overlays</Text>
      {OVERLAYS.map(overlay => (
        <Button
          key={overlay.id}
          size="sm"
          variant={active[overlay.id] ? 'solid' : 'outline'}
          onClick={() => toggle(overlay)}
          isLoading={loading[overlay.id]}
          loadingText={overlay.label}
          leftIcon={loading[overlay.id] ? <Spinner size="xs" /> : undefined}
          borderColor={active[overlay.id] ? undefined : 'whiteAlpha.300'}
          bg={active[overlay.id] ? overlay.color : undefined}
          color={active[overlay.id] ? 'white' : 'gray.300'}
          _hover={{
            bg: active[overlay.id] ? overlay.color : 'whiteAlpha.100',
          }}
          w="100%"
          justifyContent="flex-start"
        >
          {overlay.icon} {overlay.label}
        </Button>
      ))}
    </VStack>
  )
}