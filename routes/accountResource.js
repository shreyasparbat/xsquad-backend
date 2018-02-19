var express = require('express');
var router = express.Router();
var qp = require('flexqp-transaction');
var moment = require('moment');
var nodemailer = require("nodemailer");
var generator = require('generate-password');
var moment = require('moment');
var jwt = require('jwt-simple');

var secret = 'haste__token__key';

router.post('/createHasteAccount', async function (req, res, next) {

    var conn = await qp.connectWithTbegin();
    var accountDAO = buildAccountDAO(req.body);
    accountDAO.login_type = 1;
    var jwtDataLoad = { customer_id: '', token: accountDAO.username + accountDAO.lastname + accountDAO.firstname + '', login_type: 1, datetime: new Date(), username: accountDAO.username };

    try {
        var result = await qp.executeUpdatePromise('insert into hastedevdb.tbl_customer set ?; ', [accountDAO]);
        if (result.length == 0) {
            var error = new Error('Register failed');
            error.status = 406;
            throw error;
        } else {
            jwtDataLoad.customer_id = result.insertId;
            var token = jwt.encode(jwtDataLoad, secret);
            // res.json({ "message": "Account created successfully!", session: token, result: result });
            var result = await selectCustomerData(jwtDataLoad.customer_id);
            
            if(!result.error){
                res.json({userData: result, "message": "Account created successfully!", session: token});
            }else{
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
            
                if(!result.error){
                    res.json({userData: result, "message": "Account created successfully!", session: token});
                }else{
                    next(result);
                }
            }

        } else { // else do update then login
            jwtDataLoad.customer_id = result.customer_id;
            var token = jwt.encode(jwtDataLoad, secret);
            // res.json({ "message": "Welcome to Haste!", session: token });
            var result = await selectCustomerData(jwtDataLoad.customer_id);
            
            if(!result.error){
                res.json({userData: result, "message": "Welcome to Haste!", session: token});
            }else{
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
            
            if(!result.error){
                res.json({userData: result});
            }else{
                next(result);
            }

        } catch (err) {console.log(3)
            var err = new Error('Token verification failed');
            err.status = 406;
            next(err);
        }

    } else {console.log(4)
        var err = new Error('Token verification failed');
        err.status = 406;
        next(err);
    }

});

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
            
            if(!result.error){
                res.json({userData: result, "message": "Login Success!", session: token});
            }else{
                next(result);
            }
        }

    } catch (err) {
        next(err);
    }
});


router.post('/merchantlogin', async function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    var jwtDataLoad = { staff_id: '', token: username + username + username + '', datetime: new Date(), username: username };

    try {
        var result = await qp.executeAndFetchFirstPromise('select staff_id from  hastedevdb.tbl_staff where username = ? and password = ?; ', [username, password]);
        if (result == undefined) {
            var error = new Error('Invalid username or password.');
            error.status = 406;
            throw error;
        } else {
            jwtDataLoad.staff_id = result.staff_id;
            var token = jwt.encode(jwtDataLoad, secret);
            res.json({ "message": "Login Success!", session: token, result: result });
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

router.put('/changeForgottenPassword', async function (req, res, next) {
    var forgot_password_code = req.body.forgot_password_code;
    var password = req.body.password;
    console.log(forgot_password_code);
    console.log(password);
    try {
        var result = await qp.executeUpdatePromise('update hastedevdb.tbl_customer set password = ?, forgot_password_code= "" where forgot_password_code = ?; ', [password, forgot_password_code]);
        if (result.affectedRows == 0) {
            var error = new Error('Verify code does not exist.');
            error.status = 406;
            throw error;
        } else {
            res.json({ "message": "Password has been reset successfully!" });
        }

    } catch (err) {
        next(err);
    }
});


//Need to do emailing
router.put('/forgetPassword', async function (req, res, next) {
    //var loginID = req.body.loginID;
    var email = req.body.email;

    try {
        var result = await qp.executeAndFetchFirstPromise('select customer_id, fullname from hastedevdb.tbl_customer where email = ?', [email]);

        if (result == undefined || result.length == 0) {
            var error = new Error('User/Email does not exist.');
            error.status = 406;
            throw error;

        } else {
            customer_id = result.customer_id;
            fullname = result.fullname;
            var passwordCode = generator.generate({
                length: 8,
                numbers: true,
                excludeSimilarCharacters: true
            });

            var smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "haste.tech.123456",
                    pass: "123qwe!!"
                }
            });

            if (smtpTransport == undefined) {
                var error = new Error('Email service error.');
                error.status = 406;
                throw error;
            }

            var mailOptions = {
                from: 'hello@haste.tech', // sender address
                to: email, // list of receivers
                subject: 'System Reset Password', // Subject line
                //body: 'Hello world?', // plain text body
                html: '<b>Hello ' + fullname + ',</b> <br><br> &nbsp&nbsp&nbsp&nbsp The code to reset your password is <b>' + passwordCode + '</b>.'
                    + '<br><br> Warmest regards, <br> Haste Tech Team' // html body
            };

            smtpTransport.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message sent: %s', info.messageId);
            });

            var result = await qp.executeUpdatePromise('update hastedevdb.tbl_customer set forgot_password_code = ? where email = ? and customer_id = ?; ', [passwordCode, email, customer_id]);
        }
        res.json({ "message": "Password code has been sent!" });
    } catch (err) {
        next(err);
    }
});

router.get('/validateLoginID/:loginID', async function (req, res, next) {
    var loginID = req.params.loginID;
    try {
        var result = await qp.executeAndFetchFirstPromise('call interriceactualdata.EmpValidateLoginID(?)', [loginID]);
        if (result.length == 0) {
            var error = new Error('LoginID does not exist.');
            error.status = 406;
            throw error;
        } else {
            res.json(result);
        }
    } catch (err) {
        next(err);
    }
});

router.get('/test', async function (req, res, next) {
    try {
        var result = await qp.executeAndFetchPromise('SELECT cart_id FROM haste_8tivatedb.tbl_checkout_cart_item where cart_id = 28;');
        if (result.length == 0) {
            var error = new Error('LoginID does not exist.');
            error.status = 406;
            throw error;
        } else {
            res.json(result);
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

module.exports = router;