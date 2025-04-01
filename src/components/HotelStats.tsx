import React from 'react';

interface HotelStatsProps {
  totalRooms: number;
  totalBookings: number;
}

const HotelStats: React.FC<HotelStatsProps> = ({ totalRooms, totalBookings }) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-foreground mb-2">Hotel Statistics</h2>
      <p className="text-sm text-muted-foreground">Total Rooms: {totalRooms}</p>
      <p className="text-sm text-muted-foreground">Total Bookings: {totalBookings}</p>
    </div>
  );
};

export default HotelStats;
