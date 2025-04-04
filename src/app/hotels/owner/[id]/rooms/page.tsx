"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useParams } from 'next/navigation'
import React from 'react'

const roomSchema = z.object({
  type: z.string().min(1, 'Room type is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0, 'Price must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  amenities: z.string(),
  availableCount: z.number().min(0, 'Must have at least 0 rooms'),
  maxGuests: z.number().min(1, 'Maximum number of guests must be at least 1').optional(),
  images: typeof FileList !== 'undefined' 
    ? z.instanceof(FileList).optional()
    : z.any().optional()
})


type RoomForm = z.infer<typeof roomSchema>

interface Room extends RoomForm {
  id: string
}

export default function HotelRoomsPage() {
  const params = useParams()
  const hotelId = params.id as string;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [cancelledBookings, setCancelledBookings] = useState<{ count: number; message: string } | null>(null);

  const form = useForm<RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      currency: 'CAD',
      availableCount: 0,
      maxGuests: undefined,
    },
  });

  useEffect(() => {
    fetchRooms(hotelId);
  }, [hotelId]);

  const fetchRooms = async (hotelId: string) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/hotels/${hotelId}/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch rooms: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Fetched rooms:', data); // Log the response for debugging
      setRooms(data.rooms || data); // Adjust based on the API response structure
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  }

  const onSubmit = async (data: RoomForm) => {
    setIsSubmitting(true)
    setCancelledBookings(null)
    try {
      const token = localStorage.getItem('token')
      const url = editingRoom 
        ? `/api/hotels/${hotelId}/rooms/${editingRoom.id}`
        : `/api/hotels/${hotelId}/rooms`
      
      const formData = new FormData()
      formData.append('type', data.type)
      formData.append('description', data.description)
      formData.append('price', data.price.toString())
      formData.append('currency', data.currency)
      formData.append('amenities', data.amenities)
      formData.append('availableCount', data.availableCount.toString())
      
      if (data.maxGuests !== undefined) {
        formData.append('maxGuests', data.maxGuests.toString())
      }
      
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          formData.append('images', data.images[i])
        }
      }
      
      const res = await fetch(url, {
        method: editingRoom ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const result = await res.json();
      
      if (result.cancelledBookings) {
        setCancelledBookings(result.cancelledBookings);
        toast.success(`Room ${editingRoom ? 'updated' : 'created'} successfully. ${result.cancelledBookings.message}`);
      } else {
        toast.success(editingRoom ? 'Room updated successfully' : 'Room created successfully');
      }
      
      fetchRooms(hotelId)
      form.reset()
      setEditingRoom(null)
    } catch (error) {
      console.error('Submission error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save room')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    form.setValue('type', room.type || '');
    form.setValue('description', room.description || '');
    form.setValue('price', room.price || 0);
    form.setValue('currency', room.currency || 'CAD');
    form.setValue('amenities', room.amenities || '');
    form.setValue('availableCount', room.availableCount || 0);
    form.setValue('maxGuests', room.maxGuests || 1);
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/hotels/${hotelId}/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        toast.success('Room deleted successfully')
        fetchRooms(hotelId)
      } else {
        throw new Error('Failed to delete room')
      }
    } catch (error) {
      toast.error('Failed to delete room')
    }
  }

  return (
    <div className="min-h-screen relative pt-16">
      <div className="fixed inset-0 top-16 bg-[url('/backgrounds/hotellight.webp')] dark:bg-[url('/backgrounds/hoteldark.webp')] bg-cover bg-center z-0"></div>
      <div className="fixed inset-0 top-16 bg-black/50 z-0"></div>
      <div className="relative z-1">
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-6 text-white">Manage Rooms</h1>
          
          {cancelledBookings && (
            <div className="mb-6 p-4 bg-yellow-500/80 text-white rounded-lg">
              <p className="font-semibold">⚠️ {cancelledBookings.message}</p>
              <p className="text-sm mt-1">Affected guests have been notified about their cancellation.</p>
            </div>
          )}
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-background/60 backdrop-blur-sm p-6 rounded-lg mb-8">
            <div>
              <label className="block mb-1 text-white">Room Type</label>
              <input
                {...form.register('type')}
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Deluxe Suite"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-white">Description</label>
              <textarea
                {...form.register('description')}
                rows={4}
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Luxurious suite with ocean view..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-white">Price</label>
                <input
                  type="number"
                  {...form.register('price', { valueAsNumber: true })}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="299.99"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-white">Currency</label>
                <select
                  {...form.register('currency')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block mb-1 text-white">Amenities</label>
              <input
                {...form.register('amenities')}
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="TV, Mini-bar, Room Service..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-white">Available Count</label>
                <input
                  type="number"
                  min="0"
                  {...form.register('availableCount', { valueAsNumber: true })}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                <p className="text-xs text-red-300 mt-1">
                  Warning: Setting to 0 will cancel all existing bookings
                </p>
              </div>
              
              <div>
                <label className="block mb-1 text-white">Max Guests</label>
                <input
                  type="number"
                  {...form.register('maxGuests', { valueAsNumber: true })}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="Maximum number of guests"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-white">Room Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  {...form.register('images')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
            </button>
          </form>

          <div className="space-y-4 bg-background/60 backdrop-blur-sm p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Existing Rooms</h2>
            {isLoading ? (
              <div className="text-center py-4">Loading rooms...</div>
            ) : rooms.length > 0 ? (
              <div className="space-y-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-4 border rounded hover:border-primary transition-colors"
                  >
                    <div className="flex gap-4 w-full">
                      {room.images && room.images.length > 0 && (
                        <div className="w-24 h-24 flex-shrink-0">
                          <img 
                            src={Array.isArray(room.images) ? room.images[0] : room.images} 
                            alt={`${room.type}`} 
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      )}
                      <div className="flex-grow">
                        <h3 className="font-semibold text-white">{room.type}</h3>
                        <p className="text-sm text-gray-300">{room.description}</p>
                        <p className="text-sm text-white">
                          {room.price} {room.currency} · {room.availableCount} available
                        </p>
                        {room.amenities && (
                          <p className="text-sm text-gray-400 mt-1">{room.amenities}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(room)}
                        className="p-2 text-blue-600 hover:text-blue-800"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(room.id)}
                        className="p-2 text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-gray-500">No rooms added yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
