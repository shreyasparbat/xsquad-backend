var express = require('express');
var router = express.Router();
var qp = require('flexqp-transaction');
var moment = require('moment');
var config = require('../config.json');

//firebase
var firebase = require('firebase-admin');
var serviceAccount = require('../resources/serviceAccountKey.json');
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: 'https://chatrooms-bb327.firebaseio.com/'
});

router.post('/loadChatrooms', async function (req, res, next) {
    var user_id = req.body.user_id;

    try {
        //get chatroomIDs and activity IDs of all chatrooms this user belongs to
        var chatrooms = await qp.executeAndFetchPromise('select chatroom_id, activity_name from ' + config.schema +
            '.chatroom where user_id = ?;', [user_id]);

        var response = setRightFormat(chatrooms);
        res.json({
            "rowData": response
        });

    } catch (error) {
        next(error);
    }
});

function setRightFormat(chatrooms) {
    var response = [];
    var responseJson = {};
    for (var row of chatrooms) {
        responseJson = {
            activity_name: row.activity_name,
            chatroom_id: row.chatroom_id,
        }
        response.push(responseJson);
    }
    return response;
}

router.post('/findSquad', async function (req, res, next) {
    var user_id = req.body.user_id;
    var activity_id = req.body.activity_id;

    try {
        //check if user is already in waitlist or a chatroom for given activiy
        var chat = await qp.executeAndFetchFirstPromise('select chatroom_id from ' + config.schema +
            '.chatroom where user_id = ? and activity_id=?;', [user_id, activity_id]);
        var wait = await qp.executeAndFetchFirstPromise('select * from ' + config.schema +
            '.waiting_list where user_id = ? and activity_id=?;', [user_id, activity_id]);

        if (chat != null) {
            res.json({
                "message": "Already in chatroom"
            });
        } else if (wait != null) {
            res.json({
                "message": "Already in waiting list"
            });
        } else {

            //get min and max people allowed for an activity
            var noOfPeople = await qp.executeAndFetchFirstPromise('select minNoOfPeople, maxNoOfPeople from ' + config.schema +
                '.activities where activity_id=?;', [activity_id]);

            //get max chatroom_id in chatroom table (assumes all chat rooms before this are completely filled)
            var maxChatRoomIdArray = await qp.executeAndFetchPromise('select max(chatroom_id) as max_id from ' + config.schema +
                '.chatroom where activity_id = ?;', [activity_id]);
            var maxChatRoomIdforThatActivity = maxChatRoomIdArray[0].max_id;

            //get number of people in the max chatroom_id
            var noOfPeopleInChatroomArray = await qp.executeAndFetchFirstPromise('select count(user_id) as count_id from ' + config.schema +
                '.chatroom where chatroom_id=?', [maxChatRoomIdforThatActivity]);
            var noOfPeopleInChatroom = noOfPeopleInChatroomArray.count_id;

            //get global max chat room id (for creating new chatroom)
            var globalMaxChatRoomIdArray = await qp.executeAndFetchPromise('select max(chatroom_id) as max_id from ' + config.schema +
                '.chatroom;');
            var globalMaxChatRoomId = globalMaxChatRoomIdArray[0].max_id;

            //get activity name
            var activity_name = await qp.executeAndFetchPromise('SELECT activity_name as name FROM ' +
                config.schema + '.activities where activity_id = ?;', [activity_id]);

            if (maxChatRoomIdforThatActivity != null && noOfPeopleInChatroom <= noOfPeople.maxNoOfPeople) {
                //no need to add to waiting list, return chatroom id
                res.json({
                    "chatroom_id": maxChatRoomIdforThatActivity,
                    "message": "Existing chatroom"
                });

                //update chatroom table
                await qp.executeAndFetchPromise('insert into ' + config.schema +
                    '.chatroom values (?, ?, ?, ?); ', [maxChatRoomIdforThatActivity, user_id, activity_id, activity_name[0].name]);

            } else {
                //insert into waitlist
                var result = await qp.executeAndFetchFirstPromise('insert into ' + config.schema +
                    '.waiting_list values (?, ?); ', [user_id, activity_id]);

                //get number of people in waitlist for a given activity
                var noOfUsersInWaitlistArray = await qp.executeAndFetchFirstPromise('select count(*) as count_all from ' + config.schema +
                    '.waiting_list where activity_id=?;', [activity_id]);
                var noOfUsersInWaitlist = noOfUsersInWaitlistArray.count_all;

                if (noOfUsersInWaitlist >= noOfPeople.minNoOfPeople) {
                    //create new chatroom and put all of them in
                    chatroom_id = globalMaxChatRoomId + 1;
                    createChatroom(chatroom_id);
                    res.json({
                        "chatroom_id": chatroom_id,
                        "message": "New chatroom"
                    });

                    try {
                        //get list of users in waitlist
                        var wait_list = await qp.executeAndFetchPromise('SELECT user_id, activity_id FROM ' +
                            config.schema + '.waiting_list where activity_id = ?;', [activity_id]);

                        //insert into chatroom db
                        for (var row of wait_list) {
                            await qp.executeUpdatePromise('INSERT INTO ' + config.schema +
                                '.chatroom values(?, ?, ?, ?);', [chatroom_id, row.user_id, activity_id, activity_name[0].name]);
                        };

                        //delete them from waiting_list
                        await qp.executeUpdatePromise('delete from ' + config.schema +
                            '.waiting_list where activity_id=?', [activity_id]);
                    } catch (err) {
                        next(err);
                    }

                } else {
                    //need to wait
                    res.json({
                        "message": "Wait"
                    });
                }
            }
        }
    } catch (error) {
        next(error);
    }
});

// router.post('/createChatroom', async function (req, res, next) { 
//     createChatroom(1);
function createChatroom(chatroom_id) {

    // Get a database reference to our blog
    var db = firebase.database();
    var ref = db.ref();

    //inset new node as chatroom_id with a default message from XSquad
    ref.update({
        [chatroom_id]: {
            "createdAt": 1521889319803,
            text: "Welcome explorers! This chat room is for you all to know each other a little better before you meet, so feel free to introduce yourselves and ease into tomorrow! Have fun!",
            user: {
                _id: 0,
                name: "XSquad"
            }
        }
    });
    console.log('done');
}
// });

module.exports = router;