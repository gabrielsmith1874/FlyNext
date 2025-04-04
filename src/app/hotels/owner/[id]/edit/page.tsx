"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface HotelForm {
  name: string
  description: string
  address: string
  cityId: string
  rating: number
  amenities: string
  contactEmail: string
  contactPhone: string
}

interface City {
  id: string
  name: string
  country: string
}

type PageParams = {
  id: string;
}

const BaseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
export default function EditHotelPage({ params }: { params: PageParams }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [images, setImages] = useState<string[]>([])
  const { register, handleSubmit, setValue } = useForm<HotelForm>()

  useEffect(() => {
    if (!params?.id) return; // Ensure params.id is available before proceeding

    // Fetch cities
    fetch('/api/cities')
      .then(res => res.json())
      .then(setCities)
      .catch(() => toast.error('Failed to load cities'))

    // Fetch hotel details
    const fetchHotel = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/hotels/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const hotel = await res.json();
          console.log('Hotel data received:', hotel);

          // Set form values
          setValue('name', hotel.name || '');
          setValue('description', hotel.description || '');
          setValue('address', hotel.address || '');
          setValue('cityId', hotel.cityId || '');
          setValue('rating', hotel.rating || 0);
          setValue('amenities', hotel.amenities || '');
          setValue('contactEmail', hotel.contactEmail || '');
          setValue('contactPhone', hotel.contactPhone || '');
        } else {
          throw new Error('Failed to fetch hotel details');
        }
      } catch (error) {
        console.error('Error fetching hotel:', error);
        toast.error('Failed to load hotel details');
        router.push('/hotels/owner');
      }
    };

    fetchHotel();
  }, [params?.id, setValue, router]);

  useEffect(() => {
    if (!params?.id) return; // Ensure params.id is available before proceeding

    // Fetch hotel images
    const fetchImages = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BaseURL}/api/hotels/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const hotel = await res.json();
          const imageList = hotel.images.map((image: any) => image.url);
          setImages(imageList);
        } else {
          throw new Error('Failed to fetch images');
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        toast.error('Failed to load hotel images');
      }
    };

    fetchImages();
  }, [params?.id]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('newImages', file));

    try {
      const token = localStorage.getItem('token');
      formData.append('removedImageIds', JSON.stringify([])); // No images removed in this case

      const res = await fetch(`${BaseURL}/api/hotels/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const updatedHotel = await res.json();
        const updatedImages = updatedHotel.images.map((image: any) => image.url);
        setImages(updatedImages);
        toast.success('Images uploaded successfully');
      } else {
        throw new Error('Failed to upload images');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    }
  };

  const handleImageRemove = async (image: string) => {
    try {
      const token = localStorage.getItem('token');
      const removedImageIds = images
        .filter(img => img === image)
        .map((_, index) => index); // Assuming image IDs are indices for simplicity

      const formData = new FormData();
      formData.append('removedImageIds', JSON.stringify(removedImageIds));
      formData.append('newImages', ''); // No new images in this case

      const res = await fetch(`${BaseURL}/api/hotels/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const updatedHotel = await res.json();
        const updatedImages = updatedHotel.images.map((image: any) => image.url);
        setImages(updatedImages);
        toast.success('Image removed successfully');
      } else {
        throw new Error('Failed to remove image');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  };

  const onSubmit = async (data: HotelForm) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/hotels/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        toast.success('Hotel updated successfully')
        router.push('/hotels/owner')
      } else {
        throw new Error('Failed to update hotel')
      }
    } catch (error) {
      toast.error('Failed to update hotel')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative pt-16">
      <div className="fixed inset-0 top-16 bg-[url('/backgrounds/hotellight.webp')] dark:bg-[url('/backgrounds/hoteldark.webp')] bg-cover bg-center z-0"></div>
      <div className="fixed inset-0 top-16 bg-black/50 z-0"></div>
      <div className="relative z-1">
        <div className="container mx-auto py-8 px-4"></div>
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
                <h3 className="text-lg font-semibold mb-4">Hotel Images</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Hotel Image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleImageRemove(image)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block mb-2">Add Images</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
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
  )
}
