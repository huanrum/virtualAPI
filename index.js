var http = require('http');
var fs = require("fs");
var querystring = require('querystring');

var random = require('./random');
var helper = require('./helper');


http.createServer(function (request, response) {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (/^[\/\s]*$/.test(request.url)){
        response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
        response.end(helper());
    } else {
        try {
            var bodyData = '';
            request.on('data', function (chunk) {
                bodyData += chunk;
            });
            request.on('end', function () {
                var returnData = helper(request, querystring.parse(bodyData));
                if (returnData) {
                    response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' });
                    response.end(JSON.stringify(random(returnData)));
                } else {
                    response.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
                    response.end('404 地址不存在');
                }
            });

        } catch (e) {
            response.writeHead(500, { 'Content-Type': 'text/plain;charset=utf-8' });
            response.end('500 服务器异常' + e.message);
        }
    }
}).listen(8888);

// 终端打印如下信息
console.log('Server running at http://127.0.0.1:8888/');