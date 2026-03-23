import { useState } from 'react'
import {
  Box, VStack, HStack, Text, Input, Button, FormControl,
  FormLabel, FormErrorMessage, useToast, Divider, Avatar,
  Badge, Card, CardBody, InputGroup, InputRightElement,
} from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'
import { updateEmail, changePassword } from '../api'

function Section({ title, children }) {
  return (
    <Card bg="gray.800" border="1px solid" borderColor="whiteAlpha.100" borderRadius="xl" w="100%">
      <CardBody p={6}>
        <Text fontFamily="heading" fontWeight="700" fontSize="md" mb={4} color="white">
          {title}
        </Text>
        {children}
      </CardBody>
    </Card>
  )
}

function EmailForm({ user, refreshUser }) {
  const toast = useToast()
  const [email, setEmail]     = useState(user.email)
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)
  const dirty = email !== user.email

  const save = async () => {
    if (!email.includes('@')) { setError('Valid email required'); return }
    setSaving(true)
    try {
      await updateEmail({ email })
      await refreshUser()
      toast({ title: 'Email updated', status: 'success', duration: 2000 })
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err.response?.data?.detail || 'Unknown error',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <VStack align="stretch" spacing={4}>
      <FormControl isInvalid={!!error}>
        <FormLabel fontSize="sm" color="gray.300">Email address</FormLabel>
        <Input
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          bg="gray.700" borderColor="whiteAlpha.200"
          _hover={{ borderColor: 'brand.500' }}
          _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
        />
        <FormErrorMessage>{error}</FormErrorMessage>
      </FormControl>
      {dirty && (
        <Button colorScheme="brand" size="sm" onClick={save} isLoading={saving} alignSelf="flex-start">
          Save email
        </Button>
      )}
    </VStack>
  )
}

function PasswordForm() {
  const toast = useToast()
  const [form, setForm]       = useState({ current: '', next: '', confirm: '' })
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [show, setShow]       = useState({ current: false, next: false })

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.current)              e.current = 'Required'
    if (form.next.length < 8)       e.next    = 'Min 8 characters'
    if (form.next !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return !Object.keys(e).length
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await changePassword({ current_password: form.current, new_password: form.next })
      setForm({ current: '', next: '', confirm: '' })
      toast({ title: 'Password changed', status: 'success', duration: 2000 })
    } catch (err) {
      toast({
        title: 'Change failed',
        description: err.response?.data?.detail || 'Unknown error',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <VStack align="stretch" spacing={4}>
      {[
        { key: 'current', label: 'Current password',   showKey: 'current' },
        { key: 'next',    label: 'New password',       showKey: 'next' },
        { key: 'confirm', label: 'Confirm new password', showKey: null },
      ].map(({ key, label, showKey }) => (
        <FormControl key={key} isInvalid={!!errors[key]}>
          <FormLabel fontSize="sm" color="gray.300">{label}</FormLabel>
          <InputGroup>
            <Input
              type={showKey && show[showKey] ? 'text' : 'password'}
              value={form[key]}
              onChange={e => set(key, e.target.value)}
              bg="gray.700" borderColor="whiteAlpha.200"
              _hover={{ borderColor: 'brand.500' }}
              _focus={{ borderColor: 'brand.400', boxShadow: 'none' }}
            />
            {showKey && (
              <InputRightElement>
                <Button size="xs" variant="ghost" color="gray.400"
                  onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}>
                  {show[showKey] ? '🙈' : '👁️'}
                </Button>
              </InputRightElement>
            )}
          </InputGroup>
          <FormErrorMessage>{errors[key]}</FormErrorMessage>
        </FormControl>
      ))}
      <Button colorScheme="brand" size="sm" onClick={save} isLoading={saving} alignSelf="flex-start">
        Change password
      </Button>
    </VStack>
  )
}

export default function Profile() {
  const { user, refreshUser } = useAuth()
  if (!user) return null

  return (
    <Box maxW="600px" mx="auto" px={6} py={8}>
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <HStack spacing={4} mb={2}>
          <Avatar size="lg" name={user.username} bg="brand.600" color="white" />
          <VStack align="start" spacing={1}>
            <HStack>
              <Text fontFamily="heading" fontWeight="800" fontSize="xl">{user.username}</Text>
              {user.is_admin && <Badge colorScheme="brand" variant="subtle">Admin</Badge>}
            </HStack>
            <Text fontSize="sm" color="gray.400">
              Member since {new Date(user.created_at).toLocaleDateString('en-GB', {
                month: 'long', year: 'numeric'
              })}
            </Text>
          </VStack>
        </HStack>

        <Section title="Email address">
          <EmailForm user={user} refreshUser={refreshUser} />
        </Section>

        <Section title="Change password">
          <PasswordForm />
        </Section>
      </VStack>
    </Box>
  )
}
