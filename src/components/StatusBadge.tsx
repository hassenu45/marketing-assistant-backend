import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import type { OrderStatus } from '../db/database'

const statusConfig: Record<OrderStatus, { bg: string; text: string; dot: string }> = {
  pending:    { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-400' },
  confirmed:  { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-700 dark:text-blue-400',   dot: 'bg-blue-400' },
  processing: { bg: 'bg-indigo-50 dark:bg-indigo-900/20',  text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-400' },
  arrived:    { bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-700 dark:text-green-400',  dot: 'bg-green-400' },
  delivered:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-400' },
  cancelled:  { bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-700 dark:text-red-400',     dot: 'bg-red-400' },
}

interface StatusBadgeProps {
  status: OrderStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { lang } = useLanguage()
  const config = statusConfig[status] || statusConfig.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {t(status, lang)}
    </span>
  )
}
