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
router.post('/createAccount', async function (req, res, next) {

    var conn = await qp.connectWithTbegin();
    var accountDAO = buildAccountDAO(req.body);

    var jwtDataLoad = {
        user_id: '',
        password: accountDAO.password,
        username: accountDAO.email
    };

    try {
        var result = await qp.executeUpdatePromise('insert into ' + config.schema + '.user set ?; ', [accountDAO]);
        if (result.length == 0) {
            var error = new Error('Register failed');
            error.status = 406;
            throw error;
        } else {
            jwtDataLoad.user_id = result.insertId;
            var token = jwt.encode(jwtDataLoad, secret);
            // res.json({ "message": "Account created successfully!", session: token, result: result });
            await qp.executeUpdatePromise('update ' + config.schema + '.user set login_token = ? where user_id = ?;', [token, result.insertId]);
            var result = await selectCustomerData(jwtDataLoad.user_id);

            if (!result.error) {
                res.json({ userData: result, "message": "Account created successfully!", session: token });
            } else {
                next(result);
            }
        }

    } catch (err) {
        if (err.code == "ER_DUP_ENTRY") {
            //console.log("here");
            var error = new Error('Duplicate Entry');
            error.status = 500;
            next(error);
        }
        next(err);
    }
});

router.get('/authenticationToken', async function (req, res, next) {

    if (req.headers.authorization) {
        var token = req.headers.authorization;
        try {

            var decoded = jwt.decode(token, secret, true);
            var result = await selectCustomerData(decoded.user_id);

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
    var email = req.body.email;
    var password = jwt.encode(req.body.password, secret);

    var jwtDataLoad = {
        user_id: '',
        password: password,
        username: email
    };

    try {
        var result = await qp.executeAndFetchFirstPromise('select user_id from  ' + config.schema
            + '.user where email = ? and password = ?; ', [email, password]);

        if (result == undefined) {
            var error = new Error('Invalid username or password.');
            error.status = 406;
            throw error;

        } else {
            jwtDataLoad.user_id = result.user_id;
            var token = jwt.encode(jwtDataLoad, secret);
            var result = await selectCustomerData(jwtDataLoad.user_id);

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


router.post('/retrieveProfile', async function (req, res, next) {
    var token = req.body.token;

    try {
        var decoded = jwt.decode(token, secret, true);

        var result = await qp.executeAndFetchFirstPromise('SELECT user_id, email, salutation, username, fullname, firstname, lastname, gender, register_date, account_type, DATE_FORMAT(date_of_birth, "%d/%m/%Y") as "date_of_birth", mobile_no, avatar_file_name, IF(password IS NULL, 0, 1) AS "has_oldPassword" FROM hastedevdb.tbl_customer WHERE user_id = ?; ', decoded.user_id);
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

router.put('/editProfile', async function (req, res, next) {
    var user_id = req.body.user_id;
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

        var result = await qp.executeUpdatePromise('UPDATE hastedevdb.tbl_customer SET firstname = ?, lastname = ?, username = ?, email = ?, ' + passString + ' date_of_birth = ?, mobile_no = ?, gender = ? WHERE ' + password + ' AND user_id = ?; ', [firstname, lastname, username, email, date_of_birth, mobile_no, gender, user_id]);

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
    var password = jwt.encode(obj.password, secret);
    var dao = {
        email: obj.email,
        first_name: obj.first_name,
        password: password,
        last_name: obj.last_name,
        gender: obj.gender,
        mobile_number: obj.mobile_number
    }
    return dao;
}

async function selectUserData(user_id) {
    try {
        var result = await qp.executeAndFetchFirstPromise('SELECT user_id,'
            + 'email, first_name, last_name, gender,'
            + ' mobile_number from ' + config.schema + '.user'
            + ' WHERE user_id = ?; ', user_id);
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