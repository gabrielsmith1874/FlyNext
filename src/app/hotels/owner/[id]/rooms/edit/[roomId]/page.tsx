"use client";
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export interface PageProps {
  params: Promise<{ id: string; roomId: string }>;
}

interface RoomFormData {
  type: string;
  description: string;
  price: string | number;
  currency: string;
  amenities: string;
  availableCount: string | number;
  maxGuests: string | number;
  images?: FileList | null;
}

export default async function EditRoomPage({ params }: PageProps) {
  const { id: hotelId, roomId } = await params; // Await the params promise
  const { register, setValue, handleSubmit, formState: { errors } } = useForm<RoomFormData>();
  const router = useRouter();
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  console.log('Images:', existingImages);

  useEffect(() => {
    async function fetchRoomDetails() {
      try {
        const response = await fetch(`/api/hotels/${hotelId}/rooms/${roomId}`);
        const room = await response.json();

        if (room) {
          setValue('type', room.type || '');
          setValue('description', room.description || '');
          setValue('price', room.price || '');
          setValue('currency', room.currency || 'USD');
          setValue('amenities', room.amenities || '');
          setValue('availableCount', room.availableCount || 1);
          setValue('maxGuests', room.maxGuests || '');
          
          // Handle existing images
          if (room.images) {
            setExistingImages(Array.isArray(room.images) ? room.images : [room.images]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch room details:', error);
      }
    }

    fetchRoomDetails();
  }, [hotelId, roomId, setValue]);

const onSubmit = async (data: RoomFormData) => {
  setIsSubmitting(true);
  try {
    const formData = new FormData();
    formData.append('type', String(data.type));
    formData.append('description', String(data.description));
    formData.append('price', String(data.price));
    formData.append('currency', String(data.currency));
    formData.append('amenities', String(data.amenities));
    formData.append('availableCount', String(data.availableCount));
    formData.append('maxGuests', String(data.maxGuests));

    // Add existing images
    if (existingImages.length > 0) {
      formData.append('existingImages', JSON.stringify(existingImages));
    }

    // Add new images
    if (data.images && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        formData.append('images', data.images[i]);
      }
    }

    console.log('FormData being sent:', Array.from(formData.entries()));

    const response = await fetch(`/api/hotels/${hotelId}/rooms/${roomId}`, {
      method: 'PUT',
      body: formData,
    });

    if (response.ok) {
      router.push(`/hotels/owner/${hotelId}/rooms`);
    } else {
      console.error('Failed to update room:', response.statusText);
    }
  } catch (error) {
    console.error('Error updating room:', error);
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="min-h-screen relative pt-16">
      <div className="fixed inset-0 top-16 bg-[url('/backgrounds/hotellight.webp')] dark:bg-[url('/backgrounds/hoteldark.webp')] bg-cover bg-center z-0"></div>
      <div className="fixed inset-0 top-16 bg-black/50 z-0"></div>
      <div className="relative z-1">
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-6 text-white">Edit Room</h1>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-background/60 backdrop-blur-sm p-6 rounded-lg mb-8">
            <div>
              <label className="block mb-1 text-white">Room Type</label>
              <input
                {...register('type')}
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Deluxe Suite"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-white">Description</label>
              <textarea
                {...register('description')}
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
                  {...register('price')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="299.99"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-white">Currency</label>
                <select
                  {...register('currency')}
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
                {...register('amenities')}
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
                  {...register('availableCount')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-white">Max Guests</label>
                <input
                  type="number"
                  {...register('maxGuests')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="Maximum number of guests"
                />
              </div>
            </div>
            
            {/* Image section */}
            <div>
              <label className="block mb-1 text-white">Current Images</label>
              {existingImages.length > 0 ? (
                <div className="flex space-x-2 mb-4">
                  {existingImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={img} 
                        alt={`Room image ${index + 1}`} 
                        className="w-24 h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setExistingImages(existingImages.filter((_, i) => i !== index))}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 mb-2">No images available</p>
              )}
              
              <label className="block mb-1 text-white">Upload New Images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                {...register('images')}
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Update Room'}
              </button>
              
              <button
                type="button"
                onClick={() => router.push(`/hotels/owner/${hotelId}/rooms`)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}