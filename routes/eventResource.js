var express = require('express');
var router = express.Router();
var qp = require('flexqp-transaction');
var moment = require('moment');
var sha512 = require('js-sha512');
var http = require('http');
var rp = require('request-promise');
var config = require('../config.json');


router.post('/test', async function (req, res, next) {

});

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