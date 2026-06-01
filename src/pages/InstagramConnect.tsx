import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { FiInstagram, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff, FiCopy } from 'react-icons/fi'

export default function InstagramConnect() {
  const { lang } = useLanguage()
  const [accountId, setAccountId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !accessToken) {
      setMsg({ type: 'error', text: 'Please fill in both fields' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramAccountId: accountId,
          accessToken,
          instagramUserId: accountId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg({ type: 'success', text: 'Instagram connected successfully!' })
        setAccountId('')
        setAccessToken('')
      } else {
        setMsg({ type: 'error', text: data.message || 'Connection failed' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Server error. Check your connection.' })
    }
    setSaving(false)
  }

  return (
    <div className="max-w-lg mx-auto mt-10">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 rounded-xl">
            <FiInstagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Connect Instagram</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Enter your Instagram Business details</p>
          </div>
        </div>

        <form onSubmit={handleConnect} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Instagram Business Account ID
            </label>
            <input
              type="text"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              placeholder="17841400000000000"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Page Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="EAA..."
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showToken ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <FiInstagram className="w-5 h-5" />
            )}
            {saving ? 'Connecting...' : 'Connect Instagram'}
          </button>
        </form>

        {msg && (
          <div className={`mt-4 flex items-center gap-2 p-3 rounded-xl text-sm ${
            msg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {msg.type === 'success' ? <FiCheckCircle className="w-4 h-4 shrink-0" /> : <FiAlertCircle className="w-4 h-4 shrink-0" />}
            {msg.text}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">How to get these details:</p>
          <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Go to <span className="font-mono">developers.facebook.com</span> → Tools → Graph API Explorer</li>
            <li>Select your app and Page, get the Page Access Token</li>
            <li>Get your Instagram Business Account ID from your Page settings</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
