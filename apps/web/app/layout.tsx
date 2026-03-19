'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Inter } from 'next/font/google'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const queryClient = new QueryClient()

function AuthLoader({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (token && user) {
      setAuth(JSON.parse(user), token)
    }
  }, [])

  return <>{children}</>
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthLoader>
            {children}
          </AuthLoader>
        </QueryClientProvider>
      </body>
    </html>
  )
}