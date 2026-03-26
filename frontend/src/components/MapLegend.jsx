import { useState } from 'react'
import { Box, VStack, HStack, Text, IconButton } from '@chakra-ui/react'

const EQ_SCALE = [
  { label: 'M2.5–3.9', color: '#48bb78', desc: 'Minor' },
  { label: 'M4.0–4.9', color: '#ecc94b', desc: 'Light' },
  { label: 'M5.0–5.9', color: '#ed8936', desc: 'Moderate' },
  { label: 'M6.0–6.9', color: '#f56565', desc: 'Strong' },
  { label: 'M7.0+',    color: '#9b2c2c', desc: 'Major' },
]

const VOLC_SCALE = [
  { label: 'Normal',   color: '#48bb78' },
  { label: 'Advisory', color: '#ecc94b' },
  { label: 'Watch',    color: '#ed8936' },
  { label: 'Warning',  color: '#f56565' },
]

export default function MapLegend() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Box
      position="absolute"
      bottom={14}
      left={4}
      zIndex={450}
      bg="gray.900"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.200"
      shadow="xl"
      backdropFilter="blur(12px)"
      overflow="hidden"
      minW={collapsed ? 'auto' : '160px'}
    >
      {/* Header */}
      <HStack px={3} py={2} justify="space-between">
        {!collapsed && (
          <Text fontSize="2xs" fontWeight="700" color="gray.400"
            textTransform="uppercase" letterSpacing="wider">
            Legend
          </Text>
        )}
        <IconButton
          size="xs"
          variant="ghost"
          color="gray.400"
          icon={<Text fontSize="sm">{collapsed ? '▶' : '◀'}</Text>}
          onClick={() => setCollapsed(c => !c)}
          aria-label="Toggle legend"
          _hover={{ bg: 'whiteAlpha.100' }}
          ml={collapsed ? 0 : 'auto'}
        />
      </HStack>

      {/* Content */}
      {!collapsed && (
        <VStack spacing={2} align="stretch" px={3} pb={3}>
          <Text fontSize="2xs" fontWeight="700" color="gray.400"
            textTransform="uppercase" letterSpacing="wider">
            Earthquakes
          </Text>
          {EQ_SCALE.map(({ label, color, desc }) => (
            <HStack key={label} spacing={2}>
              <Box w="12px" h="12px" borderRadius="full" flexShrink={0}
                bg={color} opacity={0.85} />
              <Text fontSize="2xs" color="gray.300" fontFamily="mono">{label}</Text>
              <Text fontSize="2xs" color="gray.500">{desc}</Text>
            </HStack>
          ))}

          <Box borderTop="1px solid" borderColor="whiteAlpha.100" pt={2} mt={1}>
            <Text fontSize="2xs" fontWeight="700" color="gray.400"
              textTransform="uppercase" letterSpacing="wider" mb={2}>
              Volcanoes
            </Text>
            {VOLC_SCALE.map(({ label, color }) => (
              <HStack key={label} spacing={2} mb={1}>
                <svg width="12" height="11" viewBox="0 0 20 18" style={{ flexShrink: 0 }}>
                  <polygon points="10,1 19,17 1,17" fill={color}
                    stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
                </svg>
                <Text fontSize="2xs" color="gray.300">{label}</Text>
              </HStack>
            ))}
          </Box>

          <Box borderTop="1px solid" borderColor="whiteAlpha.100" pt={2} mt={1}>
            <HStack spacing={2}>
              <Box w="12px" h="12px" borderRadius="full" border="2px solid"
                borderColor="green.400" flexShrink={0} />
              <Text fontSize="2xs" color="gray.400">Pulse = last 30 min</Text>
            </HStack>
            <HStack spacing={2} mt={1}>
              <Text fontSize="2xs" color="gray.500" pl="14px">Fade = older events</Text>
            </HStack>
          </Box>
        </VStack>
      )}
    </Box>
  )
}