"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingState, setLoadingState] = useState({});

  /**
   * Format a price with currency
   * @param {number} price - Price
   * @param {string} currency - Currency code
   * @returns {string} - Formatted price
   */
  const formatPrice = (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(price);
  };

  /**
   * Alias for formatPrice - maintains compatibility with components using formatCurrency
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} - Formatted currency string
   */
  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return formatPrice(amount, currency);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login first");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/bookings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to fetch bookings");
    }
  };

  interface Flight {
    id: string;
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    price: number;
    currency?: string;
    status?: string;
  }

  const processConnectingFlights = (bookingFlights: Flight[]): FlightGroup[] => {
    const flightGroups = new Map();

    bookingFlights.forEach((flight) => {
      if (flight.status && flight.status.includes(":CONNECTION_REF:")) {
        const connectionMatch = flight.status.match(/:CONNECTION_REF:([^:]+):/);
        if (connectionMatch && connectionMatch[1]) {
          const connectionRef = connectionMatch[1];

          if (!flightGroups.has(connectionRef)) {
            flightGroups.set(connectionRef, []);
          }

          flightGroups.get(connectionRef).push(flight);
        }
      }
    });

    const processedFlights: FlightGroup[] = [];

    bookingFlights.forEach((flight) => {
      if (!flight.status || !flight.status.includes(":CONNECTION_REF:")) {
        processedFlights.push({
          type: 'single',
          flight,
        });
      }
    });

    flightGroups.forEach((group, connectionRef) => {
      group.sort((a: Flight, b: Flight) => {
        const aMatch = a.status?.match(/:SEGMENT:(\d+):/) || null;
        const bMatch = b.status?.match(/:SEGMENT:(\d+):/) || null;
        const aIndex = aMatch ? parseInt(aMatch[1]) : 0;
        const bIndex = bMatch ? parseInt(bMatch[1]) : 0;
        return aIndex - bIndex;
      });

      processedFlights.push({
        type: 'connecting',
        flights: group,
        connectionRef,
      });
    });

    return processedFlights;
  };

  interface Booking {
    id: string;
    bookingReference: string;
    status: string;
    flights: Flight[];
  }

  interface FlightGroup {
    type: 'single' | 'connecting';
    flight?: Flight;
    flights?: Flight[];
    connectionRef?: string;
  }

  const renderFlights = (booking: Booking) => {
    const flightGroups: FlightGroup[] = processConnectingFlights(booking.flights);

    return (
      <div className="space-y-4">
        {flightGroups.map((flightGroup, groupIndex) => (
          <div
            key={groupIndex}
            className="bg-card rounded-lg p-4 border border-border"
          >
            {flightGroup.type === "single" ? (
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">
                      {flightGroup.flight!.airline} {flightGroup.flight!.flightNumber}
                    </h4>
                    <p>
                      {flightGroup.flight!.origin} → {flightGroup.flight!.destination}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(flightGroup.flight!.departureTime).toLocaleDateString()}{" "}
                      •{" "}
                      {new Date(
                        flightGroup.flight!.departureTime
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(
                        flightGroup.flight!.arrivalTime
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">
                      {formatCurrency(
                        flightGroup.flight!.price,
                        flightGroup.flight!.currency || "USD"
                      )}
                    </span>
                    <button
                      onClick={() =>
                        handleCancelComponent({
                          bookingId: booking.id,
                          componentType: "flight",
                          componentId: flightGroup.flight!.id
                        })
                      }
                      className="block mt-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Cancel flight
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">Connected Journey</h4>
                    <p>
                      {flightGroup.flights![0].origin} →{" "}
                      {flightGroup.flights![flightGroup.flights!.length - 1].destination}
                    </p>
                    <p className="text-sm text-primary">
                      {flightGroup.flights!.length} segments •{" "}
                      {flightGroup.flights!.length - 1} connections
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">
                      {formatCurrency(
                        flightGroup.flights!.reduce(
                          (total, flight) => total + flight.price,
                          0
                        ),
                        flightGroup.flights![0].currency || "USD"
                      )}
                    </span>
                    <button
                      onClick={() =>
                        handleCancelConnectingFlights(
                          booking.id,
                          flightGroup.connectionRef,
                          flightGroup.flights
                        )
                      }
                      className="block mt-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Cancel all segments
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <p className="text-sm font-medium">Flight segments:</p>
                  {flightGroup.flights!.map((flight, idx) => (
                    <div key={idx} className="text-sm flex justify-between">
                      <div>
                        <p>
                          Segment {idx + 1}: {flight.airline} {flight.flightNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {flight.origin} → {flight.destination}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(flight.departureTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(flight.arrivalTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleCancelConnectingFlights = async (
    bookingId: string,
    connectionRef: string | undefined,
    flights: Flight[] | undefined
  ): Promise<void> => {
    if (
      !confirm(
        `Are you sure you want to cancel all flight segments for this journey?`
      )
    ) {
      return;
    }

    setLoadingState({ ...loadingState, [bookingId]: true });

    try {
      if (flights) {
        for (const flight of flights) {
          await fetch(`/api/bookings/${bookingId}/component`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              componentType: "flight",
              componentId: flight.id,
            }),
          });
        }
      }

      toast.success("Connecting flights cancelled successfully");
      fetchBookings();
    } catch (error) {
      console.error("Error cancelling connecting flights:", error);
      toast.error("Failed to cancel flights");
    } finally {
      setLoadingState({ ...loadingState, [bookingId]: false });
    }
  };

  interface CancelComponentParams {
    bookingId: string;
    componentType: string;
    componentId: string;
  }

  const handleCancelComponent = async ({
    bookingId,
    componentType,
    componentId
  }: CancelComponentParams): Promise<void> => {
    if (!confirm(`Are you sure you want to cancel this ${componentType}?`)) {
      return;
    }

    setLoadingState({ ...loadingState, [bookingId]: true });

    try {
      const response = await fetch(`/api/bookings/${bookingId}/component`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          componentType,
          componentId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel component");
      }

      toast.success(`${componentType} cancelled successfully`);
      fetchBookings();
    } catch (error) {
      console.error(`Error cancelling ${componentType}:`, error);
      toast.error(`Failed to cancel ${componentType}`);
    } finally {
      setLoadingState({ ...loadingState, [bookingId]: false });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Your Bookings</h1>
      {bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-card rounded-lg p-6 border border-border"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Booking Reference: {booking.bookingReference}</h2>
                <span className="text-sm text-muted-foreground">
                  Status: {booking.status}
                </span>
              </div>
              {renderFlights(booking)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}