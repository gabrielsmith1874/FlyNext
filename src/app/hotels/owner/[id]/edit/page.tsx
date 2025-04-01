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
}

interface City {
  id: string;
  name: string;
  country: string;
}

export default function EditHotelPage() {
  const router = useRouter();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const { register, handleSubmit, setValue } = useForm<HotelForm>();

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
          console.log('Hotel data received:', hotel); // Debug log

          if (!hotel.contactEmail || !hotel.contactPhone) {
            console.warn('Missing contact info:', { email: hotel.contactEmail, phone: hotel.contactPhone });
          }

          // Set all form values, with fallbacks
          setValue('name', hotel.name || '');
          setValue('description', hotel.description || '');
          setValue('address', hotel.address || '');
          setValue('cityId', hotel.cityId || '');
          setValue('rating', hotel.rating || 0);
          setValue('amenities', hotel.amenities || '');
          setValue('contactEmail', hotel.contactEmail || '');
          setValue('contactPhone', hotel.contactPhone || '');

          // Debug log for form values
          console.log('Form values set:', {
            email: hotel.contactEmail,
            phone: hotel.contactPhone
          });
        } else {
          throw new Error('Failed to fetch hotel details');
        }
      } catch (error) {
        console.error('Error fetching hotel:', error); // Enhanced error logging
        toast.error('Failed to load hotel details');
        router.push('/hotels/owner');
      }
    };

    fetchHotel();
  }, [id, setValue, router]);

  const onSubmit = async (data: HotelForm) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/hotels/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        toast.success('Hotel updated successfully');
        router.push('/'); // redirect to home page
      } else {
        throw new Error('Failed to update hotel');
      }
    } catch (error) {
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
