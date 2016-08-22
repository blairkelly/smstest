var socket = window.socket = io();

angular.module('truckStop', []).controller('firstController', ['$scope', '$http', '$timeout', function (scope, $http, $timeout) {
    scope.num_from = '0'; //default
    scope.received_sms = [];

    socket.on('hello', function (data) {
        console.log("Server says hello.", data);
    });

    socket.on('incoming_sms', function (data) {
        console.log("got a message", data);
        scope.received_sms.push(data);
        $timeout(function () {
            return true;
        }, 1);
    });

    $http.get('/nombres', {}).then(function (response) {
        console.log("Got numbers", response.data.numbers);
        scope.numbers = response.data.numbers;
    });

    scope.cod = function (form) {
        if (!form.$valid) {
            return console.log("invalid form");
        }
        $http.post('/send_sms', {from: scope.numbers[scope.num_from], to: scope.num_to, body: scope.msg}).then(function (response) {
            console.log("Got response", response);
        });
    }
}]);

var app = window.app = angular.module('smsApp', ['truckStop']);



