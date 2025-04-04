"use client"

import React from 'react' // Add React import
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { StarIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useAuth } from '@/src/hooks/useAuth'
import OwnedHotelsList from "@/src/components/OwnedHotelsList";


// Update interface to remove JSON images field
interface HotelCreationForm {
  name: string
  description: string
  address: string
  cityId: string
  postalCode: string
  contactEmail: string
  contactPhone: string
  rating: number
  amenities: string
}

interface City {
  id: string;
  name: string;
  country: string;
}

// Add a more complete Hotel interface
interface Hotel {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  rating: number;
  amenities: string;
  images: Array<{ url: string; caption?: string }>;
  pricePerNight: number;
  rooms?: Array<{
    id: string;
    type: string;
    price: number;
    availableCount: number;
  }>;
}

// Add this helper function before CreateHotelPage
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    throw new Error('Image upload failed');
  }
  const data = await res.json();
  return data.url;
}

export default function CreateHotelPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [ownedHotels, setOwnedHotels] = useState<Hotel[]>([]);
  const [autoCountry, setAutoCountry] = useState('');
  const [uploadedImages, setUploadedImages] = useState<Array<{
    file: File;
    preview: string;
    caption: string;
  }>>([]);

  const { register, handleSubmit, reset } = useForm<HotelCreationForm>();
  const { user } = useAuth();

  // Fetch owned hotels and cities on load
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch('/api/cities');
        if (!response.ok) throw new Error('Failed to fetch cities');
        const data = await response.json();
        setCities(data);
      } catch (error) {
        toast.error('Failed to load cities');
        console.error(error);
      }
    };

    const fetchOwnedHotels = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/hotels?ownerId=${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch hotels');
        const data = await response.json();
        setOwnedHotels(data);
      } catch (error) {
        toast.error('Failed to load your hotels');
        console.error(error);
      }
    };

    fetchCities();
    fetchOwnedHotels();
  }, [user?.id]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files).slice(0, 5); // Limit to 5 images
    
    // Create preview URLs
    const newImages = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      caption: ''
    }));
    
    setUploadedImages(prev => [...prev, ...newImages].slice(0, 5)); // Maintain max 5 images
  };

  // Update caption for an image
  const updateCaption = (index: number, caption: string) => {
    const newImages = [...uploadedImages];
    newImages[index].caption = caption;
    setUploadedImages(newImages);
  };

  // Remove an image
  const removeImage = (index: number) => {
    const newImages = [...uploadedImages];
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    setUploadedImages(newImages);
  };

  // Handle form submission
  const onSubmit = async (data: HotelCreationForm) => {
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setIsLoading(true);

    try {
      // Upload all images first
      const uploadPromises = uploadedImages.map(async img => {
        const url = await uploadImage(img.file);
        return {
          url,
          caption: img.caption
        };
      });

      const uploadedImageData = await Promise.all(uploadPromises);

      // Now create the hotel with the image URLs
      const hotelData = {
        ...data,
        images: uploadedImageData
      };

      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/hotels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(hotelData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create hotel');
      }

      const newHotel = await response.json();
      
      // Clear form and images
      reset();
      setUploadedImages([]);
      setAutoCountry('');
      
      toast.success('Hotel created successfully!');
      
      // Add the new hotel to the list
      setOwnedHotels(prev => [...prev, newHotel]);
    } catch (error) {
      console.error('Error creating hotel:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create hotel');
    } finally {
      setIsLoading(false);
    }
  };

  // Wrap the entire component with RoleProtectedRoute
  return (
      <div className="min-h-screen relative pt-16"> {/* Added pt-16 for navbar space */}
        <div className="fixed inset-0 top-16 bg-[url('/backgrounds/hotellight.webp')] dark:bg-[url('/backgrounds/hoteldark.webp')] bg-cover bg-center z-0"></div>
        <div className="fixed inset-0 top-16 bg-black/50 z-0"></div>
        <div className="relative z-1">
          <div className="container mx-auto py-8 px-4">
            {/* Owned Hotels Section */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-6 mb-8">
              <h1 className="text-2xl font-semibold mb-6 text-foreground">My Hotels</h1>
              <OwnedHotelsList hotels={ownedHotels} />
            </div>

            {/* Create Hotel Form */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-foreground">Create New Hotel</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic fields */}
                <div className="mb-2">
                  <input 
                    type="text" 
                    placeholder="Hotel Name" 
                    {...register('name', { required: true })}  // Changed from hotelName
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                  />
                </div>
                <div className="mb-2">
                  <textarea 
                    placeholder="Description" 
                    {...register('description', { required: true })} 
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
                    rows={4}
                  />
                </div>
                <div className="mb-2">
                  <input 
                    type="text" 
                    placeholder="Address" 
                    {...register('address', { required: true })} 
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                  />
                </div>
                {/* Replace City ID text input with select dropdown */}
                <div className="mb-2">
                  <select
                    {...register('cityId', { required: true })}
                    onChange={(e) => {
                      const selectedId = e.target.value
                      const selectedCity = cities.find(city => city.id === selectedId)
                      if (selectedCity) {
                        setAutoCountry(selectedCity.country)
                      } else {
                        setAutoCountry('')
                      }
                    }}
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  >
                    <option value="">Select City</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* New fields */}
                <div className="mb-2">
                  <input 
                    type="text" 
                    placeholder="Country" 
                    value={autoCountry}
                    disabled
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors opacity-50" 
                  />
                </div>
                <div className="mb-2">
                  <input 
                    type="text" 
                    placeholder="Postal Code" 
                    {...register('postalCode', { required: true })} 
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                  />
                </div>
                <div className="mb-2">
                  <input 
                    type="email" 
                    placeholder="Contact Email" 
                    {...register('contactEmail', { required: true })} 
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                  />
                </div>
                <div className="mb-2">
                  <input 
                    type="tel" 
                    placeholder="Contact Phone" 
                    {...register('contactPhone', { required: true })} 
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                  />
                </div>
                <div className="mb-2">
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="Rating" 
                    {...register('rating', { required: true, valueAsNumber: true })} 
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                  />
                </div>
                <div className="mb-2">
                  <input 
                    type="text" 
                    placeholder="Amenities (comma separated)" 
                    {...register('amenities', { required: true })} 
                    className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
                  />
                </div>
                {/* Replace the textarea with image upload section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label className="w-full flex flex-col items-center px-4 py-6 bg-background text-blue rounded-lg shadow-lg tracking-wide uppercase border border-input cursor-pointer hover:bg-gray-100 transition-colors">
                      <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04 .74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                      </svg>
                      <span className="mt-2 text-sm">Select Images</span>
                      <input 
                        type='file' 
                        className="hidden" 
                        multiple 
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>

                  {/* Image previews */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 rounded-b-lg">
                          <input
                            type="text"
                            placeholder="Add caption..."
                            value={img.caption}
                            onChange={(e) => updateCaption(index, e.target.value)}
                            className="w-full p-1 text-sm bg-transparent text-white placeholder:text-gray-300 border-none focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-primary hover:bg-primary-dark text-white p-3 rounded-md transition-colors"
                >
                  {isLoading ? "Creating..." : "Create Hotel"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
  )
}
