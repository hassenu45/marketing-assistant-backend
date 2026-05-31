import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { t } from '../i18n/translations'
import db, { type ChatMessage, type Order } from '../db/database'
import { FiSend, FiMessageCircle, FiUser, FiShoppingBag } from 'react-icons/fi'
import Modal from '../components/Modal'

export default function Chat() {
  const { lang } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [captureModal, setCaptureModal] = useState(false)
  const [capturePrice, setCapturePrice] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (selectedOrder) {
      loadMessages(selectedOrder.id!)
    }
  }, [selectedOrder])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadOrders = async () => {
    const data = await db.orders.reverse().sortBy('createdAt')
    setOrders(data)
    if (data.length > 0 && !selectedOrder) {
      setSelectedOrder(data[0])
    }
  }

  const loadMessages = async (orderId: number) => {
    const data = await db.chatMessages.where('orderId').equals(orderId).sortBy('timestamp')
    setMessages(data)
  }

  const filteredOrders = orders.filter(o =>
    o.customerName.toLowerCase().includes(search.toLowerCase()) || o.phone.includes(search)
  )

  const handleSend = async () => {
    if (!input.trim() || !selectedOrder?.id) return
    const msg: ChatMessage = {
      orderId: selectedOrder.id,
      platform: selectedOrder.platform,
      customerName: selectedOrder.customerName,
      phone: selectedOrder.phone,
      content: input.trim(),
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
    }
    const id = await db.chatMessages.add(msg)
    setMessages(prev => [...prev, { ...msg, id }])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSendAndCapture = async () => {
    if (!selectedOrder) return
    const itemGuess = messages.map(m => m.content).join(' ').substring(0, 80) + '...'
    await db.orders.add({
      customerName: selectedOrder.customerName,
      phone: selectedOrder.phone,
      platform: selectedOrder.platform,
      itemDescription: itemGuess,
      status: 'confirmed',
      price: parseFloat(capturePrice) || 0,
      currency: 'SAR',
      notes: '',
      source: 'chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      arrivalNotified: 0,
    })
    setCaptureModal(false)
    setCapturePrice('')
    loadOrders()
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return 'text-green-500'
      case 'instagram': return 'text-pink-500'
      case 'telegram': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      <div className="w-80 shrink-0 card flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <input
            className="input-field text-sm"
            placeholder={t('search', lang)}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <p className="text-gray-400 text-sm py-12 text-center">{t('no_chats', lang)}</p>
          ) : (
            filteredOrders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`w-full text-right px-3 py-3 border-b border-gray-100 dark:border-gray-700/50 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  selectedOrder?.id === order.id ? 'bg-gray-50 dark:bg-gray-800' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <FiUser className="text-sm text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{order.customerName}</p>
                    <p className="text-xs text-gray-500 truncate" dir="ltr">{order.phone}</p>
                  </div>
                  <FiMessageCircle className={`text-sm ${getPlatformColor(order.platform)}`} />
                </div>
                <p className="text-xs text-gray-400 truncate mt-1 mr-10">{order.itemDescription}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 card flex flex-col">
        {selectedOrder ? (
          <>
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <FiUser className="text-base text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedOrder.customerName}</p>
                  <p className="text-xs text-gray-500">
                    <span dir="ltr">{selectedOrder.phone}</span>
                    {' · '}
                    <span className={getPlatformColor(selectedOrder.platform)}>{selectedOrder.platform}</span>
                    {' · '}
                    <span className="text-gray-400">{t(selectedOrder.status, lang)}</span>
                  </p>
                </div>
                <button onClick={() => setCaptureModal(true)} className="btn-accent flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg">
                  <FiShoppingBag /> {t('new_order', lang)}
                </button>
              </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outgoing' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      msg.direction === 'outgoing'
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                    style={msg.direction === 'outgoing' ? { backgroundColor: 'var(--accent)' } : {}}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.direction === 'outgoing' ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {formatTime(msg.timestamp)}
                      {' · '}
                      {msg.direction === 'outgoing' ? t('outgoing', lang) : t('incoming', lang)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <input
                  className="input-field flex-1 text-sm"
                  placeholder={t('type_message', lang)}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button onClick={handleSend} className="btn-accent p-3 rounded-xl">
                  <FiSend className={`text-lg ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FiMessageCircle className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t('no_chats', lang)}</p>
            </div>
          </div>
        )}
      </div>

      <Modal open={captureModal} onClose={() => setCaptureModal(false)} title={t('new_order', lang)}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('customer_name', lang)}: <span className="font-medium text-gray-900 dark:text-white">{selectedOrder?.customerName}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('phone', lang)}: <span className="font-medium" dir="ltr">{selectedOrder?.phone}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('item', lang)}: <span className="font-medium text-gray-900 dark:text-white">
              {messages.map(m => m.content).join(' ').substring(0, 80)}...
            </span>
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('price', lang)}</label>
            <input type="number" className="input-field" value={capturePrice} onChange={e => setCapturePrice(e.target.value)} placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setCaptureModal(false)} className="btn-outline text-sm">{t('cancel', lang)}</button>
            <button onClick={handleSendAndCapture} className="btn-accent text-sm">{t('save', lang)}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
