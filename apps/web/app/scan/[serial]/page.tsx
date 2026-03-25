'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { useReactToPrint } from 'react-to-print'

const PHASE_NAMES: Record<number, string> = {
  1: 'Transformation tôle / fer',
  2: 'Soudure + Rouleuse + Cisaille',
  3: 'Peinture poudre',
  4: 'Peinture châssis & échappement',
  5: 'Câblage + tableau de commande',
  6: 'Assemblage',
  7: 'Test & mise en service',
  8: 'Contrôle qualité + livraison',
}

const statusBg: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  BLOCKED: 'bg-red-500',
}

const statusColor: Record<string, string> = {
  PENDING: 'text-yellow-400',
  IN_PROGRESS: 'text-blue-400',
  COMPLETED: 'text-green-400',
  BLOCKED: 'text-red-400',
}

export default function ScanPage() {
  const params = useParams()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const barcodeRef = useRef<SVGSVGElement>(null)
  const printLabelRef = useRef<HTMLDivElement>(null)

  const handlePrintLabel = useReactToPrint({
    contentRef: printLabelRef,
    documentTitle: `Label-${params.serial}`,
  })

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`http://localhost:3001/public/scan/${params.serial}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setOrder(data)
      } catch {
        setError('Engine not found')
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [params.serial])

  useEffect(() => {
    if (order && barcodeRef.current) {
      JsBarcode(barcodeRef.current, order.serialNumber, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
        margin: 4,
        background: 'transparent',
        lineColor: '#ffffff'
      })
    }
  }, [order])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  if (error || !order) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-lg mb-2">Engine not found</p>
        <p className="text-gray-600 text-sm font-mono">{params.serial}</p>
      </div>
    </div>
  )

  const completedPhases = order.productionPhases?.filter((p: any) => p.status === 'COMPLETED').length

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <p className="text-white font-semibold">GenTrack</p>
              <p className="text-gray-500 text-xs">Engine traceability</p>
            </div>
          </div>
          <button
            onClick={() => handlePrintLabel()}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-2 rounded-lg transition-colors"
          >
            🖨 Print label
          </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">

        {/* Engine card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-500 text-xs mb-1">Serial number</p>
              <h1 className="text-2xl font-bold text-white font-mono">{order.serialNumber}</h1>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full border ${
              order.status === 'DELIVERED'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {order.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <p className="text-gray-500 text-xs">Client</p>
              <p className="text-white">{order.clientName}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Type</p>
              <p className="text-white">{order.enclosureType} — {order.controlType?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Created</p>
              <p className="text-white">{new Date(order.createdAt).toLocaleDateString('fr-DZ')}</p>
            </div>
            {order.deliveredAt && (
              <div>
                <p className="text-gray-500 text-xs">Delivered</p>
                <p className="text-white">{new Date(order.deliveredAt).toLocaleDateString('fr-DZ')}</p>
              </div>
            )}
          </div>

          {/* Barcode */}
          <div className="flex justify-center mt-3">
            <svg ref={barcodeRef} />
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Production progress</span>
              <span>{completedPhases}/8 phases</span>
            </div>
            <div className="flex gap-1">
              {order.productionPhases?.map((p: any) => (
                <div key={p.phaseNumber} className={`h-2 flex-1 rounded-full ${statusBg[p.status] || 'bg-gray-700'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Warranty */}
        {order.warranty && (
          <div className={`rounded-2xl p-5 border ${
            new Date(order.warranty.endDate) > new Date()
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <p className={`font-medium mb-2 ${new Date(order.warranty.endDate) > new Date() ? 'text-green-400' : 'text-red-400'}`}>
              {new Date(order.warranty.endDate) > new Date() ? '✓ Warranty active' : '✗ Warranty expired'}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Start</p>
                <p className="text-white">{new Date(order.warranty.startDate).toLocaleDateString('fr-DZ')}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">End</p>
                <p className="text-white">{new Date(order.warranty.endDate).toLocaleDateString('fr-DZ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Components */}
        {order.components?.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-3">Components</h2>
            <div className="space-y-2">
              {order.components.map((comp: any) => (
                <div key={comp.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-white text-sm">
                      {comp.equipmentModel?.brand?.name} {comp.equipmentModel?.name}
                    </p>
                    <p className="text-gray-500 text-xs">{comp.equipmentModel?.brand?.category?.replace('_', ' ')}</p>
                  </div>
                  <p className="text-gray-400 text-sm font-mono">{comp.serialNumber}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase history */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Production history</h2>
          <div className="space-y-4">
            {order.productionPhases?.map((phase: any) => (
              <div key={phase.phaseNumber}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusBg[phase.status] || 'bg-gray-600'}`} />
                    <span className="text-white text-sm font-medium">
                      Phase {phase.phaseNumber} — {PHASE_NAMES[phase.phaseNumber]}
                    </span>
                  </div>
                  <span className={`text-xs ${statusColor[phase.status]}`}>{phase.status}</span>
                </div>
                {phase.entries?.length > 0 && (
                  <div className="ml-4 space-y-1 mt-1">
                    {phase.entries.map((entry: any) => (
                      <div key={entry.id} className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{new Date(entry.createdAt).toLocaleString('fr-DZ')}</span>
                        <span className="text-gray-400">{entry.operator?.name}</span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          entry.action === 'completed' ? 'bg-green-500/10 text-green-400' :
                          entry.action === 'started' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>{entry.action}</span>
                        {phase.delayMinutes && entry.action === 'completed' && (
                          <span>{phase.delayMinutes} min</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {phase.status === 'PENDING' && phase.entries?.length === 0 && (
                  <p className="ml-4 text-gray-600 text-xs mt-1">Not started yet</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Hidden print label */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <PrintLabel ref={printLabelRef} order={order} />
      </div>
    </div>
  )
}

import { forwardRef } from 'react'

const PrintLabel = forwardRef<HTMLDivElement, { order: any }>(({ order }, ref) => {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, order.serialNumber, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 8,
        background: '#ffffff',
        lineColor: '#000000'
      })
    }
  }, [order])

  return (
    <div ref={ref} style={{
      width: '210mm',
      minHeight: '100mm',
      padding: '16mm',
      background: 'white',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px'
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111', margin: 0 }}>
        {order.clientName}
      </h2>
      <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>
        {order.enclosureType} — {order.controlType?.replace('_', ' ')}
      </p>

      {/* QR code */}
      {order.qrCode && (
        <img src={order.qrCode} alt="QR" style={{ width: '100px', height: '100px' }} />
      )}

      {/* Barcode */}
      <svg ref={barcodeRef} />

      <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
        {new Date(order.createdAt).toLocaleDateString('fr-DZ')}
      </p>
    </div>
  )
})
PrintLabel.displayName = 'PrintLabel'