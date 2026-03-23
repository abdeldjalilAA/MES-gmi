'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

const PHASE_NAMES: Record<number, string> = {
  1: 'Iron / Tôle Transformation',
  2: 'Welding + Rouleuse + Cisaille',
  3: 'Powder Coating',
  4: 'Painting — Chassis & Exhaust',
  5: 'Wiring + Câblage + Control Panel',
  6: 'Assembly',
  7: 'Testing',
  8: 'QC + Warranty + Delivery',
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
  BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function ScanPage() {
  const params = useParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // Use a temp token from localStorage if available, otherwise public endpoint
        const res = await api.get(`/orders/serial/${params.serial}`)
        setOrder(res.data)
      } catch (err: any) {
        setError('Engine not found')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [params.serial])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  if (error || !order) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-lg">{error}</p>
        <p className="text-gray-600 text-sm mt-2">Serial: {params.serial}</p>
      </div>
    </div>
  )

  const completedPhases = order.productionPhases?.filter((p: any) => p.status === 'COMPLETED').length

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-white font-semibold">GenTrack</span>
          </div>
          <p className="text-gray-500 text-sm">Engine traceability report</p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-8">

        {/* Engine info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{order.serialNumber}</h1>
              <p className="text-gray-400 mt-1">{order.clientName}</p>
            </div>
            <span className={`text-xs border px-2 py-1 rounded-md ${statusColor[order.status]}`}>
              {order.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Enclosure</p>
              <p className="text-white">{order.enclosureType}</p>
            </div>
            <div>
              <p className="text-gray-500">Control</p>
              <p className="text-white">{order.controlType?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500">Created</p>
              <p className="text-white">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Progress</p>
              <p className="text-white">{completedPhases}/8 phases</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {order.productionPhases?.map((phase: any) => (
              <div key={phase.phaseNumber}
                className={`h-2 flex-1 rounded-full ${
                  phase.status === 'COMPLETED' ? 'bg-green-500' :
                  phase.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                  phase.status === 'BLOCKED' ? 'bg-red-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Components */}
        {order.components?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-white font-semibold mb-4">Components</h2>
            <div className="space-y-2">
              {order.components.map((comp: any) => (
                <div key={comp.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-white text-sm">
                      {comp.equipmentModel?.brand?.name} — {comp.equipmentModel?.name}
                    </p>
                    <p className="text-gray-500 text-xs">{comp.equipmentModel?.brand?.category}</p>
                  </div>
                  <p className="text-gray-400 text-sm font-mono">{comp.serialNumber}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase history */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Production history</h2>
          <div className="space-y-4">
            {order.productionPhases?.map((phase: any) => (
              <div key={phase.phaseNumber}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      phase.status === 'COMPLETED' ? 'bg-green-500' :
                      phase.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                      phase.status === 'BLOCKED' ? 'bg-red-500' : 'bg-gray-600'
                    }`} />
                    <span className="text-white text-sm font-medium">
                      Phase {phase.phaseNumber} — {PHASE_NAMES[phase.phaseNumber]}
                    </span>
                  </div>
                  <span className={`text-xs border px-2 py-0.5 rounded ${statusColor[phase.status]}`}>
                    {phase.status}
                  </span>
                </div>

                {phase.entries?.length > 0 && (
                  <div className="ml-4 space-y-1">
                    {phase.entries.map((entry: any) => (
                      <div key={entry.id} className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="text-gray-600">{new Date(entry.createdAt).toLocaleString()}</span>
                        <span className="text-gray-400">{entry.operator?.name}</span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          entry.action === 'completed' ? 'bg-green-500/10 text-green-400' :
                          entry.action === 'started' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>{entry.action}</span>
                        {phase.delayMinutes && entry.action === 'completed' && (
                          <span className="text-gray-600">{phase.delayMinutes} min</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}