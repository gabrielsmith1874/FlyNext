"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/src/hooks/useAuth'
import { uploadImage } from '@/src/utils/uploadImage' // Ensure this is imported

interface ProfileFormData {
  name: string
  email: string
  image?: string
}

export default function ProfileSettingsPage() {
  const { user } = useAuth()
  const { register, handleSubmit, setValue } = useForm<ProfileFormData>()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedProfileImage, setUploadedProfileImage] = useState<File | null>(null)
  const [currentProfileImage, setCurrentProfileImage] = useState<string>('')
  const [previewImage, setPreviewImage] = useState<string>('')

  useEffect(() => {
    if (user) {
      setValue('email', user.email)
      fetchUserProfile();
    }
  }, [user, setValue])

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const profileData = await response.json();
        console.log('Fetched profile data:', profileData);
        setValue('name', profileData.firstName ? `${profileData.firstName} ${profileData.lastName || ''}`.trim() : '');
        setCurrentProfileImage(profileData.profilePicture || '');
        setPreviewImage(profileData.profilePicture || '');
      } else {
        console.error('Failed to fetch profile:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedProfileImage(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Add this log to check if the file is being captured
      console.log('Image file selected:', file.name, file.size);
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)

    try {
      let imageUrl = currentProfileImage;
      
      // Add this debug log
      console.log('Current profile image before upload:', currentProfileImage);
      console.log('Uploaded profile image file:', uploadedProfileImage);
      
      if (uploadedProfileImage) {
        try {
          console.log('Uploading image:', uploadedProfileImage.name);
          imageUrl = await uploadImage(uploadedProfileImage); // Updated usage
          console.log('Uploaded image URL:', imageUrl);
          
          // Set the current profile image to the new URL
          setCurrentProfileImage(imageUrl);
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('Failed to upload image. Using existing image.');
          // Don't update imageUrl if upload fails - keep the current one
        }
      }

      const nameParts = data.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const profileData = {
        firstName,
        lastName,
        email: data.email,
        profilePicture: imageUrl
      };
      
      console.log('Sending profile data:', profileData);

      const token = localStorage.getItem('token')
      const updateResponse = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const responseText = await updateResponse.text();
      console.log('Raw response:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response:', e);
      }
      
      if (!updateResponse.ok) {
        console.error('Profile update failed:', responseData || responseText);
        throw new Error((responseData && responseData.error) || 'Failed to update profile');
      }

      console.log('Profile update successful:', responseData);
      toast.success('Profile updated successfully');
      
      setCurrentProfileImage(imageUrl);
      
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      
      {previewImage && (
        <div className="mb-6 flex justify-center">
          <div className="w-32 h-32 rounded-full overflow-hidden">
            <img 
              src={previewImage} 
              alt="Profile Preview" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            {...register('name', { required: true })}
            type="text"
            className="w-full p-3 rounded-md border border-input focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            {...register('email', { required: true })}
            type="email"
            className="w-full p-3 rounded-md border border-input focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Profile Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full p-3 rounded-md border border-input focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}