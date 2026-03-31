'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api'

export default function TestPage() {
  const router = useRouter()
  const params = useParams()
  const user = useAuthStore((s) => s.user)

  const [load, setLoad] = useState('')
  const [voltage, setVoltage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [temperature, setTemperature] = useState('')
  const [duration, setDuration] = useState('')
  const [fuelConsumption, setFuelConsumption] = useState('')
  const [noiseLevel, setNoiseLevel] = useState('')
  const [result, setResult] = useState<'PASS' | 'FAIL'>('PASS')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const { data: existingResult } = useQuery({
    queryKey: ['test-result', params.id],
    queryFn: async () => {
      const res = await api.get(`/orders/${params.id}/test-result`)
      return res.data
    }
  })

  useEffect(() => {
    if (existingResult) {
      setLoad(existingResult.load?.toString() || '')
      setVoltage(existingResult.voltage?.toString() || '')
      setFrequency(existingResult.frequency?.toString() || '')
      setTemperature(existingResult.temperature?.toString() || '')
      setDuration(existingResult.duration?.toString() || '')
      setFuelConsumption(existingResult.fuelConsumption?.toString() || '')
      setNoiseLevel(existingResult.noiseLevel?.toString() || '')
      setResult(existingResult.result || 'PASS')
      setNotes(existingResult.notes || '')
    }
  }, [existingResult])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post(`/orders/${params.id}/test-result`, {
        load, voltage, frequency, temperature,
        duration, fuelConsumption, noiseLevel, result, notes
      })
      router.push(`/dashboard/orders/${params.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save test result')
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
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/dashboard/orders/${params.id}`)}
            className="text-gray-400 hover:text-white transition-colors">← Back</button>
          <div className="w-px h-5 bg-gray-700" />
          <span className="text-white font-semibold">Banc d'essai — {order.serialNumber}</span>
          <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded">Phase 7</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-6 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Test parameters */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-5">Paramètres de test</h2>
            <div className="grid grid-cols-2 gap-4">

              {[
                { label: 'Charge (KVA)', value: load, set: setLoad, placeholder: '100' },
                { label: 'Tension (V)', value: voltage, set: setVoltage, placeholder: '400' },
                { label: 'Fréquence (Hz)', value: frequency, set: setFrequency, placeholder: '50' },
                { label: 'Température (°C)', value: temperature, set: setTemperature, placeholder: '85' },
                { label: 'Durée test (min)', value: duration, set: setDuration, placeholder: '120' },
                { label: 'Conso. carburant (L/h)', value: fuelConsumption, set: setFuelConsumption, placeholder: '25' },
                { label: 'Niveau sonore (dB)', value: noiseLevel, set: setNoiseLevel, placeholder: '72' },
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={field.value}
                    onChange={e => field.set(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Résultat du test</h2>
            <div className="flex gap-4 mb-4">
              <button type="button" onClick={() => setResult('PASS')}
                className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-colors ${
                  result === 'PASS'
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-green-600'
                }`}>
                ✓ PASS
              </button>
              <button type="button" onClick={() => setResult('FAIL')}
                className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-colors ${
                  result === 'FAIL'
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-red-600'
                }`}>
                ✗ FAIL
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {result === 'FAIL' ? 'Raison du refus *' : 'Notes (optionnel)'}
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                placeholder={result === 'FAIL' ? 'Décrivez le problème...' : 'Observations...'}
              />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className={`w-full font-bold py-4 rounded-xl text-lg transition-colors ${
              result === 'PASS'
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white'
            }`}>
            {loading ? 'Saving...' : result === 'PASS' ? '✓ Valider et passer en QC' : '✗ Marquer comme échoué'}
          </button>
        </form>
      </main>
    </div>
  )
}