"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';

interface HotelForm {
  name: string;
  description: string;
  address: string;
  cityId: string;
  rating: number;
  amenities: string;
  contactEmail: string;
  contactPhone: string;
  newImages: FileList | null; // New field for adding new images
}

interface City {
  id: string;
  name: string;
  country: string;
}

interface HotelImage {
  id: string;
  url: string;
}

export default function EditHotelPage() {
  const router = useRouter();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [images, setImages] = useState<HotelImage[]>([]); // State for existing images
  const [previewImages, setPreviewImages] = useState<string[]>([]); // State for image previews
  const { register, handleSubmit, setValue, watch } = useForm<HotelForm>();

  useEffect(() => {
    // Fetch cities
    fetch('/api/cities')
      .then(res => res.json())
      .then(setCities)
      .catch(() => toast.error('Failed to load cities'));

    // Fetch hotel details
    const fetchHotel = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/hotels/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const hotel = await res.json();
          setValue('name', hotel.name || '');
          setValue('description', hotel.description || '');
          setValue('address', hotel.address || '');
          setValue('cityId', hotel.cityId || '');
          setValue('rating', hotel.rating || 0);
          setValue('amenities', hotel.amenities || '');
          setValue('contactEmail', hotel.contactEmail || '');
          setValue('contactPhone', hotel.contactPhone || '');
          setValue('newImages', null); // Initialize new images field
          setImages(hotel.images || []); // Set existing images
        } else {
          throw new Error('Failed to fetch hotel details');
        }
      } catch (error) {
        console.error('Error fetching hotel:', error);
        toast.error('Failed to load hotel details');
        router.push('/hotels/create');
      }
    };

    fetchHotel();
  }, [id, setValue, router]);

  const handleDeleteImage = async (imageId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/hotels/${id}/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        toast.success('Image deleted successfully');
      } else {
        throw new Error('Failed to delete image');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const previews = Array.from(files).map((file) => URL.createObjectURL(file));
      setPreviewImages(previews);
    }
  };

  const onSubmit = async (data: HotelForm) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      // Add all form fields to FormData
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'newImages' && value) {
          Array.from(value).forEach((file) => formData.append('newImages', file as File)); // Ensure field name matches backend
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const res = await fetch(`/api/hotels/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        toast.success('Hotel updated successfully');
        router.push('/hotels/create');
      } else {
        const errorData = await res.json();
        console.error('Update error:', errorData);
        toast.error(errorData.message || 'Failed to update hotel');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update hotel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative pt-16">
      <div className="fixed inset-0 top-16 bg-[url('/backgrounds/hotellight.webp')] dark:bg-[url('/backgrounds/hoteldark.webp')] bg-cover bg-center z-0"></div>
      <div className="fixed inset-0 top-16 bg-black/50 z-0"></div>
      <div className="relative z-1">
        <div className="container mx-auto py-8 px-4">
          <div className="bg-background/60 backdrop-blur-sm rounded-lg p-6">
            <h1 className="text-2xl font-semibold mb-6">Edit Hotel</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block mb-1">Name</label>
                <input
                  {...register('name')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1">Description</label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1">Address</label>
                <input
                  {...register('address')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1">City ID</label>
                <select
                  {...register('cityId')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                >
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name}, {city.country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1">Rating</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  {...register('rating', { valueAsNumber: true })}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1">Amenities</label>
                <input
                  {...register('amenities')}
                  placeholder="WiFi, Pool, Spa, ..."
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1">Contact Email</label>
                <input
                  type="email"
                  {...register('contactEmail')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1">Contact Phone</label>
                <input
                  {...register('contactPhone')}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div>
                <label className="block mb-1">Existing Images</label>
                <div className="grid grid-cols-3 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.url}
                        alt="Hotel"
                        className="w-full h-32 object-cover rounded-md border border-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(image.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1">Add New Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  {...register('newImages')}
                  onChange={(e) => {
                    register('newImages').onChange(e); // Keep react-hook-form behavior
                    handleImageChange(e); // Handle preview
                  }}
                  className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {previewImages.map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-md border border-input"
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Updating...' : 'Update Hotel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
