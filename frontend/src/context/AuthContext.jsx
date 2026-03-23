import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('tw_token')
    if (!token) { setLoading(false); return }
    try {
      const u = await getMe()
      setUser(u)
    } catch {
      localStorage.removeItem('tw_token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  const loginSuccess = (token) => {
    localStorage.setItem('tw_token', token)
    fetchUser()
  }

  const logout = () => {
    localStorage.removeItem('tw_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginSuccess, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
