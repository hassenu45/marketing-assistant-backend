import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import db, { type AIConfig } from '../db/database'
import { Bot, Sparkles } from 'lucide-react'
import { Switch } from '@radix-ui/react-switch'

export default function AIConfig() {
  const { lang } = useLanguage()
  const [config, setConfig] = useState<AIConfig>({
    id: 1, enabled: 0, businessContext: '', aiTone: 'friendly', handlingRules: '', updatedAt: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    const configs = await db.aiConfigs.toArray()
    if (configs.length > 0) setConfig(configs[0])
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await db.aiConfigs.update(config.id!, { ...config, updatedAt: new Date().toISOString() })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save AI config:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleEnabled = () => {
    setConfig(prev => ({ ...prev, enabled: prev.enabled === 1 ? 0 : 1 }))
  }

  const tones = [
    { value: 'friendly', label: t('tone_friendly', lang) },
    { value: 'professional', label: t('tone_professional', lang) },
    { value: 'persuasive', label: t('tone_persuasive', lang) },
  ]

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('ai_response_customization', lang)}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('ai_subtitle', lang)}</p>
      </div>

      <div className="space-y-4">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-card shadow-sm">
          <div className="flex items-center gap-3">
            <Bot className="text-2xl" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('ai_enabled', lang)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {config.enabled === 1 ? t('ai_enabled', lang) : t('ai_disabled', lang)}
              </p>
            </div>
          </div>
          <Switch
            checked={config.enabled === 1}
            onCheckedChange={toggleEnabled}
            className="h-5 w-9"
            aria-label={t('ai_enabled', lang)}
          />
        </div>

        {/* Business Context */}
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('business_context', lang)}
          </label>
          <textarea
            className="input-field w-full min-h-[90px] resize-y"
            placeholder={t('business_context_placeholder', lang)}
            value={config.businessContext}
            onChange={(e) => setConfig(prev => ({ ...prev, businessContext: e.target.value }))}
          />
        </div>

        {/* AI Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('ai_tone', lang)}
          </label>
          <div className="flex flex-wrap gap-2">
            {tones.map((tone) => (
              <label key={tone.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                config.aiTone === tone.value
                  ? 'border-accent bg-accent-50 dark:bg-accent-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
              }`}>
                <input
                  type="radio"
                  name="aiTone"
                  value={tone.value}
                  checked={config.aiTone === tone.value}
                  onChange={(e) => setConfig(prev => ({ ...prev, aiTone: e.target.value }))}
                  className="h-4 w-4 accent-current"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{tone.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Handling Rules */}
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('handling_rules', lang)}
          </label>
          <textarea
            className="input-field w-full min-h-[120px] resize-y"
            placeholder={t('handling_rules_placeholder', lang)}
            value={config.handlingRules}
            onChange={(e) => setConfig(prev => ({ ...prev, handlingRules: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {success && (
          <span className="text-green-600 dark:text-green-400 text-sm font-medium transition-opacity duration-300">
            ✅ {t('settings_saved', lang)}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          className={`btn-accent px-6 py-2.5 text-sm flex items-center gap-2 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
              <span>{t('saving', lang)}</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>{t('save_settings', lang)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
