var express = require('express');
var router = express.Router();
var qp = require('flexqp-transaction');
var moment = require('moment');
var nodemailer = require("nodemailer");
var generator = require('generate-password');
var moment = require('moment');
var jwt = require('jwt-simple');
var config = require('../config.json');


var secret = 'xsquad';

router.post('/fbGoogleAuthentication', async function (req, res, next) {

    var accountDAO = buildAccountDAO(req.body);
    accountDAO.login_id = req.body.fb_google_account_id;
    accountDAO.avatar_file_name = req.body.avatar_file_name;
    accountDAO.login_token = req.body.token;
    accountDAO.login_type = req.body.login_type;

    var fb_google_token = req.body.token;
    var jwtDataLoad = { customer_id: '', token: fb_google_token, login_type: 1, datetime: new Date(), username: accountDAO.username };

    try {
        // Check if account is axist
        var result = await qp.executeAndFetchFirstPromise('SELECT * FROM hastedevdb.tbl_customer WHERE login_id = ?; ', req.body.fb_google_account_id);

        // If it doesnot then insert to tbl_customer
        if (!result) {

            var conn = await qp.connectWithTbegin();
            var result1 = await qp.executeUpdatePromise('INSERT INTO hastedevdb.tbl_customer SET ?; ', [accountDAO], conn);

            if (result1.length == 0) {
                var error = new Error('Failed register using facebook authentification');
                error.status = 406;
                await qp.rollbackAndCloseConnection(conn);
                throw error;
            } else {
                await qp.commitAndCloseConnection(conn);
                jwtDataLoad.customer_id = result1.insertId;
                var token = jwt.encode(jwtDataLoad, secret);
                // res.json({ "message": "Account created successfully!", session: token });
                var result = await selectCustomerData(jwtDataLoad.customer_id);

                if (!result.error) {
                    res.json({ userData: result, "message": "Account created successfully!", session: token });
                } else {
                    next(result);
                }
            }

        } else { // else do update then login
            jwtDataLoad.customer_id = result.customer_id;
            var token = jwt.encode(jwtDataLoad, secret);
            // res.json({ "message": "Welcome to Haste!", session: token });
            var result = await selectCustomerData(jwtDataLoad.customer_id);

            if (!result.error) {
                res.json({ userData: result, "message": "Welcome to Haste!", session: token });
            } else {
                next(result);
            }
        }

    } catch (err) {
        next(err);
    }

});

router.get('/authenticationToken', async function (req, res, next) {

    if (req.headers.authorization) {
        var token = req.headers.authorization;
        try {

            var decoded = jwt.decode(token, secret, true);
            var result = await selectCustomerData(decoded.customer_id);

            if (!result.error) {
                res.json({ userData: result });
            } else {
                next(result);
            }

        } catch (err) {
            console.log(3)
            var err = new Error('Token verification failed');
            err.status = 406;
            next(err);
        }

    } else {
        console.log(4)
        var err = new Error('Token verification failed');
        err.status = 406;
        next(err);
    }

});



router.post('/login', async function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    var jwtDataLoad = { customer_id: '', token: username + username + username + '', login_type: 1, datetime: new Date(), username: username };

    try {
        var result = await qp.executeAndFetchFirstPromise('select customer_id from  hastedevdb.tbl_customer where username = ? and password = ?; ', [username, password]);
        if (result == undefined) {
            var error = new Error('Invalid username or password.');
            error.status = 406;
            throw error;
        } else {
            jwtDataLoad.customer_id = result.customer_id;
            var token = jwt.encode(jwtDataLoad, secret);

            var result = await selectCustomerData(jwtDataLoad.customer_id);

            if (!result.error) {
                res.json({ userData: result, "message": "Login Success!", session: token });
            } else {
                next(result);
            }
        }

    } catch (err) {
        next(err);
    }
});


router.post('/profile', async function (req, res, next) {
    var token = req.body.token;

    try {
        var decoded = jwt.decode(token, secret, true);

        var result = await qp.executeAndFetchFirstPromise('SELECT customer_id, email, salutation, username, fullname, firstname, lastname, gender, register_date, account_type, DATE_FORMAT(date_of_birth, "%d/%m/%Y") as "date_of_birth", mobile_no, avatar_file_name, IF(password IS NULL, 0, 1) AS "has_oldPassword" FROM hastedevdb.tbl_customer WHERE customer_id = ?; ', decoded.customer_id);
        if (result == undefined) {
            var error = new Error('Invalid token.');
            error.status = 406;
            throw error;
        } else {
            res.json(result);
        }

    } catch (err) {
        next(err);
    }
});

router.put('/profile', async function (req, res, next) {
    var customer_id = req.body.customer_id;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    var date_of_birth = req.body.date_of_birth;
    var mobile_no = req.body.mobile_no;
    var gender = req.body.gender;

    var passString = '';

    if (req.body.is_newPassword) {
        passString = 'password = "' + req.body.newpassword + '",';
    }

    if (!req.body.has_oldPassword) {
        password = 'password IS NULL';
    } else {
        password = 'password = "' + password + '"';
    }

    try {

        var result = await qp.executeUpdatePromise('UPDATE hastedevdb.tbl_customer SET firstname = ?, lastname = ?, username = ?, email = ?, ' + passString + ' date_of_birth = ?, mobile_no = ?, gender = ? WHERE ' + password + ' AND customer_id = ?; ', [firstname, lastname, username, email, date_of_birth, mobile_no, gender, customer_id]);

        if (result.affectedRows == 0) {
            var error = new Error('Please check your password again.');
            error.status = 406;
            throw error;
        } else {
            res.json({ "message": "Profile has been reset successfully!" });
        }

    } catch (err) {
        next(err);
    }
});

function buildAccountDAO(obj) {
    var dao = {
        email: obj.email,
        salutation: obj.salutation,
        password: obj.password,
        username: obj.email,
        fullname: obj.firstname + " " + obj.lastname,
        firstname: obj.firstname,
        lastname: obj.lastname,
        gender: obj.gender,
        register_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        account_type: 1,
        date_of_birth: obj.date_of_birth,
        mobile_no: obj.mobile_no
    }
    return dao;
}

async function selectCustomerData(customer_id) {
    try {

        var result = await qp.executeAndFetchFirstPromise('SELECT customer_id, email, salutation, username, fullname, firstname, lastname, gender, register_date, account_type, date_of_birth, mobile_no, avatar_file_name FROM hastedevdb.tbl_customer WHERE customer_id = ?; ', customer_id);
        if (result) {
            return result;
        } else {
            var error = new Error('Token verification failed');
            error.status = 406;
            throw error;
        }

    } catch (err) {
        return err;
    }
}
module.exports = router;