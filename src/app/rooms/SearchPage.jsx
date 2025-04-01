import React from 'react';

function SearchPage({ rooms }) {
  return (
    <div className="search-page">
      {rooms.map(room => (
        <div key={room.id} className="room-card">
          <h3>{room.type}</h3>
          <p>{room.description}</p>
          <p>Price: {room.price} {room.currency}</p>
          <button className="btn">
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
}

export default SearchPage;