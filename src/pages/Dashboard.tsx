import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import { t } from '../i18n/translations'
import db, { type Order, type OrderStatus } from '../db/database'
import StatusBadge from '../components/StatusBadge'
import { FiShoppingBag, FiClock, FiCheckCircle, FiXCircle, FiTrendingUp } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { lang } = useLanguage()
  const { accent } = useTheme()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [commission, setCommission] = useState(0)
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, cancelled: 0, revenue: 0 })

  useEffect(() => {
    Promise.all([
      db.orders.reverse().sortBy('createdAt'),
      db.aiConfigs.toArray(),
    ]).then(([data, configs]) => {
      setOrders(data.slice(0, 5))
      const total = data.length
      const pending = data.filter(o => o.status === 'pending').length
      const completed = data.filter(o => o.status === 'delivered').length
      const cancelled = data.filter(o => o.status === 'cancelled').length
      const revenue = data.reduce((s, o) => s + (o.status === 'delivered' ? o.price : 0), 0)
      setStats({ total, pending, completed, cancelled, revenue })

      const commPct = (configs[0]?.deliveryCommission ?? 0) / 100
      setCommission(commPct)

      const grouped: Record<string, { sales: number; commission: number }> = {}
      data.forEach(o => {
        const day = o.createdAt?.slice(0, 10)
        if (!day) return
        if (!grouped[day]) grouped[day] = { sales: 0, commission: 0 }
        grouped[day].sales += o.price
        grouped[day].commission += o.price * commPct
      })
      setChartData(
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, vals]) => ({
            date: date.slice(5),
            sales: Math.round(vals.sales * 100) / 100,
            commission: Math.round(vals.commission * 100) / 100,
          }))
      )
    })
  }, [])

  const cards = [
    { label: t('total_orders', lang), value: stats.total, icon: FiShoppingBag, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: t('pending_orders', lang), value: stats.pending, icon: FiClock, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { label: t('completed_orders', lang), value: stats.completed, icon: FiCheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: t('cancelled_orders', lang), value: stats.cancelled, icon: FiXCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard', lang)}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('this_week', lang)}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card p-4 ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
              <Icon className={`text-xl ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('sales_chart', lang)}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
              {t('total_sales', lang)}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="w-3 h-0.5 rounded-full bg-orange-500" />
              {t('net_commission', lang)}
            </div>
          </div>
        </div>
        {chartData.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">{t('no_orders', lang)}</p>
        ) : (
          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                <Line type="monotone" dataKey="sales" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name={t('total_sales', lang)} />
                <Line type="monotone" dataKey="commission" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name={t('net_commission', lang)} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('total_sales', lang)}</h2>
          <div className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--accent)' }}>
            <FiTrendingUp />
            {stats.revenue.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('recent_orders', lang)}</h2>
          <button onClick={() => navigate('/orders')} className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
            {t('view_all', lang)}
          </button>
        </div>
        {orders.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">{t('no_orders', lang)}</p>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customerName}</p>
                  <p className="text-xs text-gray-500">{order.itemDescription}</p>
                </div>
                <StatusBadge status={order.status as OrderStatus} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
