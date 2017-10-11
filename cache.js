var fs = require("fs");

module.exports = (function () {

    return function (url, value) {
        var key = url.split('?').shift();
        var type = url.split('?').pop();

        if (!value) {
            return readFile('cache/' + key + '.json');
        } else {
            switch (type) {
                case 'append':
                    var data = JSON.parse(readFile('cache/' + key + '.json')) || {};
                    fs.writeFileSync('cache/' + key + '.json', JSON.stringify(Object.assign(data, JSON.parse(value)),null,4));
                    break;
                default:
                    fs.writeFileSync('cache/' + key + '.json', JSON.stringify(JSON.parse(value),null,4));
                    break;
            }

            return value;
        }
    };

    function readFile(_path) {
        if (fs.existsSync(_path)) {
            return fs.readFileSync(_path).toString();
        } else {
            return 'null';
        }
    }

})();