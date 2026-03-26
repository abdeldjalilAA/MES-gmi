'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import { socket } from '@/lib/socket'
import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { OrderFabricationDoc } from '@/components/documents/OrderFabricationDoc'
import { QRLabelDoc } from '@/components/documents/QRLabelDoc'
const PHASE_NAMES: Record<number, string> = {
  1: 'Iron / Tôle Transformation',
  2: 'Welding + Rouleuse + Cisaille',
  3: 'Powder Coating (Peinture Poudre)',
  4: 'Painting — Chassis & Exhaust',
  5: 'Wiring + Câblage + Control Panel',
  6: 'Assembly (Assemblage)',
  7: 'Testing (Mise en Test)',
  8: 'QC + Warranty + Delivery',
}

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
  BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const statusDot: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  BLOCKED: 'bg-red-500',
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', params.id],
    queryFn: async () => {
      const res = await api.get(`/orders/${params.id}`)
      return res.data
    }
  })
  const printLabelRef = useRef<HTMLDivElement>(null)
  const handlePrintLabel = useReactToPrint({
    contentRef: printLabelRef,
    documentTitle: `Label-${order?.serialNumber}`,
    onBeforePrint: () => {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 500)
      })
    }
  })

  // Socket.io — real-time phase updates
  useEffect(() => {
    if (!order?.id) return

    socket.connect()
    socket.emit('join-order', order.id)

    socket.on('phase-updated', () => {
      refetch()
    })

    return () => {
      socket.off('phase-updated')
      socket.disconnect()
    }
  }, [order?.id])

  const handlePhaseAction = async (orderId: string, phaseNumber: number, action: string) => {
    try {
      await api.post(`/orders/${orderId}/phases/${phaseNumber}/entry`, { action })
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed')
    }
  }
  const printRef = useRef<HTMLDivElement>(null)
 const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ordre-Fabrication-${order?.serialNumber}`,
    onBeforePrint: () => {
      return new Promise<void>((resolve) => {
        // Give JsBarcode time to render before printing
        setTimeout(resolve, 500)
      })
    }
  })

const { data: docSettings } = useQuery({
    queryKey: ['doc-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/document-settings')
      return res.data
    }
  })



  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Order not found</div>
      </div>
    )
  }
  

  const completedPhases = order.productionPhases?.filter((p: any) => p.status === 'COMPLETED').length

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <div className="w-px h-5 bg-gray-700" />
            <span className="text-white font-semibold">{order.serialNumber}</span>
          </div>
          <span className={`text-xs border px-2 py-1 rounded-md ${statusColor[order.status]}`}>
            {order.status}
          </span>
             {['SUPER_ADMIN', 'ADMIN', 'COMMERCIAL_AGENT', 'PROCUREMENT_AGENT'].includes(user.role) && (
              <button
                onClick={() => router.push(`/dashboard/orders/${params.id}/edit`)}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                ✏ Edit
              </button>
            )}
           <button
              onClick={() => handlePrint()}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              🖨 Print document
            </button>
            <button
              onClick={() => handlePrintLabel()}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              🏷 Print label
            </button>
            
        </div>
       
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Order header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-500 text-xs mb-1">Client</p>
            <p className="text-white font-semibold">{order.clientName}</p>
            {order.clientPhone && <p className="text-gray-400 text-sm mt-1">{order.clientPhone}</p>}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-500 text-xs mb-1">Engine specification</p>
            <p className="text-white font-semibold">{order.enclosureType}</p>
            <p className="text-gray-400 text-sm">{order.controlType?.replace('_', ' ')}</p>
            {order.requirements && <p className="text-gray-500 text-xs mt-1 truncate">{order.requirements}</p>}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-500 text-xs mb-1">Progress</p>
            <p className="text-white font-semibold">{completedPhases} / 8 phases completed</p>
            <div className="flex gap-1 mt-2">
              {order.productionPhases?.map((phase: any) => (
                <div
                  key={phase.phaseNumber}
                  className={`h-1.5 flex-1 rounded-full ${
                    phase.status === 'COMPLETED' ? 'bg-green-500' :
                    phase.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                    phase.status === 'BLOCKED' ? 'bg-red-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          {order.qrCode && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center">
              <p className="text-gray-500 text-xs mb-3">QR Code</p>
              <img src={order.qrCode} alt="QR Code" className="w-32 h-32" />
              <p className="text-gray-600 text-xs mt-2 font-mono">{order.serialNumber}</p>
            </div>
          )}
        </div>

        {/* Components */}
        {order.components?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="text-white font-semibold mb-3">Components</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {order.components.map((comp: any) => (
                <div key={comp.id} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-500 text-xs">{comp.equipmentModel?.brand?.category?.replace('_', ' ')}</p>
                  <p className="text-white text-sm font-medium">
                    {comp.equipmentModel?.brand?.name} {comp.equipmentModel?.name}
                  </p>
                  <p className="text-gray-400 text-xs font-mono mt-1">{comp.serialNumber}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phases */}
        <h2 className="text-white font-semibold text-lg mb-4">Production Phases</h2>
        <div className="space-y-3">
          {order.productionPhases?.map((phase: any) => (
            <div key={phase.phaseNumber} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${statusDot[phase.status]}`} />
                  <div>
                    <span className="text-gray-400 text-sm mr-2">Phase {phase.phaseNumber}</span>
                    <span className="text-white font-medium">{PHASE_NAMES[phase.phaseNumber]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs border px-2 py-1 rounded-md ${statusColor[phase.status]}`}>
                    {phase.status}
                  </span>
                  {phase.status === 'PENDING' && (
                    <button
                      onClick={() => handlePhaseAction(order.id, phase.phaseNumber, 'started')}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Start
                    </button>
                  )}
                  {phase.status === 'IN_PROGRESS' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePhaseAction(order.id, phase.phaseNumber, 'completed')}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handlePhaseAction(order.id, phase.phaseNumber, 'blocked')}
                        className="text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 px-3 py-1 rounded-lg transition-colors"
                      >
                        Block
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {phase.startedAt && (
                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  <span>Started: {new Date(phase.startedAt).toLocaleString()}</span>
                  {phase.completedAt && (
                    <span>Completed: {new Date(phase.completedAt).toLocaleString()}</span>
                  )}
                  {phase.delayMinutes !== null && phase.delayMinutes !== undefined && (
                    <span>Duration: {phase.delayMinutes} min</span>
                  )}
                </div>
              )}

              {/* Phase entries log */}
              {phase.entries?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {phase.entries.map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      <span className="text-gray-400">{entry.operator?.name}</span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        entry.action === 'completed' ? 'bg-green-500/10 text-green-400' :
                        entry.action === 'started' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>{entry.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
      </main>
       {/* Print document — off screen */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
       <OrderFabricationDoc ref={printRef} order={order} companySettings={docSettings} />
      </div>
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <QRLabelDoc ref={printLabelRef} order={order} companySettings={docSettings} />
        </div>
    </div>
  )
}