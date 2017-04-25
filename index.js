var http = require('http');
var fs = require("fs");
var random = require('./random');
var config = JSON.parse(fs.readFileSync('config.json').toString());

http.createServer(function (request, response) {
    try {
        if (!Object.keys(config).some(function (key) {
            var method = key.match(/\[(.*)\]/) && key.match(/\[(.*)\]/)[1];
            var keys = key.replace(/\[.*\]/, '').replace(/\s*\//, '').replace(/\/\s*$/, '').replace(/\/\//g, '/').split('/');
            var urls = request.url.split('?')[0].replace(/\s*\//, '').replace(/\/\s*$/, '').replace(/\/\//g, '/').split('/');
            if (keys.length === urls.length && (!method || method === request.method)) {
                var find = true;
                // 解析url获取参数
                var parameters = {};
                if (request.url.split('?')[1]) {
                    request.url.split('?')[1].split('&').forEach(function (str) {
                        parameters[str.split('=')[0]] = str.split('=')[1];
                    });
                }
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i] !== urls[i] && !/:.*/.test(keys[i])) {
                        find = false;
                    } else if (/:.*/.test(keys[i])) {
                        parameters[keys[i].replace(':', '')] = urls[i];
                    }
                }
                if (find) {
                    var configStr = JSON.stringify(config[key]);
                    Object.keys(parameters).forEach(function (parm) {
                        configStr = configStr.replace(new RegExp(':' + parm, 'g'), parameters[parm]);
                    });

                    response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' });
                    response.end(JSON.stringify(random(JSON.parse(configStr))));
                    return true;
                }

            }
        })) {
            response.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' });
            response.end('<strong>404</strong> 地址不存在');
        };
    } catch (e) {
        response.writeHead(500, { 'Content-Type': 'text/html;charset=utf-8' });
        response.end('<strong>500</strong> 服务器异常' + e.message);
    }


}).listen(8888);

// 终端打印如下信息
console.log('Server running at http://127.0.0.1:8888/');