import { useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'

interface AuthUser {
  id: string
  email: string
  role: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken) as AuthUser
        setUser(decoded)
        setToken(storedToken)
      } catch (error) {
        console.error('Invalid token:', error)
        localStorage.removeItem('token')
      }
    }
  }, [])

  return { user, token }
}
