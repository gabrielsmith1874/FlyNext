"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type AuthContextType = {
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  useEffect(() => {
    // Check on mount
    setIsAuthenticated(!!localStorage.getItem('token'))
    
    // Listen for storage events (for multi-tab sync)
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'))
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  const login = (token: string) => {
    localStorage.setItem('token', token)
    setIsAuthenticated(true)
  }
  
  const logout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
