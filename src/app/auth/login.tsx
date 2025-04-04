"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { searchFlights, bookFlights, getAirports } from '@/lib/afs-api'
import { toast } from 'react-hot-toast'
import { PaperAirplaneIcon, ArrowLongRightIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline'

interface FlightSearchForm {
  from: string
  to: string
  departDate: string
  returnDate?: string
  passengers: number
}

interface BookingForm {
  flightId: string
  passengers: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }[]
  paymentDetails: {
    cardNumber: string
    cardholderName: string
    expiryDate: string
    cvv: string
  }
}

interface BookingResponse {
  bookingReference?: string;
}

export default function FlightSearch() {
  const [flights, setFlights] = useState<any[]>([])
  const [airports, setAirports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFlight, setSelectedFlight] = useState<any>(null)
  const [bookingStep, setBookingStep] = useState(0)
  const [passengerCount, setPassengerCount] = useState(1)
  
  const { register, handleSubmit, watch } = useForm<FlightSearchForm>({
    defaultValues: {
      passengers: 1
    }
  })
  
  const { register: registerBooking, handleSubmit: handleSubmitBooking } = useForm<BookingForm>()

  const watchPassengers = watch('passengers')

  useEffect(() => {
    // Use browser fetch to call the API endpoint
    fetch('/api/airports')
      .then(res => res.json())
      .then(data => setAirports(data))
      .catch(() => toast.error('Failed to load airports'))
  }, [])

  const onSubmit = async (data: FlightSearchForm) => {
    try {
      setIsLoading(true)
      setPassengerCount(Number(data.passengers) || 1)
      
      // Retrieve the token from storage (or from your auth context)
      const token = localStorage.getItem('authToken')
      if (!token) {
        toast.error('Missing authentication token')
        setIsLoading(false)
        return
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        from: data.from,
        to: data.to,
        date: data.departDate
      }).toString()
      
      // Use fetch with the Bearer token
      const res = await fetch(`/api/flights/search?${queryParams}`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      })
      
      const results = await res.json()
      setFlights(Array.isArray(results) ? results : [])
      setIsLoading(false)
    } catch (error) {
      toast.error('Failed to search flights')
      setIsLoading(false)
    }
  }

  const handleFlightSelect = (flight: any) => {
    setSelectedFlight(flight)
    setBookingStep(1)
  }

  const handleBookFlight = async (data: BookingForm) => {
    try {
      setIsLoading(true)
      
      // Add flight ID and organize data for API
      const bookingData: BookingForm = {
        flightId: selectedFlight.id,
        passengers: data.passengers,
        paymentDetails: data.paymentDetails,
      }
      
      const response: BookingResponse = await bookFlights(bookingData)
      
      setIsLoading(false)
      toast.success('Flight booked successfully!')
      
      // Reset booking state
      setBookingStep(0)
      setSelectedFlight(null)
      
      // Show booking reference
      if (response.bookingReference) {
        toast.success(`Booking reference: ${response.bookingReference}`)
      }
    } catch (error) {
      toast.error('Failed to book flight')
      setIsLoading(false)
    }
  }

  const handleLogin = async (data: { username: string; password: string }) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const response = await res.json();
      // Expecting response.token from the login API
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        toast.success('Login successful');
        // ...redirect or update UI...
      } else {
        toast.error('Authentication token not returned');
      }
    } catch (error) {
      toast.error('Login failed');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80')] dark:opacity-0 opacity-100 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&q=80')] dark:opacity-100 opacity-0 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-white/90 dark:bg-black/90" />
      </div>

      <div className="relative z-10 container mx-auto py-8 px-4">
        <div className="flex items-center space-x-3 mb-8">
          <PaperAirplaneIcon className="h-8 w-8 text-primary rotate-45" />
          <h1 className="text-3xl font-bold text-foreground">Find Flights</h1>
        </div>

        {bookingStep === 0 ? (
          <>
            <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border p-6 mb-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      From
                    </label>
                    <select
                      {...register('from', { required: true })}
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      <option value="">Select departure airport</option>
                      {airports.map((airport: any) => (
                        <option key={airport.code} value={airport.code}>
                          {airport.name} ({airport.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      To
                    </label>
                    <select
                      {...register('to', { required: true })}
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      <option value="">Select destination airport</option>
                      {airports.map((airport: any) => (
                        <option key={airport.code} value={airport.code}>
                          {airport.name} ({airport.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Departure Date
                    </label>
                    <div className="relative">
                      <input
                        {...register('departDate', { required: true })}
                        type="date"
                        className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Return Date (Optional)
                    </label>
                    <div className="relative">
                      <input
                        {...register('returnDate')}
                        type="date"
                        className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Passengers
                    </label>
                    <div className="relative">
                      <input
                        {...register('passengers', { required: true, min: 1, max: 9 })}
                        type="number"
                        defaultValue={1}
                        min={1}
                        max={9}
                        className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>Search Flights</>
                  )}
                </button>
              </form>
            </div>

            {flights.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Available Flights</h2>
                
                <div className="grid grid-cols-1 gap-6">
                  {flights.map((flight: any) => (
                    <div
                      key={flight.id}
                      className="bg-card/50 backdrop-blur-sm border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              {flight.airline?.logo ? (
                                <img src={flight.airline.logo} alt={flight.airline.name} className="w-8 h-8" />
                              ) : (
                                <PaperAirplaneIcon className="h-6 w-6 text-primary rotate-45" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">{flight.airline?.name}</h3>
                              <p className="text-sm text-muted-foreground">Flight {flight.flightNumber}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-foreground">${flight.price}</p>
                            <p className="text-sm text-muted-foreground">per person</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{flight.departureTime}</p>
                            <p className="text-sm text-muted-foreground">{flight.origin}</p>
                          </div>
                          
                          <div className="flex-1 px-6">
                            <div className="relative flex items-center justify-center">
                              <div className="w-full border-t border-border"></div>
                              <div className="absolute bg-white dark:bg-black px-3 text-xs text-muted-foreground">
                                {flight.duration}
                              </div>
                              <ArrowLongRightIcon className="absolute right-0 h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-2xl font-bold text-foreground">{flight.arrivalTime}</p>
                            <p className="text-sm text-muted-foreground">{flight.destination}</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleFlightSelect(flight)}
                          className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-foreground">Book Your Flight</h2>
              <button
                onClick={() => setBookingStep(0)}
                className="text-sm text-primary hover:text-primary/80"
              >
                Back to search
              </button>
            </div>

            {/* Flight Summary */}
            <div className="mb-8 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedFlight?.airline?.name}</h3>
                  <p className="text-sm text-muted-foreground">Flight {selectedFlight?.flightNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">
                    ${selectedFlight?.price && passengerCount ? (selectedFlight.price * passengerCount).toFixed(2) : selectedFlight?.price}
                  </p>
                  <p className="text-sm text-muted-foreground">{passengerCount} passenger{passengerCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-foreground">{selectedFlight?.departureTime}</p>
                  <p className="text-sm text-muted-foreground">{selectedFlight?.origin}</p>
                  <p className="text-xs text-muted-foreground">{selectedFlight?.departureDate}</p>
                </div>
                
                <div className="flex-1 px-6">
                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-dashed border-border"></div>
                    <div className="absolute bg-white dark:bg-black px-3 text-xs text-muted-foreground">
                      {selectedFlight?.duration}
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-xl font-bold text-foreground">{selectedFlight?.arrivalTime}</p>
                  <p className="text-sm text-muted-foreground">{selectedFlight?.destination}</p>
                  <p className="text-xs text-muted-foreground">{selectedFlight?.arrivalDate}</p>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <form onSubmit={handleSubmitBooking(handleBookFlight)} className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Passenger Information</h3>
                
                {Array.from({ length: passengerCount }).map((_, index) => (
                  <div key={index} className="mb-6 p-4 border border-border rounded-lg">
                    <h4 className="font-medium mb-3">Passenger {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          First Name
                        </label>
                        <input
                          {...registerBooking(`passengers.${index}.firstName` as any, { required: true })}
                          type="text"
                          className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Last Name
                        </label>
                        <input
                          {...registerBooking(`passengers.${index}.lastName` as any, { required: true })}
                          type="text"
                          className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email
                        </label>
                        <input
                          {...registerBooking(`passengers.${index}.email` as any, { required: true })}
                          type="email"
                          className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Phone
                        </label>
                        <input
                          {...registerBooking(`passengers.${index}.phone` as any, { required: true })}
                          type="tel"
                          className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Card Number
                    </label>
                    <input
                      {...registerBooking('paymentDetails.cardNumber', { required: true })}
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Expiry Date
                    </label>
                    <input
                      {...registerBooking('paymentDetails.expiryDate', { required: true })}
                      type="text"
                      placeholder="MM/YY"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      CVV
                    </label>
                    <input
                      {...registerBooking('paymentDetails.cvv', { required: true })}
                      type="text"
                      placeholder="123"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="w-4 h-4" /> Booking...
                  </span>
                ) : (
                  'Book Now'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}