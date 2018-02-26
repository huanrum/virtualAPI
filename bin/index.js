var http = require('http');
var fs = require('fs');
var child_process = require('child_process');


var helper = require('./helper');
var websocket = require('./websocket');
var resource = require('./resource');
var config = require('./config');
var action = require('./action');
var views = require('./views');
var cache = require('./cache');
var proxy = require('./proxy');
var db = require('./db');
var api = require('./api');
var random = require('./random');
var permission = require('./permission');


var createServer = function (options, exits) {
    if (exits) { return; }

    var randomFn = random({ IP: options.ip, PORT: options.port, WEBSOCKET: options.websocket, weinre: options.weinre, device: options.mac });
    //等待相关服务启动后再重新赋值
    options.weinre = '';

    http.createServer(function (request, response) {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With,User,Language,IsPc,Token');

        try {
            permission(request).then(error => {
                if (!error) {
                    //显示服务端相关信息
                    if (/^[\/\s]*$/.test(request.url)) {
                        response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
                        response.end(api());
                    }
                    //测试API
                    else if (/^\/*test\/+/.test(request.url)) {
                        response.end(JSON.stringify(true));
                    }
                     //配置Web
                    else if (/^\/*config\/+/.test(request.url)) {
                        config(helper,request, response);
                    }
                    //WEB操作控制服务端
                    else if (/^\/*action\/+/i.test(request.url)) {
                        action(request, response);
                    }
                    //展示对应的视图
                    else if (/^\/*views\/*/i.test(request.url)) {
                        views(options, request, response);
                    }
                    //用于模拟手机APP处理缓存数据
                    else if (/^\/*cache\/*/i.test(request.url)) {
                        cache(request, response);
                    }
                    //用于处理数据库相关数据
                    else if (/^\/*db\/*/i.test(request.url)) {
                        db(request, response);
                    }
                    //用于处理其他域名下的API请求
                    else if (/^\/*proxy\/*/i.test(request.url)) {
                        proxy(request, response);
                    }
                    //对请求的数据处理后再返回
                    else if (/^\/*random/.test(request.url)) {
                        helper.getBodyData(request).then(bodyData => {
                            response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' });
                            response.end(JSON.stringify(randomFn(JSON.parse(bodyData||'{}'))));
                        });
                    }
                    else {
                        //从自定义的API中查找
                        api(options, request, response).then(returnData => {
                            //获取资源返回服务端
                            if (resource.test(request.url)) {
                                resource.read(request.url).then(data => response.end(data));
                            }
                            else {
                                response.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
                                response.end('404 地址不存在');
                            }
                        });
                    }
                } else {
                    response.writeHead(error.code, { 'Content-Type': 'text/plain;charset=utf-8' });
                    response.end(error.message);
                }
            });
        } catch (e) {
            response.writeHead(500, { 'Content-Type': 'text/plain;charset=utf-8' });
            response.end('500 服务器异常' + e.message);
        }
    }).listen(options.port);

    // 终端打印如下信息
    console.log('\x1B[32m', 'Server running at http://' + options.ip + ':' + options.port + '/');

};


module.exports = function(options){
    var weinrePort = options.weinre;
    var netInfo = helper.netInfo();

    options = Object.assign(options,{ ip: netInfo.address, mac: netInfo.mac});

    console.log('\x1B[31m', '服务器启动时间 ' + new Date());

    createServer(options, 0);

    websocket(options, 0);

    helper.initModule('weinre').then(function () {
        child_process.exec('weinre --httpPort ' + weinrePort + ' --boundHost ' + options.ip);
        options.weinre = weinrePort;
        console.log('\x1B[32m', 'Weinre running at http://' + options.ip + ':' + weinrePort + '/');
    });

    fs.readdirSync(__dirname + '/../service' ).forEach(function (item) {
        try{
            require(__dirname + '/../service/' + item)(configFn, helper);
        }catch(e){
            console.warn('\x1B[31m', 'item 配置加载失败 ' + new Date() + ' ==> ', e.message);  
        }
    });

    function configFn(type){
        var args = Array.prototype.slice.call(arguments,1);
        switch(type){
            case 'views':
                views.config(...args);
                break;
            case 'action':
                action.config(...args);
                break;
            case 'api':
                api.config(...args);
                break;
            case 'proxy':
                proxy.config(...args);
                api.config(...args);
                break;
        }
    }
    
};


/*
//会自动关闭浏览器，注释掉之后需要手动关闭所有相关进程
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
*/
