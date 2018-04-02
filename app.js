var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sha512 = require('js-sha512');

var index = require('./routes/index');
var account = require('./routes/accountResource');
var activity = require('./routes/activityResource');
var chatroom = require('./routes/chatroomResource');
var event = require('./routes/eventResource');

var qp = require('flexqp-transaction');
qp.presetConnection(require('./dbconfig.json'));
var app = express();
var cors = require('cors');
// view engine setup

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use(cors());
app.use('/accountResource', account);
app.use('/activityResource', activity);
app.use('/chatroomResource', chatroom);
app.use('/eventResource', event);


var account = require('./routes/');


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};


  // render the error page
  res.status(err.status || 500);
  console.log('ERROR: ' + err.message);
  res.json({ error: err.message });
});

module.exports = app;
