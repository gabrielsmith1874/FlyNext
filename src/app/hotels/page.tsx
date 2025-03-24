"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { searchHotels, getCities, bookHotel } from '@/lib/afs-api'
import { toast } from 'react-hot-toast'
import { BuildingOfficeIcon, StarIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface HotelSearchForm {
  cityId: string
  checkInDate: string
  checkOutDate: string
  name?: string
  minRating?: number
  maxPrice?: number
}

interface HotelBookingForm {
  hotelId: string
  roomType: string
  guestDetails: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  paymentDetails: {
    cardNumber: string
    cardholderName: string
    expiryDate: string
    cvv: string
  }
}

export default function HotelSearch() {
  const [hotels, setHotels] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<any>(null)
  const [bookingStep, setBookingStep] = useState(0)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  
  const { register, handleSubmit } = useForm<HotelSearchForm>()
  const { register: registerBooking, handleSubmit: handleSubmitBooking } = useForm<HotelBookingForm>()

  useEffect(() => {
    fetch('/api/cities')
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(() => toast.error('Failed to load cities'))
  }, [])

  const onSubmit = async (data: HotelSearchForm) => {
    try {
      setIsLoading(true)
      const results = await searchHotels(data)
      setHotels(results)
      setIsLoading(false)
    } catch (error) {
      toast.error('Failed to search hotels')
      setIsLoading(false)
    }
  }

  const handleHotelSelect = (hotel: any) => {
    setSelectedHotel(hotel)
    setBookingStep(1)
  }

  const handleRoomSelect = (room: any) => {
    setSelectedRoom(room)
    setBookingStep(2)
  }

  const handleBookHotel = async (data: HotelBookingForm) => {
    try {
      setIsLoading(true)
      
      // Add hotel ID, room type and organize data for API
      const bookingData = {
        hotelId: selectedHotel.id,
        roomType: selectedRoom.type,
        guestDetails: data.guestDetails,
        paymentDetails: data.paymentDetails,
        checkInDate: document.querySelector<HTMLInputElement>('[name="checkInDate"]')?.value,
        checkOutDate: document.querySelector<HTMLInputElement>('[name="checkOutDate"]')?.value,
      }
      
      const response: { bookingReference?: string } = await bookHotel(bookingData)
      
      setIsLoading(false)
      toast.success('Hotel booked successfully!')
      
      // Reset booking state
      setBookingStep(0)
      setSelectedHotel(null)
      setSelectedRoom(null)
      
      // Show booking reference
      if (response.bookingReference) {
        toast.success(`Booking reference: ${response.bookingReference}`)
      }
    } catch (error) {
      toast.error('Failed to book hotel')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80')] dark:opacity-0 opacity-100 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80')] dark:opacity-100 opacity-0 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-white/90 dark:bg-black/90" />
      </div>

      <div className="relative z-10 container mx-auto py-8 px-4">
        <div className="flex items-center space-x-3 mb-8">
          <BuildingOfficeIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Find Hotels</h1>
        </div>

        {bookingStep === 0 ? (
          <>
            <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border p-6 mb-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Destination
                    </label>
                    <select
                      {...register('cityId', { required: true })}
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      <option value="">Select destination</option>
                      {cities.map((city: any) => (
                        <option key={city.id} value={city.id}>
                          {city.name}, {city.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Hotel Name (Optional)
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      placeholder="Hotel name"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Check-in Date
                    </label>
                    <div className="relative">
                      <input
                        {...register('checkInDate', { required: true })}
                        type="date"
                        className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Check-out Date
                    </label>
                    <div className="relative">
                      <input
                        {...register('checkOutDate', { required: true })}
                        type="date"
                        className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Min. Rating (Optional)
                    </label>
                    <select
                      {...register('minRating', { valueAsNumber: true })}
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      <option value="">Any rating</option>
                      <option value="3">3+ stars</option>
                      <option value="4">4+ stars</option>
                      <option value="5">5 stars</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max. Price per Night (Optional)
                    </label>
                    <input
                      {...register('maxPrice', { valueAsNumber: true })}
                      type="number"
                      placeholder="$"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
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
                    <>Search Hotels</>
                  )}
                </button>
              </form>
            </div>

            {hotels.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hotels.map((hotel: any) => (
                  <div
                    key={hotel.id}
                    className="bg-card/50 backdrop-blur-sm border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                  >
                    {hotel.images?.[0] && (
                      <div className="relative h-48">
                        <img
                          src={hotel.images[0].url}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                          ${hotel.pricePerNight}/night
                        </div>
                      </div>
                    )}
                    
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">{hotel.name}</h3>
                          <p className="text-sm text-muted-foreground">{hotel.address}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <StarIconSolid className="h-5 w-5 text-yellow-400" />
                          <span className="text-foreground font-medium">{hotel.rating}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">{hotel.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {hotel.amenities?.split(',').map((amenity: string, index: number) => (
                          <span
                            key={index}
                            className="bg-muted px-2 py-1 rounded-md text-xs text-muted-foreground"
                          >
                            {amenity.trim()}
                          </span>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => handleHotelSelect(hotel)}
                        className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        View Rooms
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : bookingStep === 1 ? (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-foreground">{selectedHotel?.name}</h2>
              <button
                onClick={() => setBookingStep(0)}
                className="text-sm text-primary hover:text-primary/80"
              >
                Back to search
              </button>
            </div>

            {/* Hotel Images */}
            {selectedHotel?.images?.length > 0 && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedHotel.images.slice(0, 3).map((image: any, index: number) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={`${selectedHotel.name} - Image ${index + 1}`}
                    className="rounded-lg w-full h-48 object-cover"
                  />
                ))}
              </div>
            )}

            {/* Hotel Description */}
            <div className="mb-8">
              <div className="flex items-center space-x-1 mb-2">
                <StarIconSolid className="h-5 w-5 text-yellow-400" />
                <span className="text-foreground font-medium">{selectedHotel?.rating}</span>
                <span className="text-muted-foreground mx-2">•</span>
                <span className="text-muted-foreground">{selectedHotel?.address}</span>
              </div>
              
              <p className="text-muted-foreground">{selectedHotel?.description}</p>
            </div>

            {/* Available Room Types */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Available Room Types</h3>
              
              <div className="space-y-4">
                {selectedHotel?.rooms?.map((room: any) => (
                  <div
                    key={room.id}
                    className="border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => handleRoomSelect(room)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium text-foreground">{room.type}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {room.features?.map((feature: string, index: number) => (
                            <span
                              key={index}
                              className="bg-muted px-2 py-1 rounded-md text-xs text-muted-foreground"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-foreground">${room.pricePerNight}</p>
                        <p className="text-xs text-muted-foreground">per night</p>
                        <button className="mt-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors">
                          Select
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-foreground">Complete Your Booking</h2>
              <button
                onClick={() => setBookingStep(1)}
                className="text-sm text-primary hover:text-primary/80"
              >
                Back to room selection
              </button>
            </div>

            {/* Booking Summary */}
            <div className="mb-8 p-4 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedHotel?.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedHotel?.address}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground">{selectedRoom?.type}</h3>
                  <p className="text-sm text-muted-foreground">${selectedRoom?.pricePerNight} per night</p>
                </div>
                
                <div>
                  <p className="text-sm text-foreground">Check-in</p>
                  <p className="font-medium">{document.querySelector<HTMLInputElement>('[name="checkInDate"]')?.value}</p>
                </div>
                
                <div>
                  <p className="text-sm text-foreground">Check-out</p>
                  <p className="font-medium">{document.querySelector<HTMLInputElement>('[name="checkOutDate"]')?.value}</p>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <form onSubmit={handleSubmitBooking(handleBookHotel)} className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Guest Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      First Name
                    </label>
                    <input
                      {...registerBooking('guestDetails.firstName', { required: true })}
                      type="text"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Last Name
                    </label>
                    <input
                      {...registerBooking('guestDetails.lastName', { required: true })}
                      type="text"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <input
                      {...registerBooking('guestDetails.email', { required: true })}
                      type="email"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone
                    </label>
                    <input
                      {...registerBooking('guestDetails.phone', { required: true })}
                      type="tel"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>
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
                      placeholder="1234 5678 9012 3456"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Cardholder Name
                    </label>
                    <input
                      {...registerBooking('paymentDetails.cardholderName', { required: true })}
                      type="text"
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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>Complete Booking</>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}