var fs = require("fs");
var http = require('http');
var path = require('path');

var  helper = require('./../helper');
var  backup = require('./../backup');

module.exports = (function () {
    var configs = [];
    proxy.config = function(fn){
        configs.push(fn);
    };

    return proxy;
    
    
    function proxy(request, response) {
        helper.getBodyData(request).then(bodyData => {
            var promises = configs.map(f => f(request, response, bodyData)).filter(i => !!i);
            if(!promises.length){
                var api = path.join(request.headers.api).replace(':\\','://').replace(/\\/g,'/');
                var options = {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        "Content-Length": bodyData.length
                    },
                    method: request.method,
                    host: api.split('//')[1].split(/(:|\/)/).shift(),
                    port: parseInt(api.split(':')[2] || 80),
                    path: api + (/\?/.test(api)?'&':'?') + (request.url.split('?')[1]||'')
                };
                
                backup.ping(options.path).then(function(ping){
                    if(ping){
                        console.log('\x1B[37m','use proxy : ' + api);
                        var post_req = http.request(options, function (rsp) {
                            if (!/^4/.test(''+rsp.statusCode)) {
                                helper.getResponse(rsp).then(responseText => {
                                    response.end(responseText);
                                    backup.base(options.path,responseText.toString());
                                });
                            }else{
                                response.end(JSON.stringify({errorCode:rsp.statusCode}));
                            }
                        }).on('error', function(e){
                            var errorMessage = '服务器错误/';
                            response.end(JSON.stringify({
                                errorCode:e.code,
                                errorEn:errorMessage,
                                errorZhCn:errorMessage,
                                errorZhHk:errorMessage,
                            })); 
                        });
                        if (request.method.toLocaleLowerCase() !== 'get') {
                            post_req.write(bodyData);
                        }
                        post_req.end();
                    }else{
                        response.end(backup.base(options.path)); 
                    }
                });
            }
        });
        
    }

})();