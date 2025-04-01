import React from 'react';

function RoomCard({ room }) {
  return (
    <div className="room-card">
      <h3>{room.type}</h3>
      <p>{room.description}</p>
      <p>Price: {room.price} {room.currency}</p>
      <button className="btn">
        Add to Cart
      </button>
    </div>
  );
}

export default RoomCard;