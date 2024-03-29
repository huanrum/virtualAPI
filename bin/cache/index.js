var fs = require("fs");

var helper = require('./../helper');

module.exports = (function () {

    return function (request, response) {
        var url = decodeURIComponent(request.url.replace(/^\/cache\//i, ''));
        var clienip = helper.clientIp(request).replace(/::(ffff:)?/, '');
        helper.getBodyData(request).then(value => {
            var key = url.split('?').shift() + (helper.isSelf(clienip)?'':`/${clienip}`);
            var type = url.split('?').pop();
            var file = __dirname + '/../../cache/' + key + '.json';

            value = value.toString();
            helper.mkdirs(file.replace(/\/+((?!\/).)*$/, ''))

            if (!value) {
                response.end(helper.readFile(file));
            } else {
                switch (type) {
                    case 'append':
                        var data = JSON.parse(helper.readFile(file)) || {};
                        fs.writeFileSync(file, JSON.stringify(Object.assign(data, JSON.parse(value)), null, 4));
                        break;
                    default:
                        fs.writeFileSync(file, JSON.stringify(JSON.parse(value), null, 4));
                        break;
                }

                response.end(value);
            }
        });
    };

})();