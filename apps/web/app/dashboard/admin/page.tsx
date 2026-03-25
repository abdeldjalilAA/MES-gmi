'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'

const CATEGORIES = [
  'MOTEUR', 'ALTERNATEUR', 'ATS', 'BATTERIE', 'CARTE_COMMANDE', 'CHARGEUR'
]

export default function AdminPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'brands' | 'serial' | 'users'>('brands')
  const [selectedCategory, setSelectedCategory] = useState('MOTEUR')
  const [selectedBrand, setSelectedBrand] = useState<any>(null)

  // Brand form
  const [newBrandName, setNewBrandName] = useState('')

  // Model form
  const [newModelName, setNewModelName] = useState('')
  const [newModelMinKva, setNewModelMinKva] = useState('')
  const [newModelMaxKva, setNewModelMaxKva] = useState('')

  // Serial config form
  const [prefix, setPrefix] = useState('GEN')
  const [separator, setSeparator] = useState('-')
  const [padLength, setPadLength] = useState('4')

  // User form
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('OPERATOR')

  const [companyName, setCompanyName] = useState('')
  const [headerText, setHeaderText] = useState('')
  const [footerText, setFooterText] = useState('')
  const [warrantyMonths, setWarrantyMonths] = useState('12')



  const { data: docSettings } = useQuery({
    queryKey: ['doc-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/document-settings')
      return res.data
    }
  })

  useEffect(() => {
    if (docSettings) {
      setCompanyName(docSettings.companyName || '')
      setHeaderText(docSettings.headerText || '')
      setFooterText(docSettings.footerText || '')
      setWarrantyMonths(String(docSettings.warrantyMonths || 12))
    }
  }, [docSettings])


  const saveDocSettings = useMutation({
    mutationFn: () => api.post('/admin/document-settings', {
      companyName, headerText, footerText, warrantyMonths
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doc-settings'] })
  })

  useEffect(() => {
    if (!user) router.push('/login')
    if (user && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) router.push('/dashboard')
  }, [user, router])

  const { data: brands } = useQuery({
    queryKey: ['brands', selectedCategory],
    queryFn: async () => {
      const res = await api.get(`/admin/brands?category=${selectedCategory}`)
      return res.data
    }
  })

  const { data: serialConfig } = useQuery({
    queryKey: ['serial-config'],
    queryFn: async () => {
      const res = await api.get('/admin/serial-config')
      return res.data
    }
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/admin/users')
      return res.data
    }
  })

  useEffect(() => {
    if (serialConfig) {
      setPrefix(serialConfig.prefix || 'GEN')
      setSeparator(serialConfig.separator || '-')
      setPadLength(String(serialConfig.padLength || 4))
    }
  }, [serialConfig])

  const createBrand = useMutation({
    mutationFn: () => api.post('/admin/brands', { name: newBrandName, category: selectedCategory }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      setNewBrandName('')
    }
  })

  const deleteBrand = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/brands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      setSelectedBrand(null)
    }
  })

  const createModel = useMutation({
    mutationFn: () => api.post(`/admin/brands/${selectedBrand.id}/models`, {
      name: newModelName,
      minKva: newModelMinKva,
      maxKva: newModelMaxKva
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      setNewModelName('')
      setNewModelMinKva('')
      setNewModelMaxKva('')
    }
  })

  const deleteModel = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/models/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] })
  })

  const saveSerialConfig = useMutation({
    mutationFn: () => api.post('/admin/serial-config', { prefix, separator, padLength }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['serial-config'] })
  })

  const createUser = useMutation({
    mutationFn: () => api.post('/admin/users', {
      name: newUserName, email: newUserEmail,
      password: newUserPassword, role: newUserRole
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewUserName(''); setNewUserEmail('')
      setNewUserPassword(''); setNewUserRole('OPERATOR')
    }
  })

  const toggleUser = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  })

  if (!user) return null

 const tabs = [
    { id: 'brands', label: 'Equipment catalog' },
    { id: 'serial', label: 'Serial number' },
    { id: 'users', label: 'User management' },
    { id: 'documents', label: 'Document settings' },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors">← Back</button>
          <div className="w-px h-5 bg-gray-700" />
          <span className="text-white font-semibold">Admin Panel</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-8 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── EQUIPMENT CATALOG ── */}
        {activeTab === 'brands' && (
          <div className="grid grid-cols-3 gap-6">

            {/* Category selector */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Category</h3>
              <div className="space-y-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setSelectedBrand(null) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Brands list */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Brands — {selectedCategory.replace('_', ' ')}</h3>

              <div className="space-y-2 mb-4">
                {brands?.map((brand: any) => (
                  <div
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedBrand?.id === brand.id
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-white text-sm">{brand.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{brand.models?.length} models</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteBrand.mutate(brand.id) }}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {brands?.length === 0 && (
                  <p className="text-gray-600 text-sm">No brands yet</p>
                )}
              </div>

              {/* Add brand */}
              <div className="border-t border-gray-800 pt-4">
                <p className="text-gray-500 text-xs mb-2">Add brand</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={e => setNewBrandName(e.target.value)}
                    placeholder="Brand name"
                    className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => newBrandName && createBrand.mutate()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Models */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">
                {selectedBrand ? `Models — ${selectedBrand.name}` : 'Select a brand'}
              </h3>

              {selectedBrand && (
                <>
                  <div className="space-y-2 mb-4">
                    {selectedBrand.models?.map((model: any) => (
                      <div key={model.id} className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg">
                        <div>
                          <p className="text-white text-sm">{model.name}</p>
                          {(model.minKva || model.maxKva) && (
                            <p className="text-gray-500 text-xs">{model.minKva} — {model.maxKva} KVA</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteModel.mutate(model.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {selectedBrand.models?.length === 0 && (
                      <p className="text-gray-600 text-sm">No models yet</p>
                    )}
                  </div>

                  <div className="border-t border-gray-800 pt-4 space-y-2">
                    <p className="text-gray-500 text-xs">Add model</p>
                    <input
                      type="text"
                      value={newModelName}
                      onChange={e => setNewModelName(e.target.value)}
                      placeholder="Model name"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newModelMinKva}
                        onChange={e => setNewModelMinKva(e.target.value)}
                        placeholder="Min KVA"
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="number"
                        value={newModelMaxKva}
                        onChange={e => setNewModelMaxKva(e.target.value)}
                        placeholder="Max KVA"
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => newModelName && createModel.mutate()}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      Add model
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── SERIAL CONFIG ── */}
        {activeTab === 'serial' && (
          <div className="max-w-md">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h3 className="text-white font-semibold">Serial number format</h3>
              <p className="text-gray-500 text-sm">
                Preview: <span className="text-blue-400 font-mono">
                  {new Date().getFullYear()}{separator}{prefix}{separator}{'0'.repeat(parseInt(padLength) - 1)}1
                </span>
              </p>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Prefix</label>
                <input
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Separator</label>
                <input
                  value={separator}
                  onChange={e => setSeparator(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Number padding (digits)</label>
                <input
                  type="number"
                  value={padLength}
                  onChange={e => setPadLength(e.target.value)}
                  min="2" max="8"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => saveSerialConfig.mutate()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-lg transition-colors"
              >
                {saveSerialConfig.isPending ? 'Saving...' : 'Save configuration'}
              </button>
            </div>
          </div>

          
        )}{/* ── DOCUMENT SETTINGS ── */}
       {/* ── DOCUMENT SETTINGS ── */}
        {activeTab === 'documents' && (
          <div className="max-w-md">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h3 className="text-white font-semibold">Company & document settings</h3>

              {/* Logo upload */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Company logo</label>
                {docSettings?.logoUrl && (
                  <div className="mb-3 p-3 bg-gray-800 rounded-lg flex items-center gap-3">
                    <img src={docSettings.logoUrl} alt="Logo" className="h-12 object-contain" />
                    <button
                      onClick={() => saveDocSettings.mutate()}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = async (ev) => {
                      const base64 = ev.target?.result as string
                      await api.post('/admin/document-settings', {
                        companyName, headerText, footerText,
                        warrantyMonths, logoUrl: base64
                      })
                      queryClient.invalidateQueries({ queryKey: ['doc-settings'] })
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Company name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="GMI — Groupe Moteur Industriel"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Document header text</label>
                <input value={headerText} onChange={e => setHeaderText(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Zone industrielle, Alger"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Document footer text</label>
                <input value={footerText} onChange={e => setFooterText(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Tél: 023 XX XX XX — contact@company.dz"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Warranty duration (months)</label>
                <input type="number" value={warrantyMonths}
                  onChange={e => setWarrantyMonths(e.target.value)}
                  min="1" max="120"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={() => saveDocSettings.mutate()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-lg transition-colors"
              >
                {saveDocSettings.isPending ? 'Saving...' : 'Save settings'}
              </button>

              {saveDocSettings.isSuccess && (
                <p className="text-green-400 text-sm text-center">Saved successfully</p>
              )}
            </div>
          </div>
        )}

        {/* ── USER MANAGEMENT ── */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-2 gap-6">

            {/* User list */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">All users</h3>
              <div className="space-y-2">
                {users?.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-white text-sm font-medium">{u.name}</p>
                      <p className="text-gray-500 text-xs">{u.email}</p>
                      <span className="text-xs text-blue-400">{u.role.replace(/_/g, ' ')}</span>
                    </div>
                    <button
                      onClick={() => toggleUser.mutate(u.id)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        u.isActive
                          ? 'border-green-500/30 text-green-400 bg-green-500/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                          : 'border-red-500/30 text-red-400 bg-red-500/10 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Create user */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Create user</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Full name"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="OPERATOR">Operator</option>
                  <option value="PHASE_SUPERVISOR">Phase Supervisor</option>
                  <option value="COMMERCIAL_AGENT">Commercial Agent</option>
                  <option value="PROCUREMENT_AGENT">Procurement Agent</option>
                  <option value="QC_DELIVERY_AGENT">QC & Delivery Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  onClick={() => newUserName && newUserEmail && newUserPassword && createUser.mutate()}
                  disabled={createUser.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium px-4 py-3 rounded-lg transition-colors"
                >
                  {createUser.isPending ? 'Creating...' : 'Create user'}
                </button>
                {createUser.isError && (
                  <p className="text-red-400 text-xs">{(createUser.error as any)?.response?.data?.error}</p>
                )}
                {createUser.isSuccess && (
                  <p className="text-green-400 text-xs">User created successfully</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}