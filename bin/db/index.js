var sqlite = require('./sqlite');

var helper = require('./../helper');

module.exports = (function () {
    
    return function (request, response) {

        helper.getBodyData(request).then(bodyData => {
            return sqlite(request, response, JSON.parse(bodyData.toString()||'{}'));
        });

    };

})();