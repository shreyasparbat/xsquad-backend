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

module.exports = router;