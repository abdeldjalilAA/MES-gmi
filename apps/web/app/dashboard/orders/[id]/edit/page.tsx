'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'

const COMPONENT_CATEGORIES = [
  { key: 'MOTEUR', label: 'Moteur' },
  { key: 'ALTERNATEUR', label: 'Alternateur' },
  { key: 'ATS', label: 'ATS' },
  { key: 'BATTERIE', label: 'Batterie' },
  { key: 'CARTE_COMMANDE', label: 'Carte de commande' },
  { key: 'CHARGEUR', label: 'Chargeur de batterie' },
]

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [requirements, setRequirements] = useState('')
  const [addingComponent, setAddingComponent] = useState(false)
  const [newCategory, setNewCategory] = useState('MOTEUR')
  const [newBrandId, setNewBrandId] = useState('')
  const [newModelId, setNewModelId] = useState('')
  const [newSerial, setNewSerial] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

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

  useEffect(() => {
    if (order) {
      setClientName(order.clientName || '')
      setClientPhone(order.clientPhone || '')
      setClientEmail(order.clientEmail || '')
      setRequirements(order.requirements || '')
    }
  }, [order])

  const { data: brands } = useQuery({
    queryKey: ['brands-by-category', newCategory],
    queryFn: async () => {
      const res = await api.get(`/admin/brands?category=${newCategory}`)
      return res.data
    },
    enabled: addingComponent
  })

  const selectedBrand = brands?.find((b: any) => b.id === newBrandId)
  const models = selectedBrand?.models || []

  const updateOrder = useMutation({
    mutationFn: () => api.patch(`/orders/${params.id}`, {
      clientName, clientPhone, clientEmail, requirements
    }),
    onSuccess: () => {
      setSaveMsg('Saved successfully')
      setTimeout(() => setSaveMsg(''), 3000)
      queryClient.invalidateQueries({ queryKey: ['order', params.id] })
    }
  })

  const addComponent = useMutation({
    mutationFn: () => api.post(`/orders/${params.id}/components`, {
      equipmentModelId: newModelId || null,
      serialNumber: newSerial,
      notes: newNotes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', params.id] })
      setNewSerial('')
      setNewNotes('')
      setNewBrandId('')
      setNewModelId('')
      setAddingComponent(false)
    }
  })

  const deleteComponent = useMutation({
    mutationFn: (componentId: string) =>
      api.delete(`/orders/${params.id}/components/${componentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', params.id] })
  })

  if (!user || !order) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/orders/${params.id}`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div className="w-px h-5 bg-gray-700" />
          <span className="text-white font-semibold">Edit — {order.serialNumber}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Client info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Client information</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Client name</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Phone</label>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Requirements</label>
            <textarea value={requirements} onChange={e => setRequirements(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => updateOrder.mutate()}
              disabled={updateOrder.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {updateOrder.isPending ? 'Saving...' : 'Save changes'}
            </button>
            {saveMsg && <span className="text-green-400 text-sm">{saveMsg}</span>}
          </div>
        </div>

        {/* Components */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Components</h2>
            <button
              onClick={() => setAddingComponent(!addingComponent)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add component
            </button>
          </div>

          {/* Existing components */}
          <div className="space-y-2 mb-4">
            {order.components?.length === 0 && (
              <p className="text-gray-600 text-sm">No components added yet</p>
            )}
            {order.components?.map((comp: any) => (
              <div key={comp.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-white text-sm font-medium">
                    {comp.equipmentModel?.brand?.name} {comp.equipmentModel?.name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {comp.equipmentModel?.brand?.category?.replace('_', ' ')} — {comp.serialNumber}
                  </p>
                </div>
                <button
                  onClick={() => deleteComponent.mutate(comp.id)}
                  className="text-red-400 hover:text-red-300 text-xs ml-4"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Add component form */}
          {addingComponent && (
            <div className="border border-gray-700 rounded-lg p-4 space-y-3">
              <p className="text-gray-400 text-sm font-medium">New component</p>

              <select value={newCategory} onChange={e => { setNewCategory(e.target.value); setNewBrandId(''); setNewModelId('') }}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                {COMPONENT_CATEGORIES.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <select value={newBrandId} onChange={e => { setNewBrandId(e.target.value); setNewModelId('') }}
                  className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  <option value="">Select brand</option>
                  {brands?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>

                <select value={newModelId} onChange={e => setNewModelId(e.target.value)}
                  disabled={!newBrandId}
                  className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50">
                  <option value="">Select model</option>
                  {models.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.minKva ? ` (${m.minKva}–${m.maxKva} KVA)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input value={newSerial} onChange={e => setNewSerial(e.target.value)}
                  placeholder="Serial number *"
                  className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <input value={newNotes} onChange={e => setNewNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => newSerial && addComponent.mutate()}
                  disabled={!newSerial || addComponent.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                >
                  {addComponent.isPending ? 'Adding...' : 'Add component'}
                </button>
                <button
                  onClick={() => setAddingComponent(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}