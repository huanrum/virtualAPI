var fs = require("fs");
var http = require('http');
var child_process = require('child_process');

var random = require('./../../../bin/random');

var backup = require('./../../../bin/backup');

module.exports = (function () {
    var randomFn = random({});

    return request;

    function request(request, response, bodyData) {
        if(/^\/@?tngMobile/i.test(request.url)){
            try {
                if (request.headers['mockapi']) {
                    var mockapiUrl = 'http://10.0.101.248/mockapi/';
                    backup.ping(mockapiUrl).then(function (ping) {
                        if (ping) {
    
                            http.get(request.url.split('?').shift().replace(/^\/@?tngMobile/i, mockapiUrl) + (/\.json$/.test(request.url) ? '' : '/response.json'), function (res) {
                                var size = 0,
                                    chunks = [];
                                res.on('data', function (chunk) {
                                    size += chunk.length;
                                    chunks.push(chunk);
                                });
                                res.on('end', function () {
                                    if (/^2/.test(res.statusCode)) {
                                        var responseText = Buffer.concat(chunks, size);
                                        response.end(responseText);
                                        backup.base(request.url.replace(/^\/@?tngMobile/i, ''), responseText.toString());
                                        console.log('\x1B[35m', 'use mock : ' + request.url.replace(/^\/@?tngMobile/i, ''));
                                    } else {
                                        _request(request, response, bodyData);
                                    }
                                });
                            }).on('error', function (e) {
                                _request(request, response, bodyData);
                            });
                        } else {
                            response.end(backup.base(request.url.replace(/^\/@?tngMobile/i, '')));
                        }
                    });
                } else {
                    _request(request, response, bodyData);
                }
            } catch (e) {
                _request(request, response, bodyData);
            }
            return Promise.resolve();
        }
        
    }

    function _request(request, response, bodyData) {
        var urls = [
            'http://10.0.101.246:8080/tng'
            //'http://10.0.101.218:8091',
            //'http://10.0.101.218:8092'
        ];

        backup.ping(urls).then(function (ping) {
            if (ping) {
                console.log('\x1B[36m', 'use api : ' + request.url.replace(/^\/@?tngMobile/i, ''));
                requestMethod(urls, request, response, bodyData, function (rsp) {
                    if (!(rsp instanceof Error)) {
                        var chunks = [];
                        var size = 0;
                        rsp.on('data', function (data) {
                            chunks.push(data);
                            size += data.length;
                        });
                        rsp.on('end', function () {
                            var responseText = Buffer.concat(chunks, size);
                            response.end(responseText);
                            backup.base(request.url.replace(/^\/@?tngMobile/i, ''), responseText.toString());
                        });
                    } else {
                        var errorMessage = '服务器错误';
                        switch (rsp.code) {
                            case 'ETIMEDOUT':
                                errorMessage = '服务器超时';
                                break;
                        }
                        response.end(JSON.stringify({
                            errorCode: rsp.code,
                            errorEn: errorMessage,
                            errorZhCn: errorMessage,
                            errorZhHk: errorMessage,
                        }));
                    }
                });
            } else {
                response.end(backup.base(request.url.replace(/^\/@?tngMobile/i, '')));
            }
        });
    }

    function requestMethod(urls, request, response, bodyData, callback) {

        requestFn(0);

        function requestFn(index) {
            var options = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    "Content-Length": JSON.stringify(bodyData).length
                },
                method: request.method,
                host: urls[index].split('//').pop().split(':').shift(),
                port: parseInt(urls[index].split(':').pop()),
                path: addDefault(decodeURIComponent(request.url.replace(/\/+/g, '/').replace(/^\/@?tngMobile/i, urls[index])))
            };
            var post_req = http.request(options, function (rsp) {
                if (!/^4/.test('' + rsp.statusCode) || !urls[index + 1]) {
                    callback(rsp);
                } else {
                    requestFn(index + 1);
                }
            }).on('error', function (e) {
                if (!urls[index + 1]) {
                    callback(e);
                } else {
                    requestFn(index + 1);
                }
            });

            if (request.method.toLocaleLowerCase() !== 'get') {
                post_req.write(JSON.stringify(bodyData));
            }
            post_req.end();
        }

        function addDefault(url) {
            if (request.headers['token']) {
                if (/\?/.test(url)) {
                    url = url + '&token=' + request.headers['token'];
                } else {
                    url = url + '?token=' + request.headers['token'];
                }
            }
            return url.split('?').shift() + '?' + url.split('?').pop().split('&').map(function (i) {
                return i.split('=').shift() + '=' + encodeURIComponent(i.split('=').pop());
            }).join('&');
        }
    }

})();