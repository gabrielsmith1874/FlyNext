import React, { useState } from "react";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

interface HotelCardProps {
  hotel: {
    id: string;
    name: string;
    city: string;
    country: string;
    rating: number;
    pricePerNight: number;
    description?: string;
    amenities?: string;
    images?: Array<{ url: string }>;
  };
  onSelect: (hotel: any) => void;
}

const HotelCard: React.FC<HotelCardProps> = ({ hotel, onSelect }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? (hotel.images?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === (hotel.images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      {(hotel.images?.[0] || (hotel.images ?? []).length > 0) && (
        <div className="relative h-48">
          <img
            src={hotel.images?.[currentImageIndex]?.url || ""}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={handlePrevImage}
            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full"
          >
            &lt;
          </button>
          <button
            onClick={handleNextImage}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full"
          >
            &gt;
          </button>
          <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
            ${hotel.pricePerNight}/night
          </div>
        </div>
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{hotel.name}</h3>
            <p className="text-sm text-muted-foreground">
              {hotel.city}, {hotel.country}
            </p>
          </div>
          <div className="flex items-center space-x-1">
            <StarIconSolid className="h-5 w-5 text-yellow-400" />
            <span className="text-foreground font-medium">{hotel.rating}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{hotel.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {hotel.amenities?.split(",").map((amenity, index) => (
            <span
              key={index}
              className="bg-muted px-2 py-1 rounded-md text-xs text-muted-foreground"
            >
              {amenity.trim()}
            </span>
          ))}
        </div>
        <button
          onClick={() => onSelect(hotel)}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          View Rooms
        </button>
      </div>
    </div>
  );
};

export default HotelCard;
