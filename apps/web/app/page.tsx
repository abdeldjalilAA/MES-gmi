'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

export default function Home() {
  const router = useRouter()
  const { user, setAuth } = useAuthStore()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Load from localStorage first
    const token = localStorage.getItem('token')
    const stored = localStorage.getItem('user')
    if (token && stored) {
      const parsedUser = JSON.parse(stored)
      setAuth(parsedUser, token)
      if (['OPERATOR', 'PHASE_SUPERVISOR'].includes(parsedUser.role)) {
        router.push('/operator')
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/login')
    }
    setChecked(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )
}