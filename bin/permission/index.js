var fs = require('fs');
var path = require('path');
var helper = require('../helper');
var web = require('./web');
var secrecy = require('./secrecy');

module.exports = (function () {
    var configs = [];

    permission.config = function (fn) {
        configs.push(fn);
    };

    return permission;

    function permission(request, response) {
        var file = __dirname + '/../../data/permission.json';
        helper.mkdirs(path.dirname(file));
        if (!fs.existsSync(file)) {
        fs.writeFileSync(file, '[["这里是最base的权限"]]');
        }

        if (!response) {
            return check(file, request);
        }

        if (helper.regexpUrl('[^/]+/secrecy', request.url)) {
            return secrecy(request, response)
        }

        helper.getResponse(request).then(bodyData => {
        if (!bodyData.length) {
            view(file, refererUrl(request)).then(data => response.end(data));
        } else {
            update(file, JSON.parse(bodyData.toString()), request).then(data=>response.end(data));
        }
        });
    }

    function check(file, request) {
        if (helper.localhost(request)) {
        return Promise.resolve();
        }

        if (web(request)) {
        return Promise.resolve();
        }

        return new Promise(resolve => {
            var ip = helper.clientIp(request).replace(/::(ffff:)?/, '');
            var permission = JSON.parse(fs.readFileSync(file).toString()).filter(i => i.ip === ip).pop() || {};

            if (permission && Date.now() - permission.time > 4 * 3600 * 1000) {
                return resolve(relogin(request, {
                    code: 403,
                    message: '登陆超时，请重新登陆>',
                }));
            }

            Promise.all(configs.map(f => f(request, permission || {}))).then(promises => {
                if (!promises.filter(i => i === false).length) {
                    return resolve();
                } else {
                    return resolve(relogin(request, {
                        code: 403,
                        message: '没有权限'
                    }));
                }
            });
        });
    }

    function refererUrl(request) {
        if (/^\/*permission\/+\S+/.test(request.url)) {
            return request.url.replace(/^V*permission/i, '');
        }

        if (!helper.localhost(request)) {
            if (request.headers.referer) {
                return request.headers.referer.replace(/https?:\/\//, '').replace(request.headers.host, '');
            }
            return '/views';
        }
    }

    function relogin(request, obj) {
        return Object.assign(
        {
            redirect:
            (!request.headers.referer || /^\/*permission/.test(refererUrl(request))) && !/^\/*permission/.test(request.url) &&'/permission' + request.url,
        }, obj);
    }

    function view(file, data) {
        return new Promise(function (resolve) {
            data = data || JSON.parse(fs.readFileSync(file).toString());
            resolve(helper.replaceContent(__dirname,fs.readFileSync(__dirname+'/index.html').toString(), data));
        });
    }

    //只可以单个修改，并且以ip作为标识
    // 如果不存在ip标识的，标识客户端登录或者修改自己的数据
    function update(file, data, request){
        if(data instanceof Array){
            var ip = helper.clientIp(request).replace(/::(ffff:)?/,'');
            var basePermissions = JSON.parse(fs.readFileSync(file).toString()).filter(i=>i instanceof Array).pop() || [];
            var item = JSON.parse(fs.readFileSync(file).toString()).filter(i=>ip===i.ip).pop()||{};
            return update(file, Object.assign(item, {ip:ip, time:Date.now(),permissions:data.concat(item.permissions || basePermissions)}))
        }else{
            return new Promise(function(resolve){
                var items = JSON.parse(fs.readFileSync(file).toString()).filter(i=>data.ip!==i.ip);
                fs.writeFileSync(file,JSON.stringify(items.concat([data]), null, 2));
                resolve('true');
            });
        }
    }

})();
