const mongoose = require('mongoose')

const BusinessConnectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  instagramAccountId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  instagramUserId: {
    type: String,
    required: true,
  },
  instagramBusinessName: {
    type: String,
    default: '',
  },
  pageId: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true })

module.exports = mongoose.model('BusinessConnection', BusinessConnectionSchema)
