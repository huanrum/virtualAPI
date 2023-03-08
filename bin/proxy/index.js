var url = require("url");
var http = require('http');
var https = require('https');
var path = require('path');

var helper = require('./../helper');
var backup = require('./../backup');

module.exports = (function () {
    var configs = [];
    proxy.config = function (web,fn) {
        configs.push({web:web,fn:fn});
    };

    return proxy;


    function proxy(request, response, isBackup = true) {
        if(request.method === 'OPTIONS'){
            response.end('true');
        } else {
            helper.getBodyData(request).then(bodyData => {
                var promises = configs.filter(cf=>new RegExp('\/?views\/+'+cf.web.replace(/\-/g,'\\-')+'\/','i').test(request.headers.referer + '/')).map(f => f.fn(request, response, bodyData.toString())).filter(i => !!i);
                if (!promises.length) {
                    fetch(request, bodyData, isBackup).then(function(rsp){
                        if (!/^4/.test('' + rsp.statusCode)) {
                            helper.getResponse(rsp).then(responseText => {
                                response.writeHead(rsp.statusCode, rsp.headers);
                                response.end(responseText);
                            });
                        } else {
                            response.setHeader("Content-Type", 'text/plain;charset=utf-8');
                            response.end(JSON.stringify({
                                errorCode: rsp.statusCode
                            }));
                        }
                    }, function(e){
                        var errorMessage = /^4/.test(e.code)?'服务器地址异常或找不到服务器':'服务器错误';
                        response.setHeader("Content-Type", 'text/plain;charset=utf-8');
                        response.end(JSON.stringify({
                            errorCode: e.code,
                            errorEn: errorMessage,
                            errorZhCn: errorMessage,
                            errorZhHk: errorMessage,
                        }));
                    });
                }
            });
        }

    }

    function fetch(request, bodyData, isBackup){
        function getSourceUrl(){
            return request.headers.api && request.headers.api.replace(/\/+$/,'').replace(/\/+\?/,'?') ||
            /\?/.test(request.url) && decodeURIComponent(request.url.slice(request.url.indexOf('?') + 1)) ||
            (request.headers.proxy || (request.protocol + '//' + request.headers.host)) + request.url.replace(/^\/+proxy/,'');
        }
        return new Promise(function(resolve,reject){
            var apiURL = url.parse(getSourceUrl());
            if(request.headers.cookie || request.headers.$cookie){
                request.headers.cookie = request.headers.cookie || request.headers.$cookie;
            }
            if(request.headers.domain){
                request.headers.domain = request.headers.domain.replace(apiURL.pathname,'');
            }
            request.headers.host = apiURL.host;
            request.headers.referer = apiURL.protocol + '//' + apiURL.host;
            request.headers.origin = apiURL.protocol + '//' + apiURL.host;
            delete request.headers.$cookie;
            delete request.headers.api;
            delete request.headers.proxy;
            backup.ping(apiURL.href).then(function (ping) {
                var options = Object.assign({}, apiURL,  {
                    headers: request.headers,
                    method: request.method,
                    port: apiURL.port || (/https:/.test(apiURL.protocol)?443:80),
                    family: 4
                });
                if (ping) {
                    if(/https:/.test(apiURL.protocol)){
                        Object.assign(options,{
                            agent: https.globalAgent,
                            secure: true,
                            strictSSL: false, // allow us to use our self-signed cert for testing
                            rejectUnauthorized: false
                        });
                    } else {
                        delete options.protocol;
                    }
                    var $http = /https:/.test(options.protocol)?https:http;
                    var post_req = $http.request(options, function (rsp) {
                        resolve(rsp);
                        if (!!isBackup && !/^4/.test('' + rsp.statusCode)) {
                            helper.getResponse(rsp).then(responseText => {
                                backup.base(request.method,options.path, responseText.toString());
                            });
                        }
                    }).on('error', function (error) {
                        reject(error);
                    });
                    if (request.method.toLocaleLowerCase() !== 'get') {
                        post_req.write(bodyData);
                    }
                    post_req.end();
                    helper.console('white', 'use proxy : ' + apiURL.href);
                } else {
                    response.setHeader("Content-Type", 'text/plain;charset=utf-8');
                    response.end(backup.base(request.method,options.path));
                }
            });
        });
    }

})();