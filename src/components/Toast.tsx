import { useState, useEffect } from 'react'
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  onClose: () => void
}

const config = {
  success: { bg: 'bg-green-600', icon: FiCheckCircle },
  error:   { bg: 'bg-red-600',   icon: FiAlertCircle },
  info:    { bg: 'bg-gray-800 dark:bg-gray-700', icon: FiInfo },
}

export default function Toast({ message, type = 'info', onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  if (!visible) return null

  const { bg, icon: Icon } = config[type]

  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 ${bg} text-white px-4 py-3 rounded-xl shadow-lg text-sm min-w-[280px] max-w-sm`}>
      <Icon className="text-lg shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }}>
        <FiX className="text-lg" />
      </button>
    </div>
  )
}
