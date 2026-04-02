import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, Spinner, Center } from '@chakra-ui/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import AlertsPage from './pages/AlertsPage'
import Admin from './pages/Admin'
import UserDashboard from './pages/UserDashboard'
import VolcanoDetail from './pages/VolcanoDetail'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <Center h="100vh">
      <Spinner size="xl" color="brand.400" thickness="3px" />
    </Center>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Box minH="100vh" bg="gray.900">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/dashboard" element={
          <PrivateRoute><UserDashboard /></PrivateRoute>} />

        <Route path="/volcano/:vnum" element={
          <PrivateRoute><VolcanoDetail /></PrivateRoute>
        } />

        <Route path="/" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/alerts" element={
          <PrivateRoute><AlertsPage /></PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute><Profile /></PrivateRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute><Admin /></AdminRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
