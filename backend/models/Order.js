const mongoose = require('mongoose')

const OrderSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: false },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  deliveryAddress: {
    governorate: { type: String, required: true },
    city: { type: String, required: true },
    details: { type: String },
  },
  orderDetails: { type: String, required: true },
  totalPrice: { type: Number, required: true },
  currency: { type: String, required: true },
  orderStatus: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Order', OrderSchema)
