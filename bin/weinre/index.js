var child_process = require('child_process');

var helper = require('../helper');


module.exports = function (options) {
    var weinrePort = options.weinre;
    options.weinre = null;
    helper.killPort(weinrePort).then(function () {
        helper.initModule('weinre').then(function (weinre) {
            try{
                var consoleLog = console.log;
                console.log = function(){};
                weinre.run({httpPort:weinrePort,boundHost:'-all-',verbose:true,debug:true,readTimeout:10000,deathTimeout:30000});
                options.weinre = weinrePort;
                console.log = consoleLog;
                helper.console('green', 'Weinre running at http://' + options.ip + ':' + weinrePort + '/');
            }catch(e){
                helper.console('red', 'Weinre running fail: ' + e.message.replace(/\s/g, ''));
            }
        });
    });

};