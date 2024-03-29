var child_process = require('child_process');

var helper = require('../helper');
var log = require('../log');


module.exports = (function () {

    var methods = {SendKeys:SendKeys};

    return function (request, response) {
        var keyUrl = 'debug/:action';
        var parameters = helper.parameters(request,keyUrl);
        helper.getBodyData(request, true).then(bodyData => {
            new Promise(function(resolve){
                var action = Object.keys(methods).filter(i=>parameters.action&&parameters.action.toLocaleLowerCase()===i.toLocaleLowerCase()).pop();
                if(methods[action]){
                    methods[action](JSON.parse(bodyData)).then(resolve);
                }else{
                    resolve();
                }
            }).then(function(){
                log(new Date(), helper.clientIp(request), request.headers['referer'], request.headers['user-agent'], keyUrl, request.url, bodyData);
                response.end('{}');
            });
        });
    };

    function SendKeys(bodyData){
        return new Promise(function(resolve){
            bodyData.forEach(item => {
                helper.console(item);
            });
            resolve();
        });
    }

})();