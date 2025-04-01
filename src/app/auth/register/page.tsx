"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { UserPlusIcon } from '@heroicons/react/24/outline'

interface RegisterForm {
  email: string
  password: string
  firstName: string
  lastName: string
  passportId: string
  phone?: string
}

export default function Register() {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterForm>()
  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, role: 'HOTEL_OWNER' }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed')
      }

      // Store token
      localStorage.setItem('token', result.token)
      
      toast.success('Registration successful')
      router.push('/')
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80')] dark:opacity-0 opacity-100 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&q=80')] dark:opacity-100 opacity-0 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-white/90 dark:bg-black/90" />
      </div>

      <div className="relative z-10 max-w-md mx-auto pt-16 px-4">
        <div className="flex flex-col items-center mb-8">
          <UserPlusIcon className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-2">Join FlyNext today</p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm p-8 rounded-lg shadow-lg border border-border">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                First Name
              </label>
              <input
                {...register('firstName', { required: 'First name is required' })}
                type="text"
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Enter your first name"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Last Name
              </label>
              <input
                {...register('lastName', { required: 'Last name is required' })}
                type="text"
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Enter your last name"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email format'
                  }
                })}
                type="email"
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  }
                })}
                type="password"
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Create a password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Passport ID
              </label>
              <input
                {...register('passportId', {
                  required: 'Passport ID is required',
                  minLength: {
                    value: 9,
                    message: 'Passport ID must be 9 characters'
                  },
                  maxLength: {
                    value: 9,
                    message: 'Passport ID must be 9 characters'
                  }
                })}
                type="text"
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Enter your passport ID"
              />
              {errors.passportId && (
                <p className="mt-1 text-sm text-destructive">{errors.passportId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone (Optional)
              </label>
              <input
                {...register('phone', {
                  pattern: {
                    value: /^\+?[\d\s-]{10,}$/,
                    message: 'Invalid phone number format'
                  }
                })}
                type="tel"
                className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Enter your phone number"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-primary hover:text-primary/90 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}