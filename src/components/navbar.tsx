"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { toast } from 'react-hot-toast'
import { Bars3Icon, MoonIcon, SunIcon, UserCircleIcon, BellIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [isHotelOwner, setIsHotelOwner] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check authentication status
  const checkAuthStatus = () => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    setIsAuthenticated(!!token)
    setIsHotelOwner(role === 'hotel-owner')
  }

  // Run auth check on mount and when window gets focus
  useEffect(() => {
    // Initial check
    checkAuthStatus()
    window.addEventListener('focus', checkAuthStatus)
    const intervalId = setInterval(checkAuthStatus, 5000)
    return () => {
      window.removeEventListener('focus', checkAuthStatus)
      clearInterval(intervalId)
    }
  }, [])

  // Fetch user profile data when authenticated
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      
      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          // Update profilePicture state if available
          if (userData.profilePicture) {
            setProfilePicture(userData.profilePicture)
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }
    
    if (isAuthenticated) {
      fetchUserProfile()
    }
  }, [isAuthenticated])

  // Fetch notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchNotifications = async () => {
        try {
          const token = localStorage.getItem('token')
          if (!token) return

          const response = await fetch('/api/notifications', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(errorText)
          }

          const data = await response.json()
          setNotifications(data)
          setUnreadCount(data.filter((n: any) => !n.isRead).length)
        } catch (error) {
          console.error('Error fetching notifications:', error)
          toast.error(error instanceof Error ? error.message : 'Failed to fetch notifications')
        }
      }
      fetchNotifications()
      const notifInterval = setInterval(fetchNotifications, 10000)
      return () => clearInterval(notifInterval)
    }
  }, [isAuthenticated])

  // NEW: Handler to mark unread notifications as read
  const handleMarkNotificationsAsRead = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    const unreadNotifications = notifications.filter(n => !n.isRead)
    try {
      await Promise.all(
        unreadNotifications.map(n =>
          fetch('/api/notifications', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ id: n.id, isRead: true })
          })
        )
      )
      // Update local state to mark all as read
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read.')
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      toast.error('Failed to update notifications.')
    }
  }

  // When notifications dropdown opens, mark all unread as read
  useEffect(() => {
    if (showNotifDropdown) {
      handleMarkNotificationsAsRead()
    }
  }, [showNotifDropdown])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setShowDropdown(false)
    setProfilePicture(null) // Clear profile picture on logout
    toast.success('Logged out successfully')
    router.push('/auth/login')
  }

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  // After mounting, we can safely show the UI that depends on client-side features
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
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
              <Link href="/hotels/create" className="text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary">
                My Hotels
              </Link>
              <Link href="/checkout" className="text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary">
                Checkout
              </Link>
              {isAuthenticated && (
                <div className="relative">
                  <button onClick={() => setShowNotifDropdown(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200">
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-secondary shadow-lg rounded-md py-2 z-50 border border-border max-h-72 overflow-auto">
                      {notifications.length ? (
                        notifications.map(n => (
                          <div key={n.id} className="px-4 py-2 text-sm text-foreground border-b border-border">
                            {n.message || `Notification ${n.id}`}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-foreground">No notifications</div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={toggleDropdown}
                    className="flex items-center text-foreground hover:text-primary dark:text-foreground dark:hover:text-primary"
                  >
                    {profilePicture ? (
                      <div className="h-8 w-8 rounded-full overflow-hidden">
                        <img 
                          src={profilePicture} 
                          alt="Profile" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <UserCircleIcon className="h-8 w-8" />
                    )}
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
                className="p-2 rounded-md bg-transparent hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
                {mounted ? (
                  theme === 'dark' ? (
                    <SunIcon className="h-5 w-5 text-foreground" />
                  ) : (
                    <MoonIcon className="h-5 w-5 text-foreground" />
                  )
                ) : (
                  // Render a placeholder with the same dimensions to prevent layout shift
                  <div className="h-5 w-5" />
                )}
              </button>
            </div>
            
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

        {isOpen && (
          <div className="sm:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/flights" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
                Flights
              </Link>
              <Link href="/hotels" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
                Hotels
              </Link>
              <Link href="/hotels/create" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
                My Hotels
              </Link>
              <Link href="/checkout" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
                Checkout
              </Link>
              {isAuthenticated ? (
                <>
                  <Link href="/profile" className="block px-3 py-2 text-foreground hover:bg-primary/10 hover:text-primary rounded-md">
                    <div className="flex items-center space-x-2">
                      {profilePicture ? (
                        <div className="h-6 w-6 rounded-full overflow-hidden">
                          <img 
                            src={profilePicture} 
                            alt="Profile" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <UserCircleIcon className="h-6 w-6" />
                      )}
                      <span>Profile</span>
                    </div>
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
    </header>
  )
}