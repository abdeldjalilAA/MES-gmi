'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import { socket } from '@/lib/socket'

const PHASE_NAMES: Record<number, string> = {
  1: 'Transformation tôle',
  2: 'Soudure + Rouleuse',
  3: 'Peinture poudre',
  4: 'Peinture châssis',
  5: 'Câblage + tableau',
  6: 'Assemblage',
  7: 'Test & mise en service',
  8: 'Contrôle qualité',
}

export default function OperatorPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const queryClient = useQueryClient()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['operator-orders'],
    queryFn: async () => {
      const res = await api.get('/operator/orders')
      return res.data
    },
    refetchInterval: 30000 // auto refresh every 30s
  })

  // Real-time updates
  useEffect(() => {
    socket.connect()
    socket.on('phase-updated', () => refetch())
    return () => {
      socket.off('phase-updated')
      socket.disconnect()
    }
  }, [])

  const handleAction = async (orderId: string, phaseNumber: number, action: string) => {
    const key = `${orderId}-${phaseNumber}-${action}`
    setLoadingAction(key)
    try {
      await api.post(`/orders/${orderId}/phases/${phaseNumber}/entry`, { action })
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed')
    } finally {
      setLoadingAction(null)
    }
  }

  if (!user) return null

  // Flatten all phases that need action across all orders
  const activePhasesWithOrders = orders?.flatMap((order: any) =>
    order.productionPhases
      .filter((p: any) => p.status === 'PENDING' || p.status === 'IN_PROGRESS' || p.status === 'BLOCKED')
      .map((p: any) => ({ ...p, order }))
  ) || []

  // Separate in-progress from pending
  const inProgress = activePhasesWithOrders.filter((p: any) => p.status === 'IN_PROGRESS')
  const pending = activePhasesWithOrders.filter((p: any) => p.status === 'PENDING')
  const blocked = activePhasesWithOrders.filter((p: any) => p.status === 'BLOCKED')

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{user.name}</p>
              <p className="text-gray-500 text-xs">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push('/login') }}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="px-4 py-6 max-w-2xl mx-auto">

        {isLoading ? (
          <div className="text-center py-20 text-gray-500">Loading...</div>
        ) : activePhasesWithOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <p className="text-white font-semibold">All caught up</p>
            <p className="text-gray-500 text-sm mt-1">No active phases right now</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* IN PROGRESS — shown first and prominently */}
            {inProgress.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-blue-400 text-sm font-medium">In progress ({inProgress.length})</span>
                </div>
                <div className="space-y-3">
                  {inProgress.map((phase: any) => (
                    <PhaseCard
                      key={`${phase.order.id}-${phase.phaseNumber}`}
                      phase={phase}
                      onAction={handleAction}
                      loadingAction={loadingAction}
                      highlight
                    />
                  ))}
                </div>
              </div>
            )}

            {/* BLOCKED */}
            {blocked.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-400 text-sm font-medium">Blocked ({blocked.length})</span>
                </div>
                <div className="space-y-3">
                  {blocked.map((phase: any) => (
                    <PhaseCard
                      key={`${phase.order.id}-${phase.phaseNumber}`}
                      phase={phase}
                      onAction={handleAction}
                      loadingAction={loadingAction}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* PENDING */}
            {pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-yellow-400 text-sm font-medium">Waiting to start ({pending.length})</span>
                </div>
                <div className="space-y-3">
                  {pending.map((phase: any) => (
                    <PhaseCard
                      key={`${phase.order.id}-${phase.phaseNumber}`}
                      phase={phase}
                      onAction={handleAction}
                      loadingAction={loadingAction}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}

function PhaseCard({ phase, onAction, loadingAction, highlight }: {
  phase: any
  onAction: (orderId: string, phaseNumber: number, action: string) => void
  loadingAction: string | null
  highlight?: boolean
}) {
  const isLoading = (action: string) =>
    loadingAction === `${phase.order.id}-${phase.phaseNumber}-${action}`

  return (
    <div className={`rounded-2xl p-5 border ${
      highlight
        ? 'bg-blue-600/10 border-blue-500/30'
        : phase.status === 'BLOCKED'
        ? 'bg-red-600/10 border-red-500/30'
        : 'bg-gray-900 border-gray-800'
    }`}>

      {/* Order info */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white font-bold text-lg font-mono">{phase.order.serialNumber}</p>
          <p className="text-gray-400 text-sm">{phase.order.clientName}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs">Phase</p>
          <p className="text-white font-bold text-2xl">{phase.phaseNumber}</p>
        </div>
      </div>

      {/* Phase name */}
      <p className="text-gray-300 font-medium mb-4">{PHASE_NAMES[phase.phaseNumber]}</p>

      {/* Time info */}
      {phase.startedAt && (
        <p className="text-gray-500 text-xs mb-4">
          Started {new Date(phase.startedAt).toLocaleString()}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {phase.status === 'PENDING' && (
          <button
            onClick={() => onAction(phase.order.id, phase.phaseNumber, 'started')}
            disabled={!!loadingAction}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-4 rounded-xl text-lg transition-colors"
          >
            {isLoading('started') ? '...' : '▶ Start'}
          </button>
        )}

        {(phase.status === 'IN_PROGRESS' || phase.status === 'BLOCKED') && (
          <>
            <button
              onClick={() => onAction(phase.order.id, phase.phaseNumber, 'completed')}
              disabled={!!loadingAction}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold py-4 rounded-xl text-lg transition-colors"
            >
              {isLoading('completed') ? '...' : '✓ Complete'}
            </button>
            <button
              onClick={() => onAction(phase.order.id, phase.phaseNumber, 'blocked')}
              disabled={!!loadingAction}
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-medium py-4 px-4 rounded-xl transition-colors"
            >
              {isLoading('blocked') ? '...' : '⚠'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}