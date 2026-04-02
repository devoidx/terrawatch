import {
  Box, Flex, HStack, Text, Button, Menu, MenuButton,
  MenuList, MenuItem, MenuDivider, Avatar, Badge, useColorModeValue
} from '@chakra-ui/react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { label: 'Map',    to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Alerts', to: '/alerts' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const bg = useColorModeValue('gray.900', 'gray.900')

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <Box
      as="nav"
      bg={bg}
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
      px={6}
      py={3}
      position="sticky"
      top={0}
      zIndex={500}
      backdropFilter="blur(12px)"
    >
      <Flex align="center" justify="space-between" maxW="1600px" mx="auto">
        {/* Logo */}
        <HStack spacing={3} as={Link} to="/" _hover={{ textDecoration: 'none' }}>
          <Box
            w="32px" h="32px" borderRadius="8px"
            bgGradient="linear(to-br, brand.400, brand.700)"
            display="flex" alignItems="center" justifyContent="center"
            fontSize="16px"
          >
            🌍
          </Box>
          <Text
            fontFamily="heading"
            fontWeight="800"
            fontSize="lg"
            letterSpacing="-0.02em"
            color="white"
          >
            Terra<Text as="span" color="brand.400">Watch</Text>
          </Text>
        </HStack>

        {/* Nav links */}
        <HStack spacing={1}>
          {NAV_LINKS.map(({ label, to }) => (
            <Button
              key={to}
              as={Link}
              to={to}
              variant="ghost"
              size="sm"
              color={location.pathname === to ? 'brand.300' : 'gray.400'}
              fontWeight={location.pathname === to ? '600' : '400'}
              _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
            >
              {label}
            </Button>
          ))}
          {user?.is_admin && (
            <Button
              as={Link} to="/admin"
              variant="ghost" size="sm"
              color={location.pathname === '/admin' ? 'brand.300' : 'gray.400'}
              _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
            >
              Admin
            </Button>
          )}
        </HStack>

        {/* User menu */}
        <Menu>
          <MenuButton>
            <HStack spacing={2} cursor="pointer">
              <Avatar size="sm" name={user?.username} bg="brand.600" color="white" />
              <Text fontSize="sm" color="gray.300" display={{ base: 'none', md: 'block' }}>
                {user?.username}
              </Text>
              {user?.is_admin && (
                <Badge colorScheme="brand" variant="subtle" fontSize="2xs">Admin</Badge>
              )}
            </HStack>
          </MenuButton>
          <MenuList bg="gray.800" borderColor="whiteAlpha.200" shadow="xl">
            <MenuItem
              bg="gray.800" _hover={{ bg: 'gray.700' }}
              onClick={() => navigate('/profile')}
            >
              Profile
            </MenuItem>
            <MenuItem
              bg="gray.800" _hover={{ bg: 'gray.700' }}
              onClick={() => navigate('/alerts')}
            >
              My Alert Regions
            </MenuItem>
            <MenuDivider borderColor="whiteAlpha.200" />
            <MenuItem
              bg="gray.800" _hover={{ bg: 'gray.700' }} color="red.400"
              onClick={handleLogout}
            >
              Log out
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Box>
  )
}
