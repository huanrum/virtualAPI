var fs = require("fs");
var path = require('path');

var helper = require('../helper');
var db = require('../db');

module.exports = (function log() {
    helper.mkdirs(__dirname + '/../../log/');
    return function () {
        var size = 100 * 1024;
        var message = '\n' + Array(40).join('*') + '\n' + Array.prototype.join.call(arguments, '\n') + '\n' + Array(40).join('*') + '\n';
        //db({method:'PUT',url:'/db/mongodb/log',body:{name:Date.now(),arguments:Array.prototype.slice.call(arguments)}});
        fs.readdir('log', function (error, files) {
            if (error) {
                return;
            }
            var file = files.find(function (item) {
                return /\.log$/.test(item) && fs.statSync('log/' + item).size < size;
            });
            if (!file) {
                file = Date.now() + '.log';
            }
            fs.appendFile('log/' + file, message, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        });
    }
})();