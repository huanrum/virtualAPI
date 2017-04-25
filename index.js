var http = require('http');
var fs = require("fs");
var random = require('./random');
var config = JSON.parse(fs.readFileSync('config.json').toString());

http.createServer(function (request, response) {

    // 发送 HTTP 头部 
    // HTTP 状态值: 200 : OK
    // 内容类型: text/plain
    response.writeHead(200, { 'Content-Type': 'text/plain' });

    if (!Object.keys(config).some(function (key) {
        var method = key.match(/\[(.*)\]/) && key.match(/\[(.*)\]/)[1];
        var keys = key.replace(/\[.*\]/,'').replace(/\s*\//, '').replace(/\/\s*$/, '').replace(/\/\//g,'/').split('/');
        var urls = request.url.split('?')[0].replace(/\s*\//, '').replace(/\/\s*$/, '').replace(/\/\//g,'/').split('/');
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
                Object.keys(parameters).forEach(function(parm){
                    configStr = configStr.replace(new RegExp(':'+parm,'g'),parameters[parm]);
                });
                response.end(JSON.stringify(random(JSON.parse(configStr))));
                return true;
            }

        }
    })) {
        response.end('404');
    };

}).listen(8888);

// 终端打印如下信息
console.log('Server running at http://127.0.0.1:8888/');