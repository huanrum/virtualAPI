var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var child_process = require('child_process');

var privateKey = fs.readFileSync(__dirname + '/credentials/private.pem', 'utf8');
var certificate = fs.readFileSync(__dirname + '/credentials/file.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var helper = require('./helper');
var websocket = require('./websocket');
var weinre = require('./weinre');
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
var framework = require('./framework');
var debugFn = require("./debug");
var log = require('./log');
var jsonp = require('./jsonp');

var note = require('./note');
var work = require('./work');
var share = require('./share');
var tagging = require('./tagging');
var editonline = require('./editonline');
var capture = require('./capture');
var synchronous = require('./synchronous');
var logon = require('./logon');
var backup = require('./backup');

var task = require('./task');

var createServer = function (options) {

    var randomFn = random({hostname:options.hostname, IP: options.ip, PORT: options.port, WEBSOCKET: options.websocket, weinre: options.weinre, device: options.mac });

    https.createServer(credentials, handleRequest('https:')).listen(10000 + options.port);

    http.createServer(handleRequest('http:')).listen(options.port);

    //终端打印如下信息
    helper.console('green', 'Server hostname: ' + options.hostname);
    helper.console('green', 'Server running at http:// ' + options.ip + ':' + options.port + '/');
    helper.console('green', 'Server running at https:// ' + options.ip + ':' + (10000 + options.port) + '/');

     //非8888端口的需要直接打开web页面;
    setTimeout(function(){
        if(process.argv[2]){
            child_process.exec('start http://127.0.0.1:' + options.port + '/');
        }
    },2000);

    function handleRequest(protocol){
        var headers = [
            'Cookies,cookies,Content-Type,Access-Control-Allow-Headers,Authorization,X-Requested-With,User,Language,IsPC,Token,x-forwarded-host',
            '$cookie,x-forwarded-for,x-forwarded-host,x-forwarded-port','sid','token'
        ].join()
        return function(request, response){
            var refers = (request.headers.referer ||'').split(/[\/\\]/).filter(Boolean);
            request.protocol = protocol;
            response.setHeader('Content-Type', 'charset=utf-8;');
            response.setHeader('Access-Control-Allow-Origin', refers.length>1?(`${refers[0]}//${refers[1]}`):'*');
            response.setHeader('Access-Control-Allow-Headers', `${headers},${request.headers['access-control-request-headers']}`);
            response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
            response.setHeader('Access-Control-Allow-Credentials', 'true');

            var checkModule = function(rex){
                var url = request.url.split(/[\?#]/).shift();
                return helper.regexpUrl(rex, url);
            };

            try {
                if(request.headers['sec-fetch-dest']){
                    response.setHeader('Type', request.headers['sec-fetch-dest']);
                }

                permission(request).then(error => {

                    if(!checkModule('logon') && !helper.localhost(request)){
                        var logonName = logon(request);
                        if(!logonName){
                            if(request.method === 'GET'){
                                error = { redirect: '/logon?redirect=' + helper.base64(request.url, true)};
                            }else{
                                error = { redirect: '/logon'};
                            }
                        } else {
                            response.setHeader('Cookie', 'username=' + logonName)
                        }
                    }

                    if (!error) {
                        request.url = request.url.replace(/https?:\/\/((?!\/).)*/,'');

                        //显示服务端相关信息
                        if (/^[\/\s]*$/.test(request.url)) {
                            response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
                            response.end(api());
                        }
                        //测试API
                        else if (checkModule('test')) {
                            response.end(JSON.stringify(true));
                        }
                         //测试API
                        else if (checkModule('debug')) {
                            debugFn(request,response);
                        }
                        else if (checkModule('tagging')) {
                            tagging(request,response);
                        }
                        else if (checkModule('log')) {
                            log(request,response);
                        }
                        else if (checkModule('logon')) {
                            logon(request,response);
                        }
                        else if (checkModule('framework')) {
                            framework(request, response, helper);
                        }
                        //配置Web
                        else if (checkModule('config')) {
                            config(request, response, helper);
                        }
                        //管理权限
                        else if (checkModule('permission')) {
                            permission(request, response);
                        }
                        //WEB操作控制服务端
                        else if (checkModule('action')) {
                            action(request, response);
                        }
                        //展示对应的视图
                        else if (checkModule('views')) {
                            views(options, request, response);
                        }
                        //用于模拟手机APP处理缓存数据
                        else if (checkModule('cache')) {
                            cache(request, response);
                        }
                        //用于处理数据库相关数据
                        else if (checkModule('db')) {
                            db(request, response);
                        }
                        //用于处理数据库相关数据
                        else if (checkModule('task')) {
                            task(request, response);
                        }
                        //用于抓取相关数据处理
                        else if (checkModule('capture')) {
                            capture(request, response);
                        }
                        //用于处理其他域名下的API请求
                        else if (checkModule('proxy')) {
                            proxy(request, response);
                        }
                        //用于兼容客户端没有websocket,采用ajxj来模拟
                        else if (/^\/*websocket\/*$/i.test(request.url)) {
                            websocket(request,response);
                        }
                        //记录信息
                        else if (checkModule('note[^/]*')) {
                            note(request,response);
                        }
                        //查询每日工作
                        else if (checkModule('works?')) {
                            work(request,response);
                        }
                        //分享信息
                        else if (checkModule('shares?')) {
                            share(request,response);
                        }
                        else if (checkModule('jsonp')) {
                            jsonp(request,response);
                        }
                        else if (checkModule('editonlines?')) {
                            editonline(request,response);
                        }
                        //同步各种关联数据
                        else if (checkModule('synchronous')) {
                            synchronous(request,response);
                        }
                        //对请求的数据处理后再返回
                        else if (checkModule('random')) {
                            helper.getBodyData(request,true).then(bodyData => {
                                response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' });
                                response.end(JSON.stringify(randomFn(JSON.parse(bodyData.toString() || '{}'))));
                            });
                        }
                        else {
                            //从自定义的API中查找
                            api(options, request, response).then(returnData => {
                                //获取资源返回服务端
                                if (resource.test(request)) {
                                    resource.read(request, response).then(data => response.end(data));
                                }
                                else {
                                    response.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' });
                                    response.end(helper[404](options, '404 地址不存在'));
                                }
                            });
                        }
                    } else {
                        if(error.redirect){
                            response.writeHead(302, {'Location': error.redirect});
                        }else{
                            response.writeHead(error.code, { 'Content-Type': 'text/plain;charset=utf-8' });
                        }
                        response.end(error.message);
                    }
                });
            } catch (e) {
                response.writeHead(500, { 'Content-Type': 'text/plain;charset=utf-8' });
                response.end('500 服务器异常' + e.message);
            }
        }
    }
};


module.exports = function (options) {
    
    var netInfo = helper.netInfo();

    options = Object.assign(options, { hostname:helper.hostname(), ip: netInfo.address, mac: netInfo.mac });

    helper.console('red', '服务器启动时间 ' + new Date());

    if(options.kill){
        Promise.all([helper.killPort(options.port),helper.killPort(10000 + options.port)]).then(function(){
            createServer(options);
        });
    }else{
        createServer(options);
    }
    
    if(options.websocket){
        Promise.all([helper.killPort(options.websocket),helper.killPort(10000 + options.websocket)]).then(function(){
            websocket(options);
        });
    }
    
    if(options.weinre){
        helper.killPort(options.weinre).then(function(){
            weinre(options);
        });
    }

    if(options.backup){
        var helperBackdir = () => Object.defineProperty(helper, 'backdirs', {
            configurable: true,
            value: fs.readdirSync(__dirname + '/../.backup/').map(i=>path.join(__dirname + '/../.backup/', i))
        });
        
        db({method:'GET',url:'/db/sqlite/START_INFO'}, {end: res=>{
            try{
                // 4小时作为一个循环备份数据
                var interval = 4 * 3600 * 1000;
                var waitingTime = Date.now() - JSON.parse(res).data.pop().NAME < interval / 4 ? interval / 4 : 0;
                helperBackdir();
                setTimeout(() => helper.loop(() => setTimeout(() => {
                    backup.dir();
                    helperBackdir();
                }, 2000), interval), waitingTime);
            }catch(e){
                helperBackdir();
                backup.dir();
            }
        }});
    }

    if(options.extend){
        extendsFunstion(options);
    }

    helper.options = options;
    helper.mkdirs(__dirname + '/../service');
    fs.readdirSync(__dirname + '/../service').forEach(function (item) {
        try {
            if(/^__/.test(item)){return;}
            var pathname = path.join(__dirname + '/../service/' + item);
            api.config(item,path.join(pathname, 'config'));
            require(pathname)(configFn(item), helper);
        } catch (e) {
            console.warn('\x1B[31m', item + ' 配置加载失败 ' + new Date() + ' ==> ', e.message);
        }
    });

    if(fs.existsSync(__dirname + '/../data/service')){
        api.config('data',__dirname + '/../data/service');
    }

    function configFn(module) {
        return function(type){
            var args = Array.prototype.slice.call(arguments, 1);
            switch (type) {
                case 'views':
                    views.config(module,...args);
                    break;
                case 'action':
                    action.config(module,...args);
                    break;
                case 'api':
                    api.config(module,...args);
                    break;
                case 'proxy':
                    proxy.config(module,...args);
                    api.config(module,...args);
                    break;
            }
        };
    }

    function extendsFunstion(){
        helper.rmdirs('c://sssss', i=>/\d$/.test(i));
    }

};


