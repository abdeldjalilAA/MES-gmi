'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'

const ENCLOSURE_TYPES = ['STANDARD', 'INSONORISE']
const CONTROL_TYPES = ['MANUEL', 'AUTO', 'INVERSEUR_SEPARE']

const DEFAULT_COMPONENTS = [
  { name: 'Moteur', required: true },
  { name: 'Alternateur', required: true },
  { name: 'ATS', required: true },
  { name: 'Batterie', required: true },
  { name: 'Chargeur de batterie', required: true },
  { name: 'Tableau manuel', required: true },
]

export default function NewOrderPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdOrder, setCreatedOrder] = useState<any>(null)

  // Step 1 fields
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
const [enclosureType, setEnclosureType] = useState('STANDARD')
  const [controlType, setControlType] = useState('MANUEL')
  const [requirements, setRequirements] = useState('')

  // Step 2 fields — component serials
  const [components, setComponents] = useState(
    DEFAULT_COMPONENTS.map(c => ({ ...c, serial: '', notes: '' }))
  )

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
     const res = await api.post('/orders', {
        clientName, clientPhone, clientEmail, enclosureType, controlType, requirements
      })
      setCreatedOrder(res.data)
      setStep(2)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComponents = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Submit each component serial
      for (const comp of components) {
        if (comp.serial.trim()) {
          await api.post(`/orders/${createdOrder.id}/components`, {
            componentName: comp.name,
            serialNumber: comp.serial,
            notes: comp.notes
          })
        }
      }
      router.push(`/dashboard/orders/${createdOrder.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save components')
    } finally {
      setLoading(false)
    }
  }

  const updateComponent = (index: number, field: string, value: string) => {
    setComponents(prev => prev.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    ))
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => step === 2 ? setStep(1) : router.push('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div className="w-px h-5 bg-gray-700" />
          <span className="text-white font-semibold">New Production Order</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-400' : 'text-green-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step === 1 ? 'bg-blue-600' : 'bg-green-600'}`}>
              {step === 1 ? '1' : '✓'}
            </div>
            <span className="text-sm font-medium">Order details</span>
          </div>
          <div className="flex-1 h-px bg-gray-800" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-400' : 'text-gray-600'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step === 2 ? 'bg-blue-600' : 'bg-gray-700'}`}>
              2
            </div>
            <span className="text-sm font-medium">Component serials</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* STEP 1 — Order details */}
        {step === 1 && (
          <form onSubmit={handleCreateOrder} className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
              <h2 className="text-white font-semibold">Client information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Client name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Entreprise Sonatrach"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="0555 123 456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="contact@company.dz"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
              <h2 className="text-white font-semibold">Engine specification</h2>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Enclosure *</label>
                <div className="flex gap-3 mb-4">
                  {ENCLOSURE_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEnclosureType(type)}
                      className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        enclosureType === type
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Control type *</label>
                <div className="flex gap-3">
                  {CONTROL_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setControlType(type)}
                      className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        controlType === type
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Requirements</label>
                <textarea
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="Genset 100KVA, livraison urgent, specs particulières..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
            >
              {loading ? 'Creating order...' : 'Create order & continue →'}
            </button>
          </form>
        )}

        {/* STEP 2 — Component serials */}
        {step === 2 && createdOrder && (
          <form onSubmit={handleSubmitComponents} className="space-y-5">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="text-green-400 text-lg">✓</span>
              <div>
                <p className="text-green-400 font-medium">Order created — {createdOrder.serialNumber}</p>
                <p className="text-gray-400 text-sm">Now enter the serial numbers of each component</p>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="text-white font-semibold">Component serial numbers</h2>
              <p className="text-gray-500 text-sm">Enter the manufacturer serial number for each component</p>

              {components.map((comp, index) => (
                <div key={comp.name} className="border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-white font-medium text-sm">{comp.name}</span>
                    {comp.required && (
                      <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={comp.serial}
                      onChange={e => updateComponent(index, 'serial', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Serial number"
                    />
                    <input
                      type="text"
                      value={comp.notes}
                      onChange={e => updateComponent(index, 'notes', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Notes (optional)"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/orders/${createdOrder.id}`)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-3 transition-colors"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
              >
                {loading ? 'Saving...' : 'Save components →'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}