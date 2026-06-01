import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import AIConfig from './pages/AIConfig'
import Broadcast from './pages/Broadcast'
import MobileApp from './pages/MobileApp'
import { seedDefaults } from './db/database'
import { FiMenu } from 'react-icons/fi'
import { WifiOff } from 'lucide-react'

function AppLayout() {
  const { lang } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  useEffect(() => { seedDefaults() }, [])

  if (!isOnline) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 items-center justify-center p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-sm">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
            <WifiOff className="text-4xl text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {lang === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No Internet Connection'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            {lang === 'ar'
              ? 'عذراً، يتطلب تطبيق المساعد التسويقي اتصالاً نشطاً بالإنترنت للعمل. يرجى التحقق من الشبكة وإعادة المحاولة 🌐'
              : 'Sorry, the Marketing Assistant app requires an active internet connection. Please check your network and try again 🌐'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FiMenu className="text-xl" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white flex-1 text-center">
            {lang === 'ar' ? 'المساعد التسويقي' : 'Marketing Assistant'}
          </h1>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/ai-customization" element={<AIConfig />} />
            <Route path="/broadcast" element={<Broadcast />} />
            <Route path="/mobile-app" element={<MobileApp />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AppLayout />
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
