"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  CalendarIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  ExclamationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface Booking {
  id: string;
  bookingReference: string;
  status: string;
  totalPrice: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
  flights: Flight[];
  hotelBookings: HotelBooking[];
}

interface Flight {
  id: string;
  flightId: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency?: string;
  status: string;
  isConnectingLeg?: boolean;
  connectionGroupId?: string;
  passengerDetails?: string;
}

interface HotelBooking {
  id: string;
  hotelId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  price: number;
  currency: string;
  status: string;
  hotel: {
    id: string;
    name: string;
    city?: string;
    country?: string;
  };
  room: {
    id: string;
    type: string;
    price: number;
    currency: string;
  };
}

const BookingsPage = () => {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelType, setCancelType] = useState<'flight' | 'hotel' | 'booking'>('booking');
  const [componentToCancel, setComponentToCancel] = useState<Flight | HotelBooking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (bookings.length > 0) {
      if (statusFilter === 'ALL') {
        setFilteredBookings(bookings);
      } else {
        setFilteredBookings(bookings.filter(booking => booking.status === statusFilter));
      }
    }
  }, [statusFilter, bookings]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to view your bookings');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data);
      setFilteredBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch (error) {
      return 'Invalid time';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const calculateDuration = (departureTime: string, arrivalTime: string) => {
    try {
      const departure = new Date(departureTime);
      const arrival = new Date(arrivalTime);
      const durationMs = arrival.getTime() - departure.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return 'N/A';
    }
  };

  const calculateNights = (checkInDate: string, checkOutDate: string) => {
    try {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    setBookingToCancel(booking);
    setCancelType('booking');
    setComponentToCancel(null);
    setShowCancelModal(true);
  };

  const handleCancelFlight = (booking: Booking, flight: Flight) => {
    setBookingToCancel(booking);
    setCancelType('flight');
    setComponentToCancel(flight);
    setShowCancelModal(true);
  };

  const handleCancelHotel = (booking: Booking, hotel: HotelBooking) => {
    setBookingToCancel(booking);
    setCancelType('hotel');
    setComponentToCancel(hotel);
    setShowCancelModal(true);
  };

  const confirmCancellation = async () => {
    if (!bookingToCancel) return;
    
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('token');

      //Get Last name from FlightBookings passengerDetails field
      const flightBookings = bookingToCancel.flights.filter(flight => flight.flightId);
      const passengerDetails = flightBookings[0]?.passengerDetails;
      // convert passengerDetails to JSON
      console.log('Passenger details:', passengerDetails);
      const passengerDetailsJSON = passengerDetails ? JSON.parse(passengerDetails) : null;
      console.log('Passenger details:', passengerDetailsJSON);
      const lastName = passengerDetailsJSON[0]?.lastName || '';
      console.log('Passenger last name:', lastName);
      

      // Handle different types of cancellations
      if (cancelType === 'booking') {
        // Cancel entire booking
        const response = await fetch(`/api/bookings/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            bookingId: bookingToCancel.id,
            bookingReference: bookingToCancel.bookingReference,
            lastName: lastName
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to cancel booking');
        }

        toast.success('Booking cancelled successfully');
      } 
      else if (cancelType === 'flight' && componentToCancel) {
        // Cancel specific flight component
        const response = await fetch(`/api/bookings/${bookingToCancel.id}/component`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            componentType: 'flight',
            componentId: componentToCancel.id
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to cancel flight');
        }

        toast.success('Flight cancelled successfully');
      } 
      else if (cancelType === 'hotel' && componentToCancel) {
        // Cancel specific hotel component
        const response = await fetch(`/api/bookings/${bookingToCancel.id}/component`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            componentType: 'hotel',
            componentId: componentToCancel.id
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to cancel hotel booking');
        }

        toast.success('Hotel booking cancelled successfully');
      }

      // Refresh bookings after cancellation
      fetchBookings();
    } catch (error) {
      console.error('Cancellation error:', error);
      toast.error(error instanceof Error ? error.message : 'Cancellation failed');
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
  };

  // Group flights by connection group for display
  const organizeFlights = (flights: Flight[]) => {
    const standalone: Flight[] = [];
    const connections: Record<string, Flight[]> = {};

    flights.forEach(flight => {
      if (flight.connectionGroupId) {
        if (!connections[flight.connectionGroupId]) {
          connections[flight.connectionGroupId] = [];
        }
        connections[flight.connectionGroupId].push(flight);
      } else {
        standalone.push(flight);
      }
    });

    // Sort connections by segment order
    Object.keys(connections).forEach(groupId => {
      connections[groupId].sort((a, b) => {
        if (a.departureTime < b.departureTime) return -1;
        if (a.departureTime > b.departureTime) return 1;
        return 0;
      });
    });

    return { standalone, connections };
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/backgrounds/bookings.webp')] dark:bg-[url('/backgrounds/bookingsdark.jpg')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-black/50"></div>
      </div>
      <div className="relative z-10 container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">My Bookings</h1>
          <p className="mt-2 text-lg text-gray-300">
            View and manage all your travel bookings
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-background/60 backdrop-blur-sm p-6 rounded-lg">
          <div className="mb-4 sm:mb-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            >
              <option value="ALL">All Bookings</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <Link 
            href="/checkout" 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Continue to Checkout
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-background/60 backdrop-blur-sm rounded-lg shadow">
            <ExclamationCircleIcon className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium text-white">No bookings found</h3>
            <p className="mt-1 text-gray-300">
              {statusFilter !== 'ALL' 
                ? `You don't have any ${statusFilter.toLowerCase()} bookings.` 
                : "You haven't made any bookings yet."}
            </p>
            <div className="mt-6">
              <Link 
                href="/" 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Start exploring
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 bg-background/60 backdrop-blur-sm p-6 rounded-lg">
            {filteredBookings.map((booking) => {
              const { standalone: standaloneFlights, connections: connectedFlights } = organizeFlights(booking.flights);
              
              return (
                <div key={booking.id} className="bg-card/80 rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Booking Reference: {booking.bookingReference}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Booked on {formatDate(booking.createdAt)}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-0 flex items-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className="ml-4 font-semibold">
                        {formatCurrency(booking.totalPrice, booking.currency || 'USD')}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Flights Section */}
                    {booking.flights && booking.flights.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-md font-semibold mb-3 flex items-center">
                          <ClockIcon className="h-5 w-5 mr-2 text-primary" />
                          Flight Bookings
                        </h3>
                        
                        {/* Standalone Flights */}
                        {standaloneFlights.map((flight) => (
                          <div key={flight.id} className="mb-4 p-4 bg-background rounded-lg">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div>
                                <div className="font-medium">{flight.airline} {flight.flightNumber}</div>
                                <div className="text-sm mt-1">
                                  <span className="font-semibold">{flight.origin}</span> → <span className="font-semibold">{flight.destination}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {formatDate(flight.departureTime)} • {formatTime(flight.departureTime)} - {formatTime(flight.arrivalTime)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Duration: {calculateDuration(flight.departureTime, flight.arrivalTime)}
                                </div>
                              </div>
                              <div className="mt-3 sm:mt-0 flex flex-col items-start sm:items-end">
                                <div className="font-medium">
                                  {formatCurrency(flight.price, flight.currency || 'USD')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Connected Flights */}
                        {Object.entries(connectedFlights).map(([groupId, flights]) => {
                          const firstFlight = flights[0];
                          const lastFlight = flights[flights.length - 1];
                          const totalPrice = flights.reduce((sum, f) => sum + f.price, 0);
                          
                          return (
                            <div key={groupId} className="mb-4 p-4 bg-background rounded-lg">
                              <div className="flex flex-col sm:flex-row justify-between">
                                <div>
                                  <div className="font-medium">Connected Journey</div>
                                  <div className="text-sm mt-1">
                                    <span className="font-semibold">{firstFlight.origin}</span> → <span className="font-semibold">{lastFlight.destination}</span>
                                  </div>
                                  <div className="text-xs text-primary mt-1">
                                    {flights.length} segments • {flights.length - 1} stops
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(firstFlight.departureTime)} • Total duration: {calculateDuration(firstFlight.departureTime, lastFlight.arrivalTime)}
                                  </div>
                                  
                                  <div className="mt-2 space-y-1">
                                    {flights.map((segment, idx) => (
                                      <div key={segment.id} className="text-xs text-muted-foreground pl-2 border-l border-primary/30">
                                        Segment {idx + 1}: {segment.airline} {segment.flightNumber} • {segment.origin} → {segment.destination}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="mt-3 sm:mt-0 flex flex-col items-start sm:items-end">
                                  <div className="font-medium">
                                    {formatCurrency(totalPrice, firstFlight.currency || 'USD')}
                                  </div>
                                  {booking.status !== 'CANCELLED' && (
                                    <button
                                      onClick={() => handleCancelFlight(booking, firstFlight)}
                                      className="mt-2 text-xs text-red-600 hover:text-red-800 flex items-center"
                                    >
                                      <XCircleIcon className="h-4 w-4 mr-1" />
                                      Cancel all segments
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Hotel Bookings Section */}
                    {booking.hotelBookings && booking.hotelBookings.length > 0 && (
                      <div>
                        <h3 className="text-md font-semibold mb-3 flex items-center">
                          <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
                          Hotel Bookings
                        </h3>
                        
                        {booking.hotelBookings.map((hotelBooking) => (
                          <div key={hotelBooking.id} className="mb-4 p-4 bg-background rounded-lg">
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div>
                                <div className="font-medium">{hotelBooking.hotel.name}</div>
                                <div className="text-sm mt-1">
                                  {hotelBooking.room.type} Room • {hotelBooking.guestCount} {hotelBooking.guestCount === 1 ? 'Guest' : 'Guests'}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {formatDate(hotelBooking.checkInDate)} → {formatDate(hotelBooking.checkOutDate)} • {calculateNights(hotelBooking.checkInDate, hotelBooking.checkOutDate)} nights
                                </div>
                                {hotelBooking.hotel.city && hotelBooking.hotel.country && (
                                  <div className="text-xs text-muted-foreground">
                                    {hotelBooking.hotel.city}, {hotelBooking.hotel.country}
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 sm:mt-0 flex flex-col items-start sm:items-end">
                                <div className="font-medium">
                                  {formatCurrency(hotelBooking.price, hotelBooking.currency)}
                                </div>
                                {booking.status !== 'CANCELLED' && hotelBooking.status !== 'CANCELLED' && (
                                  <button
                                    onClick={() => handleCancelHotel(booking, hotelBooking)}
                                    className="mt-2 text-xs text-red-600 hover:text-red-800 flex items-center"
                                  >
                                    <XCircleIcon className="h-4 w-4 mr-1" />
                                    Cancel hotel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Booking Actions */}
                    <div className="mt-6 flex justify-between items-center border-t border-border pt-4">
                      <div>
                        <Link 
                          href={`/api/bookings/${booking.id}/invoice?token=${localStorage.getItem('token')}`} 
                          target="_blank"
                          className="flex items-center text-sm text-primary hover:text-primary/80"
                        >
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          Download Invoice
                        </Link>
                      </div>
                      
                      {booking.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancelBooking(booking)}
                          className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
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

      {/* Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            </div>

            <div className="inline-block align-bottom bg-card/80 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationCircleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-foreground">
                      {cancelType === 'booking' 
                        ? 'Cancel Entire Booking' 
                        : cancelType === 'flight' 
                          ? 'Cancel Flight' 
                          : 'Cancel Hotel Booking'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        {cancelType === 'booking' 
                          ? 'Are you sure you want to cancel this entire booking? This action cannot be undone and may be subject to cancellation fees.'
                          : cancelType === 'flight'
                            ? 'Are you sure you want to cancel this flight? This action cannot be undone and may be subject to airline cancellation policies.'
                            : 'Are you sure you want to cancel this hotel booking? This action cannot be undone and may be subject to the hotel\'s cancellation policy.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-background px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={confirmCancellation}
                  disabled={isCancelling}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;