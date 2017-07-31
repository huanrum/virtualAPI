var fs = require("fs");

module.exports = (function () {

    return function (url, value) {
        var key = url.split('?').shift();
        var parms = {};
        url.split('?').pop().split('&').map(function (str) {
            if (str) {
                parms[str.split('=').shift()] = str.split('=').pop();
            }
        });

        if (!value) {
            if (fs.existsSync('cache/' + key + '.json')) {
                return fs.readFileSync('cache/' + key + '.json').toString();
            } else {
                return 'null';
            }
        } else {
            fs.writeFileSync('cache/' + key + '.json', value);
            return value;
        }
    };


})();