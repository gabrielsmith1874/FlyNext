import React, { useState } from "react";
import { StarIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

interface Hotel {
  id: string;
  name: string;
  address: string;
  rating: number;
  pricePerNight: number;
  images?: Array<{ url: string }>;
}

interface OwnedHotelsListProps {
  hotels: Hotel[];
}

const OwnedHotelsList: React.FC<OwnedHotelsListProps> = ({ hotels }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({});

  const handlePrevImage = (hotelId: string, imagesLength: number) => {
    setCurrentImageIndex((prev) => ({
      ...prev,
      [hotelId]: (prev[hotelId] || 0) === 0 ? imagesLength - 1 : (prev[hotelId] || 0) - 1,
    }));
  };

  const handleNextImage = (hotelId: string, imagesLength: number) => {
    setCurrentImageIndex((prev) => ({
      ...prev,
      [hotelId]: (prev[hotelId] || 0) === imagesLength - 1 ? 0 : (prev[hotelId] || 0) + 1,
    }));
  };

  if (hotels.length === 0) {
    return <p className="text-muted-foreground">No hotels found. Create your first hotel below.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {hotels.map((hotel) => (
        <div
          key={hotel.id}
          className="bg-card border rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow"
        >
          {(hotel.images?.length ?? 0) > 0 && (
            <div className="relative h-48">
              <img
                src={(hotel.images ?? [])[currentImageIndex[hotel.id] || 0]?.url}
                alt={hotel.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handlePrevImage(hotel.id, (hotel.images ?? []).length)}
                className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full"
              >
                &lt;
              </button>
              <button
                onClick={() => handleNextImage(hotel.id, (hotel.images ?? []).length)}
                className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full"
              >
                &gt;
              </button>
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                ${hotel.pricePerNight}/night
              </div>
            </div>
          )}
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">{hotel.name}</h3>
            <div className="flex items-center mb-2">
              <StarIcon className="h-5 w-5 text-yellow-400" />
              <span className="ml-1">{hotel.rating}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{hotel.address}</p>
            <div className="flex justify-around items-center">
              <Link
                href={`/hotels/owner/${hotel.id}/rooms`}
                className="text-primary hover:underline text-sm"
              >
                Manage Rooms
              </Link>
              <Link
                href={`/hotels/owner/${hotel.id}/bookings`}
                className="text-primary hover:underline text-sm"
              >
                Manage Bookings
              </Link>
              <Link
                href={`/hotels/owner/${hotel.id}/edit`}
                className="text-primary hover:underline text-sm"
              >
                Edit Hotel
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OwnedHotelsList;