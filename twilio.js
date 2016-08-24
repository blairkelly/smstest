var fs = require('fs');
var request = require('request');

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


var get_numbers = function (cb) {
    async.waterfall([
        function (cb) {
            var data = {};
            twilio.list(function (err, res) {
                if (err) return cb(err);
                data.twilio_res = res;
                if (!res.accounts) {
                    return cb("Twilio response is missing data. Key: accounts")
                }
                for (var i in res.accounts) {
                    var a = res.accounts[i];
                    if (a.sid == process.env.TWILIO_SID) {
                        data.ta = a;
                    }
                }
                if (!data.ta) {
                    return cb("Twilio response is missing account with SID " + process.env.TWILIO_SID);
                }
                var ta = data.ta;
                if (!ta.subresource_uris) {
                    return cb("Twilio account " + process.env.TWILIO_SID + " missing subresource_uris key");
                }
                data.subresource_uris = ta.subresource_uris;
                data.incoming_phone_numbers_uri = ta.subresource_uris.incoming_phone_numbers;
                cb(null, data);
            });
        },
        function (data, cb) {
            var uri = 'https://' + process.env.TWILIO_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@api.twilio.com' + data.incoming_phone_numbers_uri;
            request.get(uri, {
                json: true
            }, function (err, response, body) {
                if (err) return cb(err);

                if (body.end > 0) {
                    return cb("Number of Twilio numbers exceeds a single page. Time to upgrade the code!");
                    //possible solution would be to increase page size or page through all numbers and add them together as you go.
                }
                
                data.incomingNumbersResponse = body;
                data.incoming_phone_numbers = body.incoming_phone_numbers;

                cb(null, data);
            });
        }
    ], function (err, data) {
        if (err) return cb(err);
        cb(null, data.incoming_phone_numbers);
    });
}

var search_for_available_numbers = function (options, cb) {
    /*
    var uri = 'https://' + process.env.TWILIO_SID + ':' + process.env.TWILIO_AUTH_TOKEN + '@api.twilio.com' + data.incoming_phone_numbers_uri;
    request.get(uri, {
        json: true
    }, function (err, response, body) {
        if (err) return cb(err);

        if (body.end > 0) {
            return cb("Number of Twilio numbers exceeds a single page. Time to upgrade the code!");
            //possible solution would be to increase page size or page through all numbers and add them together as you go.
        }
        
        data.incomingNumbersResponse = body;
        data.incoming_phone_numbers = body.incoming_phone_numbers;

        cb(null, data);
    });
    */
    var qOpts = {
        capabilities: {
            SMS: true
        }
    }
    if (options.postcode) {
        qOpts['InPostalCode'] = options.postcode;
    }
    else if (options.latitude && options.longitude) {
        qOpts['nearLatLong'] = options.latitude + ',' + options.longitude;
    }
    console.log(qOpts);
    twilio.availablePhoneNumbers(options.country_code).local.get(qOpts, cb);
}

setTimeout(function () {
    console.log('testing');
    var phoneSearchOptions = {
        country_code: 'CA',
        latitude: 43.6532,
        longitude: -79.3832
    };
    search_for_available_numbers(phoneSearchOptions, function (err, availableNumbers) {
        if (err) {
            return console.error("There was an error trying to list AVAILABLE numbers", err);
        }
        console.log("Got available numbers:");
        //console.log(availableNumbers);
        console.log(availableNumbers.availablePhoneNumbers[0]);
    });

    return null;
    get_numbers(function (err, numbers) {
        if (err) {
            return console.error("There was an error trying to list my numbers", err);
        }
        console.log('\r\nfinito', numbers)
    })    
}, 555);
