require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const mongoose = require('mongoose')
const Order = require('./models/Order')

const app = express()
const PORT = process.env.PORT || 3001
const CONFIG_PATH = path.join(__dirname, 'ai_config.json')
const RECIPIENTS_PATH = path.join(__dirname, 'recipients.json')
const GRAPH_API = 'https://graph.facebook.com/v21.0'

app.use(cors())
app.use(express.json({ limit: '10mb' }))

/* ─── MongoDB Connection ─── */
const MONGO_URI = process.env.MONGO_URI
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err.message))
}

let igConnected = false
let aiConfig = {
  enabled: false,
  businessContext: '',
  aiTone: 'friendly',
  handlingRules: '',
  phoneFormat: '',
  addressFormat: '',
  deliveryCommission: 0,
  botDms: true,
  botComments: false,
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
      aiConfig = { ...aiConfig, ...fileConfig }
    }
  } catch (err) {
    console.error('Failed to load config:', err.message)
  }
}

function saveConfigToFile(config) {
  aiConfig = { ...aiConfig, ...config }
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(aiConfig, null, 2))
    return true
  } catch (err) {
    console.error('Failed to save config:', err.message)
    return false
  }
}

loadConfig()

/* ─── Recipients (Instagram Contacts) ─── */
function loadRecipients() {
  try {
    if (fs.existsSync(RECIPIENTS_PATH)) {
      return JSON.parse(fs.readFileSync(RECIPIENTS_PATH, 'utf-8'))
    }
  } catch (err) {
    console.error('Failed to load recipients:', err.message)
  }
  return []
}

function saveRecipients(recipients) {
  try {
    fs.writeFileSync(RECIPIENTS_PATH, JSON.stringify(recipients, null, 2))
    return true
  } catch (err) {
    console.error('Failed to save recipients:', err.message)
    return false
  }
}

function addRecipient(senderId, senderName) {
  const recipients = loadRecipients()
  const existing = recipients.find(r => r.instagramId === senderId)
  if (existing) {
    existing.lastSeen = new Date().toISOString()
    if (senderName) existing.name = senderName
  } else {
    recipients.push({
      instagramId: senderId,
      name: senderName || senderId,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    })
  }
  saveRecipients(recipients)
}

/* ─── Gemini Campaign Generator ─── */
async function generateReply(messageText) {
  if (!process.env.GEMINI_API_KEY) return null
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const toneMap = {
    friendly: 'ودي ولطيف',
    professional: 'رسمي ومباشر',
    persuasive: 'تسويقي وحماسي',
  }

  const prompt = `أنت مساعد تسويقي ذكي لتاجر على إنستغرام. مهمتك الرد على العملاء واستخراج بيانات الطلب.
  
سياق العمل:
${aiConfig.businessContext || 'لا يوجد'}

نبرة الرد: ${toneMap[aiConfig.aiTone] || 'ودي ولطيف'}

صيغة سؤال رقم الهاتف:
${aiConfig.phoneFormat || 'اسأل العميل عن رقم هاتفه للتواصل'}

صيغة سؤال العنوان:
${aiConfig.addressFormat || 'اسأل العميل عن عنوان التوصيل (المحافظة، المدينة، التفاصيل)'}

قواعد التعامل:
${aiConfig.handlingRules || 'لا توجد قواعد خاصة'}

العميل يقول: "${messageText}"

قم بالآتي:
1. رد على العميل بلغة رسالته (عربي أو إنجليزي) - رد طبيعي يسأل عن المعلومات الناقصة لإنشاء الطلب (الاسم، رقم الهاتف، العنوان، تفاصيل الطلب).
2. إذا توفرت معلومات كافية لإنشاء طلب - أضف في نهاية ردك كتلة JSON بهذا الشكل:
---ORDER_START
{"customerName":"اسم العميل","customerPhone":"رقم الهاتف","governorate":"المحافظة","city":"المدينة","addressDetails":"تفاصيل العنوان","orderDetails":"تفاصيل الطلب","totalPrice":0}
---ORDER_END

إذا لم تكن المعلومات كافية، لا تضف كتلة JSON.`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

/* ─── Gemini Campaign Generator ─── */
async function generateCampaignText(idea) {
  if (!process.env.GEMINI_API_KEY) return null
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const toneMap = {
    friendly: 'ودي ولطيف',
    professional: 'رسمي ومباشر',
    persuasive: 'تسويقي وحماسي',
  }

  const prompt = `أنت مساعد تسويقي محترف. اكتب رسالة تسويقية مميزة وجذابة باللغة العربية (أو لغة الفكرة إذا كانت إنجليزية) بناءً على فكرة العرض التالية.

فكرة العرض: "${idea}"

سياق العمل:
${aiConfig.businessContext || 'لا يوجد'}

نبرة الرسالة: ${toneMap[aiConfig.aiTone] || 'تسويقي وحماسي'}

المطلوب:
- رسالة قصيرة جذابة (لا تتجاوز 300 حرف)
- تحفيزية وتشجع على الشراء
- مناسبة للإرسال الجماعي عبر إنستغرام
- لا تحتاج لرد من العميل (إعلان فقط)
- اكتب الرسالة فقط بدون مقدمات أو تذييل`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

/* ─── Send Instagram Message via Graph API ─── */
async function sendInstagramMessage(recipientId, text) {
  const token = process.env.IG_ACCESS_TOKEN
  const igUserId = process.env.IG_USER_ID
  if (!token || !igUserId) return false

  const url = `${GRAPH_API}/${igUserId}/messages`
  const body = { recipient: { id: recipientId }, message: { text } }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) console.error('Graph API error:', data)
    return res.ok
  } catch (err) {
    console.error('Send message error:', err.message)
    return false
  }
}

/* ─── Handle incoming Instagram message ─── */
async function handleInstagramMessage(senderId, messageText) {
  /* Save sender as recipient */
  addRecipient(senderId)

  if (!aiConfig.enabled || !process.env.GEMINI_API_KEY) return
  try {
    const reply = await generateReply(messageText)
    if (!reply) return

    /* Extract JSON block and create order */
    const jsonMatch = reply.match(/---ORDER_START\n?(.*?)\n?---ORDER_END/s)
    if (jsonMatch) {
      try {
        const orderData = JSON.parse(jsonMatch[1])
        const cleanedReply = reply.replace(/---ORDER_START[\s\S]*?---ORDER_END/, '').trim()
        if (orderData.customerName && orderData.customerPhone) {
          await Order.create({
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            deliveryAddress: {
              governorate: orderData.governorate || '',
              city: orderData.city || '',
              details: orderData.addressDetails || '',
            },
            orderDetails: orderData.orderDetails || '',
            totalPrice: orderData.totalPrice || 0,
            currency: 'SAR',
            orderStatus: 'Pending',
            source: 'instagram',
          })
        }
        if (cleanedReply) await sendInstagramMessage(senderId, cleanedReply)
      } catch (parseErr) {
        console.error('Order JSON parse error:', parseErr.message)
        await sendInstagramMessage(senderId, reply.replace(/---ORDER_START[\s\S]*?---ORDER_END/, '').trim())
      }
    } else {
      await sendInstagramMessage(senderId, reply)
    }
  } catch (err) {
    console.error('AI reply error:', err.message)
  }
}

/* ─── Webhook: Verification (GET) ─── */
app.get('/api/webhook/instagram', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.IG_VERIFY_TOKEN) {
    console.log('Instagram webhook verified!')
    return res.status(200).send(challenge)
  }
  res.sendStatus(403)
})

/* ─── Webhook: Receive events (POST) ─── */
app.post('/api/webhook/instagram', (req, res) => {
  const body = req.body

  if (body.object !== 'instagram') return res.sendStatus(400)

  for (const entry of body.entry || []) {
    /* رسائل مباشرة */
    for (const msg of entry.messaging || []) {
      const senderId = msg.sender?.id
      const text = msg.message?.text
      if (senderId && text) {
        handleInstagramMessage(senderId, text)
      }
    }

    /* تعليقات */
    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
        const val = change.value
        const text = val.text
        const fromId = val.from?.id
        if (fromId && text) {
          handleInstagramMessage(fromId, text)
        }
      }
    }
  }

  res.sendStatus(200)
})

/* ─── Instagram Status ─── */
app.get('/api/instagram/status', (req, res) => {
  const token = process.env.IG_ACCESS_TOKEN
  const igUserId = process.env.IG_USER_ID
  res.json({
    connected: !!(token && igUserId),
    enabled: aiConfig.enabled,
    aiTone: aiConfig.aiTone,
    businessContext: aiConfig.businessContext ? true : false,
    handlingRules: aiConfig.handlingRules ? true : false,
    botDms: aiConfig.botDms,
    botComments: aiConfig.botComments,
  })
})

/* ─── Save AI Config ─── */
app.post('/api/instagram/save-config', (req, res) => {
  const { enabled, businessContext, aiTone, handlingRules, phoneFormat, addressFormat, deliveryCommission, botDms, botComments } = req.body
  const config = {}
  if (enabled !== undefined) config.enabled = Boolean(enabled)
  if (businessContext !== undefined) config.businessContext = String(businessContext)
  if (aiTone !== undefined) config.aiTone = String(aiTone)
  if (handlingRules !== undefined) config.handlingRules = String(handlingRules)
  if (phoneFormat !== undefined) config.phoneFormat = String(phoneFormat)
  if (addressFormat !== undefined) config.addressFormat = String(addressFormat)
  if (deliveryCommission !== undefined) config.deliveryCommission = Number(deliveryCommission)
  if (botDms !== undefined) config.botDms = Boolean(botDms)
  if (botComments !== undefined) config.botComments = Boolean(botComments)

  const saved = saveConfigToFile(config)
  res.json({
    success: saved,
    message: saved ? 'Configuration saved successfully' : 'Failed to save configuration',
  })
})

/* ─── Send message manually ─── */
app.post('/api/instagram/send', async (req, res) => {
  const { recipientId, message } = req.body
  if (!recipientId || !message) {
    return res.status(400).json({ success: false, message: 'Missing recipientId or message' })
  }
  const ok = await sendInstagramMessage(recipientId, message)
  res.json({ success: ok })
})

/* ─── Webhook test panel ─── */
app.get('/api/webhook/instagram/test', (req, res) => {
  res.json({
    webhook_url: `${req.protocol}://${req.get('host')}/api/webhook/instagram`,
    verify_token: process.env.IG_VERIFY_TOKEN || 'لم يتم التعيين',
    access_token_set: !!process.env.IG_ACCESS_TOKEN,
    ig_user_id: process.env.IG_USER_ID || 'لم يتم التعيين',
  })
})

/* ─── Orders CRUD ─── */
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 })
    res.json({ success: true, orders })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    res.json({ success: true, order })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/orders', async (req, res) => {
  try {
    const order = await Order.create(req.body)
    res.status(201).json({ success: true, order })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

app.put('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    res.json({ success: true, order })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    res.json({ success: true, message: 'Order deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

const HOST = process.env.HOST || '0.0.0.0'

/* ─── Broadcast Endpoints ─── */
app.post('/api/broadcast/generate', async (req, res) => {
  const { idea } = req.body
  if (!idea) return res.status(400).json({ success: false, message: 'Campaign idea is required' })
  try {
    const text = await generateCampaignText(idea)
    if (!text) return res.status(500).json({ success: false, message: 'Failed to generate text (check GEMINI_API_KEY)' })
    res.json({ success: true, text })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.get('/api/broadcast/recipients', (req, res) => {
  const recipients = loadRecipients()
  res.json({ success: true, recipients, total: recipients.length })
})

app.post('/api/broadcast/send', async (req, res) => {
  const { message } = req.body
  if (!message) return res.status(400).json({ success: false, message: 'Message is required' })

  const token = process.env.IG_ACCESS_TOKEN
  const igUserId = process.env.IG_USER_ID
  if (!token || !igUserId) {
    return res.status(400).json({ success: false, message: 'Instagram not connected (no token)' })
  }

  const recipients = loadRecipients()
  if (recipients.length === 0) {
    return res.status(400).json({ success: false, message: 'No recipients found' })
  }

  let sent = 0
  const errors = []
  for (const recipient of recipients) {
    try {
      const ok = await sendInstagramMessage(recipient.instagramId, message)
      if (ok) sent++
      else errors.push(recipient.instagramId)
    } catch (err) {
      errors.push(recipient.instagramId)
    }
    /* Small delay to avoid rate limiting */
    await new Promise(r => setTimeout(r, 200))
  }

  res.json({
    success: sent > 0,
    sent,
    total: recipients.length,
    errors: errors.length > 0 ? errors : undefined,
  })
})

app.listen(PORT, HOST, () => {
  console.log(`Instagram Marketing Assistant Backend running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
  console.log(`Webhook URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/webhook/instagram`)
})
