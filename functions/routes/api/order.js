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
const { makePostCashfreeAsyncCall, makeGetCashfreeAsyncCall } = require('../../utils/utils');
const order = require('../../models/order');



router.post('/add', auth, async (req, res) => {
  try {
    const cart = req.body.cartId;
    const total = req.body.total;
    const user = req.user._id;
    const order = new Order({
      cart,
      user,
      total,
      selectedAddress: req.body.selectedAddress
    });
    
    let body = {
      "order_id": order._id,
      "order_amount": total,
      "order_currency": "INR",
      "customer_details": {
       "customer_id": req.user._id,
        "customer_name": req.user.firstName,
        "customer_email": req.user.email,
        "customer_phone": req.user.phoneNumber? req.user.phoneNumber : "+918297997256"
      },
      "order_meta":{
        "notify_url": process.env.BASE_URL + "order/handleCashfreeWebhook"
      } 
    }
    console.log(body)
    let response = await makePostCashfreeAsyncCall(process.env.CASHFREE_BASE_URL + "pg/orders", body);

    const orderDoc = await order.save();

    const orderUpdate = await Order.updateOne({ _id : order._id}, {paymentLink: response.payment_link, paymentStatus: "LINK_GENERATED"})
    console.log(orderUpdate);

    const cartDoc = await Cart.findById(orderDoc.cart._id).populate({
      path: 'products.product',
      populate: {
        path: 'brand'
      }
    });

    const newOrder = {
      _id: orderDoc._id,
      created: orderDoc.created,
      user: orderDoc.user,
      total: orderDoc.total,
      products: cartDoc.products
    };

    await mailgun.sendEmail(order.user.email, 'order-confirmation', newOrder);

    res.status(200).json({
      success: true,
      message: `Your order has been placed successfully!`,
      payment: response.payment_link,
      order: { _id: orderDoc._id }
    });
  } catch (error) {
    console.log(error)
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.post('/checkPayment', async (req, res)=>{
  const orderId = req.body.orderId;

  const order = await Order.findById(orderId);

  let response = await makeGetCashfreeAsyncCall(process.env.CASHFREE_BASE_URL + "pg/orders/" + orderId);
  if(response.order_status === "PAID"){
    await Order.updateOne({_id: orderId}, {paymentStatus: "PAYMENT_SUCCESS"});

    res.status(200).json({
      success: true,
      message: "Payment Done",
      payment: order.paymentLink
    });
    return;
  }else if(response.order_status === "EXPIRED"){
    let body = {
      "order_id": orderId,
      "order_amount": order.total,
      "order_currency": "INR",
      "customer_details": {
       "customer_id": req.user._id,
        "customer_name": req.user.firstName,
        "customer_email": req.user.email,
        "customer_phone": req.user.phoneNumber? req.user.phoneNumber : "+918297997256"
      } 
    }
    let generateRes = await makePostCashfreeAsyncCall(process.env.CASHFREE_BASE_URL + "pg/orders", body);
    order = await Order.updateOne({_id: orderId}, {paymentStatus: "PAYMENT_LINK_GENERATED", paymentLink: generateRes.payment_link});
  
    res.status(200).json({
      success: true,
      message: "Payment link refreshed",
      payment: generateRes.payment_link
    });

    return;
  }else{
    console.log(order);
    res.status(200).json({
      success: true,
      message: "Payment link Active",
      payment: order.paymentLink
    });
    return;
  }
  
})

router.post('/handleCashfreeWebhook', async (req, res)=>{
  var body = req.body.data;
  console.log(body.order.order_id)
  console.log(body.payment.payment_status)


  if(body.payment.payment_status === "SUCCESS"){
    let od = await Order.findById({_id : body.order.order_id});
    await Order.updateOne({_id : body.order.order_id}, {paymentStatus: "PAYMENT_SUCCESS"})
    res.status(200).json({
      success: true
    });
  }else{
    res.status(200).json({
      success: false
    });
  }
})

// search orders api
router.get('/search', auth, async (req, res) => {
  try {
    const { search } = req.query;

    if (!Mongoose.Types.ObjectId.isValid(search)) {
      return res.status(200).json({
        orders: []
      });
    }

    let ordersDoc = null;

    if (req.user.role === role.ROLES.Admin) {
      ordersDoc = await Order.find({
        _id: Mongoose.Types.ObjectId(search)
      }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    } else {
      const user = req.user._id;
      ordersDoc = await Order.find({
        _id: Mongoose.Types.ObjectId(search),
        user
      }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    }

    ordersDoc = ordersDoc.filter(order => order.cart);

    if (ordersDoc.length > 0) {
      const newOrders = ordersDoc.map(o => {
        return {
          _id: o._id,
          total: parseFloat(Number(o.total.toFixed(2))),
          created: o.created,
          products: o.cart?.products
        };
      });

      let orders = newOrders.map(o => store.caculateTaxAmount(o));
      orders.sort((a, b) => b.created - a.created);
      res.status(200).json({
        orders
      });
    } else {
      res.status(200).json({
        orders: []
      });
    }
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch orders api
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const ordersDoc = await Order.find()
      .sort('-created')
      .populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Order.countDocuments();
    const orders = store.formatOrders(ordersDoc);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      count
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch my orders api
router.get('/me', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = req.user._id;
    const query = { user };

    const ordersDoc = await Order.find(query)
      .sort('-created')
      .populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Order.countDocuments(query);
    const orders = store.formatOrders(ordersDoc);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      count
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch order api
router.get('/:orderId', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    let orderDoc = null;

    if (req.user.role === role.ROLES.Admin) {
      orderDoc = await Order.findOne({ _id: orderId }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    } else {
      const user = req.user._id;
      orderDoc = await Order.findOne({ _id: orderId, user }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    }
    console.log(orderDoc)

    if (!orderDoc || !orderDoc.cart) {
      return res.status(404).json({
        message: `Cannot find order with the id: ${orderId}.`
      });
    }


    let order = {
      _id: orderDoc._id,
      total: orderDoc.total,
      created: orderDoc.created,
      totalTax: 0,
      products: orderDoc?.cart?.products,
      cartId: orderDoc.cart._id,
      paymentStatus: orderDoc?.paymentStatus,
      paymentLink: orderDoc?.paymentLink,
      updates: orderDoc?.updates,
      selectedAddress: orderDoc.selectedAddress,
      userId: orderDoc.cart.user
    };

    order = store.caculateTaxAmount(order);

    res.status(200).json({
      order
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.delete('/cancel/:orderId', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId });
    const foundCart = await Cart.findOne({ _id: order.cart });

    increaseQuantity(foundCart.products);

    await Order.deleteOne({ _id: orderId });
    await Cart.deleteOne({ _id: order.cart });

    res.status(200).json({
      success: true
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.put('/status/item/:itemId', auth, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const orderId = req.body.orderId;
    const cartId = req.body.cartId;
    const status = req.body.status || 'Cancelled';

    const foundCart = await Cart.findOne({ 'products._id': itemId });
    const foundCartProduct = foundCart.products.find(p => p._id == itemId);

    await Cart.updateOne(
      { 'products._id': itemId },
      {
        'products.$.status': status
      }
    );

    if (status === 'Cancelled') {
      await Product.updateOne(
        { _id: foundCartProduct.product },
        { $inc: { quantity: foundCartProduct.quantity } }
      );

      const cart = await Cart.findOne({ _id: cartId });
      const items = cart.products.filter(item => item.status === 'Cancelled');

      // All items are cancelled => Cancel order
      if (cart.products.length === items.length) {
        await Order.deleteOne({ _id: orderId });
        await Cart.deleteOne({ _id: cartId });

        return res.status(200).json({
          success: true,
          orderCancelled: true,
          message: `${
            req.user.role === role.ROLES.Admin ? 'Order' : 'Your order'
          } has been cancelled successfully`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Item has been cancelled successfully!'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item status has been updated successfully!'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

const increaseQuantity = products => {
  let bulkOptions = products.map(item => {
    return {
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: item.quantity } }
      }
    };
  });

  Product.bulkWrite(bulkOptions);
};

module.exports = router;
