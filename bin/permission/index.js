var web = require('./web');

module.exports = (function () {
    var configs = [];

    permission.config = function () {
        configs.push(fn);
    };

    return permission;

    function permission(request, response) {
        if (web(request)) {
            return Promise.resolve();
        } else {
            var promises = configs.map(f => f(request, response, bodyData)).filter(i => !!i);
            if (promises.length) {
                return Promise.all(promises);
            } else {
                return Promise.resolve({
                    code: 403,
                    message: '没有权限'
                });
            }
        }

    }

})();