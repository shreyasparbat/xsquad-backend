var express = require('express');
var router = express.Router();
var qp = require('flexqp-transaction');
var moment = require('moment');
var config = require('../config.json');


router.post('/findSquad', async function (req, res, next) {
    var user_id = req.body.user_id;
    var activity_id = req.body.activity_id;

    try {
        //get min and max people allowed for an activity
        var noOfPeople = await qp.executeAndFetchFirstPromise('select minNoOfPeople, maxNoOfPeople from' + config.schema +
            '.activities where activity_id=?;', [activity_id]);

        //get max chatroom_id in chatroom table (assumes all chat rooms before this are completely filled)
        var maxChatRoomId = await qp.executeAndFetchFirstPromise('select max(chatroom_id) from chatroom where activity_id=?;', [activity_id]);

        //get number of people in the max chatroom_id
        var noOfPeopleInChatroom = await qp.executeAndFetchFirstPromise('select count(user_id) from chatroom where chatroom_id=?', [maxChatRoomId]);

        //no need to add to waiting list
        if (noOfPeopleInChatroom <= noOfPeople.maxNoOfPeople) {
            //add user to that chatroom
        } else {
            //insert into waitlist
            var result = await qp.executeAndFetchFirstPromise('insert into ' + config.schema +
            '.waiting_list values (?, ?); ', [user_id, activity_id]);

            //get number of people in waitlist for a given activity
            var noOfUsersInWaitlist = await qp.executeAndFetchFirstPromise('select count(user_id) from' + config.schema +
                '.waiting_list where activity_id=?;', [activity_id]);

            if (noOfUsersInWaitlist >= noOfPeople.minNoOfPeople) {
                
            }
        }

        
            
            
            //create chatroom and notify all users
            if (!result.error) {
                res.json({
                    "noOfUsersInWaitList": result,
                    "message": "Login Success!"
                });
            
        }
    } catch (error) {
        next(error);
    }

    next(result);
});



module.exports = router;