import { useEffect, useRef, useState, useCallback } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import {
  Smartphone, Download, QrCode,
  CheckCircle, XCircle, RefreshCw, Clock,
  Copy, Check
} from 'lucide-react'
import QRCode from 'qrcode'

const API = import.meta.env.VITE_API_URL || ''

export default function MobileApp() {
  const { lang } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pairing, setPairing] = useState<any>(null)
  const [pairingStatus, setPairingStatus] = useState<'idle' | 'loading' | 'paired' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const generatePairing = useCallback(async () => {
    setPairingStatus('loading')
    setStatusMsg('')
    try {
      const res = await fetch(`${API}/api/pairing/generate`, { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setPairing(data)
      setPairingStatus('idle')
    } catch {
      setPairingStatus('error')
      setStatusMsg(lang === 'ar' ? 'فشل إنشاء كود الربط' : 'Failed to generate pairing code')
    }
  }, [API, lang])

  useEffect(() => {
    generatePairing()
  }, [])

  useEffect(() => {
    if (canvasRef.current && pairing?.qrData) {
      QRCode.toCanvas(canvasRef.current, pairing.qrData, {
        width: 200,
        margin: 2,
        color: { dark: '#1f2937', light: '#ffffff' },
      })
    }
  }, [pairing?.qrData])

  /* Poll pairing status */
  useEffect(() => {
    if (!pairing?.code || pairingStatus === 'paired') return
    const int = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/pairing/check?code=${pairing.code}`)
        const data = await res.json()
        if (data.success && data.status === 'paired') {
          setPairingStatus('paired')
          setStatusMsg(t('paired_success', lang))
          clearInterval(int)
        }
      } catch { }
    }, 3000)
    return () => clearInterval(int)
  }, [pairing?.code, pairingStatus, API, lang])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [timeLeft, setTimeLeft] = useState('')
  const getTimeLeft = useCallback(() => {
    if (!pairing?.expiresAt) return ''
    const diff = new Date(pairing.expiresAt).getTime() - Date.now()
    if (diff <= 0) return t('expired', lang)
    const min = Math.floor(diff / 60000)
    const sec = Math.floor((diff % 60000) / 1000)
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }, [pairing?.expiresAt, lang])

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [getTimeLeft])

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('mobile_app', lang)}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('mobile_app_desc', lang)}</p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">

        {/* ─── Pairing Section ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--accent-bg)' }}>
              <Smartphone className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pair_phone', lang)}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('pair_phone_desc', lang)}</p>
            </div>
          </div>

          {pairingStatus === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          )}

          {pairingStatus === 'error' && (
            <div className="text-center py-6">
              <XCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-500 mb-3">{statusMsg}</p>
              <button onClick={generatePairing} className="btn-accent text-sm px-4 py-2">
                {lang === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
              </button>
            </div>
          )}

          {pairing && (
            <>
              <div className="flex justify-center mb-5">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <canvas ref={canvasRef} className="block" />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">
                  {t('activation_code', lang)} ({t('activation_code_hint', lang)})
                </label>
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-gray-100 dark:bg-gray-900 rounded-lg px-5 py-3 text-center" dir="ltr">
                    <span className="text-2xl font-bold tracking-[0.25em]" style={{ color: 'var(--accent)' }}>
                      {pairing.code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(pairing.code)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className={`font-mono ${timeLeft === t('expired', lang) ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {timeLeft}
                  </span>
                </div>
                <button
                  onClick={generatePairing}
                  className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('regenerate', lang)}
                </button>
              </div>

              {pairingStatus === 'paired' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm text-green-700 dark:text-green-400">{statusMsg}</span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 text-center">
                  {t('or_open_link', lang)}
                </p>
                <div
                  className="flex items-center gap-2 justify-center text-xs font-medium cursor-pointer"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => handleCopy(pairing.qrData)}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span dir="ltr" className="truncate max-w-[260px]">{pairing.qrData}</span>
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ─── Install Section ─── */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('install_app', lang)}
            </h2>
          </div>
          <ol className="space-y-2 mb-4">
            {['pair_steps_1', 'pair_steps_2', 'pair_steps_3', 'pair_steps_4'].map((key, i) => (
              <li key={key} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: 'var(--accent)' }}>{i + 1}</span>
                {t(key, lang)}
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{t('pair_after_install', lang)}</p>
        </div>
      </div>
    </div>
  )
}
