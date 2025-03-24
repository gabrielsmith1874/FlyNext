"use client"

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { CalendarIcon, CreditCardIcon } from '@heroicons/react/24/outline'

interface CheckoutForm {
  fullName: string
  email: string
  address: string
  paymentMethod: string
}

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [itinerary, setItinerary] = useState<any>(null)
  const { register, handleSubmit } = useForm<CheckoutForm>()

  useEffect(() => {
    // Assume itinerary id is stored in localStorage
    const itineraryId = localStorage.getItem('itineraryId')
    if (itineraryId) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      fetch(`${baseUrl}/api/itineraries/${itineraryId}`)
        .then(res => res.json())
        .then(data => setItinerary(data))
        .catch(() => toast.error('Failed to load itinerary'))
    }
  }, [])

  const onSubmit = async (data: CheckoutForm) => {
    setIsLoading(true)
    // ...simulate backend call...
    setTimeout(() => {
      toast.success('Checkout completed!')
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80')] dark:opacity-0 opacity-100 bg-cover bg-center transition-opacity duration-500" />
        <div className="absolute inset-0 bg-white/90 dark:bg-black/90" />
      </div>

      <div className="relative z-10 container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-foreground mb-6">Checkout</h1>
        {/* Itinerary Section */}
        {itinerary && (
          <div className="mb-8 bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border p-6">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Your Itinerary</h2>
            {itinerary.purchases && itinerary.purchases.length > 0 ? (
              <ul className="space-y-2">
                {itinerary.purchases.map((item: any, idx: number) => (
                  <li key={idx} className="p-3 border border-border rounded-md">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">${item.price}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No purchases found.</p>
            )}
          </div>
        )}

        <div className="bg-card/50 backdrop-blur-sm rounded-lg shadow-lg border border-border p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
              <input {...register('fullName', { required: true })} type="text" placeholder="John Doe" className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input {...register('email', { required: true })} type="email" placeholder="john@example.com" className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Address</label>
              <input {...register('address', { required: true })} type="text" placeholder="123 Main St" className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Payment Method</label>
              <div className="relative">
                <select {...register('paymentMethod', { required: true })} className="w-full p-3 rounded-md bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                  <option value="">Select payment method</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">MasterCard</option>
                  <option value="paypal">PayPal</option>
                </select>
                <CreditCardIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center">
              {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <>Complete Checkout</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
