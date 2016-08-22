var fs = require('fs');

// Read in env vars when running tests
fs.readdirSync(__dirname + "/env").forEach(function (file) {
    if (/^\./.test(file)) return;
    if (!process.env[file]) {
        console.log("Setting: " + file);
        process.env[file] = fs.readFileSync(__dirname + "/env/" + file, "UTF-8").trim();
    }
});

var startup_t0 = new Date();
var expressPort = 3000;

var twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
var async = require('async');
var express = require('express');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require("body-parser");
var methodOverride = require('method-override');
var http = require('http');
var app = express();
module.exports = app;

app.use(morgan('dev'));
app.set('view engine', 'jade');
app.set('views', __dirname);
app.use(express.static(__dirname));

app.use(cookieParser());
app.use(methodOverride());
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '100mb',
}));
app.use(bodyParser.json({
    limit: '100mb',
}));

var server = http.createServer(app).listen(expressPort, function(){
    console.log("\r\nTwilio Test\r\n");
    console.log("Server is listening on port " + expressPort);
    var startup_t1 = new Date();
    var startup_t_diff = (startup_t1 - startup_t0) / 1000;
    console.log("Startup took " + startup_t_diff.toFixed(1) + " seconds");
});


var io = app.io = require('socket.io')(server);
app.io.on('connection', function (socket) {
    console.log("SOCKET CONNECTED");
    socket.on('test', function (data) {
        console.log("TEST!", data);
    });
    setTimeout(function () {
        io.emit('hello', 'Hi there!');
    }, 555);
});


var nombres = [
    '+16476910739'
];

app.get('/', function (req, res, next) {
    res.render('sms_test');
});

app.post('/got/call', function (req, res) {
    console.log("I'm getting a call");
    console.log(req.body);
    res.sendStatus(500);
});

app.post('/got/sms', function (req, res) {
    console.log("I'm getting a message");
    console.log(req.body);
    io.emit('incoming_sms', req.body);
    res.sendStatus(200);
});


app.post('/send_sms', function (req, res) {
    console.log('Sending SMS...');
    console.log(req.body);
    twilio.sendMessage(req.body, function(err, responseData) {
        if (err) {
            console.error("Error sending SMS", err);
            return res.sendStatus(500);
        }
        console.log("got response");
        console.log(responseData);
    });
});

app.get('/nombres', function (req, res) {
    res.send({numbers: nombres});
});
