import { useState } from 'react'
import {
  Box, VStack, HStack, Text, Input, Button, FormControl,
  FormLabel, FormErrorMessage, Link, useToast, Center,
  InputGroup, InputRightElement, IconButton,
} from '@chakra-ui/react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../api'

export default function Login() {
  const { loginSuccess } = useAuth()
  const navigate = useNavigate()
  const [params]  = useSearchParams()
  const toast     = useToast()
  const [form, setForm]       = useState({ username: '', password: '' })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  const validate = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.password)        e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const data = await login({ username: form.username, password: form.password })
      loginSuccess(data.access_token)
      navigate('/')
    } catch (err) {
      toast({
        title: 'Login failed',
        description: err.response?.data?.detail || 'Invalid credentials',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center minH="100vh" bg="gray.900" px={4}>
      {/* Background decoration */}
      <Box
        position="fixed" inset={0} zIndex={0} overflow="hidden" pointerEvents="none"
      >
        <Box
          position="absolute" top="-20%" left="50%" transform="translateX(-50%)"
          w="800px" h="800px" borderRadius="full"
          bgGradient="radial(brand.900 0%, transparent 70%)"
          opacity={0.4}
        />
      </Box>

      <Box
        position="relative" zIndex={1}
        bg="gray.800"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="2xl"
        p={8}
        w="100%"
        maxW="400px"
        shadow="2xl"
      >
        <VStack spacing={6} align="stretch">
          {/* Logo */}
          <VStack spacing={2} align="center">
            <Text fontSize="3xl">🌍</Text>
            <Text fontFamily="heading" fontWeight="800" fontSize="2xl" letterSpacing="-0.02em">
              Terra<Text as="span" color="brand.400">Watch</Text>
            </Text>
            <Text fontSize="sm" color="gray.400">Real-time seismic &amp; volcanic monitoring</Text>
          </VStack>

          {params.get('expired') && (
            <Box bg="orange.900" border="1px solid" borderColor="orange.700" borderRadius="md" p={3}>
              <Text fontSize="sm" color="orange.200">Your session expired. Please log in again.</Text>
            </Box>
          )}

          {/* Form */}
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.username}>
              <FormLabel fontSize="sm" color="gray.300">Username</FormLabel>
              <Input
                value={form.username}
                onChange={e => set('username', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your username"
                bg="gray.700" borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'brand.500' }}
                _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
              />
              <FormErrorMessage>{errors.username}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel fontSize="sm" color="gray.300">Password</FormLabel>
              <InputGroup>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Enter your password"
                  bg="gray.700" borderColor="whiteAlpha.200"
                  _hover={{ borderColor: 'brand.500' }}
                  _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
                />
                <InputRightElement>
                  <Button size="xs" variant="ghost" color="gray.400" onClick={() => setShowPw(s => !s)}>
                    {showPw ? '🙈' : '👁️'}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <Button
              colorScheme="brand"
              size="lg"
              onClick={handleSubmit}
              isLoading={loading}
              loadingText="Signing in…"
              mt={2}
              fontWeight="700"
            >
              Sign in
            </Button>
          </VStack>

          <Text fontSize="sm" color="gray.400" textAlign="center">
            Don't have an account?{' '}
            <Link as={RouterLink} to="/register" color="brand.400" fontWeight="600">
              Register
            </Link>
          </Text>
        </VStack>
      </Box>
    </Center>
  )
}
