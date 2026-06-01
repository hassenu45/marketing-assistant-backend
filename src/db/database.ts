import Dexie, { type Table } from 'dexie'

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'arrived' | 'delivered' | 'cancelled'
export type Platform = 'whatsapp' | 'instagram' | 'telegram' | 'other'

export interface Order {
  id?: number
  customerName: string
  phone: string
  platform: Platform
  itemDescription: string
  status: OrderStatus
  price: number
  currency: string
  notes: string
  source: string
  createdAt: string
  updatedAt: string
  arrivalNotified: number
}

export interface ChatMessage {
  id?: number
  orderId: number
  platform: Platform
  customerName: string
  phone: string
  content: string
  direction: 'incoming' | 'outgoing'
  timestamp: string
}

export interface BotConfig {
  id?: number
  platform: Platform
  apiToken: string
  webhookUrl: string
  active: number
  updatedAt: string
}

export interface ArrivalTemplate {
  id?: number
  platform: Platform
  message: string
  options: string
  active: number
}

export interface AppSetting {
  id?: number
  key: string
  value: string
}

export interface AIConfig {
  id?: number
  enabled: number
  businessContext: string
  aiTone: string
  handlingRules: string
  phoneFormat: string
  addressFormat: string
  deliveryCommission: number
  botDms: number
  botComments: number
  upsellingEnabled: number
  upsellingConditions: string
  couponEnabled: number
  couponCode: string
  couponDiscount: number
  couponExpiry: number
  autoReports: number
  loyaltyPoints: number
  updatedAt: string
}

class MarketingDatabase extends Dexie {
  orders!: Table<Order>
  chatMessages!: Table<ChatMessage>
  botConfigs!: Table<BotConfig>
  arrivalTemplates!: Table<ArrivalTemplate>
  appSettings!: Table<AppSetting>
  aiConfigs!: Table<AIConfig>

  constructor() {
    super('MarketingAssistant')
    this.version(1).stores({
      orders: '++id, customerName, phone, platform, status, createdAt, updatedAt, arrivalNotified',
      chatMessages: '++id, orderId, platform, customerName, phone, direction, timestamp',
      botConfigs: '++id, platform, active, updatedAt',
      arrivalTemplates: '++id, platform, active',
      appSettings: '++id, key, value',
      aiConfigs: '++id',
    })
  }
}

const db = new MarketingDatabase()

export async function exportDatabase(): Promise<string> {
  const orders = await db.orders.toArray()
  const messages = await db.chatMessages.toArray()
  const configs = await db.botConfigs.toArray()
  const templates = await db.arrivalTemplates.toArray()
  const settings = await db.appSettings.toArray()
  return JSON.stringify({ orders, messages, configs, templates, settings, exportedAt: new Date().toISOString() })
}

export async function importDatabase(json: string): Promise<void> {
  const data = JSON.parse(json)
  await db.transaction('rw', db.orders, db.chatMessages, db.botConfigs, db.arrivalTemplates, db.appSettings, async () => {
    await db.orders.clear()
    await db.chatMessages.clear()
    await db.botConfigs.clear()
    await db.arrivalTemplates.clear()
    await db.appSettings.clear()
    if (data.orders?.length) await db.orders.bulkAdd(data.orders)
    if (data.messages?.length) await db.chatMessages.bulkAdd(data.messages)
    if (data.configs?.length) await db.botConfigs.bulkAdd(data.configs)
    if (data.templates?.length) await db.arrivalTemplates.bulkAdd(data.templates)
    if (data.settings?.length) await db.appSettings.bulkAdd(data.settings)
  })
}

export async function seedDefaults(): Promise<void> {
  const count = await db.appSettings.count()
  if (count > 0) return

  await db.appSettings.bulkAdd([
    { key: 'shopName', value: 'متجري' },
    { key: 'currency', value: 'SAR' },
    { key: 'accentColor', value: 'teal' },
    { key: 'theme', value: 'light' },
    { key: 'language', value: 'ar' },
  ])

  await db.arrivalTemplates.bulkAdd([
    { platform: 'whatsapp', message: 'مرحباً {name}، طلبك رقم {orderId} وصل وجاهز للتسليم ✓', options: '[]', active: 1 },
    { platform: 'instagram', message: 'Hello {name}! Your order #{orderId} has arrived and is ready ✓', options: '[]', active: 1 },
  ])

  await db.aiConfigs.add({
    enabled: 0,
    businessContext: '',
    aiTone: 'friendly',
    handlingRules: '',
    updatedAt: new Date().toISOString()
  })
}

export default db
