'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

useEffect(() => {
    if (!user) router.push('/login')
    if (user && ['OPERATOR', 'PHASE_SUPERVISOR'].includes(user.role)) {
      router.push('/operator')
    }
  }, [user, router])

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders')
      return res.data
    }
  })
  const { data: docSettings } = useQuery({
    queryKey: ['doc-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/document-settings')
      return res.data
    }
  })

  if (!user) return null

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
    BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
           <div className="flex items-center gap-3">
            {docSettings?.logoUrl ? (
              <img src={docSettings.logoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
            )}
            <span className="text-white font-semibold text-lg">
              {docSettings?.companyName || 'GenTrack'}
            </span>
          </div>
            <span className="text-white font-semibold text-lg"></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user.name}</span>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-md">
              {user.role.replace('_', ' ')}
            </span>
            <button
              onClick={() => router.push('/dashboard/archive')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => router.push('/dashboard/machines')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Machines
            </button>
           {['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
              <button
                onClick={() => router.push('/dashboard/admin')}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => { logout(); router.push('/login') }}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Production Orders</h1>
            <p className="text-gray-400 mt-1">Track all engine production in real time</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/orders/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Order
          </button>
        </div>

        {isLoading ? (
          <div className="text-gray-400 text-center py-20">Loading orders...</div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No orders yet</p>
            <p className="text-gray-600 text-sm mt-2">Create your first production order to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders?.map((order: any) => (
              <div
                key={order.id}
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 cursor-pointer hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-semibold text-lg">{order.serialNumber}</span>
                      <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                        {order.engineType}
                      </span>
                    </div>
                    <p className="text-gray-400">{order.clientName}</p>
                  </div>
                  <span className={`text-xs border px-2 py-1 rounded-md ${statusColor[order.status] || 'bg-gray-800 text-gray-400'}`}>
                    {order.status}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex gap-1">
                    {order.productionPhases?.map((phase: any) => (
                      <div
                        key={phase.phaseNumber}
                        className={`h-2 flex-1 rounded-full ${
                          phase.status === 'COMPLETED' ? 'bg-green-500' :
                          phase.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                          phase.status === 'BLOCKED' ? 'bg-red-500' :
                          'bg-gray-700'
                        }`}
                        title={`Phase ${phase.phaseNumber}: ${phase.status}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-600">Phase 1</span>
                    <span className="text-xs text-gray-600">Phase 8</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>Created {new Date(order.createdAt).toLocaleDateString()}</span>
                  <span>{order._count?.components} components registered</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}