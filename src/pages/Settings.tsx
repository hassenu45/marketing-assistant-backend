import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import { t, type Lang } from '../i18n/translations'
import db, { exportDatabase, importDatabase as importDB, type BotConfig, type ArrivalTemplate, type Platform } from '../db/database'
import Toast from '../components/Toast'
import Modal from '../components/Modal'
import { FiSave, FiDownload, FiUpload, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Smartphone, WifiOff } from 'lucide-react'
import { API_URL } from '../config'

const accentColors: Record<string, string> = {
  teal: '#0d9488', blue: '#2563eb', emerald: '#059669',
  rose: '#e11d48', amber: '#d97706', sky: '#0284c7',
}

const accentOptions = [
  { key: 'teal', label: 'teal', color: '#0d9488' },
  { key: 'blue', label: 'blue', color: '#2563eb' },
  { key: 'emerald', label: 'emerald', color: '#059669' },
  { key: 'rose', label: 'rose', color: '#e11d48' },
  { key: 'amber', label: 'amber', color: '#d97706' },
  { key: 'sky', label: 'sky', color: '#0284c7' },
]

export default function Settings() {
  const { lang, setLang } = useLanguage()
  const { dark, toggle, accent, setAccent } = useTheme()
  const [configs, setConfigs] = useState<BotConfig[]>([])
  const [templates, setTemplates] = useState<ArrivalTemplate[]>([])
  const [shopName, setShopName] = useState('')
  const [currency, setCurrency] = useState('SAR')
  const [templateModal, setTemplateModal] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ platform: 'whatsapp' as Platform, message: '' })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    db.botConfigs.toArray().then(setConfigs)
    db.arrivalTemplates.toArray().then(setTemplates)
    db.appSettings.where('key').equals('shopName').first().then(s => s && setShopName(s.value))
    db.appSettings.where('key').equals('currency').first().then(s => s && setCurrency(s.value))

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/whatsapp/status`)
        const data = await res.json()
        setQrCode(data.qr || null)
        setConnected(data.ready || false)
        setPhoneNumber(data.phone || null)
      } catch {
        setConnected(false)
        setQrCode(null)
      }
    }, 3000)

    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  const saveShop = async () => {
    await db.appSettings.where('key').equals('shopName').modify({ value: shopName })
    await db.appSettings.where('key').equals('currency').modify({ value: currency })
    setToast({ message: t('success', lang), type: 'success' })
  }

  const handleExport = async () => {
    const json = await exportDatabase()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      await importDB(await file.text())
      setToast({ message: t('success', lang), type: 'success' })
    }
    input.click()
  }

  const addTemplate = async () => {
    if (!newTemplate.message.trim()) return
    await db.arrivalTemplates.add({ ...newTemplate, options: '[]', active: 1 })
    setTemplates(await db.arrivalTemplates.toArray())
    setTemplateModal(false)
    setNewTemplate({ platform: 'whatsapp', message: '' })
    setToast({ message: t('success', lang), type: 'success' })
  }

  const deleteTemplate = async (id: number) => {
    await db.arrivalTemplates.delete(id)
    setTemplates(await db.arrivalTemplates.toArray())
  }

  const toggleTemplate = async (id: number, active: number) => {
    await db.arrivalTemplates.update(id, { active: active ? 0 : 1 })
    setTemplates(await db.arrivalTemplates.toArray())
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings', lang)}</h1>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('shop_name', lang)}</h2>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('shop_name', lang)}</label>
            <input className="input-field" value={shopName} onChange={e => setShopName(e.target.value)} />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('currency', lang)}</label>
            <input className="input-field" value={currency} onChange={e => setCurrency(e.target.value)} />
          </div>
          <button onClick={saveShop} className="btn-accent flex items-center gap-2 text-sm"><FiSave /> {t('save', lang)}</button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('theme', lang)}</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">{dark ? t('dark', lang) : t('light', lang)}</span>
          <button onClick={toggle} className={`relative w-11 h-6 rounded-full transition-colors ${dark ? 'bg-accent' : 'bg-gray-300'}`} style={{ backgroundColor: dark ? 'var(--accent)' : undefined }}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('language', lang)}</h2>
        <div className="flex gap-2">
          <button onClick={() => setLang('ar')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${lang === 'ar' ? 'text-white border-transparent' : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'}`} style={lang === 'ar' ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>
            {t('arabic', lang)}
          </button>
          <button onClick={() => setLang('en')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${lang === 'en' ? 'text-white border-transparent' : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'}`} style={lang === 'en' ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>
            {t('english', lang)}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('accent_color', lang)}</h2>
        <div className="flex gap-3 flex-wrap">
          {accentOptions.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setAccent(key as 'teal' | 'blue' | 'emerald' | 'rose' | 'amber' | 'sky')}
              className={`w-10 h-10 rounded-full transition-transform ${accent === key ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 scale-110' : ''}`}
              style={{ backgroundColor: color }}
              title={t(label, lang)}
            />
          ))}
        </div>
      </div>

      {/* WhatsApp Smart Connection */}
      <div className={`card p-5 border-2 transition-colors ${
        connected
          ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
          : qrCode
            ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/10'
            : 'border-gray-200 dark:border-gray-700'
      }`}>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          إعدادات ربط الواتساب الذكي
        </h2>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-3 h-3 rounded-full ${
            connected ? 'bg-green-500' : qrCode ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <div>
            {connected ? (
              <p className="font-medium text-green-700 dark:text-green-300">
                الواتساب متصل حياً وجاهز للرد التلقائي 🟢
              </p>
            ) : qrCode ? (
              <p className="font-medium text-yellow-700 dark:text-yellow-300">
                يرجى مسح الرمز لربط رقم متجرك
              </p>
            ) : (
              <p className="font-medium text-gray-500 dark:text-gray-400">
                في انتظار الاتصال بالخادم...
              </p>
            )}
            {connected && phoneNumber && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1" dir="ltr">
                <Smartphone className="w-3.5 h-3.5" />
                {phoneNumber}
              </p>
            )}
            {!connected && !qrCode && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                تأكد من تشغيل الخادم على {API_URL}
              </p>
            )}
          </div>
        </div>
        {qrCode && !connected && (
          <img src={qrCode} alt="WhatsApp QR" className="w-48 h-48 mx-auto my-4 rounded-xl border-2 border-gray-200 dark:border-gray-600" />
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('arrival_templates', lang)}</h2>
          <button onClick={() => setTemplateModal(true)} className="btn-accent flex items-center gap-1 text-xs"><FiPlus /> {t('add_template', lang)}</button>
        </div>
        {templates.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">{t('no_products', lang)}</p>
        ) : (
          <div className="space-y-2">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <button onClick={() => toggleTemplate(tmpl.id!, tmpl.active)} className={`w-9 h-5 rounded-full transition-colors ${tmpl.active ? 'bg-accent' : 'bg-gray-300'}`} style={tmpl.active ? { backgroundColor: 'var(--accent)' } : {}}>
                  <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${tmpl.active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{tmpl.platform}</p>
                  <p className="text-xs text-gray-500 truncate">{tmpl.message}</p>
                </div>
                <button onClick={() => deleteTemplate(tmpl.id!)} className="p-1.5 text-gray-400 hover:text-red-500"><FiTrash2 className="text-sm" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('export_data', lang)}</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-outline flex items-center gap-2 text-sm flex-1 justify-center"><FiDownload /> {t('export', lang)}</button>
          <button onClick={handleImport} className="btn-outline flex items-center gap-2 text-sm flex-1 justify-center"><FiUpload /> {t('import', lang)}</button>
        </div>
      </div>

      <Modal open={templateModal} onClose={() => setTemplateModal(false)} title={t('add_template', lang)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('platform', lang)}</label>
            <select className="input-field" value={newTemplate.platform} onChange={e => setNewTemplate(f => ({ ...f, platform: e.target.value as Platform }))}>
              <option value="whatsapp">{t('whatsapp', lang)}</option>
              <option value="instagram">{t('instagram', lang)}</option>
              <option value="telegram">{t('telegram', lang)}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('arrival_message', lang)}</label>
            <textarea className="input-field resize-none" rows={4} value={newTemplate.message} onChange={e => setNewTemplate(f => ({ ...f, message: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setTemplateModal(false)} className="btn-outline text-sm">{t('cancel', lang)}</button>
            <button onClick={addTemplate} className="btn-accent text-sm">{t('save', lang)}</button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
