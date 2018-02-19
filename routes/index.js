var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('welcome to 3001 dashbaord backend');
  // res.redirect('http://irasaleskit.com/management');
});

module.exports = router;
