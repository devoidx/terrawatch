import { useState } from 'react'
import {
  Box, VStack, Text, Input, Button, FormControl,
  FormLabel, FormErrorMessage, Link, useToast, Center, InputGroup, InputRightElement,
} from '@chakra-ui/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { register } from '../api'
import { useAuth } from '../context/AuthContext'
import { login } from '../api'

export default function Register() {
  const { loginSuccess } = useAuth()
  const navigate = useNavigate()
  const toast    = useToast()
  const [form, setForm]       = useState({ username: '', email: '', password: '', confirm: '' })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  const validate = () => {
    const e = {}
    if (!form.username.trim() || form.username.length < 3) e.username = 'Must be at least 3 characters'
    if (!form.email.includes('@'))                         e.email    = 'Valid email required'
    if (form.password.length < 8)                          e.password = 'Must be at least 8 characters'
    if (form.password !== form.confirm)                    e.confirm  = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await register({ username: form.username, email: form.email, password: form.password })
      // Auto-login after registration
      const data = await login({ username: form.username, password: form.password })
      loginSuccess(data.access_token)
      toast({ title: 'Account created!', status: 'success', duration: 2000 })
      navigate('/')
    } catch (err) {
      toast({
        title: 'Registration failed',
        description: err.response?.data?.detail || 'Unknown error',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center minH="100vh" bg="gray.900" px={4}>
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
        border="1px solid" borderColor="whiteAlpha.200"
        borderRadius="2xl" p={8} w="100%" maxW="420px" shadow="2xl"
      >
        <VStack spacing={6} align="stretch">
          <VStack spacing={2} align="center">
            <Text fontSize="3xl">🌍</Text>
            <Text fontFamily="heading" fontWeight="800" fontSize="2xl" letterSpacing="-0.02em">
              Create account
            </Text>
            <Text fontSize="sm" color="gray.400">Join TerraWatch</Text>
          </VStack>

          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.username}>
              <FormLabel fontSize="sm" color="gray.300">Username</FormLabel>
              <Input value={form.username} onChange={e => set('username', e.target.value)}
                placeholder="Choose a username" bg="gray.700" borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'brand.500' }} _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
              <FormErrorMessage>{errors.username}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.email}>
              <FormLabel fontSize="sm" color="gray.300">Email</FormLabel>
              <Input value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="your@email.com" type="email" bg="gray.700" borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'brand.500' }} _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel fontSize="sm" color="gray.300">Password</FormLabel>
              <InputGroup>
                <Input value={form.password} onChange={e => set('password', e.target.value)}
                  type={showPw ? 'text' : 'password'} placeholder="Min 8 characters"
                  bg="gray.700" borderColor="whiteAlpha.200"
                  _hover={{ borderColor: 'brand.500' }} _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
                <InputRightElement>
                  <Button size="xs" variant="ghost" color="gray.400" onClick={() => setShowPw(s => !s)}>
                    {showPw ? '🙈' : '👁️'}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.confirm}>
              <FormLabel fontSize="sm" color="gray.300">Confirm password</FormLabel>
              <Input value={form.confirm} onChange={e => set('confirm', e.target.value)}
                type="password" placeholder="Repeat password"
                bg="gray.700" borderColor="whiteAlpha.200"
                _hover={{ borderColor: 'brand.500' }} _focus={{ borderColor: 'brand.400', boxShadow: 'none' }} />
              <FormErrorMessage>{errors.confirm}</FormErrorMessage>
            </FormControl>

            <Button colorScheme="brand" size="lg" onClick={handleSubmit} isLoading={loading}
              loadingText="Creating account…" mt={2} fontWeight="700">
              Create account
            </Button>
          </VStack>

          <Text fontSize="sm" color="gray.400" textAlign="center">
            Already have an account?{' '}
            <Link as={RouterLink} to="/login" color="brand.400" fontWeight="600">Sign in</Link>
          </Text>
        </VStack>
      </Box>
    </Center>
  )
}
