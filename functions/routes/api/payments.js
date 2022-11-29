const express = require('express');
const router = express.Router();
const Mongoose = require('mongoose');

// Bring in Models & Utils
const Order = require('../../models/order');
const Cart = require('../../models/cart');
const Product = require('../../models/product');
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const mailgun = require('../../services/mailgun');
const store = require('../../utils/store');
const axios = require('axios');
const { makeCashfreeAsyncCall } = require('../../utils/utils');

router.post('/initiatePayment',auth, async (req, res) => {
  try {
    
    let body = {
      "order_id": req.body.orderId,
      "order_amount": req.body.total,
      "order_currency": "INR",
      "customer_details": {
       "customer_id": req.user._id,
        "customer_name": req.user.firstName,
        "customer_email": req.user.email,
        "customer_phone": req.user.phoneNumber? req.user.phoneNumber : "+918297997256"
      } 
    }
    let response = await makeCashfreeAsyncCall(process.env.CASHFREE_BASE_URL + "pg/orders", body);
    console.log(response);
    res.json(response)
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

module.exports = router;
