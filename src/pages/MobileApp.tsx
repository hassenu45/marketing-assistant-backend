import { useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { Smartphone, Download, QrCode } from 'lucide-react'
import QRCode from 'qrcode'

export default function MobileApp() {
  const { lang } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appUrl = window.location.origin

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, appUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#1f2937', light: '#ffffff' },
      })
    }
  }, [appUrl])

  const handleInstall = () => {
    window.open(appUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('mobile_app', lang)}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('mobile_app_desc', lang)}</p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* QR Code Card */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-6 text-center">
          <div className="flex justify-center mb-4">
            <Smartphone className="text-4xl" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('scan_qr', lang)}</p>
          <div className="flex justify-center mb-4">
            <canvas ref={canvasRef} className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700" />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{t('or_open_link', lang)}</p>
          <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            <QrCode className="w-4 h-4" />
            <span dir="ltr">{appUrl}</span>
          </div>
        </div>

        {/* Install Button */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-6">
          <button
            onClick={handleInstall}
            className="w-full btn-accent py-3 text-sm flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span>{t('install_app', lang)}</span>
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center leading-relaxed">
            {lang === 'ar'
              ? 'يمكنك تثبيت التطبيق على هاتفك عبر متصفح كروم أو سفاري. افتح الرابط واضغط على "إضافة إلى الشاشة الرئيسية"'
              : 'You can install the app on your phone via Chrome or Safari. Open the link and tap "Add to Home Screen"'}
          </p>
        </div>
      </div>
    </div>
  )
}
