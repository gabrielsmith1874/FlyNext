"use client"

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { CalendarIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { Button } from '@/src/components/ui/button'

// Update the CheckoutForm interface to remove guest details fields
interface CheckoutForm {
  cardNumber: string
  cardholderName: string
  expiryMonth: string
  expiryYear: string
  cvc: string
}

interface Booking {
  id: string
  bookingReference: string
  totalPrice: number
  status: string
  flights?: any[]
  hotelBookings?: any[]
}

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [passengerDetails, setPassengerDetails] = useState<any>(null)
  const [hotelGuestDetails, setHotelGuestDetails] = useState<any>(null)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CheckoutForm>()

  // Helper function to correctly format dates without timezone issues
  const formatDateWithoutTimezoneShift = (dateString: string): string => {
    if (!dateString) return 'N/A';
    
    try {
      // For ISO format strings (like 2025-04-02T00:00:00.000Z)
      if (dateString.includes('T')) {
        // Extract just the date portion (YYYY-MM-DD) and parse it
        const datePart = dateString.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        
        // Format the date directly without creating a Date object that might shift
        return `${month}/${day}/${year}`;
      }
      
      // For simple YYYY-MM-DD format
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        // Format directly to avoid any Date object timezone conversion
        return `${month}/${day}/${year}`;
      }
      
      // If format is unrecognized, log and return original
      console.warn('Unexpected date format:', dateString);
      return dateString;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };
  
  // Calculate correct number of nights between dates
  const calculateNights = (checkInDate: string, checkOutDate: string): number => {
    if (!checkInDate || !checkOutDate) return 0;
    
    try {
      let inYear, inMonth, inDay, outYear, outMonth, outDay;
      
      // Extract date parts based on format
      if (checkInDate.includes('T') && checkOutDate.includes('T')) {
        // Extract just the date parts from ISO strings
        const inDatePart = checkInDate.split('T')[0];
        const outDatePart = checkOutDate.split('T')[0];
        
        [inYear, inMonth, inDay] = inDatePart.split('-').map(Number);
        [outYear, outMonth, outDay] = outDatePart.split('-').map(Number);
      } 
      else if (checkInDate.match(/^\d{4}-\d{2}-\d{2}$/) && checkOutDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        [inYear, inMonth, inDay] = checkInDate.split('-').map(Number);
        [outYear, outMonth, outDay] = checkOutDate.split('-').map(Number);
      } else {
        console.warn('Unexpected date format for night calculation');
        return 0;
      }
      
      // Create Date objects with UTC to prevent timezone shifts
      const checkIn = new Date(Date.UTC(inYear, inMonth - 1, inDay));
      const checkOut = new Date(Date.UTC(outYear, outMonth - 1, outDay));
      
      const diffTime = checkOut.getTime() - checkIn.getTime();
      return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch (error) {
      console.error('Error calculating nights:', error);
      return 0;
    }
  };

  // Load saved form data
  useEffect(() => {
    const savedFormData = localStorage.getItem('checkoutFormData')
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData)
      Object.entries(parsedData).forEach(([key, value]) => {
        setValue(key as keyof CheckoutForm, value as string)
      })
    }
  }, [setValue])

  // Fetch pending bookings
  useEffect(() => {
    const fetchBookings = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        setIsLoading(false)
        return
      }
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        const response = await fetch(`${baseUrl}/api/bookings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch bookings')
        }
        const data = await response.json()
        
        // Filter for pending bookings only - should ideally only be ONE booking with PENDING status
        const pending = data.filter((b: Booking) => b.status === 'PENDING')
        
        // If multiple pending bookings found, log a warning as this should be a rare situation
        if (pending.length > 1) {
          console.warn('Multiple pending bookings found. Ideally should be only one.')
        }
        
        // Extract passenger details from the flight bookings if available
        if (pending.length > 0) {
          for (const booking of pending) {
            if (booking.flights && booking.flights.length > 0) {
              // Try to find a flight with passenger details
              for (const flight of booking.flights) {
                if (flight.passengerDetails) {
                  try {
                    const details = typeof flight.passengerDetails === 'string' 
                      ? JSON.parse(flight.passengerDetails) 
                      : flight.passengerDetails;
                    
                    if (details && (Array.isArray(details) ? details.length > 0 : true)) {
                      setPassengerDetails(details);
                      console.log('Loaded passenger details from flight booking:', details);
                      // Store in localStorage as a backup
                      localStorage.setItem('passengerDetails', JSON.stringify(details));
                      break; // Exit loop after finding valid passenger details
                    }
                  } catch (e) {
                    console.error('Failed to parse passenger details from flight:', e);
                  }
                }
              }
            }
          }
        }
        
        setBookings(pending)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookings')
        toast.error('Failed to load bookings')
      } finally {
        setIsLoading(false)
      }
    }
    fetchBookings()
  }, [])

  // Update useEffect for localStorage - make it run after API data has been fetched
  // and only use localStorage as fallback
  useEffect(() => {
    try {
      // Only load from localStorage if no passenger details were found in bookings
      if (!passengerDetails) {
        const savedPassengerDetails = localStorage.getItem('passengerDetails')
        if (savedPassengerDetails) {
          const details = JSON.parse(savedPassengerDetails)
          setPassengerDetails(details)
          console.log('Loaded passenger details from localStorage as fallback:', details)
        }
      }
      
      // Load hotel guest details from localStorage (no change to this part)
      const savedGuestDetails = localStorage.getItem('hotelGuestDetails')
      if (savedGuestDetails) {
        const details = JSON.parse(savedGuestDetails)
        setHotelGuestDetails(details)
        console.log('Loaded hotel guest details from localStorage:', details)
      }
    } catch (e) {
      console.error('Failed to load guest details from localStorage:', e)
    }
  }, [passengerDetails])

  const validateCardNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, '')
    return cleaned.length === 16
  }

  const onSubmit = async (data: CheckoutForm) => {
    setIsProcessing(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setIsProcessing(false);
        return;
      }
      
      // Make sure we have bookings to process
      if (bookings.length === 0) {
        setError('No bookings to process');
        setIsProcessing(false);
        return;
      }
      
      // Get passenger details from booking data first, fall back to localStorage
      let passengerInfo = passengerDetails;
      let hotelGuestInfo = hotelGuestDetails;
      
      // If no passenger details from booking data, try localStorage as fallback
      if (!passengerInfo) {
        try {
          const savedPassengerDetails = localStorage.getItem('passengerDetails');
          if (savedPassengerDetails) {
            passengerInfo = JSON.parse(savedPassengerDetails);
            console.log('Including passenger details from localStorage:', passengerInfo);
          }
        } catch (e) {
          console.error('Failed to parse passenger details from localStorage:', e);
        }
      } else {
        console.log('Including passenger details from booking data:', passengerInfo);
      }
      
      // Hotel guest details still from localStorage (unchanged)
      try {
        const savedGuestDetails = localStorage.getItem('hotelGuestDetails');
        if (savedGuestDetails) {
          hotelGuestInfo = JSON.parse(savedGuestDetails);
          console.log('Including hotel guest details in checkout:', hotelGuestInfo);
        }
      } catch (e) {
        console.error('Failed to parse guest details:', e);
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cardNumber: data.cardNumber,
          cardholderName: data.cardholderName,
          expiryMonth: data.expiryMonth,
          expiryYear: data.expiryYear,
          cvc: data.cvc,
          bookingId: bookings[0].id,
          passengers: passengerInfo ? [passengerInfo] : [],
          hotelGuests: hotelGuestInfo ? [hotelGuestInfo] : []
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment processing failed');
      }
      
      // Clear checkout form data from localStorage
      localStorage.removeItem('checkoutFormData');
      localStorage.removeItem('passengerDetails');
      localStorage.removeItem('hotelGuestDetails');
      
      toast.success('Payment processed successfully!');
      
      // Redirect to bookings page instead of home page
      window.location.href = '/my-bookings';
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to remove a booking component
  const removeBookingComponent = async (bookingId: string, componentId: string, componentType: 'flight' | 'hotel') => {
    try {
      const token = localStorage.getItem('token')
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/bookings/${bookingId}/component`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          componentId,
          componentType
        })
      })
      
      if (response.ok) {
        // Refresh the bookings list
        const updatedBookings = [...bookings];
        
        // Find the booking that contains this component
        const bookingIndex = updatedBookings.findIndex(b => b.id === bookingId);
        
        if (bookingIndex !== -1) {
          if (componentType === 'flight') {
            // Remove the flight from the booking
            updatedBookings[bookingIndex].flights = updatedBookings[bookingIndex].flights?.filter(
              f => f.id !== componentId
            ) || [];
          } else if (componentType === 'hotel') {
            // Remove the hotel booking from the booking
            updatedBookings[bookingIndex].hotelBookings = updatedBookings[bookingIndex].hotelBookings?.filter(
              h => h.id !== componentId
            ) || [];
          }
          
          // If this booking now has no components, remove it completely
          if (
            (!updatedBookings[bookingIndex].flights || updatedBookings[bookingIndex].flights.length === 0) &&
            (!updatedBookings[bookingIndex].hotelBookings || updatedBookings[bookingIndex].hotelBookings.length === 0)
          ) {
            updatedBookings.splice(bookingIndex, 1);
          }
        }
        
        setBookings(updatedBookings);
        toast.success(`${componentType.charAt(0).toUpperCase() + componentType.slice(1)} booking removed successfully`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || `Failed to remove ${componentType} booking`);
      }
    } catch (error) {
      console.error(`Error removing ${componentType} booking:`, error);
      toast.error(`Failed to remove ${componentType} booking`);
    }
  };

  // Function to remove an entire booking - only used as fallback
  const removeBooking = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/api/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        setBookings(prev => prev.filter(b => b.id !== id))
        toast.success('Booking removed successfully')
      } else {
        toast.error('Failed to remove booking')
      }
    } catch (error) {
      toast.error('Failed to remove booking')
    }
  }

  // Calculate total price from pending bookings
  const totalPrice = bookings.reduce((sum, b) => sum + b.totalPrice, 0)

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || bookings.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold text-red-600">{error || 'No pending bookings found'}</h2>
        <button 
          onClick={() => window.history.back()} 
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6">
      <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Your Pending Bookings</h1>
        
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="border rounded-md p-4 relative">
              <button
                onClick={() => removeBooking(booking.id)}
                className="absolute top-2 right-2 text-red-500 font-bold"
                title="Remove entire booking"
              >
                X
              </button>
              <div className="flex items-center gap-4">
                <CalendarIcon className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold">Booking Reference: {booking.bookingReference}</h3>
                  <p className="text-sm text-muted-foreground">
                    Total Price: ${booking.totalPrice}
                  </p>
                </div>
              </div>
              
              {booking.flights && booking.flights.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Flights:</h4>
                  {/* Group flights by bundle ID */}
                  {(() => {
                    // Define flight type interface to be used for regularFlights
                    interface FlightWithBundle extends Record<string, any> {
                      id: string;
                      origin: string;
                      destination: string;
                      departureTime: string;
                      price: number;
                      flightNumber: string;
                      status: string;
                      details?: {
                        bundleId: string;
                        segmentIndex: number;
                        totalSegments: number;
                      };
                    }
                    
                    // Create a map to group bundled flights
                    const bundledFlights = new Map<string, FlightWithBundle[]>();
                    const regularFlights: FlightWithBundle[] = [];
                    
                    booking.flights.forEach(flight => {
                      // Check if the status contains bundle information
                      const statusParts = flight.status.split(':');
                      const isBundled = statusParts.length > 2 && statusParts[1] === 'BUNDLE';
                      
                      if (isBundled) {
                        // Extract bundle info from status field
                        // Format is: SCHEDULED:BUNDLE:bundleId:index:total
                        const bundleId = statusParts[2];
                        const segmentIndex = parseInt(statusParts[3], 10);
                        const totalSegments = parseInt(statusParts[4], 10);
                        
                        if (!bundledFlights.has(bundleId)) {
                          bundledFlights.set(bundleId, []);
                        }
                        
                        bundledFlights.get(bundleId)!.push({ 
                          ...flight, 
                          details: { bundleId, segmentIndex, totalSegments } 
                        });
                      } else {
                        regularFlights.push(flight);
                      }
                    });
                    
                    // Render bundled flights first, then regular flights
                    return (
                      <>
                        {/* Display bundled flights */}
                        {Array.from(bundledFlights.entries()).map(([bundleId, flights]) => {
                          // Sort segments by segment index
                          const sortedFlights = [...flights].sort((a, b) => 
                            (a.details?.segmentIndex || 0) - (b.details?.segmentIndex || 0)
                          );
                          
                          // Get first and last segment to display origin/destination
                          const firstSegment = sortedFlights[0];
                          const lastSegment = sortedFlights[sortedFlights.length - 1];
                          
                          return (
                            <div key={`bundle-${bundleId}`} className="text-sm border-l-2 border-blue-300 pl-3 flex justify-between items-center">
                              <div>
                                <div className="font-medium">
                                  {firstSegment.origin} → {lastSegment.destination} on {formatDateWithoutTimezoneShift(firstSegment.departureTime)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  ${sortedFlights.reduce((sum, flight) => sum + flight.price, 0)} - Connected Flight ({sortedFlights.length} segments)
                                </p>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {sortedFlights.map((segment, idx) => (
                                    <div key={`segment-${segment.id}-${idx}`} className="ml-2">
                                      Segment {idx + 1}: {segment.origin} → {segment.destination} ({segment.flightNumber})
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <button 
                                onClick={() => removeBookingComponent(booking.id, firstSegment.id, 'flight')}
                                className="text-red-500 text-xs hover:underline"
                              >
                                Remove All Segments
                              </button>
                            </div>
                          );
                        })}
                        
                        {/* Display regular flights */}
                        {regularFlights.map((flight, index) => (
                          <div key={`flight-${flight.id}-${index}`} className="text-sm border-l-2 border-blue-300 pl-3 flex justify-between items-center">
                            <div>
                              {flight.origin} → {flight.destination} on {formatDateWithoutTimezoneShift(flight.departureTime)}
                              <p className="text-xs text-muted-foreground">
                                ${flight.price} - Flight {flight.flightNumber}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}
              
              {booking.hotelBookings && booking.hotelBookings.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Hotel Bookings:</h4>
                  {booking.hotelBookings.map((hb: any) => (
                    <div key={hb.id} className="text-sm border-l-2 border-green-300 pl-3 flex justify-between items-center">
                      <div>
                        <p>{hb.hotel?.name || 'Hotel'}</p>
                        <p className="text-muted-foreground text-xs">
                          Room: {hb.room?.type || 'Standard'} | 
                          Guests: {hb.guestCount || 1} | 
                          Price: ${hb.price || 0}
                        </p>
                        <p className="text-muted-foreground text-xs mt-1">
                          <span className="text-primary font-medium">
                            {formatDateWithoutTimezoneShift(hb.checkInDate)}
                          </span>
                          {' → '}
                          <span className="text-primary font-medium">
                            {formatDateWithoutTimezoneShift(hb.checkOutDate)}
                          </span>
                          {' • '}
                          {hb.checkInDate && hb.checkOutDate ? 
                            `${calculateNights(hb.checkInDate, hb.checkOutDate)} nights` : 
                            'Dates not specified'}
                        </p>
                      </div>
                      <button 
                        onClick={() => removeBookingComponent(booking.id, hb.id, 'hotel')}
                        className="text-red-500 text-xs hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Price:</span>
            <span className="text-xl font-bold">${totalPrice}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
          <div className="bg-muted/50 p-4 rounded-md mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CreditCardIcon className="h-5 w-5 mr-2" />
              Credit Card Payment
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="cardholderName">
                  Cardholder Name
                </label>
                <input 
                  id="cardholderName" 
                  {...register('cardholderName', { required: 'Cardholder name is required' })} 
                  className="w-full p-2 border border-input rounded-md bg-transparent focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="John Smith"
                  autoComplete="cc-name"
                />
                {errors.cardholderName && (
                  <p className="text-sm text-red-500 mt-1">{errors.cardholderName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="cardNumber">
                  Card Number
                </label>
                <input 
                  id="cardNumber" 
                    {...register('cardNumber', { 
                    required: 'Card number is required',
                    pattern: {
                      value: /^[\d\s]+$/,
                      message: 'Card number should contain only digits'
                    },
                    validate: {
                      validLength: (value: string): true | string => {
                      const cleaned: string = value.replace(/\D/g, '');
                      return (cleaned.length === 16) || 
                        'Card number must be exactly 16 digits';
                      }
                    }
                    })} 
                  className="w-full p-2 border border-input rounded-md bg-transparent focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="4111 1111 1111 1111"
                  defaultValue="4111111111111111"
                  autoComplete="cc-number"
                />
                {errors.cardNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.cardNumber.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  For testing, use: 4111 1111 1111 1111
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="expiryMonth">
                    Expiry Month
                  </label>
                  <select 
                    id="expiryMonth" 
                    {...register('expiryMonth', { required: 'Required' })} 
                    className="w-full p-2 border border-input rounded-md bg-transparent focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    defaultValue="12"
                    autoComplete="cc-exp-month"
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      return (
                        <option key={month} value={month.toString().padStart(2, '0')}>
                          {month.toString().padStart(2, '0')}
                        </option>
                      );
                    })}
                  </select>
                  {errors.expiryMonth && (
                    <p className="text-sm text-red-500 mt-1">{errors.expiryMonth.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="expiryYear">
                    Expiry Year
                  </label>
                  <select 
                    id="expiryYear" 
                    {...register('expiryYear', { required: 'Required' })} 
                    className="w-full p-2 border border-input rounded-md bg-transparent focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    defaultValue={String((new Date().getFullYear() + 1) % 100)}
                    autoComplete="cc-exp-year"
                  >
                    <option value="">YY</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <option key={year} value={year.toString().slice(-2)}>
                          {year.toString().slice(-2)}
                        </option>
                      );
                    })}
                  </select>
                  {errors.expiryYear && (
                    <p className="text-sm text-red-500 mt-1">{errors.expiryYear.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" htmlFor="cvc">
                    CVC
                  </label>
                  <input 
                    id="cvc" 
                    {...register('cvc', { 
                      required: 'CVC is required',
                      pattern: {
                        value: /^[0-9]{3}$/,
                        message: 'CVC must be 3 digits'
                      }
                    })} 
                    className="w-full p-2 border border-input rounded-md bg-transparent focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="123"
                    maxLength={3}
                    defaultValue="123"
                    autoComplete="cc-csc"
                  />
                  {errors.cvc && (
                    <p className="text-sm text-red-500 mt-1">{errors.cvc.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={isProcessing || bookings.length === 0} 
            className="w-full py-3"
          >
            {isProcessing ? 'Processing Payment...' : `Pay $${totalPrice.toFixed(2)}`}
          </Button>
        </form>
      </div>
    </div>
  )
}
