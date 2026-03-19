'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'

const ENCLOSURE_TYPES = ['STANDARD', 'INSONORISE']
const CONTROL_TYPES = ['MANUEL', 'AUTO', 'INVERSEUR_SEPARE']

const COMPONENT_CATEGORIES = [
  { key: 'MOTEUR', label: 'Moteur' },
  { key: 'ALTERNATEUR', label: 'Alternateur' },
  { key: 'ATS', label: 'ATS' },
  { key: 'BATTERIE', label: 'Batterie' },
  { key: 'CARTE_COMMANDE', label: 'Carte de commande' },
  { key: 'CHARGEUR', label: 'Chargeur de batterie' },
]

interface ComponentEntry {
  category: string
  label: string
  brandId: string
  modelId: string
  serialNumber: string
  notes: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdOrder, setCreatedOrder] = useState<any>(null)

  // Step 1
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [enclosureType, setEnclosureType] = useState('STANDARD')
  const [controlType, setControlType] = useState('MANUEL')
  const [requirements, setRequirements] = useState('')

  // Step 2 — one entry per component category
  const [components, setComponents] = useState<ComponentEntry[]>(
    COMPONENT_CATEGORIES.map(c => ({
      category: c.key,
      label: c.label,
      brandId: '',
      modelId: '',
      serialNumber: '',
      notes: ''
    }))
  )

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  // Fetch all brands grouped by category
  const { data: allBrands } = useQuery({
    queryKey: ['all-brands'],
    queryFn: async () => {
      const results: Record<string, any[]> = {}
      await Promise.all(
        COMPONENT_CATEGORIES.map(async (cat) => {
          const res = await api.get(`/admin/brands?category=${cat.key}`)
          results[cat.key] = res.data
        })
      )
      return results
    },
    enabled: step === 2
  })

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/orders', {
        clientName, clientPhone, clientEmail,
        enclosureType, controlType, requirements
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
      for (const comp of components) {
        if (comp.serialNumber.trim()) {
          await api.post(`/orders/${createdOrder.id}/components`, {
            equipmentModelId: comp.modelId || null,
            serialNumber: comp.serialNumber,
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

  const updateComponent = (index: number, field: keyof ComponentEntry, value: string) => {
    setComponents(prev => prev.map((c, i) => {
      if (i !== index) return c
      // Reset model when brand changes
      if (field === 'brandId') return { ...c, brandId: value, modelId: '' }
      return { ...c, [field]: value }
    }))
  }

  const getModelsForComponent = (comp: ComponentEntry) => {
    if (!allBrands || !comp.brandId) return []
    const brand = allBrands[comp.category]?.find((b: any) => b.id === comp.brandId)
    return brand?.models || []
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950">
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

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleCreateOrder} className="space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
              <h2 className="text-white font-semibold">Client information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Client name *</label>
                <input
                  type="text" value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                  placeholder="Entreprise Sonatrach" required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                  <input
                    type="text" value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                    placeholder="0555 123 456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input
                    type="email" value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
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
                    <button key={type} type="button" onClick={() => setEnclosureType(type)}
                      className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        enclosureType === type ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      {type}
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Control type *</label>
                <div className="flex gap-3">
                  {CONTROL_TYPES.map(type => (
                    <button key={type} type="button" onClick={() => setControlType(type)}
                      className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                        controlType === type ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Requirements</label>
                <textarea value={requirements} onChange={e => setRequirements(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Genset 100KVA, livraison urgent..."
                />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg px-4 py-3 transition-colors">
              {loading ? 'Creating order...' : 'Create order & continue →'}
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && createdOrder && (
          <form onSubmit={handleSubmitComponents} className="space-y-5">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
              <span className="text-green-400 text-lg">✓</span>
              <div>
                <p className="text-green-400 font-medium">Order created — {createdOrder.serialNumber}</p>
                <p className="text-gray-400 text-sm">Enter component serial numbers</p>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
              <h2 className="text-white font-semibold">Component serial numbers</h2>

              {components.map((comp, index) => (
                <div key={comp.category} className="border border-gray-800 rounded-lg p-4">
                  <p className="text-white font-medium text-sm mb-3">{comp.label}</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Brand selector */}
                    <select
                      value={comp.brandId}
                      onChange={e => updateComponent(index, 'brandId', e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select brand</option>
                      {allBrands?.[comp.category]?.map((brand: any) => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>

                    {/* Model selector */}
                    <select
                      value={comp.modelId}
                      onChange={e => updateComponent(index, 'modelId', e.target.value)}
                      disabled={!comp.brandId}
                      className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">Select model</option>
                      {getModelsForComponent(comp).map((model: any) => (
                        <option key={model.id} value={model.id}>
                          {model.name}{model.minKva ? ` (${model.minKva}–${model.maxKva} KVA)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text" value={comp.serialNumber}
                      onChange={e => updateComponent(index, 'serialNumber', e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Serial number"
                    />
                    <input
                      type="text" value={comp.notes}
                      onChange={e => updateComponent(index, 'notes', e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Notes (optional)"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button type="button"
                onClick={() => router.push(`/dashboard/orders/${createdOrder.id}`)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-3 transition-colors">
                Skip for now
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg px-4 py-3 transition-colors">
                {loading ? 'Saving...' : 'Save & view order →'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}