const Mongoose = require('mongoose');
const { Schema } = Mongoose;

// Order Schema
const OrderSchema = new Schema({
  cart: {
    type: Schema.Types.ObjectId,
    ref: 'Cart'
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentLink : {
    type: String,
  },
  paymentStatus:{
    type: String
  },
  total: {
    type: Number,
    default: 0
  },
  updates:{
    type:String
  },
  selectedAddress:{
    type:String
  },
  updated: Date,
  created: {
    type: Date,
    default: Date.now
  }
});

module.exports = Mongoose.model('Order', OrderSchema);
