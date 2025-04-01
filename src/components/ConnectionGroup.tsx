import React from 'react';
import FlightCard from './FlightCard';

/**
 * Alias for formatPrice - maintains compatibility with components using formatCurrency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return formatPrice(amount, currency);
}

/**
 * Format a price with currency
 * @param {number} price - Price
 * @param {string} currency - Currency code
 * @returns {string} - Formatted price
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(price);
}

/**
 * Format flight duration in minutes to hours and minutes
 * @param {number} minutes - Duration in minutes
 * @returns {string} - Formatted duration
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

interface ConnectionGroupProps {
  flights: any[];
  onSelect: (flights: any[]) => void;
  isSelected: boolean;
  passengerCount?: number;
}

const ConnectionGroup: React.FC<ConnectionGroupProps> = ({ 
  flights, 
  onSelect,
  isSelected,
  passengerCount
}) => {
  if (!flights || flights.length === 0) return null;
  
  // Sort flights by departure time or segment index if available
  const sortedFlights = [...flights].sort((a, b) => {
    // If flights have segment info in the status, use that for ordering
    const aSegment = a.status?.match(/:SEGMENT:(\d+):/);
    const bSegment = b.status?.match(/:SEGMENT:(\d+):/);
    
    if (aSegment && bSegment) {
      return parseInt(aSegment[1]) - parseInt(bSegment[1]);
    }
    
    // Fall back to departure time
    return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
  });
  
  const firstFlight = sortedFlights[0];
  const lastFlight = sortedFlights[sortedFlights.length - 1];
  
  // Calculate total duration from first departure to last arrival
  const firstDepartureTime = new Date(firstFlight.departureTime).getTime();
  const lastArrivalTime = new Date(lastFlight.arrivalTime).getTime();
  const totalDuration = (lastArrivalTime - firstDepartureTime) / 60000; // in minutes
  
  // Calculate total price
  const totalPrice = sortedFlights.reduce((sum, flight) => sum + flight.price, 0);
  
  const handleSelect = () => {
    onSelect(sortedFlights);
  };
  
  return (
    <div className={`bg-card rounded-lg shadow-md p-4 border ${isSelected ? 'border-primary border-2' : 'border-border'}`}>
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-foreground">
              {firstFlight.origin?.city || firstFlight.origin?.code || firstFlight.origin} → {lastFlight.destination?.city || lastFlight.destination?.code || lastFlight.destination}
            </h3>
            <p className="text-sm text-muted-foreground">
              {sortedFlights.length} flight{sortedFlights.length > 1 ? 's' : ''} • {sortedFlights.length - 1} connection{sortedFlights.length > 2 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-foreground">
              {formatCurrency(passengerCount ? totalPrice * passengerCount : totalPrice, firstFlight.currency || 'USD')}
            </p>
            <p className="text-xs text-muted-foreground">
              Total duration: {formatDuration(totalDuration)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {sortedFlights.map((flight, index) => (
          <div key={flight.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">Flight {index + 1} of {sortedFlights.length}</p>
              {index > 0 && (
                <div className="text-xs text-muted-foreground">
                  Connection time: {calculateConnectionTime(sortedFlights[index - 1], flight)}
                </div>
              )}
            </div>
            <FlightCard 
              flight={flight} 
              passengerCount={passengerCount}
              showSelectButton={false}
            />
          </div>
        ))}
      </div>
      
      <div className="mt-4">
        <button 
          onClick={handleSelect}
          className={`w-full py-2 rounded-md transition-colors ${
            isSelected 
              ? 'bg-primary/20 text-primary border border-primary' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isSelected ? 'Selected' : 'Book All Segments Together'}
        </button>
      </div>
    </div>
  );
};

// Helper function to calculate connection time
function calculateConnectionTime(departureFlight: any, arrivalFlight: any) {
  if (!departureFlight.arrivalTime || !arrivalFlight.departureTime) {
    return 'Unknown';
  }
  
  const arrivalTime = new Date(departureFlight.arrivalTime).getTime();
  const departureTime = new Date(arrivalFlight.departureTime).getTime();
  
  const diffMs = departureTime - arrivalTime;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHrs}h ${diffMins}m`;
}

export default ConnectionGroup;
