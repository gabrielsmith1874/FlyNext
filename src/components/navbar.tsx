"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { toast } from 'react-hot-toast'
import { Bars3Icon, MoonIcon, SunIcon, UserCircleIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check authentication status
  const checkAuthStatus = () => {
    setIsAuthenticated(!!localStorage.getItem('token'))
  }

  useEffect(() => {
    // Initial check
    checkAuthStatus()

    // Check when window gets focus (user returns to tab)
    window.addEventListener('focus', checkAuthStatus)

    // Create an interval to periodically check (optional, for better UX)
    const intervalId = setInterval(checkAuthStatus, 5000)

    return () => {
      window.removeEventListener('focus', checkAuthStatus)
      clearInterval(intervalId)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setShowDropdown(false)
    toast.success('Logged out successfully')
    router.push('/auth/login')
  }

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  return (
    <nav className="bg-white dark:bg-secondary border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center space-x-2">
              <img src="/logo.jpg" alt="FlyNext Logo" className="h-8 w-8" />
              <span className="text-xl font-bold text-secondary dark:text-white">FlyNext</span>
            </Link>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
            <Link href="/flights" className="text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary">
              Flights
            </Link>
            <Link href="/hotels" className="text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary">
              Hotels
            </Link>
            <Link href="/checkout" className="text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary">
              Checkout
            </Link>
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={toggleDropdown}
                  className="flex items-center text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary"
                >
                  <UserCircleIcon className="h-8 w-8" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-secondary shadow-lg rounded-md py-1 z-50 border border-border">
                    <Link 
                      href="/profile"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary"
                      onClick={() => setShowDropdown(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary"
              >
                Login
              </Link>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-5 w-5 text-foreground" />
              ) : (
                <MoonIcon className="h-5 w-5 text-foreground" />
              )}
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-foreground hover:text-primary hover:bg-muted"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="sm:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link href="/flights" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
              Flights
            </Link>
            <Link href="/hotels" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
              Hotels
            </Link>
            <Link href="/checkout" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
              Checkout
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/profile" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
                Login
              </Link>
            )}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex w-full items-center px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}