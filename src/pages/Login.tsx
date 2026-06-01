import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import { Link } from 'react-router-dom'
import { FiInstagram } from 'react-icons/fi'

const CamoLogo = ({ size = 88 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="camoGrad" x1="15" y1="10" x2="85" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF1B6B" />
        <stop offset="50%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    <path d="M 78 28 A 32 32 0 1 0 78 72" stroke="url(#camoGrad)" strokeWidth="18" strokeLinecap="round" />
    <circle cx="68" cy="50" r="7.5" fill="url(#camoGrad)" />
  </svg>
)

export default function Login() {
  const { lang } = useLanguage()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center mb-12">
        <CamoLogo size={96} />
        <h1 className="text-3xl font-bold text-white tracking-tight mt-6">Camo</h1>
        <p className="text-gray-500 text-sm mt-1">Marketing Assistant</p>
      </div>

      <Link
        to="/instagram-connect"
        className="w-full max-w-sm flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-all duration-200"
      >
        <FiInstagram className="w-5 h-5" />
        Connect Instagram
      </Link>

      <p className="text-gray-600 text-xs mt-4 text-center max-w-xs">
        Connect your Instagram Business account to start automating replies
      </p>
    </div>
  )
}
