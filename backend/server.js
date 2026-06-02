require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const mongoose = require('mongoose')
const Order = require('./models/Order')
const BusinessConnection = require('./models/BusinessConnection')
const PairingSession = require('./models/PairingSession')

const app = express()
const PORT = process.env.PORT || 3001
const CONFIG_PATH = path.join(__dirname, 'ai_config.json')
const RECIPIENTS_PATH = path.join(__dirname, 'recipients.json')
const GRAPH_API = 'https://graph.facebook.com/v21.0'

app.use(cors())
app.use(express.json({ limit: '10mb' }))

/* ─── Serve Frontend Static Files (optional) ─── */
const DIST_CANDIDATES = [
  path.join(__dirname, 'dist'),
  path.join(__dirname, '..', 'dist'),
]
for (const p of DIST_CANDIDATES) {
  if (fs.existsSync(p)) {
    app.use(express.static(p))
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next()
      res.sendFile(path.join(p, 'index.html'))
    })
    break
  }
}

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
  upsellingEnabled: false,
  upsellingConditions: '',
  couponEnabled: false,
  couponCode: '',
  couponDiscount: 0,
  couponExpiry: 30,
  autoReports: false,
  loyaltyPoints: false,
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

${aiConfig.upsellingEnabled ? `صياد المبيعات (شروط اقتراح منتجات إضافية):
${aiConfig.upsellingConditions || 'لا توجد شروط محددة'}` : ''}

${aiConfig.couponEnabled ? `القسائم الذكية:
- كود الخصم: ${aiConfig.couponCode || 'لا يوجد'}
- نسبة الخصم: ${aiConfig.couponDiscount}%
- مدة الصلاحية: ${aiConfig.couponExpiry} دقيقة
يمكنك إرسال كود الخصم للعميل إذا كان مناسباً.` : ''}

${aiConfig.loyaltyPoints ? 'نظام نقاط الولاء مفعل - يمكنك إخبار العميل بنقاطه إذا طلب.' : ''}

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

/* ─── Send Instagram Message via Graph API (multi-tenant) ─── */
async function sendInstagramMessage(recipientId, text, connection = null) {
  const token = connection?.accessToken || process.env.IG_ACCESS_TOKEN
  const igUserId = connection?.instagramUserId || process.env.IG_USER_ID
  if (!token || !igUserId) {
    console.warn('No token or IG user ID for', connection ? `account ${connection.instagramAccountId}` : 'env vars')
    return false
  }

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

/* ─── Handle incoming Instagram message (multi-tenant) ─── */
async function handleInstagramMessage(senderId, messageText, connection = null) {
  /* Save sender as recipient */
  addRecipient(senderId, connection)

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
        if (cleanedReply) await sendInstagramMessage(senderId, cleanedReply, connection)
      } catch (parseErr) {
        console.error('Order JSON parse error:', parseErr.message)
        await sendInstagramMessage(senderId, reply.replace(/---ORDER_START[\s\S]*?---ORDER_END/, '').trim(), connection)
      }
    } else {
      await sendInstagramMessage(senderId, reply, connection)
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
  const expected = process.env.IG_VERIFY_TOKEN

  if (mode === 'subscribe' && token === expected) {
    console.log('Webhook verified!')
    return res.status(200).send(challenge)
  }

  /* رسالة خطأ واضحة للتشخيص */
  console.warn(`Webhook verify failed: mode=${mode}, token=${token}, expected=${expected ? '***set***' : 'NOT_SET'}`)
  res.status(403).json({
    error: 'Verification failed',
    hint: !expected ? 'Set IG_VERIFY_TOKEN in Render env vars and redeploy' :
          mode !== 'subscribe' ? `Expected mode=subscribe, got ${mode}` :
          `Token mismatch (check IG_VERIFY_TOKEN)`,
    token_received: token || '(empty)',
    server_time: new Date().toISOString(),
  })
})

/* ─── Webhook: Receive events (POST) - Multi-tenant ─── */
app.post('/api/webhook/instagram', async (req, res) => {
  const body = req.body

  if (body.object !== 'instagram') return res.sendStatus(400)

  for (const entry of body.entry || []) {
    const accountId = entry.id
    if (!accountId) continue

    /* Look up connection by Instagram Business Account ID (multi-tenant) */
    let connection = null
    try {
      connection = await BusinessConnection.findOne({
        instagramAccountId: String(accountId),
        isActive: true,
      })
    } catch (err) {
      console.error('DB lookup error:', err.message)
    }

    /* رسائل مباشرة */
    for (const msg of entry.messaging || []) {
      const senderId = msg.sender?.id
      const text = msg.message?.text
      if (senderId && text) {
        handleInstagramMessage(senderId, text, connection)
      }
    }

    /* تعليقات */
    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
        const val = change.value
        const text = val.text
        const fromId = val.from?.id
        if (fromId && text) {
          handleInstagramMessage(fromId, text, connection)
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
    upsellingEnabled: aiConfig.upsellingEnabled,
    couponEnabled: aiConfig.couponEnabled,
    autoReports: aiConfig.autoReports,
    loyaltyPoints: aiConfig.loyaltyPoints,
  })
})

/* ─── Save AI Config ─── */
app.post('/api/instagram/save-config', (req, res) => {
  const { enabled, businessContext, aiTone, handlingRules, phoneFormat, addressFormat, deliveryCommission, botDms, botComments, upsellingEnabled, upsellingConditions, couponEnabled, couponCode, couponDiscount, couponExpiry, autoReports, loyaltyPoints } = req.body
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
  if (upsellingEnabled !== undefined) config.upsellingEnabled = Boolean(upsellingEnabled)
  if (upsellingConditions !== undefined) config.upsellingConditions = String(upsellingConditions)
  if (couponEnabled !== undefined) config.couponEnabled = Boolean(couponEnabled)
  if (couponCode !== undefined) config.couponCode = String(couponCode)
  if (couponDiscount !== undefined) config.couponDiscount = Number(couponDiscount)
  if (couponExpiry !== undefined) config.couponExpiry = Number(couponExpiry)
  if (autoReports !== undefined) config.autoReports = Boolean(autoReports)
  if (loyaltyPoints !== undefined) config.loyaltyPoints = Boolean(loyaltyPoints)

  const saved = saveConfigToFile(config)
  res.json({
    success: saved,
    message: saved ? 'Configuration saved successfully' : 'Failed to save configuration',
  })
})

/* ─── Send message manually (supports accountId for multi-tenant) ─── */
app.post('/api/instagram/send', async (req, res) => {
  const { recipientId, message, accountId } = req.body
  if (!recipientId || !message) {
    return res.status(400).json({ success: false, message: 'Missing recipientId or message' })
  }
  let connection = null
  if (accountId) {
    try {
      connection = await BusinessConnection.findOne({ instagramAccountId: String(accountId), isActive: true })
    } catch (_) {}
  }
  const ok = await sendInstagramMessage(recipientId, message, connection)
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

/* ─── Business Connections CRUD (multi-tenant) ─── */
app.get('/api/connections', async (req, res) => {
  try {
    const connections = await BusinessConnection.find({ isActive: true }).sort({ createdAt: -1 })
    res.json({ success: true, connections })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/connections', async (req, res) => {
  const { instagramAccountId, accessToken, instagramUserId, instagramBusinessName, pageId } = req.body
  if (!instagramAccountId || !accessToken || !instagramUserId) {
    return res.status(400).json({ success: false, message: 'Missing required fields: instagramAccountId, accessToken, instagramUserId' })
  }
  try {
    const existing = await BusinessConnection.findOne({ instagramAccountId: String(instagramAccountId) })
    if (existing) {
      Object.assign(existing, { accessToken, instagramUserId, instagramBusinessName, pageId, isActive: true })
      await existing.save()
      return res.json({ success: true, connection: existing, message: 'Connection updated' })
    }
    const connection = await BusinessConnection.create({
      userId: req.body.userId || '000000000000000000000000',
      instagramAccountId: String(instagramAccountId),
      accessToken,
      instagramUserId,
      instagramBusinessName: instagramBusinessName || '',
      pageId: pageId || '',
    })
    res.json({ success: true, connection, message: 'Connection created' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.delete('/api/connections/:id', async (req, res) => {
  try {
    await BusinessConnection.findByIdAndUpdate(req.params.id, { isActive: false })
    res.json({ success: true, message: 'Connection deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* ─── Instagram OAuth 2.0 ─── */
const crypto = require('crypto')
const oauthStateMap = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [key, val] of oauthStateMap) {
    if (now > val.expiresAt) oauthStateMap.delete(key)
  }
}, 60000)

app.get('/api/auth/instagram', (req, res) => {
  const appId = process.env.FB_APP_ID
  if (!appId) return res.status(500).send('<html><body><h2>FB_APP_ID not configured</h2><p>Set FB_APP_ID and FB_APP_SECRET in environment variables.</p></body></html>')

  const state = crypto.randomBytes(16).toString('hex')
  const redirect = req.query.redirect || ''
  oauthStateMap.set(state, { createdAt: Date.now(), expiresAt: Date.now() + 600000, redirect })

  const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/instagram/callback`
  const scope = 'instagram_business_basic,instagram_business_manage_messages,pages_show_list,pages_read_engagement'
  const fbUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=${encodeURIComponent(scope)}&response_type=code`

  res.redirect(fbUrl)
})

app.get('/api/auth/instagram/callback', async (req, res) => {
  const { code, state } = req.query

  const stateData = oauthStateMap.get(state)
  if (!state || !stateData) {
    return res.status(400).send(wrapPopupHtml('error', 'Invalid state parameter. Try again.'))
  }
  const redirectUrl = stateData.redirect
  oauthStateMap.delete(state)

  if (!code) {
    const msg = 'Authorization denied or missing code.'
    if (redirectUrl) return res.redirect(`${redirectUrl}?error=${encodeURIComponent(msg)}`)
    return res.status(400).send(wrapPopupHtml('error', msg))
  }

  const appId = process.env.FB_APP_ID
  const appSecret = process.env.FB_APP_SECRET
  const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/instagram/callback`

  try {
    const axios = require('axios')

    /* Exchange code for short-lived token */
    const tokenRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: { client_id: appId, client_secret: appSecret, code, redirect_uri: callbackUrl },
    })
    const shortToken = tokenRes.data.access_token

    /* Exchange for long-lived token (60 days) */
    const longRes = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken },
    })
    const longToken = longRes.data.access_token

    /* Get user's Pages */
    const pagesRes = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: { access_token: longToken },
    })
    const pages = pagesRes.data.data || []

    if (pages.length === 0) {
      const msg = 'No Facebook Pages found. Create a Page first and link Instagram.'
      if (redirectUrl) return res.redirect(`${redirectUrl}?error=${encodeURIComponent(msg)}`)
      return res.send(wrapPopupHtml('error', msg))
    }

    /* Find the first page that has an Instagram Business Account */
    let connected = false
    let resultData = null
    for (const page of pages) {
      try {
        const pageIgRes = await axios.get(`https://graph.facebook.com/v21.0/${page.id}`, {
          params: { fields: 'instagram_business_account', access_token: page.access_token },
        })
        const igAccount = pageIgRes.data.instagram_business_account
        if (igAccount) {
          await BusinessConnection.findOneAndUpdate(
            { instagramAccountId: String(igAccount.id) },
            {
              instagramAccountId: String(igAccount.id),
              accessToken: page.access_token,
              instagramUserId: String(igAccount.id),
              instagramBusinessName: page.name || '',
              pageId: page.id,
              isActive: true,
            },
            { upsert: true, new: true }
          )
          connected = true
          resultData = { instagramAccountId: igAccount.id, instagramBusinessName: page.name, pageId: page.id }
          break
        }
      } catch { }
    }

    if (!connected) {
      const msg = 'No Instagram Business Account linked to your Pages. Connect Instagram to a Page first.'
      if (redirectUrl) return res.redirect(`${redirectUrl}?error=${encodeURIComponent(msg)}`)
      return res.send(wrapPopupHtml('error', msg))
    }

    if (redirectUrl) {
      return res.redirect(`${redirectUrl}?success=true`)
    }
    res.send(wrapPopupHtml('success', '', resultData))
  } catch (err) {
    console.error('OAuth error:', err.response?.data || err.message)
    const msg = `OAuth failed: ${err.response?.data?.error?.message || err.message}`
    if (redirectUrl) return res.redirect(`${redirectUrl}?error=${encodeURIComponent(msg)}`)
    res.send(wrapPopupHtml('error', msg))
  }
})

function wrapPopupHtml(status, message, data = null) {
  const json = JSON.stringify({ success: status === 'success', message, ...(data || {}) })
  return `<!DOCTYPE html><html><body><script>
    const payload = ${json};
    if (window.opener) {
      try { window.opener.postMessage(payload, '*'); } catch {}
      window.close();
    } else {
      document.body.innerHTML = '<h2>' + (payload.success ? '✅ Connected!' : '❌ ' + payload.message) + '</h2>' +
        '<p>You can close this tab and return to the app.</p>';
    }
  </script></body></html>`
}

/* ─── Pairing / Mobile App Sync ─── */
app.post('/api/pairing/generate', async (req, res) => {
  try {
    const session = await PairingSession.generate(req.body.userId || '')
    res.json({
      success: true,
      code: session.code,
      token: session.token,
      qrData: `${req.protocol}://${req.get('host')}/pair?code=${session.code}`,
      expiresAt: session.expiresAt,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.get('/api/pairing/check', async (req, res) => {
  try {
    const session = await PairingSession.findOne({ code: String(req.query.code || '').toUpperCase() })
    if (!session) return res.json({ success: false, message: 'Not found' })
    res.json({
      success: true,
      status: session.status,
      pairedAt: session.pairedAt,
      deviceId: session.deviceId,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/pairing/verify', async (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ success: false, message: 'Missing code' })

  try {
    const session = await PairingSession.findOne({ code: String(code).toUpperCase(), status: 'pending' })
    if (!session) return res.status(404).json({ success: false, message: 'Invalid or expired code' })

    if (new Date() > session.expiresAt) {
      session.status = 'expired'
      await session.save()
      return res.status(410).json({ success: false, message: 'Code expired' })
    }

    const deviceToken = require('crypto').randomBytes(32).toString('hex')
    session.status = 'paired'
    session.deviceToken = deviceToken
    session.deviceTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    session.deviceId = req.body.deviceId || ''
    session.pairedAt = new Date()
    await session.save()

    res.json({
      success: true,
      deviceToken,
      session: {
        code: session.code,
        pairedAt: session.pairedAt,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/sync', async (req, res) => {
  const deviceToken = req.headers['x-device-token']
  if (!deviceToken) return res.status(401).json({ success: false, message: 'Missing device token' })

  try {
    const session = await PairingSession.findByDeviceToken(deviceToken)
    if (!session) {
      const expired = await PairingSession.findOne({ deviceToken, status: 'paired' })
      return res.status(401).json({
        success: false,
        code: expired ? 'token_expired' : 'invalid_token',
        message: expired ? 'Token expired, please re-pair or refresh' : 'Invalid or unpaired token',
      })
    }

    const { orders, config } = req.body
    const results = { orders: { synced: 0, errors: [] }, config: null }

    if (orders && Array.isArray(orders)) {
      for (const order of orders) {
        try {
          if (order._id) {
            await Order.findByIdAndUpdate(order._id, order, { upsert: true })
          } else {
            await Order.create(order)
          }
          results.orders.synced++
        } catch (err) {
          results.orders.errors.push(order.orderNumber || 'unknown')
        }
      }
    }

    if (config) {
      const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
      Object.assign(existing, config)
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2))
      results.config = existing
    }

    res.json({ success: true, ...results })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.get('/api/sync', async (req, res) => {
  const deviceToken = req.headers['x-device-token']
  if (!deviceToken) return res.status(401).json({ success: false, message: 'Missing device token' })

  try {
    const session = await PairingSession.findByDeviceToken(deviceToken)
    if (!session) {
      const expired = await PairingSession.findOne({ deviceToken, status: 'paired' })
      return res.status(401).json({
        success: false,
        code: expired ? 'token_expired' : 'invalid_token',
        message: expired ? 'Token expired, please re-pair or refresh' : 'Invalid or unpaired token',
      })
    }

    const orders = await Order.find().sort({ createdAt: -1 }).lean()
    let config = {}
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    } catch { /* ignore */ }

    res.json({ success: true, orders, config })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

app.post('/api/pairing/refresh-token', async (req, res) => {
  const oldToken = req.headers['x-device-token']
  if (!oldToken) return res.status(401).json({ success: false, message: 'Missing device token' })

  try {
    const session = await PairingSession.findOne({ deviceToken: oldToken, status: 'paired' })
    if (!session) return res.status(401).json({ success: false, message: 'Invalid or unpaired token' })

    const newToken = await session.refreshDeviceToken()
    res.json({
      success: true,
      deviceToken: newToken,
      expiresAt: session.deviceTokenExpiresAt,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
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
