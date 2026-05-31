import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import db, { exportDatabase, importDatabase as importDB, type Order, type OrderStatus, type Platform } from '../db/database'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiDownload, FiUpload, FiTruck } from 'react-icons/fi'

const emptyForm = {
  customerName: '', phone: '', platform: 'whatsapp' as Platform,
  itemDescription: '', status: 'pending' as OrderStatus,
  price: 0, currency: 'SAR', notes: '', source: '',
}

export default function Orders() {
  const { lang } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Order | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = () => {
    db.orders.reverse().sortBy('createdAt').then(setOrders)
  }

  const filtered = orders.filter(o => {
    const matchSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || o.phone.includes(search) || o.itemDescription.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (order: Order) => {
    setEditing(order)
    setForm({
      customerName: order.customerName,
      phone: order.phone,
      platform: order.platform,
      itemDescription: order.itemDescription,
      status: order.status,
      price: order.price,
      currency: order.currency,
      notes: order.notes,
      source: order.source,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await db.orders.update(editing.id!, { ...form, updatedAt: new Date().toISOString() })
        setToast({ message: t('success', lang), type: 'success' })
      } else {
        await db.orders.add({ ...form, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), arrivalNotified: 0 })
        setToast({ message: t('success', lang), type: 'success' })
      }
      setModalOpen(false)
      loadOrders()
    } catch {
      setToast({ message: t('error', lang), type: 'error' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirm_delete', lang))) return
    await db.orders.delete(id)
    setToast({ message: t('success', lang), type: 'success' })
    loadOrders()
  }

  const handleExport = async () => {
    const json = await exportDatabase()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marketing-assistant-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setToast({ message: t('success', lang), type: 'success' })
  }

  const handleMarkArrived = async (order: Order) => {
    await db.orders.update(order.id!, { status: 'arrived', arrivalNotified: 1 })
    const template = await db.arrivalTemplates.where('platform').equals(order.platform).first()
    await db.chatMessages.add({
      orderId: order.id,
      platform: order.platform,
      customerName: order.customerName,
      phone: order.phone,
      content: template?.message ?? 'Your order has arrived!',
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
    } as any)
    setToast({ message: t('success', lang), type: 'success' })
    loadOrders()
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      await importDB(text)
      setToast({ message: t('success', lang), type: 'success' })
      loadOrders()
    }
    input.click()
  }

  const statuses: (OrderStatus | 'all')[] = ['all', 'pending', 'confirmed', 'processing', 'arrived', 'delivered', 'cancelled']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('orders', lang)}</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-outline flex items-center gap-2 text-sm" title={t('export', lang)}>
            <FiDownload /> {t('export', lang)}
          </button>
          <button onClick={handleImport} className="btn-outline flex items-center gap-2 text-sm" title={t('import', lang)}>
            <FiUpload /> {t('import', lang)}
          </button>
          <button onClick={openNew} className="btn-accent flex items-center gap-2 text-sm">
            <FiPlus /> {t('new_order', lang)}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            className="input-field pr-9"
            placeholder={t('search', lang)}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={statusFilter === s ? { backgroundColor: 'var(--accent)' } : {}}
            >
              {s === 'all' ? t('all', lang) : t(s, lang)}
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
                  <th className="text-right px-4 py-3 font-medium">#</th>
                  <th className="text-right px-4 py-3 font-medium">{t('customer_name', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('phone', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('platform', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('item', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('price', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('status', lang)}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('date', lang)}</th>
                  <th className="text-center px-4 py-3 font-medium">{t('actions', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">{order.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{order.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dir-left text-left" dir="ltr">{order.phone}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {order.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{order.itemDescription}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{order.price.toFixed(2)} {order.currency}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {order.status !== 'arrived' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <button onClick={() => handleMarkArrived(order)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title={t('mark_arrived', lang)}>
                            <FiTruck className="text-sm" />
                          </button>
                        )}
                        <button onClick={() => openEdit(order)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                          <FiEdit2 className="text-sm" />
                        </button>
                        <button onClick={() => handleDelete(order.id!)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
            <input className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('platform', lang)}</label>
            <select className="input-field" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform }))}>
              <option value="whatsapp">{t('whatsapp', lang)}</option>
              <option value="instagram">{t('instagram', lang)}</option>
              <option value="telegram">{t('telegram', lang)}</option>
              <option value="other">{t('other', lang)}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('status', lang)}</label>
            <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as OrderStatus }))}>
              {(['pending', 'confirmed', 'processing', 'arrived', 'delivered', 'cancelled'] as OrderStatus[]).map(s => (
                <option key={s} value={s}>{t(s, lang)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('item', lang)}</label>
            <input className="input-field" value={form.itemDescription} onChange={e => setForm(f => ({ ...f, itemDescription: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('price', lang)}</label>
              <input type="number" className="input-field" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('currency', lang)}</label>
              <input className="input-field" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('source', lang)}</label>
            <input className="input-field" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('notes', lang)}</label>
            <textarea className="input-field resize-none" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
