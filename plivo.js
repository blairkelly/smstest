var plivo = require('plivo');
var async = require('async');

console.log("Plivo Test");

var api = plivo.RestAPI({
    authId: '',
    authToken: '',
});

async.waterfall([
    function (cb) {
        api.get_numbers({}, function (status, response) {
            
        });
    },
    function (data, cb) {
        console.log("heyo");
        cb(null, data);
    }
], function (err, data) {
    if (err) {
        return console.error("Extreme error.", err);
    }
    console.log("Finished test.");
});
