"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/src/hooks/useAuth'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeftIcon, 
  CalendarIcon, 
  MagnifyingGlassIcon, 
  XMarkIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import Link from 'next/link'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'


// Types
interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  specialRequests?: string;
}

interface HotelBooking {
  id: string;
  bookingId: string;
  hotelId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  price: number;
  currency: string;
  status: string;
  guestDetails: string; // JSON string containing guest information
  createdAt: string;
  updatedAt: string;
  room: {
    id: string;
    type: string;
    hotelId: string;
    description: string;
    price: number;
    currency: string;
    amenities: string;
    availableCount: number;
    maxGuests: number;
  };
  hotel?: {
    id: string;
    name: string;
    description: string;
    ownerId: string;
  };
  parsedGuestDetails?: GuestDetails; // We'll add this after parsing
}

interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  images: Array<{ url: string }>;
  ownerId: string;
}

const BookingManagementPage = () => {
  const { id: hotelId } = useParams() as { id: string }
  const router = useRouter()
  const { user, token } = useAuth()
  const authLoading = false;
  
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [bookings, setBookings] = useState<HotelBooking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<HotelBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<HotelBooking | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // Check if user is authorized and fetch hotel data
  useEffect(() => {
    const checkAuthorization = async () => {
      if (authLoading) return;

      try {
        const token = localStorage.getItem('token')
        
        if (!token) {
          toast.error('Authentication token not found. Please log in again.')
          return router.push('/login')
        }
        
        const profileResponse = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!profileResponse.ok) {
          toast.error('Failed to verify your account. Please log in again.')
          localStorage.removeItem('token')
          return router.push('/login')
        }
        
        const profileData = await profileResponse.json();
        const userId = profileData.id;
        
        if (!userId) {
          toast.error('User ID not found. Please log in again.')
          return router.push('/login')
        }
        
        const response = await fetch(`/api/hotels/${hotelId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.status === 401) {
          toast.error('Your session has expired. Please log in again.')
          localStorage.removeItem('token')
          return router.push('/login')
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch hotel details')
        }

        const hotelData = await response.json()
        
        const ownerIdFromResponse = hotelData.ownerId || hotelData.userId || hotelData.owner?.id;
        
        if (!ownerIdFromResponse) {
          setHotel(hotelData)
          fetchBookings()
          return;
        }
        
        if (ownerIdFromResponse !== userId) {
          toast.error('You are not authorized to manage this hotel')
          return router.push('/hotels/create')
        }

        setHotel(hotelData)
        fetchBookings()
      } catch (error) {
        toast.error('Error loading hotel information')
        router.push('/hotels/create')
      }
    }

    checkAuthorization()
  }, [hotelId, authLoading, router])

  // Fetch bookings for this hotel
  const fetchBookings = async () => {
    setIsLoading(true)
    try {
        const token = localStorage.getItem('token')
      
        if (!token) {
            toast.error('Authentication token not found')
            router.push('/login')
            return
        }
      
        // Use the updated query parameters for filtering
        let url = `/api/hotels/${hotelId}/rooms`
        const queryParams = new URLSearchParams()
      
        // The endpoint accepts "date" as a single parameter for bookings active on the given day.
        if (dateFilter.startDate) queryParams.append('date', dateFilter.startDate)
      
        // "status" is a substring match (case-insensitive)
        if (statusFilter !== 'ALL') queryParams.append('status', statusFilter)
      
        // "roomType" is a substring match
        if (searchTerm) {
            queryParams.append('roomType', searchTerm)
        }
      
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`
        }
      
        console.log("Fetching bookings from:", url)
      
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
      
        if (response.status === 401) {
            toast.error('Your session has expired. Please log in again.')
            localStorage.removeItem('token')
            router.push('/login')
            return
        }
      
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error("Bookings fetch error:", errorData)
            throw new Error(errorData.error || 'Failed to fetch bookings')
        }
      
        const data = await response.json()
        console.log("Raw booking data:", data)
      
        // Process bookings to parse guest details JSON
        const processedBookings = data.map((booking: HotelBooking) => {
            try {
                const parsedGuestDetails = booking.guestDetails
                    ? JSON.parse(booking.guestDetails) as GuestDetails
                    : null
                return {
                    ...booking,
                    parsedGuestDetails
                }
            } catch (e) {
                console.error("Error parsing guest details for booking:", booking.id, e)
                return booking
            }
        })
      
        console.log("Processed bookings:", processedBookings.length)
        setBookings(processedBookings)
        setFilteredBookings(processedBookings)
    } catch (error) {
        console.error('Fetch bookings error:', error)
        toast.error('Failed to load bookings')
    } finally {
        setIsLoading(false)
    }
}

  // Cancel booking
  const cancelBooking = async () => {
    if (!bookingToCancel) return
    
    setIsCancelling(true)
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.error('Authentication token not found')
        setIsModalOpen(false)
        router.push('/login')
        return
      }
      
      const response = await fetch(`/api/bookings/${bookingToCancel.bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        toast.error('Your session has expired. Please log in again.')
        localStorage.removeItem('token')
        setIsModalOpen(false)
        router.push('/login')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to cancel booking')
      }

      setBookings(bookings.map(booking => {
        if (booking.id === bookingToCancel.id) {
          return { ...booking, status: 'CANCELLED' }
        }
        return booking
      }))
      
      toast.success('Booking cancelled successfully')
      setIsModalOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel booking')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleCancelClick = (booking: HotelBooking) => {
    setBookingToCancel(booking)
    setIsModalOpen(true)
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setDateFilter({ startDate: '', endDate: '' })
    fetchBookings()
  }

  const applyDateFilters = () => {
    fetchBookings()
  }

  // Refetch bookings when search, status, or date filters change
  useEffect(() => {
    if (hotel) {
      fetchBookings()
    }
  }, [searchTerm, statusFilter, dateFilter])

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="min-h-screen relative pt-16">
      <div className="fixed inset-0 top-16 bg-[url('/backgrounds/hotellight.webp')] dark:bg-[url('/backgrounds/hoteldark.webp')] bg-cover bg-center z-0"></div>
      <div className="fixed inset-0 top-16 bg-black/50 z-0"></div>
      <div className="relative z-1">
        <div className="container mx-auto py-8 px-4">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <Link href="/hotels/create" className="inline-flex items-center text-primary hover:text-primary-dark mb-4">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to My Hotels
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {hotel ? hotel.name : 'Loading...'} - Bookings
                </h1>
                <p className="text-muted-foreground mt-1">
                  {hotel ? `${hotel.city}, ${hotel.country}` : ''}
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-col items-end">
                <div className="text-sm text-muted-foreground">Bookings</div>
                <div className="text-xl font-semibold mt-1">{filteredBookings.length} total</div>
                <div className="flex mt-2">
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 mr-2">
                    {bookings.filter(b => b.status === 'CONFIRMED').length} confirmed
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                    {bookings.filter(b => b.status === 'PENDING').length} pending
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card/60 backdrop-blur-sm rounded-lg p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by room type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="w-full md:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full py-2 px-3 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                
                <button 
                  onClick={() => document.getElementById('dateFilters')?.classList.toggle('hidden')}
                  className="inline-flex items-center px-4 py-2 border border-input bg-background rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Date Filter
                </button>
                
                <button 
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 border border-input bg-background rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Reset
                </button>
              </div>
              
              <div id="dateFilters" className="hidden mt-4 p-4 bg-background border border-input rounded-md">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Check-in Date</label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                      className="w-full p-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Check-out Date</label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                      className="w-full p-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={applyDateFilters}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-card/60 backdrop-blur-sm rounded-lg p-8 text-center">
                <h3 className="text-lg font-medium text-foreground mb-2">No bookings found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'ALL' || dateFilter.startDate || dateFilter.endDate 
                    ? 'Try changing your search filters'
                    : 'There are no bookings for this hotel yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredBookings.map((booking) => {
                  const guest = booking.parsedGuestDetails || {
                    firstName: 'Guest',
                    lastName: '',
                    email: 'No email provided'
                  };
                  
                  return (
                    <div key={booking.id} className="bg-card/60 backdrop-blur-sm rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground flex items-center">
                              {guest.firstName} {guest.lastName}
                              <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                {booking.status}
                              </span>
                            </h3>
                            <p className="text-muted-foreground mt-1">{guest.email}</p>
                            <p className="text-sm mt-2">
                              <span className="font-medium">Booking Reference:</span> {booking.bookingId}
                            </p>
                          </div>
                          <div className="mt-4 md:mt-0 text-right">
                            <div className="text-xl font-bold text-foreground">
                              {booking.currency} {booking.price.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {calculateNights(booking.checkInDate, booking.checkOutDate)} nights
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Room Type</div>
                            <div className="font-medium">{booking.room?.type || 'Unknown'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Check-in</div>
                            <div className="font-medium">{formatDate(booking.checkInDate)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Check-out</div>
                            <div className="font-medium">{formatDate(booking.checkOutDate)}</div>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                          {booking.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancelClick(booking)}
                              className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-background p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-foreground"
                  >
                    Cancel Booking
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to cancel this booking? This action cannot be undone.
                    </p>
                    {bookingToCancel && (
                      <div className="mt-3 p-3 bg-card rounded-md">
                        <p className="text-sm font-medium">Booking Reference: {bookingToCancel.bookingId}</p>
                        <p className="text-sm">
                          Guest: {bookingToCancel.parsedGuestDetails?.firstName || 'Guest'} {bookingToCancel.parsedGuestDetails?.lastName || ''}
                        </p>
                        <p className="text-sm">
                          Dates: {formatDate(bookingToCancel.checkInDate)} - {formatDate(bookingToCancel.checkOutDate)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex space-x-3 justify-end">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      onClick={cancelBooking}
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}

export default BookingManagementPage