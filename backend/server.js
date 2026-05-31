require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const qrcode = require('qrcode')
const { Client, LocalAuth } = require('whatsapp-web.js')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const app = express()
const PORT = process.env.PORT || 3001
const CONFIG_PATH = path.join(__dirname, 'ai_config.json')
const IS_WIN = process.platform === 'win32'
const CHROME_PATH = process.env.CHROME_PATH || (IS_WIN ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

let qrCodeBase64 = null
let clientReady = false
let client = null
let aiConfig = {
  businessContext: '',
  aiTone: 'friendly',
  handlingRules: '',
  enabled: false,
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
      aiConfig = JSON.parse(raw)
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

function initWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'marketing-assistant' }),
    puppeteer: {
      headless: true,
      ...(CHROME_PATH && { executablePath: CHROME_PATH }),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  })

  client.on('qr', async (qr) => {
    try {
      qrCodeBase64 = await qrcode.toDataURL(qr)
    } catch (err) {
      console.error('QR generation error:', err.message)
    }
  })

  client.on('ready', () => {
    clientReady = true
    qrCodeBase64 = null
    console.log('WhatsApp client is ready!')
  })

  client.on('authenticated', () => {
    console.log('WhatsApp authenticated')
  })

  client.on('auth_failure', (msg) => {
    console.error('Auth failure:', msg)
    clientReady = false
  })

  client.on('disconnected', (reason) => {
    console.log('WhatsApp disconnected:', reason)
    clientReady = false
    qrCodeBase64 = null
    setTimeout(() => {
      console.log('Attempting reconnection...')
      client.initialize()
    }, 5000)
  })

  client.on('message', async (msg) => {
    if (msg.isGroupMsg || msg.from === 'status@broadcast' || msg.author) return

    if (!aiConfig.enabled) return
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set, skipping AI reply')
      return
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      const toneMap = {
        friendly: 'ودي ولطيف',
        professional: 'رسمي ومباشر',
        persuasive: 'تسويقي وحماسي',
      }

      const prompt = `أنت مساعد تسويقي ذكي لتاجر على واتساب. يجب أن ترد على رسائل العملاء بطريقة مهنية.

سياق العمل:
${aiConfig.businessContext || 'لا يوجد'}

نبرة الرد: ${toneMap[aiConfig.aiTone] || 'ودي ولطيف'}

قواعد التعامل:
${aiConfig.handlingRules || 'لا توجد قواعد خاصة'}

العميل يقول: "${msg.body}"

قم بالرد على العميل مباشرة بلغة الرسالة (عربي أو إنجليزي). لا تقدم مقدمات أو أسئلة، فقط الرد المناسب للتاجر ليرسله للعميل.`

      const result = await model.generateContent(prompt)
      const replyText = result.response.text().trim()

      if (replyText) {
        await msg.reply(replyText)
      }
    } catch (err) {
      console.error('Gemini error:', err.message)
    }
  })

  client.initialize()
}

app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    ready: clientReady,
    qr: qrCodeBase64,
    phone: client?.info?.wid?.user || null,
  })
})

app.post('/api/whatsapp/save-config', (req, res) => {
  const { enabled, businessContext, aiTone, handlingRules } = req.body

  const config = {}
  if (enabled !== undefined) config.enabled = Boolean(enabled)
  if (businessContext !== undefined) config.businessContext = String(businessContext)
  if (aiTone !== undefined) config.aiTone = String(aiTone)
  if (handlingRules !== undefined) config.handlingRules = String(handlingRules)

  const saved = saveConfigToFile(config)
  if (saved) {
    res.json({ success: true, message: 'Configuration saved successfully' })
  } else {
    res.status(500).json({ success: false, message: 'Failed to save configuration' })
  }
})

app.get('/api/whatsapp/config', (req, res) => {
  res.json({ success: true, config: aiConfig })
})

app.post('/api/whatsapp/send-message', async (req, res) => {
  const { to, message } = req.body
  if (!to || !message) {
    return res.status(400).json({ success: false, message: 'Missing "to" or "message"' })
  }
  try {
    await client.sendMessage(to, message)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

const HOST = process.env.HOST || '0.0.0.0'
app.listen(PORT, HOST, () => {
  console.log(`Marketing Assistant Backend running on http://${HOST === '0.0.0.0' ? '192.168.42.235' : HOST}:${PORT}`)
  initWhatsApp()
})
