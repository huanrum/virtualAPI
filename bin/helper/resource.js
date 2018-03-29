var os = require('os');
var fs = require("fs");
var path = require('path');
var child_process = require('child_process');

var BufferHelper = require('./bufferhelper');


module.exports = {
    /**
     * 获取请求者的ip
     */
    getClientIp: function (req) {
        return (req.headers && req.headers['x-forwarded-for']) ||
            (req.connection && req.connection.remoteAddress) ||
            (req.socket && req.socket.remoteAddress) ||
            (req.connection && req.connection.socket && req.connection.socket.remoteAddress);
    },
    /**
     * 客户端是否跟服务端在同一个网段
     */
    net: function (request) {
        var netSegment = this.netInfo().address.split('.').slice(0, -1).join('.');
        return this.getClientIp(request).indexOf(netSegment) !== -1;
    },
    /**
     * 是否是本机访问
     */
    localhost: function (request) {
        var clientIp = this.getClientIp(request).replace(/::(ffff:)?/, '');
        return [this.netInfo().address, '127.0.0.1', '1'].indexOf(clientIp) !== -1;
    },
    /**
     * 
     * @param {*} request 
     */
    getBodyData: function (request) {
        return new Promise(succ => {
            var bufferHelper = new BufferHelper();
            if (!request.on) {
                succ(JSON.stringify(request.body||{}));
            } else {
                request.on("data", function (chunk) {
                    bufferHelper.concat(chunk);
                });
                request.on('end', function () {
                    succ(bufferHelper.toBuffer());
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