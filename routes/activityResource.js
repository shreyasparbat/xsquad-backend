var express = require('express');
var router = express.Router();
var qp = require('flexqp-transaction');
var moment = require('moment');
var config = require('../config.json');

router.post('/getActivities', async function (req, res, next) {

    try {
        var result = await qp.executeAndFetchPromise('SELECT activity_id, activity_name FROM '
            + config.schema + '.activities;');

        if (result.length == 0) {
            var error = new Error('There are no activities.');
            error.status = 406;
            throw error;
        } else {
            res.json(result);

        }
    } catch (err) {
        next(err);
    }
});

router.post('/getActivityByID', async function (req, res, next) {
    var activityID = req.body.activityID;

    try {
        var result = await qp.executeAndFetchPromise('SELECT activity_id, activity_name,' +
            'address_line_1, address_line_2, minNoOfPeople, maxNoOfPeople, price_adult, ' +
            'price_child, category_id FROM '
            + config.schema + '.activities where activity_id = ?;', activityID);

        if (result.length == 0) {
            var error = new Error('Activity does not exist.');
            error.status = 406;
            throw error;
        } else {
            var activity = result[0];
            res.json(activity);

        }
    } catch (err) {
        next(err);
    }
});

router.post('/insertRSVP', async function (req, res, next) {
    var rsvp = {
        activity_id: req.body.activity_id,
        user_id: req.body.user_id
    };

    try {
        var result = await qp.executeAndFetchPromise(`insert into ${config.schema}.rsvp set ?; `, [rsvp]);

        if (result.length == 0 || result == undefined) {
            var error = new Error('RSVP not added.');
            error.status = 406;
            throw error;
        } else {
            res.json(result);

        }
    } catch (err) {
        next(err);
    }
});

router.post('/getRSVP', async function (req, res, next) {
    var activity_id = req.body.activity_id;

    try {
        var result = await qp.executeAndFetchPromise(`SELECT rsvp.activity_id, rsvp.user_id,
            first_name FROM ${config.schema}.rsvp 
            JOIN ${config.schema}.user on rsvp.user_id = user.user_id 
            where activity_id = ?;`, activity_id);

        if (result.length == 0 || result == undefined) {
            var error = new Error('No one has RSVP.');
            error.status = 406;
            throw error;
        } else {
            res.json(result);

        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;