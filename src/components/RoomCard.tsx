import React, { useState } from "react";

interface RoomCardProps {
  room: {
    id: string;
    type: string;
    price: number;
    description: string;
    features?: string[];
    imageUrl?: string;
    images?: Array<{ url: string }>;
    currency: string;
  };
  onSelect: (room: any) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onSelect }) => {
  console.log("RoomCard received room:", room); // Debugging room data
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? (room.images?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === (room.images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  return (
    <div
      className="border border-border rounded-lg overflow-hidden hover:border-primary transition-colors cursor-pointer"
      onClick={() => onSelect(room)}
    >
      <div className="flex flex-col md:flex-row">
        {/* Room image */}
        <div className="w-full md:w-1/3 h-48 relative">
          {room.images && room.images.length > 0 && room.images[currentImageIndex]?.url ? (
            <img
              src={room.images[currentImageIndex].url}
              alt={`${room.type} room`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No Image Available</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevImage();
            }}
            className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full"
          >
            &lt;
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextImage();
            }}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full"
          >
            &gt;
          </button>
        </div>

        {/* Room details */}
        <div className="w-full md:w-2/3 p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-medium text-foreground">{room.type}</h4>
              <p className="text-sm text-muted-foreground mb-2">{room.description}</p>
              <div className="flex flex-wrap gap-2">
                {room.features?.map((feature, index) => (
                  <span
                    key={index}
                    className="bg-muted px-2 py-1 rounded-md text-xs text-muted-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-foreground">
                {room.currency} {room.price}
              </p>
              <p className="text-xs text-muted-foreground">per night</p>
              <button className="mt-2 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
