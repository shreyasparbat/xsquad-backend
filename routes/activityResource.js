var express = require('express');
var router = express.Router();
var qp = require('flexqp-transaction');
var moment = require('moment');
var config = require('../config.json');

router.post('/getActivitiesByCategoryID', async function (req, res, next) {
    var categoryID = req.body.categoryID;

    try {
        var result = await qp.executeAndFetchPromise('SELECT activityID, activityName FROM '
            + config.schema + '.activity where categoryID = ?;', categoryID);

        if (result.length == 0) {
            var error = new Error('There are no activities under this categoryID.');
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
        var result = await qp.executeAndFetchPromise('SELECT activityID, activityName,' +
            'activityDescription, location, minNoOfPeople, maxNoOfPeople, categoryID FROM '
            + config.schema + '.activity where activityID = ?;', activityID);

        if (result.length == 0) {
            var error = new Error('Activity ID does not exist.');
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

router.get('/getActivityCategories', async function (req, res, next) {
    var categories;
    try {
        var result = await qp.executeAndFetchPromise('SELECT categoryID, categoryName from '
            + config.schema + '.category');

        if (result.length == 0) {
            var error = new Error('There are no categories.');
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