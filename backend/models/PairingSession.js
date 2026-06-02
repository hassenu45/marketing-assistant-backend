const mongoose = require('mongoose')
const crypto = require('crypto')

const PairingSessionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  deviceToken: {
    type: String,
    default: '',
    index: true,
  },
  deviceTokenExpiresAt: {
    type: Date,
    default: null,
  },
  webUserId: {
    type: String,
    default: '',
  },
  deviceId: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'paired', 'expired'],
    default: 'pending',
  },
  pairedAt: Date,
  expiresAt: {
    type: Date,
    required: true,
  },
}, { timestamps: true })

PairingSessionSchema.statics.generate = async function(webUserId = '') {
  const code = crypto.randomBytes(3).toString('hex').toUpperCase()
  const token = crypto.randomBytes(32).toString('hex')
  const session = await this.create({
    code,
    token,
    webUserId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
  })
  return session
}

PairingSessionSchema.statics.findByDeviceToken = async function(deviceToken) {
  return this.findOne({
    deviceToken,
    status: 'paired',
    deviceTokenExpiresAt: { $gt: new Date() },
  })
}

PairingSessionSchema.methods.refreshDeviceToken = async function() {
  const newToken = crypto.randomBytes(32).toString('hex')
  this.deviceToken = newToken
  this.deviceTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  await this.save()
  return newToken
}

module.exports = mongoose.model('PairingSession', PairingSessionSchema)
