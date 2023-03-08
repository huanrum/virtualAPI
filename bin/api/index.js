var fs = require("fs");
var path = require('path');

var helper = require('./../helper');
var random = require("./../random");

var log = require("./../log");

module.exports = (function () {

    var isNotNormalObject = function(data, base){
        return (typeof data === 'object' && data.constructor.name !== 'Object') || base;
    }

    var defaultReturn = {
        message: '根据具体逻辑处理返回'
    };
    var returnData = {},
        configData = {},
        disableList = [];
    var configs = [];

    initConfig('', __dirname + '/config', configData, returnData);

    api.config = function (web, __dir) {
        if (typeof __dir === 'function') {
            configs.push({
                web: web,
                fn: __dir
            });
        } else {
            initConfig(web, __dir, configData, returnData);
        }
    };

    return api;
    /**
     * 入口
     * @param {*} options 
     * @param {*} request 
     * @param {*} response 
     */
    function api(options, request, response) {
        if (!request) {
            return helper.replaceContent(__dirname+'/view/',fs.readFileSync(__dirname + '/index.html').toString(),Object.keys(configData).map(f => {
                return {
                    file: f,
                    config: configData[f]
                };
            }));
        }

        var keys = Object.keys(returnData);
        var urls = Object.keys(returnData).filter(function (key) {
            return (!key.match(/\[(.*)\]/) || new RegExp('\[' + request.method + '\]', 'i').test(key)) &&
                new RegExp('^\\/*' + key.split('?')[0].replace(/\[(.*)\]/, '').replace(/\//g, '\\/+').replace(/:((?!\/).)*/g, '((?!\\/).)+') + '\\/*$', 'i').test(request.url.split('?')[0]) &&
                (Object.keys(request.headers).indexOf('disable') !== -1 || disableList.indexOf(key) === -1);
        });

        if (urls.length) {
            var mothedUrl = urls.filter(function (i) {
                return new RegExp('\\[' + request.method + '\\]', 'i').test(i.match(/\[(.*)\]/) ? i : ('[GET]' + i));
            });
            return new Promise(function(succ,fail){
                if(request.headers['debug-statuscode']){
                    request.statusCode = +request.headers['debug-statuscode'];
                }
                setTimeout(function(){
                    if (mothedUrl.length) {
                        return run(countValue(mothedUrl)).then(succ,fail);
                    }
                    return run(countValue(urls)).then(succ,fail);
                }, request.headers['debug-timeout']);
            });
        } else {
            return new Promise(succ => {
                helper.getBodyData(request).then(bodyData => {
                    var promises = configs.filter(cf => new RegExp('\/?views\/+' + cf.web.replace(/\-/g, '\\-') + '\/', 'i').test(request.headers.referer + '/')).map(cf => cf.fn(request, response, bodyData.toString())).filter(i => !!i);
                    if (!promises.length) {
                        succ();
                    }
                });
            });
        }

        /**
         * 找到符合条件的所有api地址
         * @param {*} filterUrlKV 
         */
        function run(filterUrlKV) {
            var key = filterUrlKV[Math.max.apply(Math, Object.keys(filterUrlKV))];
            var isEndType = function(data){return /\[object (Uint8Array|string)\]/.test(Object.prototype.toString.call(data));};
            return new Promise(succ => {
                helper.getBodyData(request).then(bodyData => {
                    returnResult(key, request,response, toObject(bodyData.toString() || '{}')).then(function(data){
                        request.statusCode = request.statusCode || 200;
                        if (data) {
                            var webModuleReg = /\^(((?!\/).)*)/;
                            var notRandom = request.html || /text\/html/.test(response.getHeader('Content-Type'));
                            var datas = notRandom ? data : random(returnData[key].path)(data);
                            if (isNotNormalObject(data)){
                                response.end(isEndType(data) ? data : JSON.stringify(data));
                            } else if (typeof datas === 'string' && fs.existsSync(returnData[key].path + '/' + datas)) {
                                response.writeHead(request.statusCode, {
                                    'Content-Type': response.getHeader('Content-Type') || helper.type(datas.split('.').pop())
                                });
                                response.end(fs.readFileSync(returnData[key].path + '/' + datas));
                            } else if (webModuleReg.test(datas) && datas.replace && fs.existsSync(datas.replace(webModuleReg,helper.config(webModuleReg.exec(datas)[1])))) {
                                response.writeHead(request.statusCode, {
                                    'Content-Type': response.getHeader('Content-Type') || helper.type(datas.split('.').pop())
                                });
                                response.end(fs.readFileSync(datas.replace(webModuleReg,helper.config(webModuleReg.exec(datas)[1]))));
                            } else {
                                var jsonp = request.url.split('?').pop().split('&').filter(i=>/^callback\s*=\s*.+/i.test(i)).pop();
                                response.writeHead(request.statusCode, {
                                    'Content-Type': response.getHeader('Content-Type') || helper.type(request.url) || 'text/plain;charset=utf-8'
                                });
                                if(jsonp){
                                    response.end(';' + jsonp.split('=')[1] + '(' +JSON.stringify(datas) + ')');
                                }else{
                                    response.end(typeof datas === 'string' ? datas : JSON.stringify(datas));
                                }
                                
                            }
                        } else if(data !== undefined){
                            succ();
                        }
                    }, function(error){
                        response.writeHead(400, {
                            'Content-Type': 'text/plain;charset=utf-8'
                        });
                        response.end(JSON.stringify(error));
                    });
                });
            });

            function toObject(data) {
                try {
                    return JSON.parse(data);
                } catch (e) {
                    return data;
                }
            }
        }

        function countValue(filterUrls) {
            var filterUrlArray = {};
            filterUrls.map(function (i) {
                var value = 0;
                i.replace(/\[.*\]/, '').split('/').filter(function (i) {
                    return !!i;
                }).forEach(function (i, index) {
                    value += (/:/.test(i) ? 0 : Math.pow(filterUrls.length, index));
                });
                filterUrlArray[value] = i;
            });
            return filterUrlArray;
        }
    }


    function returnResult(key, request, response, bodyData) {
        var parameters = helper.parameters(request,key);

        return new Promise(function (resolve) {
            var apiFn = typeof returnData[key].js === 'function' ? returnData[key].js(JSON.parse(JSON.stringify(returnData[key].data || defaultReturn)), parameters, bodyData, request, response) : returnData[key].data;
            if (apiFn && apiFn.then) {
                apiFn.then(data => resolve(done(data)));
            } else {
                resolve(done(apiFn));
            }
        });

        function done(data) {
            if(isNotNormalObject(data)){
                return data;
            }
            var configStr = JSON.stringify(data);
            if(!configStr){
                return configStr;
            }
            if (typeof (returnData[key] && returnData[key].js) === 'function') {
                helper.console('bold', 'use localhost api :' + key);
            } else {
                helper.console('bold', 'use random :' + key);
            }
            if (Object.keys(request.headers).indexOf('disable') !== -1) {
                if (request.headers.disable === 'true') {
                    disableList.push(key);
                } else {
                    disableList = disableList.filter(function (i) {
                        return i !== key;
                    });
                }
                return '改变API的可用性为' + request.headers.disable;
            }
            Object.keys(parameters).forEach(function (parm) {
                configStr = configStr.replace(new RegExp(':' + parm, 'g'), parameters[parm]);
            });
            Object.keys(bodyData).forEach(function (parm) {
                configStr = configStr.replace(new RegExp(':' + parm, 'g'), bodyData[parm]);
            });
            log(new Date(), helper.clientIp(request), request.headers['referer'], request.headers['user-agent'], key, request.url, JSON.stringify(bodyData));
            try {
                return JSON.parse(configStr);
            } catch (e) {
                return configStr;
            }
        }
    }

    /**
     * 读取所有配置初始化api
     * @param {*} dirpath 
     * @param {*} configData 
     * @param {*} returnData 
     */
    function initConfig(web, dirpath, configData, returnData) {
        if (fs.existsSync(dirpath)) {
            fs.readdirSync(dirpath).forEach(function (item) {
                try {
                    var info = fs.statSync(dirpath + '/' + item);
                    if (info.isDirectory()) {
                        initConfig(web, dirpath + '/' + item, configData, returnData);
                    } else if (/\.(js|json)$/.test(item)) {
                        try {
                            var fileName = path.join(dirpath + '/' + item.replace(/\.(js|json)$/, ''));
                            var js = fs.existsSync(fileName + '.js') ? require(fileName + '.js') : {},
                                jsNew = {};
                            var json = fs.existsSync(fileName + '.json') ? JSON.parse(fs.readFileSync(fileName + '.json') || '{}') : {};

                            Object.keys(js).forEach(k => jsNew[k] = typeof js[k] === 'function' ? defaultReturn : js[k]);
                            configData['[' + web + ']' + fileName.replace(path.join(__dirname + '/../../'), '')] = Object.assign({}, jsNew, JSON.parse(JSON.stringify(json).replace(/</g, '&lt;').replace(/>/g, '&gt;')));

                            Object.keys(json).concat(Object.keys(js)).forEach(function (key) {
                                returnData[key.replace(/\(.*\)/g, '')] = Object.assign(Object.create({random:random}),{
                                    path: dirpath,
                                    data: json[Object.keys(json).filter(i=>i.replace(/\(.*\)/g,'') === key.replace(/\(.*\)/g,'')).pop()],
                                    js: js[Object.keys(js).filter(i=>i.replace(/\(.*\)/g,'') === key.replace(/\(.*\)/g,'')).pop()] || function(data, parameters){
                                        var parms = (/\((.*)\)/.exec(key) && /\((.*)\)/.exec(key)[1].split(',') || []).filter(p=>/\*/g.test(p)).map(p=>p.replace(/\*/g,''));
                                        var r_parms = parms.filter(p=>!/=/.test(p) && !parameters[p.split(/[:=]/).shift()]);
                                        if(r_parms.length){
                                            return {
                                                message: '缺少必填参数: ' + r_parms.join()
                                            }
                                        }
                                        return data;
                                    }
                                });
                            });
                        } catch (e) {
                            helper.console(e);
                        }
                    }
                } catch (e) {
                    log(new Date(), dirpath + '/' + item, e.message);
                }
            });
        }
    }

})();