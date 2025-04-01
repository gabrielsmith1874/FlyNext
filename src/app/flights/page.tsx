"use client"

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { searchFlights, searchRoundTripFlights, getAirports } from '../../../lib/afs-api'
import { toast } from 'react-hot-toast'
import { PaperAirplaneIcon, UserIcon } from '@heroicons/react/24/outline'
import FlightItem from '../../components/FlightItem'
import FlightCard from '../../components/FlightCard'
import { useRouter } from 'next/navigation'

interface FlightSearchForm {
  from: string
  to: string
  departDate: string
  returnDate?: string
  passengers: number
}

interface BookingForm {
  passengers: {
    firstName: string
    lastName: string
    email: string
    passportNumber: string
  }[]
  paymentDetails?: {
    cardNumber: string
    cardholderName: string
    expiryDate: string
    cvv: string
  }
}

interface BookingResponse {
  bookingReference?: string
}

interface FlightBooking {
  flightNumber: string
  departure: string
  destination: string
  departureTime: string
  arrivalTime: string
  price: number
  airline: string
  passengers: Array<{
    firstName: string
    lastName: string
    email: string
    type: string
  }>
}

export default function FlightSearch() {
  const router = useRouter()
  const [flights, setFlights] = useState<any[]>([])
  const [outboundFlights, setOutboundFlights] = useState<any[]>([])
  const [returnFlights, setReturnFlights] = useState<any[]>([])
  const [airports, setAirports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFlights, setSelectedFlights] = useState<any[]>([])
  const [bookingStep, setBookingStep] = useState(0)
  const [passengerCount, setPassengerCount] = useState(1)

  const { register, handleSubmit, watch, control, setValue } = useForm<FlightSearchForm>({
    defaultValues: {
      passengers: 1
    }
  })

  const { register: registerBooking, handleSubmit: handleSubmitBooking } = useForm<BookingForm>()

  const watchPassengers = watch('passengers')

  const [isFromFocused, setIsFromFocused] = useState(false)
  const [isToFocused, setIsToFocused] = useState(false)
  const fromQuery = watch('from') || ""
  const toQuery = watch('to') || ""
  const filteredFromAirports = airports.filter((airport: any) =>
    airport.name.toLowerCase().includes(fromQuery.toLowerCase()) ||
    airport.code.toLowerCase().includes(fromQuery.toLowerCase())
  )
  const filteredToAirports = airports.filter((airport: any) =>
    airport.name.toLowerCase().includes(toQuery.toLowerCase()) ||
    airport.code.toLowerCase().includes(toQuery.toLowerCase())
  )

  useEffect(() => {
    fetch('/api/airports')
      .then(res => res.json())
      .then(data => setAirports(data))
      .catch(() => toast.error('Failed to load airports'))
  }, [])

  const onSubmit = async (data: FlightSearchForm) => {
    setIsLoading(true)
    try {
      setPassengerCount(Number(data.passengers) || 1)
      
      // Convert "from" and "to" values into IATA codes if needed
      const fromCode =
        data.from.length === 3
          ? data.from
          : (airports.find(a => a.name.toLowerCase().includes(data.from.toLowerCase()))
              ?.code || data.from)
      const toCode =
        data.to.length === 3
          ? data.to
          : (airports.find(a => a.name.toLowerCase().includes(data.to.toLowerCase()))
              ?.code || data.to)

      // Use round-trip search only if returnDate is provided; otherwise use one-way search
      if (data.returnDate && data.returnDate.trim() !== "") {
        const result = await searchRoundTripFlights(
          fromCode,
          toCode,
          data.departDate,
          data.returnDate
        )
        // Use optional chaining and nullish coalescing to guard against null response
        const outbound = result?.outbound ?? []
        const ret = result?.returnFlights ?? [] // updated key
        setOutboundFlights(Array.isArray(outbound) ? outbound : [])
        setReturnFlights(Array.isArray(ret) ? ret : [])
        setFlights([])
        console.log("Round-trip flights received:", { outbound, returnFlights: ret })
      } else {
        const result = await searchFlights(fromCode, toCode, data.departDate)
        // Cast the result to any to handle various response structures
        const oneWay = (result as any).results?.[0]?.flights || (result as any).flights || result
        setFlights(oneWay)
        setOutboundFlights([])
        setReturnFlights([])
        console.log("One-way flights received:", oneWay)
      }
    } catch (error) {
      console.error("Error fetching flights:", error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch flights')
    }
    setIsLoading(false)
  }

  const handleFlightSelect = (flight: any) => {
    setSelectedFlights(prev => {
      if (prev.some(f => f.id === flight.id)) {
        return prev.filter(f => f.id !== flight.id)
      }
      return [...prev, flight]
    })
  }

  const handleBookFlight = async (data: BookingForm) => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Please login first')
        router.push('/login')
        return
      }

      const passenger = data.passengers[0]
      const bookingData = {
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        email: passenger.email,
        passportNumber: passenger.passportNumber,
        flightIds: selectedFlights.map(flight => flight.id)
      }

      const passengerDetails = {
        firstName: data.passengers[0].firstName,
        lastName: data.passengers[0].lastName,
        email: data.passengers[0].email,
        passportNumber: data.passengers[0].passportNumber,
      };

      localStorage.setItem('passengerDetails', JSON.stringify(passengerDetails));

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Failed to book flight')
      }

      await response.json()
      setIsLoading(false)
      toast.success('Flight booked successfully!')
      router.push(`/checkout`)
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to book flight')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
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
                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-2">From</label>
                    <input
                      {...register('from', { required: true })}
                      type="text"
                      placeholder="Type city or airport code"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      onFocus={() => setIsFromFocused(true)}
                      onBlur={() => setTimeout(() => setIsFromFocused(false), 200)}
                    />
                    {isFromFocused && filteredFromAirports.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredFromAirports.map((airport: any) => (
                          <div
                            key={airport.code}
                            className="p-2 hover:bg-primary hover:text-primary-foreground cursor-pointer"
                            onMouseDown={() => {
                              setValue('from', airport.code)
                              setIsFromFocused(false)
                            }}
                          >
                            {airport.name} ({airport.code})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-foreground mb-2">To</label>
                    <input
                      {...register('to', { required: true })}
                      type="text"
                      placeholder="Type city or airport code"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      onFocus={() => setIsToFocused(true)}
                      onBlur={() => setTimeout(() => setIsToFocused(false), 200)}
                    />
                    {isToFocused && filteredToAirports.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredToAirports.map((airport: any) => (
                          <div
                            key={airport.code}
                            className="p-2 hover:bg-primary hover:text-primary-foreground cursor-pointer"
                            onMouseDown={() => {
                              setValue('to', airport.code)
                              setIsToFocused(false)
                            }}
                          >
                            {airport.name} ({airport.code})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-foreground mb-2 text-center">
                      Departure Date
                    </label>
                    <div className="relative">
                      <Controller
                        name="departDate"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <DayPicker
                            mode="single"
                            selected={
                              field.value
                                ? new Date(
                                    new Date(field.value).setDate(
                                      new Date(field.value).getDate() + 1
                                    )
                                  )
                                : undefined
                            }
                            onSelect={(date: Date | undefined) => {
                              if (date) {
                                const actualDate = new Date(date)
                                actualDate.setDate(actualDate.getDate())
                                field.onChange(format(actualDate, 'yyyy-MM-dd'))
                              } else {
                                field.onChange('')
                              }
                            }}
                            className="custom-day-picker bg-white dark:bg-[rgb(38,64,64)] p-2 rounded-md shadow-md"
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-foreground mb-2 text-center">
                      Return Date (Optional)
                    </label>
                    <div className="relative">
                      <Controller
                        name="returnDate"
                        control={control}
                        render={({ field }) => (
                          <DayPicker
                            mode="single"
                            selected={
                              field.value
                                ? new Date(
                                    new Date(field.value).setDate(
                                      new Date(field.value).getDate() + 1
                                    )
                                )
                                : undefined
                            }
                            onSelect={(date: Date | undefined) => {
                              if (date) {
                                const actualDate = new Date(date)
                                actualDate.setDate(actualDate.getDate())
                                field.onChange(format(actualDate, 'yyyy-MM-dd'))
                              } else {
                                field.onChange('')
                              }
                            }}
                            className="custom-day-picker bg-white dark:bg-[rgb(38,64,64)] p-2 rounded-md shadow-md"
                          />
                        )}
                      />
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

            {(outboundFlights.length > 0 || returnFlights.length > 0) ? (
              <>
                {outboundFlights.length > 0 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Outbound Flights</h2>
                    <div className="grid grid-cols-1 gap-6">
                      {outboundFlights.map((flight: any) => (
                        <FlightItem 
                          key={flight.id}
                          flight={flight}
                          onSelect={() => handleFlightSelect(flight)}
                          isSelected={selectedFlights.some(f => f.id === flight.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {returnFlights.length > 0 && (
                  <div className="space-y-6 mt-6">
                    <h2 className="text-xl font-semibold text-foreground">Return Flights</h2>
                    <div className="grid grid-cols-1 gap-6">
                      {returnFlights.map((flight: any) => (
                        <FlightItem 
                          key={flight.id}
                          flight={flight}
                          onSelect={() => handleFlightSelect(flight)}
                          isSelected={selectedFlights.some(f => f.id === flight.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {selectedFlights.length > 0 && (
                  <button 
                    onClick={() => setBookingStep(1)}
                    className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Book Selected Flights ({selectedFlights.length})
                  </button>
                )}
              </>
            ) : flights.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Available Flights</h2>
                <div className="grid grid-cols-1 gap-6">
                  {flights.map((flight: any) => (
                    <FlightItem 
                      key={flight.id} 
                      flight={flight}
                      onSelect={() => handleFlightSelect(flight)}
                      isSelected={selectedFlights.some(f => f.id === flight.id)}
                    />
                  ))}
                </div>
                {selectedFlights.length > 0 && (
                  <button 
                    onClick={() => setBookingStep(1)}
                    className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Book Selected Flights ({selectedFlights.length})
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-foreground">Book Your Flights</h2>
              <button
                onClick={() => setBookingStep(0)}
                className="text-sm text-primary hover:text-primary/80"
              >
                Back to search
              </button>
            </div>

            <div className="space-y-4">
              {selectedFlights.map(flight => (
                <FlightCard 
                  key={flight.id} 
                  flight={flight} 
                  passengerCount={passengerCount}
                  showSelectButton={true} // Add the required prop
                />
              ))}
            </div>

            <form onSubmit={handleSubmitBooking(handleBookFlight)} className="space-y-8 mt-6">
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
                          {...registerBooking(`passengers.${index}.firstName` as const, { required: true })}
                          type="text"
                          className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Last Name
                        </label>
                        <input
                          {...registerBooking(`passengers.${index}.lastName` as const, { required: true })}
                          type="text"
                          className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email
                        </label>
                        <input
                          {...registerBooking(`passengers.${index}.email` as const, { required: true })}
                          type="email"
                          className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Passport Number
                        </label>
                        <input
                          {...registerBooking(`passengers.${index}.passportNumber` as const, { required: true, minLength: 9, maxLength: 9 })}
                          type="text"
                          className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Adding to Cart...' : 'Add to Cart'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}