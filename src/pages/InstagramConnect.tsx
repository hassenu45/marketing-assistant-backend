import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { FiInstagram, FiCheckCircle, FiAlertCircle, FiTrash2, FiRefreshCw, FiExternalLink } from 'react-icons/fi'

const API = import.meta.env.VITE_API_URL || ''

interface Connection {
  _id: string
  instagramAccountId: string
  instagramBusinessName: string
  instagramUserId: string
  pageId: string
  isActive: boolean
  createdAt: string
}

export default function InstagramConnect() {
  const { lang } = useLanguage()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/connections`)
      const data = await res.json()
      if (data.success) setConnections(data.connections)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  /* Listen for OAuth popup messages */
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return
      if (event.data.success) {
        setMsg({ type: 'success', text: `Instagram connected! Account: ${event.data.instagramAccountId}` })
        fetchConnections()
      } else if (event.data.message) {
        setMsg({ type: 'error', text: event.data.message })
      }
      setConnecting(false)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [fetchConnections])

  /* Check if redirected back after OAuth (fallback if popup blocked) */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')
    if (success === 'true') {
      setMsg({ type: 'success', text: lang === 'ar' ? 'تم ربط إنستغرام بنجاح!' : 'Instagram connected successfully!' })
      fetchConnections()
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (error) {
      setMsg({ type: 'error', text: decodeURIComponent(error) })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [lang, fetchConnections])

  const handleConnect = () => {
    setConnecting(true)
    setMsg(null)
    const w = 600
    const h = 700
    const left = window.screenX + (window.innerWidth - w) / 2
    const top = window.screenY + (window.innerHeight - h) / 2
    const popup = window.open(
      `${API}/api/auth/instagram`,
      'instagram-auth',
      `width=${w},height=${h},left=${left},top=${top},popup=1`
    )
    if (!popup || popup.closed) {
      /* Popup blocked — fallback to redirect */
      window.location.href = `${API}/api/auth/instagram?redirect=${encodeURIComponent(window.location.origin + '/instagram-connect')}`
    }
  }

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/connections/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setConnections(prev => prev.filter(c => c._id !== id))
        setMsg({ type: 'success', text: lang === 'ar' ? 'تم فصل الحساب' : 'Account disconnected' })
      }
    } catch {
      setMsg({ type: 'error', text: lang === 'ar' ? 'فشل الفصل' : 'Failed to disconnect' })
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-10">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 rounded-xl">
            <FiInstagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'ربط إنستغرام' : 'Connect Instagram'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lang === 'ar' ? 'اربط حساب إنستغرام بزنس لإدارة الرسائل والرد التلقائي' : 'Link your Instagram Business account for DM management and auto-reply'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <FiRefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Connected accounts */}
            {connections.length > 0 && (
              <div className="space-y-3 mb-6">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {lang === 'ar' ? 'الحسابات المرتبطة' : 'Connected Accounts'}
                </p>
                {connections.map(conn => (
                  <div key={conn._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-500/20 to-pink-500/20">
                        <FiInstagram className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conn.instagramBusinessName || conn.instagramAccountId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                          ID: {conn.instagramAccountId}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(conn._id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition shrink-0"
                      title={lang === 'ar' ? 'فصل' : 'Disconnect'}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Connect button */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {connecting ? (
                <FiRefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <FiInstagram className="w-5 h-5" />
              )}
              {connecting
                ? (lang === 'ar' ? 'جاري الربط...' : 'Connecting...')
                : (lang === 'ar' ? 'ربط مع إنستغرام' : 'Connect with Instagram')}
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
              {lang === 'ar'
                ? 'سيتم فتح نافذة لتسجيل الدخول عبر فيسبوك. إذا تم حظر النافذة المنبثقة، سيتم تحويلك تلقائياً.'
                : 'A Facebook login popup will open. If blocked, you\'ll be redirected automatically.'}
            </p>
          </>
        )}

        {msg && (
          <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-sm ${
            msg.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {msg.type === 'success' ? <FiCheckCircle className="w-4 h-4 shrink-0" /> : <FiAlertCircle className="w-4 h-4 shrink-0" />}
            {msg.text}
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
            {lang === 'ar' ? 'ماذا ستحتاج؟' : 'Requirements'}
          </p>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5 shrink-0">•</span>
              {lang === 'ar' ? 'حساب فيسبوك مع صفحة مرتبطة بحساب إنستغرام بزنس' : 'Facebook account with a Page linked to an Instagram Business account'}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 mt-0.5 shrink-0">•</span>
              <span>{lang === 'ar' ? 'FB_APP_ID و FB_APP_SECRET مضبوطين في إعدادات السيرفر' : 'FB_APP_ID and FB_APP_SECRET configured in server environment'}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
