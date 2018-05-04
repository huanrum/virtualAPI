var fs = require("fs");
var path = require('path');

var helper = require('./../helper');
var random = require("./../random");

var log = require("./../log");

module.exports = (function () {

    var defaultReturn = {
        message: '根据具体逻辑处理返回'
    };
    var returnData = {},
        configData = {},
        disableList = [];
    var configs = [];

    initConfig(__dirname + '/config', configData, returnData);

    api.config = function (web, __dir) {
        if (typeof __dir === 'function') {
            configs.push({
                web: web,
                fn: __dir
            });
        } else {
            initConfig(__dir, configData, returnData);
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
            return helper.repalceContent(__dirname+'/view/',fs.readFileSync(__dirname + '/index.html').toString(),Object.keys(configData).map(f => {
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
            if (mothedUrl.length) {
                return run(countValue(mothedUrl));
            }
            return run(countValue(urls));
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
            return new Promise(succ => {
                helper.getBodyData(request).then(bodyData => {
                    returnResult(key, request, toObject(bodyData.toString() || '{}')).then(function(data){
                        if (data) {
                            var webModuleReg = /\^(((?!\/).)*)/;
                            var datas = random(returnData[key].path)(data);
                            if (typeof datas === 'string' && fs.existsSync(returnData[key].path + '/' + datas)) {
                                response.writeHead(200, {
                                    'Content-Type': helper.type(datas.split('.').pop())
                                });
                                response.end(fs.readFileSync(returnData[key].path + '/' + datas));
                            } else if (webModuleReg.test(datas) && fs.existsSync(datas.replace(webModuleReg,helper.config(webModuleReg.exec(datas)[1])))) {
                                response.writeHead(200, {
                                    'Content-Type': helper.type(datas.split('.').pop())
                                });
                                response.end(fs.readFileSync(datas.replace(webModuleReg,helper.config(webModuleReg.exec(datas)[1]))));
                            } else {
                                var jsonp = request.url.split('?').pop().split('&').filter(i=>/^callback\s*=\s*.+/i.test(i)).pop();
                                response.writeHead(200, {
                                    'Content-Type': 'text/plain;charset=utf-8'
                                });
                                if(jsonp){
                                    response.end(';' + jsonp.split('=')[1] + '(' +JSON.stringify(datas) + ')');
                                }else{
                                    response.end(JSON.stringify(datas));
                                }
                                
                            }
                        } else {
                            succ();
                        }
                    });
                });
            });

            function toObject(data) {
                try {
                    return JSON.parse(data);
                } catch (e) {
                    return {};
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


    function returnResult(key, request, bodyData) {
        var parameters = helper.getParameters(key, request);

        return new Promise(function (resolve) {
            var apiFn = typeof returnData[key].js === 'function' ? returnData[key].js(JSON.parse(JSON.stringify(returnData[key].data || defaultReturn)), parameters, bodyData, request) : returnData[key].data;
            if (apiFn.then) {
                apiFn.then(data => resolve(done(JSON.stringify(data))));
            } else {
                resolve(done(JSON.stringify(apiFn)));
            }
        });

        function done(configStr) {
            if (typeof (returnData[key] && returnData[key].js) === 'function') {
                console.log('\x1B[38m', 'use localhost api :' + key);
            } else {
                console.log('\x1B[39m', 'use random :' + key);
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
            log(new Date(), helper.getClientIp(request), request.headers['referer'], key, request.url, JSON.stringify(bodyData));
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
    function initConfig(dirpath, configData, returnData) {
        if (fs.existsSync(dirpath)) {
            fs.readdirSync(dirpath).forEach(function (item) {
                try {
                    var info = fs.statSync(dirpath + '/' + item);
                    if (info.isDirectory()) {
                        initConfig(dirpath + '/' + item, configData, returnData);
                    } else if (/\.(js|json)$/.test(item)) {
                        try {
                            var fileName = path.join(dirpath + '/' + item.replace(/\.(js|json)$/, ''));
                            var js = fs.existsSync(fileName + '.js') ? require(fileName + '.js') : {},
                                jsNew = {};
                            var json = fs.existsSync(fileName + '.json') ? JSON.parse(fs.readFileSync(fileName + '.json') || '{}') : {};

                            Object.keys(js).forEach(k => jsNew[k] = typeof js[k] === 'function' ? defaultReturn : js[k]);
                            configData[fileName.replace(path.join(__dirname + '/../../'), '')] = Object.assign({}, jsNew, JSON.parse(JSON.stringify(json).replace(/</g, '&lt;').replace(/>/g, '&gt;')));

                            Object.keys(json).concat(Object.keys(js)).forEach(function (key) {
                                returnData[key.replace(/\(.*\)/g, '')] = Object.assign(Object.create({random:random}),{
                                    path: dirpath,
                                    data: json[key],
                                    js: js[key]
                                });
                            });
                        } catch (e) {

                        }
                    }
                } catch (e) {
                    log(new Date(), dirpath + '/' + item, e.message);
                }
            });
        }
    }

})();