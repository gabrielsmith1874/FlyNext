import React from 'react';
import { PaperAirplaneIcon, ArrowLongRightIcon } from '@heroicons/react/24/outline';

// Define interfaces for flight-related data
interface Location {
  city?: string;
  code?: string;
}

interface Airline {
  name?: string;
  code?: string;
  logo?: string;
}

interface Flight {
  airline: Airline | string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  origin: Location | string;
  destination: Location | string;
  duration: number;
  price: number;
}

interface FlightItemProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
  isSelected?: boolean;
}

// Helper function to format duration in minutes to "Xhr Ymin"
function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return `${hours}hr ${minutes}min`;
}

const FlightItem: React.FC<FlightItemProps> = ({ flight, onSelect, isSelected = false }) => {
  if (!flight) return null;

  // Helper function to safely get airline display name
  const getAirlineDisplay = (airline: Airline | string | undefined): string => {
    if (!airline) return 'Unknown Airline';
    if (typeof airline === 'string') return airline;
    return airline.name || airline.code || 'Unknown Airline';
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              {flight.airline && typeof flight.airline !== 'string' && flight.airline.logo ? (
                <img src={flight.airline.logo} alt={getAirlineDisplay(flight.airline)} className="w-8 h-8" />
              ) : (
                <PaperAirplaneIcon className="h-6 w-6 text-primary rotate-45" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{getAirlineDisplay(flight.airline)}</h3>
              <p className="text-sm text-muted-foreground">Flight {flight.flightNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">${flight.price}</p>
            <p className="text-sm text-muted-foreground">per person</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{flight.departureTime}</p>
            <p className="text-sm text-muted-foreground">
              {typeof flight.origin === 'string' ? flight.origin : flight.origin?.city || flight.origin?.code}
            </p>
          </div>

          <div className="flex-1 px-6">
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-border"></div>
              <div className="absolute bg-black dark:bg-black px-3 text-xs text-muted-foreground">
                {formatDuration(flight.duration)}
              </div>
              <ArrowLongRightIcon className="absolute right-0 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{flight.arrivalTime}</p>
            <p className="text-sm text-muted-foreground">
              {typeof flight.destination === 'string'
                ? flight.destination
                : flight.destination?.city || flight.destination?.code}
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelect(flight)}
          className="w-full mt-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default FlightItem;