"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface Hotel {
  id: string;
  name: string;
  // ...other hotel properties...
}

export default function OwnerHotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [newHotel, setNewHotel] = useState({
    name: "",
    description: "",
    address: "",
    ownerId: "",
    cityId: "",
    country: "",
    postalCode: "",
    images: "", // Enter as JSON string or comma-separated URLs
    rating: "",
    amenities: "",
    contactEmail: "",
    contactPhone: "",
    pricePerNight: "",
    type: "HOTEL",
    roomCount: ""
  })

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await fetch('/api/hotels/owner')
        if (res.ok) {
          const data = await res.json()
          setHotels(data)
        } else {
          toast.error('Failed to fetch hotels')
        }
      } catch (error) {
        console.error('Error fetching hotels:', error)
        toast.error('Error fetching hotels')
      }
    }
    fetchHotels()
  }, [])

  const handleNewHotelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewHotel(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/hotels/owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHotel)
      })
      if (res.ok) {
        const createdHotel = await res.json()
        toast.success("Hotel created successfully")
        setHotels(prev => [...prev, createdHotel])
        setNewHotel({
          name: "",
          description: "",
          address: "",
          ownerId: "",
          cityId: "",
          country: "",
          postalCode: "",
          images: "",
          rating: "",
          amenities: "",
          contactEmail: "",
          contactPhone: "",
          pricePerNight: "",
          type: "HOTEL",
          roomCount: ""
        })
      } else {
        const errorData = await res.json()
        toast.error("Error: " + errorData.message)
      }
    } catch (error) {
      console.error(error)
      toast.error("Error creating hotel")
    }
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-[url('https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
      <div className="fixed inset-0 bg-black/50"></div>
      <div className="relative z-10">
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-4 text-white">My Hotels</h1>
          {hotels.length ? (
            <div className="space-y-4">
              {hotels.map(hotel => (
                <div key={hotel.id} className="mb-4 p-4 bg-background/60 backdrop-blur-sm border border-border rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">{hotel.name}</span>
                    <Link href={`/hotels/owner/${hotel.id}/rooms/create`} className="text-primary hover:underline">
                      Create Room
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white">No hotels found.</p>
          )}

          {/* Create Hotel Form */}
          <div className="mt-8 border-t border-white/20 pt-8">
            <h2 className="text-xl font-bold mb-4 text-white">Create Hotel</h2>
            <form onSubmit={handleCreateHotel} className="space-y-4 bg-background/60 backdrop-blur-sm p-6 rounded-lg">
              <div>
                <label className="block mb-1 text-foreground">Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={newHotel.name} 
                  onChange={handleNewHotelChange} 
                  required 
                  className="w-full border px-2 py-1 rounded" 
                />
              </div>
              <div>
                <label className="block mb-1 text-foreground">Description</label>
                <textarea 
                  name="description" 
                  value={newHotel.description} 
                  onChange={handleNewHotelChange} 
                  required 
                  className="w-full border px-2 py-1 rounded" 
                />
              </div>
              <div>
                <label className="block mb-1 text-foreground">Address</label>
                <input 
                  type="text" 
                  name="address" 
                  value={newHotel.address} 
                  onChange={handleNewHotelChange} 
                  required 
                  className="w-full border px-2 py-1 rounded" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-foreground">City ID</label>
                  <input 
                    type="text" 
                    name="cityId" 
                    value={newHotel.cityId} 
                    onChange={handleNewHotelChange} 
                    className="w-full border px-2 py-1 rounded" 
                  />
                </div>
                <div>
                  <label className="block mb-1 text-foreground">Country</label>
                  <input 
                    type="text" 
                    name="country" 
                    value={newHotel.country} 
                    onChange={handleNewHotelChange} 
                    className="w-full border px-2 py-1 rounded" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-foreground">Postal Code</label>
                  <input 
                    type="text" 
                    name="postalCode" 
                    value={newHotel.postalCode} 
                    onChange={handleNewHotelChange} 
                    className="w-full border px-2 py-1 rounded" 
                  />
                </div>
                <div>
                  <label className="block mb-1 text-foreground">Price Per Night</label>
                  <input 
                    type="number" 
                    name="pricePerNight" 
                    value={newHotel.pricePerNight} 
                    onChange={handleNewHotelChange} 
                    className="w-full border px-2 py-1 rounded" 
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-foreground">Amenities</label>
                <input 
                  type="text" 
                  name="amenities" 
                  value={newHotel.amenities} 
                  onChange={handleNewHotelChange} 
                  placeholder="WiFi, Pool, Spa, ..." 
                  className="w-full border px-2 py-1 rounded" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-foreground">Contact Email</label>
                  <input 
                    type="email" 
                    name="contactEmail" 
                    value={newHotel.contactEmail} 
                    onChange={handleNewHotelChange} 
                    className="w-full border px-2 py-1 rounded" 
                  />
                </div>
                <div>
                  <label className="block mb-1 text-foreground">Contact Phone</label>
                  <input 
                    type="text" 
                    name="contactPhone" 
                    value={newHotel.contactPhone} 
                    onChange={handleNewHotelChange} 
                    className="w-full border px-2 py-1 rounded" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-foreground">Rating</label>
                  <input 
                    type="number" 
                    name="rating" 
                    value={newHotel.rating} 
                    onChange={handleNewHotelChange} 
                    step="0.1"
                    className="w-full border px-2 py-1 rounded" 
                  />
                </div>
                <div>
                  <label className="block mb-1 text-foreground">Room Count</label>
                  <input 
                    type="number" 
                    name="roomCount" 
                    value={newHotel.roomCount} 
                    onChange={handleNewHotelChange} 
                    className="w-full border px-2 py-1 rounded" 
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-foreground">Images (JSON)</label>
                <input 
                  type="text" 
                  name="images" 
                  value={newHotel.images} 
                  onChange={handleNewHotelChange} 
                  placeholder='[{"url": "https://...", "caption": "..."}, ...]' 
                  className="w-full border px-2 py-1 rounded" 
                />
              </div>
              <button 
                type="submit" 
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Create Hotel
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
