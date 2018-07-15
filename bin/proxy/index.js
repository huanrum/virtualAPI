var fs = require("fs");
var http = require('http');
var path = require('path');

var helper = require('./../helper');
var backup = require('./../backup');

module.exports = (function () {
    var configs = [];
    proxy.config = function (web,fn) {
        configs.push({web:web,fn:fn});
    };

    return proxy;


    function proxy(request, response) {
        helper.getBodyData(request).then(bodyData => {
            var promises = configs.filter(cf=>new RegExp('\/?views\/+'+cf.web.replace(/\-/g,'\\-')+'\/','i').test(request.headers.referer + '/')).map(f => f.fn(request, response, bodyData.toString())).filter(i => !!i);
            if (!promises.length) {
                var api = path.join(request.headers.api).replace(':\\', '://').replace(/\\/g, '/');
                var options = {
                    headers: request.headers.headers?Object.assign(JSON.parse(request.headers.headers),{"Context-Length":bodyData.length}):request.headers,
                    method: request.method,
                    host: api.split('//')[1].split(/(:|\/)/).shift(),
                    port: parseInt(api.split(':')[2] || 80),
                    path: api + (/\?/.test(api) ? '&' : (/\?/.test(request.url)?'?':'')) + (request.url.split('?')[1] || '')
                };

                backup.ping(options.path).then(function (ping) {
                    if (ping) {
                        console.log('\x1B[37m', 'use proxy : ' + api);
                        var post_req = http.request(options, function (rsp) {
                            if (!/^4/.test('' + rsp.statusCode)) {
                                helper.getResponse(rsp).then(responseText => {
                                    response.writeHead(rsp.statusCode, rsp.headers);
                                    response.end(responseText);
                                    backup.base(request.method,options.path, responseText.toString());
                                });
                            } else {
                                response.setHeader("Content-Type", 'text/plain;charset=utf-8');
                                response.end(JSON.stringify({
                                    errorCode: rsp.statusCode
                                }));
                            }
                        }).on('error', function (e) {
                            var errorMessage = '服务器错误';
                            response.setHeader("Content-Type", 'text/plain;charset=utf-8');
                            response.end(JSON.stringify({
                                errorCode: e.code,
                                errorEn: errorMessage,
                                errorZhCn: errorMessage,
                                errorZhHk: errorMessage,
                            }));
                        });
                        if (request.method.toLocaleLowerCase() !== 'get') {
                            post_req.write(bodyData);
                        }
                        post_req.end();
                    } else {
                        response.setHeader("Content-Type", 'text/plain;charset=utf-8');
                        response.end(backup.base(request.method,options.path));
                    }
                });
            }
        });

    }

})();