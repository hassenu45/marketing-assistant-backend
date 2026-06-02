import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Smartphone, CheckCircle, XCircle, RefreshCw, Key, ArrowLeft, Upload, Clock } from 'lucide-react'
import { enqueue, getQueueStatus } from '../utils/sync'

const API = import.meta.env.VITE_API_URL || ''

export default function Pair() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const codeFromUrl = searchParams.get('code') || ''
  const [code, setCode] = useState(codeFromUrl)
  const [deviceId, setDeviceId] = useState('')
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  useEffect(() => {
    if (codeFromUrl) generateDeviceId()
  }, [])

  const generateDeviceId = () => {
    const id = 'device_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    setDeviceId(id)
  }

  const handlePair = async () => {
    if (!code.trim()) return
    setStatus('verifying')
    setMessage('')
    if (!deviceId) generateDeviceId()

    try {
      const res = await fetch(`${API}/api/pairing/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), deviceId }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('success')
        localStorage.setItem('camo_device_token', data.deviceToken)
        localStorage.setItem('camo_paired_at', data.session.pairedAt)
        localStorage.setItem('camo_token_expires_at', data.expiresAt || '')

        enqueue('sync_orders', [])
        enqueue('sync_config', {})
        setSyncStatus('sync_queued')
      } else {
        setStatus('error')
        setMessage(data.message || 'Invalid code')
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Connection error')
    }
  }

  const tokenExpiresAt = localStorage.getItem('camo_token_expires_at') || ''
  const daysLeft = tokenExpiresAt
    ? Math.max(0, Math.floor((new Date(tokenExpiresAt).getTime() - Date.now()) / 86400000))
    : 30

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connected!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Your device is now paired with the dashboard</p>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-6">
            <Clock className="w-3.5 h-3.5" />
            <span>Token expires in {daysLeft} days</span>
          </div>

          {syncStatus === 'sync_queued' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4 text-left">
              <Upload className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xs text-blue-600 dark:text-blue-400">
                Data sync queued — will retry automatically if offline
              </span>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="btn-accent w-full py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6" dir="ltr">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
            <Smartphone className="w-8 h-8" style={{ color: 'var(--accent)' }} />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Pair Device
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Enter the activation code from your dashboard
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Activation Code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3"
              className="w-full px-4 py-3 text-lg text-center font-mono tracking-[0.3em] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition"
              style={{ '--tw-ring-color': 'var(--accent)' } as any}
              maxLength={6}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handlePair()}
            />
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span className="text-sm text-red-600 dark:text-red-400">{message}</span>
            </div>
          )}

          <button
            onClick={handlePair}
            disabled={status === 'verifying' || !code.trim()}
            className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 text-white transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {status === 'verifying' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            {status === 'verifying' ? 'Verifying...' : 'Pair Device'}
          </button>
        </div>
      </div>
    </div>
  )
}
