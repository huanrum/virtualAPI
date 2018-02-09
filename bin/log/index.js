var fs = require("fs");
var path = require('path');

module.exports = function log() {
    var size = 100 * 1024;
    var message = '\n' + Array(40).join('*') + '\n' + Array.prototype.join.call(arguments, '\n') + '\n' + Array(40).join('*') + '\n';
    fs.readdir('log', function (error, files) {
        if (error) { return; }
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
};