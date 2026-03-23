'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  IN_PRODUCTION: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TESTING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  QC: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  DELIVERED: 'bg-green-500/10 text-green-400 border-green-500/20',
  ARCHIVED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export default function ArchivePage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const [year, setYear] = useState('')
  const [enclosureType, setEnclosureType] = useState('')
  const [controlType, setControlType] = useState('')
  const [clientName, setClientName] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  const { data: orders, isLoading } = useQuery({
    queryKey: ['archive', year, enclosureType, controlType, clientName, status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (year) params.append('year', year)
      if (enclosureType) params.append('enclosureType', enclosureType)
      if (controlType) params.append('controlType', controlType)
      if (clientName) params.append('clientName', clientName)
      if (status) params.append('status', status)
      const res = await api.get(`/archive?${params.toString()}`)
      return res.data
    }
  })

  const filtered = orders?.filter((o: any) =>
    search === '' ||
    o.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.clientName.toLowerCase().includes(search.toLowerCase())
  )

  const exportExcel = () => {
    if (!filtered) return
    const rows = filtered.map((o: any) => ({
      'N° Série': o.serialNumber,
      'Client': o.clientName,
      'Téléphone': o.clientPhone || '',
      'Type': o.enclosureType,
      'Commande': o.controlType?.replace('_', ' '),
      'Statut': o.status,
      'Phases complètes': o.productionPhases?.filter((p: any) => p.status === 'COMPLETED').length + '/8',
      'Date création': new Date(o.createdAt).toLocaleDateString('fr-DZ'),
      'Date livraison': o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString('fr-DZ') : '',
      'Exigences': o.requirements || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Archive')
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    saveAs(new Blob([buf]), `archive-gentrack-${year || 'all'}.xlsx`)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors">← Back</button>
            <div className="w-px h-5 bg-gray-700" />
            <span className="text-white font-semibold">Archive</span>
          </div>
          <button
            onClick={exportExcel}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
          >
            Export Excel
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search serial / client..."
              className="col-span-2 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />

            {/* Year */}
            <select value={year} onChange={e => setYear(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="">All years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Enclosure */}
            <select value={enclosureType} onChange={e => setEnclosureType(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="">All types</option>
              <option value="STANDARD">Standard</option>
              <option value="INSONORISE">Insonorisé</option>
            </select>

            {/* Control */}
            <select value={controlType} onChange={e => setControlType(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="">All controls</option>
              <option value="MANUEL">Manuel</option>
              <option value="AUTO">Auto</option>
              <option value="INVERSEUR_SEPARE">Inverseur séparé</option>
            </select>

            {/* Status */}
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PRODUCTION">In production</option>
              <option value="TESTING">Testing</option>
              <option value="QC">QC</option>
              <option value="DELIVERED">Delivered</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          <span className="text-gray-400">
            <span className="text-white font-semibold">{filtered?.length || 0}</span> orders
          </span>
          <span className="text-gray-400">
            <span className="text-green-400 font-semibold">
              {filtered?.filter((o: any) => o.status === 'DELIVERED').length || 0}
            </span> delivered
          </span>
          <span className="text-gray-400">
            <span className="text-blue-400 font-semibold">
              {filtered?.filter((o: any) => o.status === 'IN_PRODUCTION').length || 0}
            </span> in production
          </span>
        </div>

        {/* Orders table */}
        {isLoading ? (
          <div className="text-gray-400 text-center py-20">Loading archive...</div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Serial</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Control</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Progress</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-600 py-16">No orders found</td>
                  </tr>
                ) : (
                  filtered?.map((order: any) => {
                    const completed = order.productionPhases?.filter((p: any) => p.status === 'COMPLETED').length
                    return (
                      <tr key={order.id}
                        onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                        className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-white font-medium">{order.serialNumber}</td>
                        <td className="px-4 py-3 text-gray-300">{order.clientName}</td>
                        <td className="px-4 py-3 text-gray-400">{order.enclosureType}</td>
                        <td className="px-4 py-3 text-gray-400">{order.controlType?.replace('_', ' ')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {order.productionPhases?.map((p: any) => (
                                <div key={p.phaseNumber} className={`w-2 h-2 rounded-sm ${
                                  p.status === 'COMPLETED' ? 'bg-green-500' :
                                  p.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                                  p.status === 'BLOCKED' ? 'bg-red-500' : 'bg-gray-700'
                                }`} />
                              ))}
                            </div>
                            <span className="text-gray-500 text-xs">{completed}/8</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs border px-2 py-0.5 rounded ${statusColor[order.status]}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(order.createdAt).toLocaleDateString('fr-DZ')}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">→</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}