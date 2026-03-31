'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'

export default function ConformityPage() {
  const router = useRouter()
  const params = useParams()
  const user = useAuthStore((s) => s.user)
  const printRef = useRef<HTMLDivElement>(null)

  const [isConform, setIsConform] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  const { data: order } = useQuery({
    queryKey: ['order', params.id],
    queryFn: async () => {
      const res = await api.get(`/orders/${params.id}`)
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

  const { data: existingReport } = useQuery({
    queryKey: ['conformity', params.id],
    queryFn: async () => {
      const res = await api.get(`/orders/${params.id}/conformity`)
      return res.data
    }
  })

  useEffect(() => {
    if (existingReport) {
      setIsConform(existingReport.isConform)
      setNotes(existingReport.notes || '')
      setSubmitted(true)
    }
  }, [existingReport])

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Conformite-${order?.serialNumber}`,
    onBeforePrint: () => new Promise<void>(resolve => setTimeout(resolve, 300))
  })

  const handleSubmit = async (conform: boolean) => {
    setLoading(true)
    setError('')
    try {
      await api.post(`/orders/${params.id}/conformity`, { isConform: conform, notes })
      setIsConform(conform)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save report')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !order) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/dashboard/orders/${params.id}`)}
              className="text-gray-400 hover:text-white transition-colors">← Back</button>
            <div className="w-px h-5 bg-gray-700" />
            <span className="text-white font-semibold">Contrôle qualité — {order.serialNumber}</span>
            <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded">Phase 8</span>
          </div>
          {submitted && (
            <button onClick={() => handlePrint()}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg">
              🖨 Print report
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-6 text-sm">{error}</div>
        )}

        {/* Engine summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Récapitulatif moteur</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">N° série</p><p className="text-white font-mono font-bold">{order.serialNumber}</p></div>
            <div><p className="text-gray-500">Client</p><p className="text-white">{order.clientName}</p></div>
            <div><p className="text-gray-500">Type</p><p className="text-white">{order.enclosureType}</p></div>
            <div><p className="text-gray-500">Commande</p><p className="text-white">{order.controlType?.replace('_', ' ')}</p></div>
          </div>

          {/* Components */}
          {order.components?.length > 0 && (
            <div className="mt-4 border-t border-gray-800 pt-4">
              <p className="text-gray-500 text-xs mb-2">Composants</p>
              <div className="space-y-1">
                {order.components.map((comp: any) => (
                  <div key={comp.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{comp.equipmentModel?.brand?.category?.replace('_', ' ')} — {comp.equipmentModel?.brand?.name} {comp.equipmentModel?.name}</span>
                    <span className="text-gray-600 font-mono">{comp.serialNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Conformity decision */}
        {!submitted ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Décision de conformité</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Observations / remarques</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Observations du contrôleur qualité..."
              />
            </div>

            <div className="flex gap-4">
              <button onClick={() => handleSubmit(true)} disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold py-4 rounded-xl text-lg transition-colors">
                ✓ CONFORME
              </button>
              <button onClick={() => handleSubmit(false)} disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold py-4 rounded-xl text-lg transition-colors">
                ✗ NON CONFORME
              </button>
            </div>
          </div>
        ) : (
          <div className={`rounded-xl p-6 border ${
            isConform
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <p className={`text-2xl font-bold mb-2 ${isConform ? 'text-green-400' : 'text-red-400'}`}>
              {isConform ? '✓ CONFORME' : '✗ NON CONFORME'}
            </p>
            <p className="text-gray-400 text-sm">{notes}</p>
            {!isConform && (
              <button onClick={() => setSubmitted(false)}
                className="mt-4 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg">
                Modifier la décision
              </button>
            )}
          </div>
        )}
      </main>

      {/* Hidden print document */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef} style={{ width: '210mm', minHeight: '297mm', padding: '20mm', background: 'white', fontFamily: 'sans-serif' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #111', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {docSettings?.logoUrl && <img src={docSettings.logoUrl} alt="Logo" style={{ height: '48px', objectFit: 'contain' }} />}
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{docSettings?.companyName || 'GenTrack'}</h1>
                {docSettings?.headerText && <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>{docSettings.headerText}</p>}
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#666' }}>{new Date().toLocaleDateString('fr-DZ')}</p>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', border: '2px solid #111', display: 'inline-block', padding: '8px 32px', textTransform: 'uppercase', letterSpacing: '2px' }}>
              {isConform ? 'Certificat de Conformité' : 'Rapport de Non-Conformité'}
            </h2>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>N° {order.serialNumber}</p>
          </div>

          {/* Result badge */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{
              fontSize: '24px', fontWeight: 'bold', padding: '12px 32px', borderRadius: '8px',
              background: isConform ? '#dcfce7' : '#fee2e2',
              color: isConform ? '#166534' : '#991b1b',
              border: `2px solid ${isConform ? '#16a34a' : '#dc2626'}`
            }}>
              {isConform ? '✓ CONFORME' : '✗ NON CONFORME'}
            </span>
          </div>

          {/* Engine details */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
            <tbody>
              {[
                ['N° série', order.serialNumber],
                ['Client', order.clientName],
                ['Type', order.enclosureType],
                ['Commande', order.controlType?.replace('_', ' ')],
                ['Date', new Date(order.createdAt).toLocaleDateString('fr-DZ')],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', color: '#666', width: '160px' }}>{label}</td>
                  <td style={{ padding: '8px', fontWeight: '600' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {notes && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>Observations</p>
              <p style={{ fontSize: '13px', margin: 0 }}>{notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '48px' }}>
            {['Inspecteur qualité', 'Responsable production'].map(role => (
              <div key={role} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '48px' }}>{role}</p>
                <div style={{ borderTop: '1px solid #999', paddingTop: '4px' }}>
                  <p style={{ fontSize: '11px', color: '#999' }}>Signature et cachet</p>
                </div>
              </div>
            ))}
          </div>

          {docSettings?.footerText && (
            <div style={{ borderTop: '1px solid #eee', marginTop: '32px', paddingTop: '16px', textAlign: 'center', fontSize: '11px', color: '#999' }}>
              {docSettings.footerText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}