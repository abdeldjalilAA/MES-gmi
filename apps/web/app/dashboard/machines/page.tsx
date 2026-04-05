'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'
import { socket } from '@/lib/socket'

const PHASE_NAMES: Record<number, string> = {
  1: 'Tôle', 2: 'Soudure', 3: 'Poudre', 4: 'Peinture',
  5: 'Câblage', 6: 'Assemblage', 7: 'Test', 8: 'QC'
}

export default function MachinesPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [selectedPhase, setSelectedPhase] = useState(1)
  const [selectedMachine, setSelectedMachine] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  const { data: machines, refetch: refetchMachines } = useQuery({
    queryKey: ['machines-full', selectedPhase],
    queryFn: async () => {
      const res = await api.get(`/admin/machines?phase=${selectedPhase}`)
      return res.data
    }
  })

  const { data: machineDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['machine-detail', selectedMachine?.id],
    queryFn: async () => {
      if (!selectedMachine?.id) return null
      const res = await api.get(`/machines/${selectedMachine.id}`)
      return res.data
    },
    enabled: !!selectedMachine?.id
  })

  const { data: activeOrders } = useQuery({
    queryKey: ['active-orders'],
    queryFn: async () => {
      const res = await api.get('/orders')
      return res.data.filter((o: any) =>
        ['PENDING', 'IN_PRODUCTION', 'TESTING', 'QC'].includes(o.status)
      )
    },
    enabled: showAddModal
  })

  // Socket for real-time queue updates
  useEffect(() => {
    if (!selectedMachine?.id) return
    socket.connect()
    socket.emit('join-machine', selectedMachine.id)
    socket.on('queue-updated', () => {
      refetchDetail()
      refetchMachines()
    })
    return () => {
      socket.off('queue-updated')
    }
  }, [selectedMachine?.id])

  const addToQueue = useMutation({
    mutationFn: async () => {
      const order = activeOrders?.find((o: any) => o.id === selectedOrder)
      const phase = order?.productionPhases?.find(
        (p: any) => p.phaseNumber === selectedPhase
      )
      return api.post(`/machines/${selectedMachine.id}/queue`, {
        orderId: selectedOrder,
        phaseId: phase?.id,
        isUrgent
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-detail'] })
      setShowAddModal(false)
      setSelectedOrder('')
      setIsUrgent(false)
    }
  })

  const pauseEntry = useMutation({
    mutationFn: (entryId: string) =>
      api.post(`/machines/${selectedMachine.id}/queue/${entryId}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['machine-detail'] })
  })

  const resumeEntry = useMutation({
    mutationFn: (entryId: string) =>
      api.post(`/machines/${selectedMachine.id}/queue/${entryId}/resume`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['machine-detail'] })
  })

  const completeEntry = useMutation({
    mutationFn: (entryId: string) =>
      api.post(`/machines/${selectedMachine.id}/queue/${entryId}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['machine-detail'] })
  })

  if (!user) return null

  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
    WAITING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    PAUSED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    DONE: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors">← Back</button>
            <div className="w-px h-5 bg-gray-700" />
            <span className="text-white font-semibold">Machine Queue</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-6">

          {/* Phase selector + machine list */}
          <div className="col-span-1 space-y-4">

            {/* Phase tabs */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-3">Phase</p>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 8 }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => { setSelectedPhase(p); setSelectedMachine(null) }}
                    className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                      selectedPhase === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Machines */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-3">
                {PHASE_NAMES[selectedPhase]} machines
              </p>
              <div className="space-y-2">
                {machines?.map((machine: any) => (
                  <button key={machine.id}
                    onClick={() => setSelectedMachine(machine)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors border ${
                      selectedMachine?.id === machine.id
                        ? 'bg-blue-600/20 border-blue-500/30 text-white'
                        : 'border-transparent hover:bg-gray-800 text-gray-300'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{machine.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        machine.status === 'EN_PANNE'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}>
                        {machine.status === 'EN_PANNE' ? 'Panne' : 'OK'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {machine.minOperators}–{machine.maxOperators} operators
                    </p>
                  </button>
                ))}
                {machines?.length === 0 && (
                  <p className="text-gray-600 text-sm">No machines in this phase</p>
                )}
              </div>
            </div>
          </div>

          {/* Queue detail */}
          <div className="col-span-3">
            {!selectedMachine ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <p className="text-gray-500">Select a machine to view its queue</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Machine header */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-bold text-xl">{machineDetail?.name || selectedMachine.name}</h2>
                    <p className="text-gray-500 text-sm">Phase {selectedPhase} — {PHASE_NAMES[selectedPhase]}</p>
                   {['SUPER_ADMIN', 'ADMIN', 'PHASE_SUPERVISOR'].includes(user.role) && (
                      <AssignOperator
                        machineId={selectedMachine.id}
                        currentAssignments={machineDetail?.assignments || []}
                        onAssigned={() => queryClient.invalidateQueries({ queryKey: ['machine-detail'] })}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    disabled={selectedMachine.status === 'EN_PANNE'}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    + Add to queue
                  </button>
                </div>

                

                {/* Queue entries */}
                <div className="space-y-3">
                  {machineDetail?.queueEntries?.length === 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                      <p className="text-gray-500">Queue is empty</p>
                    </div>
                  )}

                  {machineDetail?.queueEntries?.map((entry: any, index: number) => (
                    <div key={entry.id}
                      className={`bg-gray-900 border rounded-xl p-5 ${
                        entry.status === 'ACTIVE' ? 'border-green-500/30' :
                        entry.status === 'PAUSED' ? 'border-orange-500/30' :
                        'border-gray-800'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600 font-bold text-lg w-6">{index + 1}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-mono font-bold">{entry.order.serialNumber}</p>
                              {entry.isUrgent && (
                                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                                  URGENT
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm">{entry.order.clientName}</p>
                            {entry.operator && (
                              <p className="text-gray-600 text-xs">{entry.operator.name}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Timing */}
                          <div className="text-right text-xs text-gray-500">
                            {entry.startedAt && (
                              <p>Started: {new Date(entry.startedAt).toLocaleTimeString('fr-DZ')}</p>
                            )}
                            {entry.activeMinutes != null && (
                              <p>Active: {entry.activeMinutes} min</p>
                            )}
                          </div>

                          <span className={`text-xs border px-2 py-1 rounded ${statusColor[entry.status]}`}>
                            {entry.status}
                          </span>

                          {/* Action buttons */}
                          <div className="flex gap-2">
                            {entry.status === 'ACTIVE' && (
                              <>
                                <button onClick={() => pauseEntry.mutate(entry.id)}
                                  className="text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                  Pause
                                </button>
                                <button onClick={() => completeEntry.mutate(entry.id)}
                                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                                  Done
                                </button>
                              </>
                            )}
                            {entry.status === 'PAUSED' && (
                              <button onClick={() => resumeEntry.mutate(entry.id)}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                                Resume
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </main>

      {/* Add to queue modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-white font-semibold mb-4">Add engine to queue</h3>
            <p className="text-gray-500 text-sm mb-4">
              Machine: <span className="text-white">{selectedMachine.name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Select engine</label>
                <select value={selectedOrder} onChange={e => setSelectedOrder(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                  <option value="">Choose an order...</option>
                  {activeOrders?.map((order: any) => (
                    <option key={order.id} value={order.id}>
                      {order.serialNumber} — {order.clientName}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isUrgent}
                  onChange={e => setIsUrgent(e.target.checked)}
                  className="w-4 h-4" />
                <span className="text-gray-300 text-sm">Mark as urgent (insert at front of queue)</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddModal(false); setSelectedOrder('') }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => selectedOrder && addToQueue.mutate()}
                  disabled={!selectedOrder || addToQueue.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 rounded-xl transition-colors">
                  {addToQueue.isPending ? 'Adding...' : 'Add to queue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  )
}

function AssignOperator({ machineId, currentAssignments, onAssigned }: {
  machineId: string
  currentAssignments: any[]
  onAssigned: () => void
}) {
  const [open, setOpen] = useState(false)
  const [operatorId, setOperatorId] = useState('')

  const { data: users } = useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const res = await api.get('/admin/users')
      return res.data.filter((u: any) =>
        ['OPERATOR', 'PHASE_SUPERVISOR'].includes(u.role) && u.isActive
      )
    },
    enabled: open
  })

  const assign = useMutation({
    mutationFn: () => api.post(`/machines/${machineId}/assign`, { operatorId }),
    onSuccess: () => { onAssigned(); setOpen(false); setOperatorId('') }
  })

  const unassign = useMutation({
    mutationFn: (opId: string) => api.delete(`/machines/${machineId}/assign/${opId}`),
    onSuccess: () => onAssigned()
  })

  return (
    <div className="mt-3">
      {currentAssignments.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {currentAssignments.map((a: any) => (
            <span key={a.id} className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
              {a.operator.name}
              <button onClick={() => unassign.mutate(a.operator.id)}
                className="text-blue-600 hover:text-red-400 ml-1">×</button>
            </span>
          ))}
        </div>
      )}
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="text-xs text-gray-500 hover:text-white transition-colors">
          + Assign operator
        </button>
      ) : (
        <div className="flex gap-2 mt-1">
          <select value={operatorId} onChange={e => setOperatorId(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500">
            <option value="">Select operator...</option>
            {users?.filter((u: any) => !currentAssignments.find((a: any) => a.operator.id === u.id))
              .map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
          </select>
          <button onClick={() => operatorId && assign.mutate()}
            disabled={!operatorId}
            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-3 py-1 rounded-lg">
            Assign
          </button>
          <button onClick={() => setOpen(false)}
            className="text-xs text-gray-500 hover:text-white px-2">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}