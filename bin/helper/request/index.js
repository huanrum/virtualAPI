var os = require('os');
var fs = require("fs");
var path = require('path');
var child_process = require('child_process');

var BufferHelper = require('./bufferhelper');


module.exports = {
    /**
     * 获取请求者的ip
     */
    clientIp: function (req) {
        return (req.headers && req.headers['x-forwarded-for']) ||
            (req.connection && req.connection.remoteAddress) ||
            (req.socket && req.socket.remoteAddress) ||
            (req.connection && req.connection.socket && req.connection.socket.remoteAddress);
    },
    /**
     * 客户端是否跟服务端在同一个网段
     */
    network: function (request) {
        var netSegment = this.netInfo().address.split('.').slice(0, -1).join('.');
        return this.clientIp(request).indexOf(netSegment) !== -1;
    },
    /**
     * 是否是本机访问
     */
    localhost: function (request) {
        var clientIp = this.clientIp(request).replace(/::(ffff:)?/, '');
        return clientIp==='1' || /^(172|192|10)/.test(clientIp);
    },
    /**
     * 解析url获取参数
     * @param {*} urlAndParms 
     * @param {*} key 
     */
    parameters: function (request,key) {
        key = key || request.url;
        var urlAndParms = request.url.split('?'), headers = request.headers || {};
        var parameters = {
            clientIp: this.clientIp(request),
            test: headers.test
        };

        var keys = key.split('?')[0].replace(/\[.*\]/, '').split('/').filter(function (i) {
            return !!i;
        });
        var urls = urlAndParms[0].split('/').filter(function (i) {
            return !!i;
        });

        if (urlAndParms[1]) {
            urlAndParms[1].split('#').shift().split('&').forEach(function (str) {
                parameters[str.split('=')[0]] = decodeURIComponent(str.split('=')[1]);
            });
        }
        for (var i = 0; i < keys.length; i++) {
            if (/:.*/.test(keys[i])) {
                parameters[keys[i].replace(':', '')] = urls[i];
            }
        }
        return Object.assign(parameters, headers);
    },
    /**
     * 
     * @param {*} request 
     * @param {*} replace 
     */
    getBodyData: function (request, replace) {
        var parameters = this.parameters(request);
        return new Promise(succ => {
            var bufferHelper = new BufferHelper();
            if (!request.on) {
                succ(JSON.stringify(request.body || {}));
            } else {
                request.on("data", function (chunk) {
                    bufferHelper.concat(chunk);
                });
                request.on('end', function () {
                    if (replace) {
                        var result = bufferHelper.toString();
                        Object.keys(parameters).forEach(k => {
                            result = result.replace(new RegExp(':\s*' + k, 'ig'), parameters[k]);
                        });
                        succ(result);
                    } else {
                        succ(bufferHelper.toBuffer());
                    }
                });
            }
        });
    },
    /**
     * 获取请求的返回
     * @param {*} rsp 
     */
    getResponse: function (rsp) {
        return new Promise(succ => {
            var responseText = [];
            var size = 0;
            rsp.on('data', function (data) {
                responseText.push(data);
                size += data.length;
            });
            rsp.on('end', function () {
                responseText = Buffer.concat(responseText, size);
                succ(responseText);
            });
        });
    }

};