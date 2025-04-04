'use client';
import { useEffect } from 'react';
import { getToken } from '@/lib/auth-helpers';
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/src/components/theme-provider'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/src/components/navbar'
import './globals.css'
import { AuthProvider } from '@/src/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Log authentication status on client side
    const token = getToken();
    console.log(`Auth Status: ${token ? 'Authenticated' : 'Not authenticated'}`);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster position="bottom-right" />
            <Navbar />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}