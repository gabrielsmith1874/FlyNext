import React from 'react';
import { ArrowLongRightIcon } from '@heroicons/react/24/outline';

// Define interfaces for flight-related data
interface Location {
  city?: string;
  code?: string;
}

interface Airline {
  name?: string;
  code?: string;
}

interface Segment {
  id: string | number;
}

interface Flight {
  airline: Airline | string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  origin: Location | string;
  destination: Location | string;
  duration: string | number;
  price: number;
  segments?: Segment[];
}

interface FlightCardProps {
  flight: Flight;
  passengerCount: number;
  showSelectButton?: boolean;
}

// Helper function to format duration from minutes to "Xhr Ymin"
function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return `${hours}hr ${minutes}min`;
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, passengerCount, showSelectButton }) => {
  if (!flight) return null;

  // Helper function to safely get airline display name
  const getAirlineDisplay = (airline: Airline | string | undefined): string => {
    if (!airline) return 'Unknown Airline';
    if (typeof airline === 'string') return airline;
    return airline.name || airline.code || 'Unknown Airline';
  };

  // Helper function to safely get location display
  const getLocationDisplay = (location: Location | string | undefined): string => {
    if (!location) return 'Unknown Location';
    if (typeof location === 'string') return location;
    return location.city || location.code || 'Unknown Location';
  };

  const formattedDuration = formatDuration(parseInt(String(flight.duration), 10));

  return (
    <div className="mb-8 p-4 bg-muted/50 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{getAirlineDisplay(flight.airline)}</h3>
          <p className="text-sm text-muted-foreground">Flight {flight.flightNumber}</p>
          {flight.segments && (
            <p className="text-sm text-primary">
              Indirect Flight - {flight.segments.length} segment{flight.segments.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-foreground">
            ${flight.price && passengerCount ? (flight.price * passengerCount).toFixed(2) : flight.price}
          </p>
          <p className="text-sm text-muted-foreground">{passengerCount} passenger{passengerCount !== 1 ? 's' : ''}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{flight.departureTime}</p>
          <p className="text-sm text-muted-foreground">{getLocationDisplay(flight.origin)}</p>
        </div>
        
        <div className="flex-1 px-6">
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border"></div>
            <div className="absolute bg-black dark:bg-black px-3 text-xs text-muted-foreground">
              {formattedDuration}
            </div>
            <ArrowLongRightIcon className="absolute right-0 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{flight.arrivalTime}</p>
          <p className="text-sm text-muted-foreground">{getLocationDisplay(flight.destination)}</p>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;