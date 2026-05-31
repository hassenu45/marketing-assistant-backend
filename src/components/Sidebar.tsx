import { NavLink } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import { t } from '../i18n/translations'
import { FiGrid, FiShoppingBag, FiMessageCircle, FiSettings, FiMoon, FiSun, FiX } from 'react-icons/fi'
import { Bot } from 'lucide-react'

const links = [
  { to: '/', icon: FiGrid, label: 'dashboard' },
  { to: '/orders', icon: FiShoppingBag, label: 'orders' },
  { to: '/chat', icon: FiMessageCircle, label: 'chat' },
  { to: '/ai-customization', icon: Bot, label: 'ai_customization' },
  { to: '/settings', icon: FiSettings, label: 'settings' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { lang } = useLanguage()
  const { dark, toggle } = useTheme()
  const isRtl = lang === 'ar'

  const sidebarContent = (
    <aside
      className={`h-full w-[256px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col py-4 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
      }`}
      style={{ position: 'fixed', top: 0, bottom: 0, [isRtl ? 'right' : 'left']: 0, zIndex: 50 }}
    >
      <div className="px-4 pb-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white text-center flex-1">
          {t('app_name', lang)}
        </h1>
        <button onClick={onClose} className="md:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <FiX className="text-xl" />
        </button>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`
            }
            style={({ isActive }) => isActive ? { backgroundColor: 'var(--accent)' } : {}}
          >
            <Icon className="text-lg" />
            <span>{t(label, lang)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {dark ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
          <span>{dark ? t('light', lang) : t('dark', lang)}</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar: always visible on md+ */}
      <aside className="hidden md:flex h-full w-[256px] shrink-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex-col py-4">
        <div className="px-4 pb-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white text-center">
            {t('app_name', lang)}
          </h1>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: 'var(--accent)' } : {}}
            >
              <Icon className="text-lg" />
              <span>{t(label, lang)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {dark ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
            <span>{dark ? t('light', lang) : t('dark', lang)}</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar: drawer overlay */}
      <div className="md:hidden">
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
            onClick={onClose}
          />
        )}
        {sidebarContent}
      </div>
    </>
  )
}
