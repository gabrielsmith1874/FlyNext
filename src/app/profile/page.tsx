"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { UserIcon, KeyIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'



interface ProfileForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  profilePicture?: string // Add this field to include profile image
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Client-side API functions using fetch
async function getProfileClient() {
  const token = localStorage.getItem('token')
  const response = await fetch('/api/auth/profile', {
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      }
  })
  if (!response.ok) throw new Error('Failed to fetch profile')
  return response.json()
}

async function updateProfileClient(data: ProfileForm) {
  const token = localStorage.getItem('token')
  const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error('Failed to update profile')
  return response.json()
}

async function updatePasswordClient(data: { currentPassword: string, newPassword: string }) {
  const token = localStorage.getItem('token')
  const response = await fetch('/api/auth/profile', {
      method: 'PUT', // changed from 'POST' to 'PUT'
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error('Failed to update password')
  return response.json()
}

export default function Profile() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  
  const { register: registerProfile, handleSubmit: handleSubmitProfile, reset } = useForm<ProfileForm>()
  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors }, watch } = useForm<PasswordForm>()
  
  const newPassword = watch('newPassword')
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfileClient();
        reset(data);
        setProfileImage(data.profilePicture); // Use the correct property name
        setIsLoading(false);
      } catch (error) {
        console.error('Profile loading error:', error);
        
        if ((error as any)?.response?.status === 401) {
          localStorage.removeItem('token');
          toast.error('Session expired. Please login again.');
          router.push('/auth/login');
        } else {
          toast.error('Failed to load profile');
          setIsLoading(false);
        }
      }
    };

    fetchProfile();
  }, [reset, router])

  const onSubmitProfile = async (data: ProfileForm) => {
    try {
      // Include the profileImage in the data sent to the API
      const updatedData = {
        ...data,
        profilePicture: profileImage || undefined
      };
      await updateProfileClient(updatedData)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const onSubmitPassword = async (data: PasswordForm) => {
    try {
      await updatePasswordClient({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
      toast.success('Password updated successfully')
    } catch (error) {
      toast.error('Failed to update password')
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80')] dark:opacity-0 opacity-100 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&q=80')] dark:opacity-100 opacity-0 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-white/90 dark:bg-black/90" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto pt-8 px-4">
        <div className="flex items-center space-x-3 mb-8">
          <UserIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border overflow-hidden">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'details'
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Profile Details
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === 'password'
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Change Password
              </button>
            </div>

            <div className="p-8">
              {activeTab === 'details' ? (
                <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-muted">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <PhotoIcon className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <label
                        htmlFor="profile-image"
                        className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        <PhotoIcon className="w-5 h-5" />
                      </label>
                      <input
                        type="file"
                        id="profile-image"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        First Name
                      </label>
                      <input
                        {...registerProfile('firstName')}
                        type="text"
                        className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Last Name
                      </label>
                      <input
                        {...registerProfile('lastName')}
                        type="text"
                        className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <input
                      {...registerProfile('email')}
                      type="email"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone
                    </label>
                    <input
                      {...registerProfile('phone')}
                      type="tel"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Current Password
                    </label>
                    <input
                      {...registerPassword('currentPassword', { required: 'Current password is required' })}
                      type="password"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    {errors.currentPassword && (
                      <p className="mt-1 text-sm text-destructive">{errors.currentPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      New Password
                    </label>
                    <input
                      {...registerPassword('newPassword', {
                        required: 'New password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters'
                        }
                      })}
                      type="password"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-destructive">{errors.newPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Confirm New Password
                    </label>
                    <input
                      {...registerPassword('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: value =>
                          value === newPassword || 'The passwords do not match'
                      })}
                      type="password"
                      className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Update Password
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}