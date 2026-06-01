import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import db from '../db/database'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiRefreshCw, FiDownload } from 'react-icons/fi'
import * as XLSX from 'xlsx'
import { API_URL } from '../config'

const emptyForm = {
  customerName: '',
  customerPhone: '',
  deliveryAddress: { governorate: '', city: '', details: '' },
  orderDetails: '',
  totalPrice: 0,
  currency: 'SAR',
  orderStatus: 'Pending',
}

export default function Orders() {
  const { lang } = useLanguage()
  const [orders, setOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadOrders() }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/orders`)
      const data = await res.json()
      if (data.success) setOrders(data.orders)
    } catch {
      const cached = await db.orders.toArray()
      setOrders(cached.map(o => ({
        _id: o.id,
        customerName: o.customerName,
        customerPhone: o.phone,
        orderDetails: o.itemDescription,
        totalPrice: o.price,
        currency: o.currency,
        orderStatus: o.status,
        createdAt: o.createdAt,
      })))
    } finally {
      setLoading(false)
    }
  }

  const filtered = orders.filter(o => {
    const matchSearch = (o.customerName || '').toLowerCase().includes(search.toLowerCase())
      || (o.customerPhone || '').includes(search)
      || (o.orderDetails || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.orderStatus === statusFilter
    return matchSearch && matchStatus
  })

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }

  const openEdit = (order: any) => {
    setEditing(order)
    setForm({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress || { governorate: '', city: '', details: '' },
      orderDetails: order.orderDetails,
      totalPrice: order.totalPrice,
      currency: order.currency,
      orderStatus: order.orderStatus,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        const res = await fetch(`${API_URL}/api/orders/${editing._id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.message)
      } else {
        const res = await fetch(`${API_URL}/api/orders`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.message)
      }
      setToast({ message: t('success', lang), type: 'success' })
      setModalOpen(false)
      loadOrders()
    } catch {
      setToast({ message: t('error', lang), type: 'error' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete', lang))) return
    try {
      const res = await fetch(`${API_URL}/api/orders/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      setToast({ message: t('success', lang), type: 'success' })
      loadOrders()
    } catch {
      setToast({ message: t('error', lang), type: 'error' })
    }
  }

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((o, i) => ({
        '#': i + 1,
        [t('customer_name', lang)]: o.customerName,
        [t('phone', lang)]: o.customerPhone,
        [t('item', lang)]: o.orderDetails,
        [t('price', lang)]: o.totalPrice,
        [t('currency', lang)]: o.currency,
        [t('status', lang)]: o.orderStatus,
        [t('date', lang)]: new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US'),
      }))
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, `orders_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const statuses = ['all', 'Pending', 'Confirmed', 'Processing', 'Arrived', 'Delivered', 'Cancelled']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('orders', lang)}</h1>
        <div className="flex items-center gap-2">
          <button onClick={loadOrders} className="btn-outline flex items-center gap-2 text-sm">
            <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExport} className="btn-outline flex items-center gap-2 text-sm">
            <FiDownload /> {t('export_excel', lang)}
          </button>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 text-sm">
            <FiPlus /> {t('new_order', lang)}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input className="input-field pr-9" placeholder={t('search', lang)} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'text-white' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
              style={statusFilter === s ? { backgroundColor: 'var(--accent)' } : {}}>
              {s === 'all' ? t('all', lang) : t(s.toLowerCase(), lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-sm py-12 text-center">{t('no_orders', lang)}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-right px-4 py-3 font-medium">{t('customer_name', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('phone', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('item', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('price', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('status', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('date', lang)}</th>
                  <th className="text-center px-4 py-3 font-medium">{t('actions', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{order.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dir-left text-left" dir="ltr">{order.customerPhone}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{order.orderDetails}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{order.totalPrice?.toFixed(2)} {order.currency}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.orderStatus?.toLowerCase() || 'pending'} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(order)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <FiEdit2 className="text-sm" />
                        </button>
                        <button onClick={() => handleDelete(order._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('edit_order', lang) : t('new_order', lang)} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('customer_name', lang)}</label>
            <input className="input-field" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('phone', lang)}</label>
            <input className="input-field" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">المحافظة</label>
            <input className="input-field" value={form.deliveryAddress.governorate} onChange={e => setForm(f => ({ ...f, deliveryAddress: { ...f.deliveryAddress, governorate: e.target.value } }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">المدينة</label>
            <input className="input-field" value={form.deliveryAddress.city} onChange={e => setForm(f => ({ ...f, deliveryAddress: { ...f.deliveryAddress, city: e.target.value } }))} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">تفاصيل العنوان</label>
            <input className="input-field" value={form.deliveryAddress.details} onChange={e => setForm(f => ({ ...f, deliveryAddress: { ...f.deliveryAddress, details: e.target.value } }))} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">تفاصيل الطلب</label>
            <textarea className="input-field resize-none" rows={3} value={form.orderDetails} onChange={e => setForm(f => ({ ...f, orderDetails: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('price', lang)}</label>
            <input type="number" className="input-field" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('currency', lang)}</label>
            <input className="input-field" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('status', lang)}</label>
            <select className="input-field" value={form.orderStatus} onChange={e => setForm(f => ({ ...f, orderStatus: e.target.value }))}>
              {['Pending', 'Confirmed', 'Processing', 'Arrived', 'Delivered', 'Cancelled'].map(s => (
                <option key={s} value={s}>{t(s.toLowerCase(), lang)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={() => setModalOpen(false)} className="btn-outline text-sm">{t('cancel', lang)}</button>
          <button onClick={handleSave} className="btn-accent text-sm">{t('save', lang)}</button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
