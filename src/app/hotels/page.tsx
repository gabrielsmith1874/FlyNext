"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { getCities } from '../../../lib/afs-api'
import { toast } from 'react-hot-toast'
import { BuildingOfficeIcon, StarIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useAuth } from '@/src/hooks/useAuth'
import { Slider } from "@/src/components/ui/slider"
import { useRouter } from 'next/navigation'
import { CustomDatePicker } from '@/src/components/ui/CustomDatePicker'
import { saveHotelGuestDetails } from '../../../lib/guest-utils'
import HotelCard from "@/src/components/HotelCard"
import RoomCard from "@/src/components/RoomCard"
import prisma from '@/lib/prisma'


// Define the Room interface
interface Room {
  id: string;
  type: string;
  price: number;
  description: string;
  availableCount: number;
  currency: string;
  features?: string[];
  amenities?: string; // Add amenities as an optional property
  imageUrl?: string; // Add imageUrl as an optional property
  maxGuests?: number; // Add maxGuests as an optional property
  images?: { url: string }[]; // Add images as an optional property
}

interface HotelSearchForm {
  city: string
  name?: string
  minRating?: number
  priceRange?: [number, number]
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
}

// Add new interface for guest details form
interface GuestDetailsForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  guestCount?: number // Add guestCount as an optional property
}

async function getMaxRoomPrice(): Promise<number> {
  try {
    const maxPrice = await prisma.room.aggregate({
      _max: {
        price: true,
      },
    });

    return maxPrice._max.price || 0; // Return 0 if no rooms exist
  } catch (error) {
    console.error('Error fetching max room price:', error);
    throw new Error('Failed to fetch max room price');
  }
}

async function searchHotels(params: HotelSearchForm) {
  const queryParams = new URLSearchParams();
  if (params.city) queryParams.set('city', params.city);
  if (params.name) queryParams.set('name', params.name);
  if (params.minRating) queryParams.set('minRating', params.minRating.toString());
  if (params.priceRange) {
    queryParams.set('minPrice', params.priceRange[0].toString());
    queryParams.set('maxPrice', params.priceRange[1].toString());
  }

  console.log('Searching hotels with params:', Object.fromEntries(queryParams));
  const response = await fetch(`/api/hotels?${queryParams.toString()}`);
  
  if (!response.ok) {
    console.error('Hotel search failed:', response.status, response.statusText);
    throw new Error('Failed to search hotels');
  }

  const data = await response.json();
  console.log('Hotel search results:', data);
  return data;
}

// Helper function to replace date-fns format
function formatDate(date: Date, format: string): string {
  if (format === 'yyyy-MM-dd') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  if (format === 'MMM dd, yyyy') {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString(undefined, options);
  }
  
  return date.toISOString();
}

// Helper function to compute today's date formatted as YYYY-MM-DD
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HotelSearch() {
  const [hotels, setHotels] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<any>(null)
  const [bookingStep, setBookingStep] = useState(0)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 3000])
  const [roomDateRange, setRoomDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [roomsSearched, setRoomsSearched] = useState(false); // new state
  const [guestCount, setGuestCount] = useState(1); // new guest count state
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([
    new Date('2023-10-31'),
    new Date('2023-11-05')
  ]);
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestFormData, setGuestFormData] = useState<GuestDetailsForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  const { register, handleSubmit, setValue } = useForm<HotelSearchForm>()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setValue('priceRange', priceRange);
  }, [setValue, priceRange]);

  useEffect(() => {
    fetch('/api/cities')
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(() => toast.error('Failed to load cities'))
  }, [])

  const onSubmit = async (data: HotelSearchForm) => {
    try {
      setIsLoading(true);
      setHotels([]);
      
      const searchData = {
        ...data
      };

      console.log('Search data:', searchData); // Log the search data for debugging

      const results = await searchHotels(searchData);
      
      if (Array.isArray(results)) {
        console.log(`Found ${results.length} hotels`);
        setHotels(results);
      } else {
        console.error('Unexpected response format:', results);
        toast.error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search hotels');
    } finally {
      setIsLoading(false);
    }
  }

  const handleHotelSelect = (hotel: any) => {
    console.log('Selected hotel with rooms:', hotel.rooms);
    setSelectedHotel(hotel)
    setBookingStep(1)
  }

  const processAddToCart = async (roomParam: any, guestDetails: GuestDetailsForm) => {
    try {
      const payload = {
        type: 'HOTEL',
        status: 'PENDING',
        hotelId: selectedHotel.id,
        roomId: roomParam.id,
        // Use roomDateRange for dates; ensure they are in YYYY-MM-DD format
        checkInDate: roomDateRange.from ? roomDateRange.from.toISOString().split("T")[0] : undefined,
        checkOutDate: roomDateRange.to ? roomDateRange.to.toISOString().split("T")[0] : undefined,
        guestCount: guestDetails.guestCount || 1,
        price: roomParam.price,
        currency: roomParam.currency,
        roomType: roomParam.roomType || roomParam.type, // Fix to support both formats
        guestDetails: JSON.stringify(guestDetails),
        totalPrice: roomParam.price,
        notes: `Hotel booking for ${selectedHotel.name}, ${roomParam.type || roomParam.roomType} room`
      };

      console.log("Booking payload:", payload);
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/hotels/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Booking failed');
      }
      toast.success('Hotel added to cart!')
      
      // Decrement room availability locally in selectedHotel
      setSelectedHotel((prev: typeof selectedHotel) => ({
        ...prev,
        rooms: prev?.rooms.map((room: Room) =>
          room.id === roomParam.id
        ? { ...room, availableCount: room.availableCount - 1 }
        : room
        )
      }));
      
      // Reset selection without clearing the hotel so that other rooms remain visible
      setBookingStep(1)
      setSelectedRoom(null)
      // Reset guest form
      setShowGuestForm(false)
      
      const responseData = await response.json();
      if (responseData.bookingReference) {
        toast.success(`Booking reference: ${responseData.bookingReference}`)
      }
    } catch (error) {
      console.error('Cart error:', error);
      let errorMessage = 'Failed to add hotel to cart.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRoomSelect = (room: any) => {
    console.log('Selected room data:', room);
    setSelectedRoom(room);
    // Show guest form instead of immediately processing
    setShowGuestForm(true);
  }

  const handleGuestFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate form
    if (!guestFormData.firstName || !guestFormData.lastName || !guestFormData.email || !guestFormData.phone) {
      toast.error('Please fill in all guest information fields');
      return;
    }
    
    // Save guest details to localStorage for use in checkout and PDF
    saveHotelGuestDetails(guestFormData);
    console.log('Saved guest details to localStorage:', guestFormData);
    
    // Process cart with guest details
    processAddToCart(selectedRoom, guestFormData);
  }

  const handleSearchRooms = async () => {
    if (!roomDateRange.from || !roomDateRange.to) {
      toast.error("Please select both check-in and check-out dates");
      return;
    }
    console.log("Searching available rooms for", {
      checkIn: roomDateRange.from,
      checkOut: roomDateRange.to,
      guestCount
    });
    const formattedCheckInDate = roomDateRange.from.toISOString().split("T")[0];
    const formattedCheckOutDate = roomDateRange.to.toISOString().split("T")[0];
    const baseURL = process.env.NEXT_PUBLIC_API_URL || "";
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    try {
      const detailRes = await fetch(
        `${baseURL}/api/hotels/${selectedHotel.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (!detailRes.ok) {
        const errorData = await detailRes.json();
        throw new Error(errorData.error || "Failed to fetch hotel details");
      }
      
      const hotelDetails = await detailRes.json();
      console.log("Hotel Details:", hotelDetails);
      
      const res = await fetch(
        `${baseURL}/api/hotels/${selectedHotel.id}/rooms?startDate=${formattedCheckInDate}&endDate=${formattedCheckOutDate}&guestCount=${guestCount}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch room availability");
      }
      const availableRoomsData = await res.json();
      console.log("API Response:", availableRoomsData);
      
      const hotelRooms = hotelDetails.rooms || [];
      console.log("Hotel Rooms with real IDs:", hotelRooms);
      
      let transformedRooms = Array.isArray(availableRoomsData.rooms) 
        ? availableRoomsData.rooms.map(roomData => {
            // Match by ID or type
            const actualRoom: Room | undefined = hotelRooms.find(
              (r: Room) => r.id === roomData.id || r.type.toLowerCase() === roomData.type.toLowerCase()
            );

            if (!actualRoom) {
              console.warn(`No matching room found for roomData:`, roomData);
            }

            const totalCapacity = roomData.totalCapacity || actualRoom?.availableCount || 0;
            const totalBooked = roomData.totalBooked || 0;

            return {
              id: actualRoom?.id || roomData.id,
              type: actualRoom?.type || roomData.type,
              price: actualRoom?.price || roomData.price,
              description: actualRoom?.description || roomData.description,
              availableCount: totalCapacity - totalBooked, // Ensure valid calculation
              currency: actualRoom?.currency || roomData.currency || 'USD',
              features: actualRoom?.features || [],
              imageUrl: actualRoom?.imageUrl || 
                `https://source.unsplash.com/featured/?hotel,room,${encodeURIComponent(roomData.type)}`,
              maxGuests: actualRoom?.maxGuests || roomData.maxGuests || undefined
            };
          })
        : [];

      if (transformedRooms.length === 0) {
        console.error("Transformed rooms list is empty. Debugging data:");
        console.log("Available Rooms Data:", availableRoomsData.rooms);
        console.log("Hotel Rooms:", hotelRooms);
      }
      
      console.log("Transformed Rooms:", transformedRooms);
      
      setSelectedHotel((prev: typeof selectedHotel) => ({ ...prev, rooms: transformedRooms as Room[] }));
      toast.success("Room search successful");
      setRoomsSearched(true);
    } catch (error: any) {
      console.error("Error fetching room availability:", error);
      toast.error(error.message || "Error fetching room availability");
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
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
                      {...register('city', { required: true })}
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      <option value="">Select destination</option>
                      {cities.map((city: any) => (
                        <option key={city.id} value={city.name}>
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Price Range per Night
                    </label>
                    <div className="px-3 py-6">
                      <Slider
                        defaultValue={priceRange}
                        max={3000}
                        min={0}
                        step={10}
                        value={priceRange}
                        onValueChange={(value: [number, number]) => {
                          setPriceRange(value);
                          setValue('priceRange', value);
                        }}
                      />
                      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>${priceRange[0]}</span>
                        <span>${priceRange[1]}</span>
                      </div>
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
                    <>Search Hotels</>
                  )}
                </button>
              </form>
            </div>

            {hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hotels.map((hotel: any) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onSelect={handleHotelSelect}
                  />
                ))}
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Searching for hotels...</p>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No hotels found. Try adjusting your search criteria.</p>
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
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Search Room Availability</h3>
              <div className="grid grid-cols-1 gap-4">
                <CustomDatePicker
                  selectedRange={roomDateRange.from && roomDateRange.to ? { from: roomDateRange.from, to: roomDateRange.to } : undefined}
                  onSelect={(range) => {
                    setRoomDateRange(range || {});
                    setRoomsSearched(false);
                  }}
                  disabledDays={unavailableDates}
                />
                <div className="flex flex-col">
                  <label htmlFor="guest-count" className="text-sm font-medium mb-1">Guests</label>
                  <input
                    id="guest-count"
                    type="number"
                    min="1"
                    defaultValue="1"
                    className="w-full rounded-md border border-input p-2 bg-transparent"
                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <button
                onClick={handleSearchRooms}
                className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Search Rooms
              </button>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">Available Room Types</h3>
              {roomsSearched ? (
                <div className="space-y-4">
                  {Array.isArray(selectedHotel?.rooms) && selectedHotel.rooms.length > 0 ? (
                    selectedHotel.rooms
                      .filter((room: any) => {
                        console.log("Filtering room:", room); // Debugging room data before filtering
                        return room.availableCount > 0 && guestCount <= (room.maxGuests || Infinity);
                      })
                      .map((room: any) => {
                        console.log("Passing room to RoomCard:", room); // Debugging room data passed to RoomCard
                        return <RoomCard key={room.id} room={room} onSelect={handleRoomSelect} />;
                      })
                  ) : (
                    <p className="text-center text-muted-foreground">
                      No available rooms found for the selected dates.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  Please enter check-in and check-out dates and click "Search Rooms".
                </p>
              )}
            </div>
          </div>
        ) : (
          <></>
        )}
      </div>

      {/* Add guest information form modal */}
      {showGuestForm && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Guest Information</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide guest details for your stay at {selectedHotel?.name}
            </p>
            
            <form onSubmit={handleGuestFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <input
                  type="text"
                  value={guestFormData.firstName}
                  onChange={(e) => setGuestFormData({...guestFormData, firstName: e.target.value})}
                  className="w-full p-3 rounded-md bg-background border border-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  value={guestFormData.lastName}
                  onChange={(e) => setGuestFormData({...guestFormData, lastName: e.target.value})}
                  className="w-full p-3 rounded-md bg-background border border-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={guestFormData.email}
                  onChange={(e) => setGuestFormData({...guestFormData, email: e.target.value})}
                  className="w-full p-3 rounded-md bg-background border border-input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={guestFormData.phone}
                  onChange={(e) => setGuestFormData({...guestFormData, phone: e.target.value})}
                  className="w-full p-3 rounded-md bg-background border border-input"
                  required
                />
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowGuestForm(false);
                    setSelectedRoom(null);
                  }}
                  className="px-4 py-2 border border-input rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                  {isLoading ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}