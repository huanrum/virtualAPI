
var fs = require("fs");
var http = require('http');
var child_process = require('child_process');

var random = require('./random');
var helper = require('./helper');
var cache = require('./cache');
var views = require('./views');
var action = require('./action');


var createServer = function (port, exits) {
    if (exits) { return; }

    randomFn = random({ IP: 'http://127.0.0.1', PORT: port });
    http.createServer(function (request, response) {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With,User,Language,IsPc,Token')
        if (/^[\/\s]*$/.test(request.url)) {
            response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
            response.end(helper());
        } else if (request.url.toLocaleLowerCase() === '/test') {
            response.end(JSON.stringify(true));
        } else if (/^\/images\//i.test(request.url)) {
            response.end(fs.readFileSync(__dirname + request.url));
        } else if (/^\/action\//i.test(request.url)) {
            response.end(action(request, response));
        } else {
            try {
                var bodyData = '';
                request.on('data', function (chunk) {
                    bodyData += chunk;
                });
                request.on('end', function () {
                    if (/^\/cache\//i.test(request.url)) {//用于处理缓存数据
                        response.end(cache(decodeURIComponent(request.url.replace(/^\/cache\//i, '')), bodyData));
                    } else {
                        var returnData = helper(request, JSON.parse(bodyData || '{}'));
                        if (returnData) {
                            response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' });
                            response.end(JSON.stringify(randomFn(returnData)));
                        } else {
                            if (/^\/views/i.test(request.url)) {
                                response.end(views.views());
                            } else if (views.is(request)) {
                                response.end(views.get(request, response), "binary");
                            } else {
                                response.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
                                response.end('404 地址不存在');
                            }
                        }
                    }

                });

            } catch (e) {
                response.writeHead(500, { 'Content-Type': 'text/plain;charset=utf-8' });
                response.end('500 服务器异常' + e.message);
            }
        }
    }).listen(port);

    // 终端打印如下信息
    console.log('Server running at http://127.0.0.1:' + port + '/');

};

child_process.exec(process.platform == 'win32' ? 'netstat -aon' : 'netstat –apn', function (err, stdout, stderr) {
    var port = 8888, count = 0, thenList = [];
    if (err) { return console.log(err); }
    stdout.split('\n').filter(function (line) { return line.trim().split(/\s+/).length > 4; }).forEach(function (line) {
        var p = line.trim().split(/\s+/);
        if (process.platform == 'win32') {
            p.splice(1, 0, "0");
        }
        if (p[2].split(':')[1] == port || p[3].split(':')[1] == port) {
            ++count;
            child_process.exec('taskkill /pid ' + p[5].split('/')[0] + ' -t -f ', function (err, stdout, stderr) {
                createServer(port, --count);
            });
        }
    });
    createServer(port, count);
});