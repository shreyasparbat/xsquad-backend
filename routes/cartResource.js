var express = require('express');
var router = express.Router();
var qp = require('flexqp-transaction');
var moment = require('moment');
var sha512 = require('js-sha512');
var http = require('http');
var rp = require('request-promise');
var reddot = require('./reddotResource');

router.post('/checkoutItemsAndUpdateDatabase', async function (req, res, next) {
    try {
        var obj = req.body;
        var session_id = moment() + obj.customer_id + obj.outlet_id;
        var checkoutCartDao = buildCheckoutCartDAO(obj, session_id);
        var updateCartResult = await qp.executeUpdatePromise('INSERT INTO hastedevdb.tbl_checkout_cart set ?;', [checkoutCartDao]);
        console.log(0); //

        var cart_id = updateCartResult.insertId; // cart_id here
        var checkoutAddressDao = buildCheckoutAddressDAO(obj, session_id, cart_id);
        var updateCheckoutAddressResult = await qp.executeUpdatePromise('INSERT INTO hastedevdb.tbl_checkout_address set ?', [checkoutAddressDao]);
        console.log(1);

        var checkout_address_id = updateCheckoutAddressResult.insertId;
        var checkoutPaymentDao = buildCheckoutPaymentDAO(obj, session_id, cart_id, checkout_address_id);
        var updatePaymentResult = await qp.executeUpdatePromise('INSERT INTO hastedevdb.tbl_checkout_payment set ?;', [checkoutPaymentDao]);
        console.log(2);

        for (var item of req.body.cart_items) {
            var cartItemDao = buildCartItem(item, session_id, cart_id);
            var updateCartItemResult = await qp.executeUpdatePromise('INSERT INTO hastedevdb.tbl_checkout_cart_item set ? ;', [cartItemDao]);
            console.log(3);
            if (updateCartItemResult.length == 0) {
                var error = Error('Error updating cart item');
                error.status = 406;
                throw error;
            };
        };
        if (updateCartResult.length == 0 || updateCheckoutAddressResult.length == 0 || updatePaymentResult.length == 0) {
            var error = new Error('Error processing');
            error.status = 406;
            throw error;
        } else {
            if (obj.external_token != undefined) {
                //If customer has existing card
                checkoutCartDao.external_token = obj.external_token;
                var result = await reddot.reddot_payment(checkoutCartDao);
            } else {
                //Add new card and make first payment
                var result = await reddot.reddot_firstRequestForPayment(checkoutCartDao);
            }

            result.session_id = session_id; 
            res.json(result); // returns updates response
        }
    } catch (err) {
        var rollbackCheckoutCartItem = await qp.executeUpdatePromise('DELETE FROM hastedevdb.tbl_checkout_cart_item WHERE cart_id = ?;', [cart_id]); // in case customer id does not exist  
        var rollbackCheckoutPayment = await qp.executeUpdatePromise('DELETE FROM hastedevdb.tbl_checkout_payment WHERE cart_id = ?;', [cart_id]); // in case customer id does not exist              
        var rollbackCheckoutAddress = await qp.executeUpdatePromise('DELETE FROM hastedevdb.tbl_checkout_address WHERE cart_id = ?;', [cart_id]); // in case customer id does not exist                
        var rollbackCheckoutCart = await qp.executeUpdatePromise('DELETE FROM hastedevdb.tbl_checkout_cart WHERE cart_id = ?;', [cart_id]); // in case customer id does not exist
        next(err);
    }
});

function buildCartItem(item, session_id, cart_id) {
    var cartItemDao = {
        session_id: session_id,
        cart_id: cart_id,
        product_id: item.pid,
        name: item.name,
        qty: item.qty,
        price: item.price,
        created_on: item.timeAdded,
        row_total: item.row_total,
        //test
    }
    return cartItemDao;
};

function buildCheckoutCartDAO(obj, session_id) {
    var dao = {
        session_id: session_id,
        created_on: obj.created_on,
        outlet_id: obj.outlet_id,
        customer_id: obj.customer_id,
        customer_fullname: obj.customer_fullname,
        subtotal: obj.subtotal,
        grand_total: obj.grand_total
    }
    return dao;
}

function buildCheckoutAddressDAO(obj, session_id, cart_id) {
    var dao = {
        cart_id: cart_id,
        session_id: session_id,
        created_on: obj.created_on,
        customer_id: obj.customer_id,
        customer_address_id: obj.customer_address_id,
        customer_email: obj.email,
        customer_fullname: obj.customer_fullname,
        subtotal: obj.subtotal,
        grand_total: obj.grand_total
    }
    return dao;
}

function buildCheckoutPaymentDAO(obj, session_id, cart_id, checkout_address_id) {
    var dao = {
        cart_id: cart_id,
        customer_id: obj.customer_id,
        session_id: obj.session_id,
        amount: obj.grand_total,
        checkout_address_id: checkout_address_id,
        created_on: obj.created_on,
        payment_method: obj.payment_method,
    }
    return dao;
}

module.exports = router;