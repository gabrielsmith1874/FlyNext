import React from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

// Define proper types for your airline and airport objects
interface Airport {
  code?: string;
  name?: string;
  city?: string;
  country?: string;
}

interface Airline {
  code?: string;
  name?: string;
  logo?: string;
}

interface Flight {
  id: string;
  airline: Airline | string;
  flightNumber: string;
  origin: Airport | string;
  destination: Airport | string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate?: string;
  duration: number;
  price: number;
  stops: number;
  class?: string;
  aircraft?: string;
}

interface FlightSelectionCardProps {
  flight: Flight;
  isSelected: boolean;
  onSelect: (flight: Flight) => void;
}

export default function FlightSelectionCard({ 
  flight, 
  isSelected, 
  onSelect 
}: FlightSelectionCardProps) {
  // Helper function to format location data
  const formatLocation = (location: Airport | string | any): string => {
    if (!location) return 'Unknown';
    
    if (typeof location === 'string') {
      return location;
    } else if (typeof location === 'object') {
      if (location.code && location.city) {
        return `${location.city} (${location.code})`;
      } else if (location.code) {
        return location.code;
      } else if (location.name) {
        return location.name;
      } else if (location.city) {
        return location.city;
      }
    }
    return 'Unknown';
  };

  // Helper to format airline information
  const formatAirline = (airline: Airline | string | any): string => {
    if (typeof airline === 'string') {
      return airline;
    } else if (airline && typeof airline === 'object') {
      return airline.name || airline.code || 'Unknown Airline';
    }
    return 'Unknown Airline';
  };

  // Format duration to hours and minutes
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card 
      className={`border-2 transition-all ${isSelected ? 'border-primary' : 'border-border'}`}
      onClick={() => onSelect(flight)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex items-center justify-center w-10 h-10 rounded-full">
              {typeof flight.airline === 'object' && flight.airline?.logo ? (
                <img src={flight.airline.logo} alt={formatAirline(flight.airline)} className="w-8 h-8" />
              ) : (
                <span>{formatAirline(flight.airline).substring(0, 2)}</span>
              )}
            </div>
            <div>
              <p className="font-medium">{formatAirline(flight.airline)}</p>
              <p className="text-sm text-muted-foreground">Flight {flight.flightNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">${flight.price.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div>
            <p className="text-lg font-semibold">{flight.departureTime}</p>
            <p className="text-sm text-muted-foreground">{formatLocation(flight.origin)}</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground">{formatDuration(flight.duration)}</div>
            <div className="w-full border-t border-dashed my-1"></div>
            <div className="text-xs text-muted-foreground">
              {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{flight.arrivalTime}</p>
            <p className="text-sm text-muted-foreground">{formatLocation(flight.destination)}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button 
            variant={isSelected ? "secondary" : "outline"} 
            size="sm"
            type="button"
          >
            {isSelected ? "Selected" : "Select"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export type { Flight };
