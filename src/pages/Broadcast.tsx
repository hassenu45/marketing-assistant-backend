import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { API_URL } from '../config'
import { Megaphone, Sparkles, Send, Users, Loader2 } from 'lucide-react'

export default function Broadcast() {
  const { lang } = useLanguage()
  const [idea, setIdea] = useState('')
  const [generatedText, setGeneratedText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [recipients, setRecipients] = useState<any[]>([])
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchRecipients = async () => {
    try {
      const res = await fetch(`${API_URL}/api/broadcast/recipients`)
      const data = await res.json()
      if (data.success) {
        setRecipients(data.recipients)
        setRecipientCount(data.recipients.length)
      }
    } catch {
      setRecipientCount(0)
    }
  }

  useEffect(() => { fetchRecipients() }, [])

  const handleGenerate = async () => {
    if (!idea.trim()) return
    setGenerating(true)
    setResult(null)
    try {
      const res = await fetch(`${API_URL}/api/broadcast/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedText(data.text)
      } else {
        setResult({ type: 'error', message: data.message || t('error', lang) })
      }
    } catch {
      setResult({ type: 'error', message: t('error', lang) })
    } finally {
      setGenerating(false)
    }
  }

  const handleSend = async () => {
    if (!generatedText.trim()) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`${API_URL}/api/broadcast/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: generatedText.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setResult({ type: 'success', message: `${t('broadcast_sent', lang)} (${data.sent}/${data.total})` })
        fetchRecipients()
      } else {
        setResult({ type: 'error', message: data.message || t('broadcast_failed', lang) })
      }
    } catch {
      setResult({ type: 'error', message: t('broadcast_failed', lang) })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('broadcast_campaign', lang)}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('broadcast', lang)}</p>
      </div>

      {/* Recipients count */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-card shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="text-2xl" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{t('recipients_count', lang)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {recipientCount === null ? '...' : recipientCount === 0 ? t('no_recipients', lang) : `${recipientCount} ${lang === 'ar' ? 'مستلم' : 'recipients'}`}
            </p>
          </div>
        </div>
        <button onClick={fetchRecipients} className="text-xs px-3 py-1.5 rounded-lg btn-outline">{t('refresh', lang)}</button>
      </div>

      {/* Campaign Idea */}
      <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
          <Megaphone className="w-4 h-4" /> {t('campaign_idea', lang)}
        </label>
        <textarea
          className="input-field w-full min-h-[80px] resize-y"
          placeholder={t('campaign_idea_placeholder', lang)}
          value={idea}
          onChange={e => setIdea(e.target.value)}
        />
        <button
          onClick={handleGenerate}
          disabled={generating || !idea.trim()}
          className={`btn-accent mt-3 px-5 py-2 text-sm flex items-center gap-2 ${generating || !idea.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? t('saving', lang) : t('generate_text', lang)}
        </button>
      </div>

      {/* Generated Text */}
      {generatedText && (
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('generated_text', lang)}</label>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {generatedText}
          </div>
          <button
            onClick={handleSend}
            disabled={sending}
            className={`btn-accent mt-4 px-6 py-2.5 text-sm flex items-center gap-2 ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? t('sending', lang) : t('send_to_all', lang)}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-lg text-sm font-medium ${result.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
          {result.message}
        </div>
      )}
    </div>
  )
}
