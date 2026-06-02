const API = import.meta.env.VITE_API_URL || ''

interface PendingItem {
  id: string
  type: 'sync_orders' | 'sync_config'
  payload: any
  attempts: number
  maxAttempts: number
  lastAttempt: number | null
}

const STORAGE_KEY = 'camo_sync_queue'

function getQueue(): PendingItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveQueue(queue: PendingItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

function getToken(): string | null {
  return localStorage.getItem('camo_device_token')
}

function isTokenExpired(data: any): boolean {
  return data?.code === 'token_expired'
}

async function refreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API}/api/pairing/refresh-token`, {
      method: 'POST',
      headers: { 'x-device-token': getToken() || '' },
    })
    const data = await res.json()
    if (data.success && data.deviceToken) {
      localStorage.setItem('camo_device_token', data.deviceToken)
      localStorage.setItem('camo_token_expires_at', data.expiresAt)
      return data.deviceToken
    }
    return null
  } catch {
    return null
  }
}

async function sendWithRetry(endpoint: string, body: any, token: string): Promise<any> {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-token': token,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()

  if (isTokenExpired(data)) {
    const newToken = await refreshToken()
    if (newToken) {
      const retryRes = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': newToken,
        },
        body: JSON.stringify(body),
      })
      return retryRes.json()
    }
    throw new Error('token_expired')
  }

  return data
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export function enqueue(type: PendingItem['type'], payload: any) {
  const queue = getQueue()
  queue.push({
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    type,
    payload,
    attempts: 0,
    maxAttempts: 5,
    lastAttempt: null,
  })
  saveQueue(queue)
  processQueue()
}

export async function processQueue() {
  const token = getToken()
  if (!token) return

  const queue = getQueue()
  if (queue.length === 0) return

  const remaining: PendingItem[] = []

  for (const item of queue) {
    if (item.attempts >= item.maxAttempts) {
      remaining.push(item)
      continue
    }

    const backoff = Math.min(1000 * Math.pow(2, item.attempts), 30000)

    if (item.lastAttempt && Date.now() - item.lastAttempt < backoff) {
      remaining.push(item)
      continue
    }

    try {
      let endpoint = ''
      let body = {}

      if (item.type === 'sync_orders') {
        endpoint = '/api/sync'
        body = { orders: item.payload }
      } else if (item.type === 'sync_config') {
        endpoint = '/api/sync'
        body = { config: item.payload }
      }

      const data = await sendWithRetry(endpoint, body, token)

      if (data.success) {
        continue
      }

      item.attempts++
      item.lastAttempt = Date.now()
      remaining.push(item)
    } catch {
      item.attempts++
      item.lastAttempt = Date.now()
      remaining.push(item)
    }
  }

  saveQueue(remaining)
}

export function getQueueStatus() {
  const queue = getQueue()
  return {
    pending: queue.length,
    items: queue.map(i => ({ type: i.type, attempts: i.attempts, maxAttempts: i.maxAttempts })),
  }
}

/* Listen for online/offline to retry */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => processQueue())
}

/* Attempt queue every 30s while there are pending items */
setInterval(() => {
  const queue = getQueue()
  if (queue.length > 0) processQueue()
}, 30000)
