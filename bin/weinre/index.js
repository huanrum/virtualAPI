var child_process = require('child_process');

var helper = require('../helper');


module.exports = function (options) {
    var weinrePort = options.weinre;
    options.weinre = null;
    helper.killPort(weinrePort).then(function () {
        helper.initModule('weinre').then(function () {
            child_process.exec('weinre --httpPort ' + weinrePort + ' --boundHost ' + options.ip);
            options.weinre = weinrePort;
            console.log('\x1B[32m', 'Weinre running at http://' + options.ip + ':' + weinrePort + '/');
        });
    });

};