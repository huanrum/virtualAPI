
var fs = require("fs");
var debugFn = require("./debug");

var watchDirectory = (function () {
    var watches = [];
    setInterval(function () {
        watches.forEach(w => w());
    }, 1000);
    return function (dirpath, fn) {
        watches.push(readDirectory(dirpath, fn));
    }
    function readDirectory(dirpath, fn) {
        var files = fs.readdirSync(dirpath);
        files.forEach(fn);
        return function () {
            fs.readdirSync(dirpath).forEach(function (item) {
                if (files.indexOf(item) === -1) {
                    files.push(item);
                    fn(item);
                }
            });
        }
    }
})();

var watchFiles = (function () {
    var watches = [];
    setInterval(function () {
        watches.forEach(w => w());
    }, 1000);
    return function (files, fn) {
        if (!(files instanceof Array)) {
            files = [files];
        }
        watches.push(readFiles(files, fn));
    };
    function readFiles(files, fn) {
        var baseContents = files.map(file => fs.existsSync(file) ? fs.readFileSync(file).toString() : '');
        fn.apply(null, baseContents);
        return function () {
            var contents = files.map(file => fs.existsSync(file) ? fs.readFileSync(file).toString() : '');
            if (contents.join() !== baseContents.join()) {
                baseContents = contents;
                fn.apply(null, baseContents);
            }
        };
    }
})();

module.exports = (function () {

    var returnData = {}, configData = {}, disableList = [];
    initConfig('config', configData, returnData);

    return function (request, bodyData) {
        if (!request) {
            return fs.readFileSync('help.html').toString().replace('window.configData = []', 'window.configData = ' + JSON.stringify(Object.keys(configData).map(f => { return { file: f, config: configData[f] }; })));
        }

        var keys = Object.keys(returnData);
        var urls = Object.keys(returnData).filter(function (key) {
            return (!key.match(/\[(.*)\]/) || new RegExp('\[' + request.method + '\]', 'i').test(key))
                && new RegExp('^\\/*' + key.split('?')[0].replace(/\[(.*)\]/, '').replace(/\//g, '\\/+').replace(/:((?!\/).)*/g, '((?!\\/).)+') + '\\/*$', 'i').test(request.url.split('?').shift())
                && (Object.keys(request.headers).indexOf('disable') !== -1 || disableList.indexOf(key) === -1);
        });

        if (urls.length) {
            var mothedUrl = urls.filter(function (i) { return new RegExp('\\[' + request.method + '\\]', 'i').test(i.match(/\[(.*)\]/) ? i : ('[GET]' + i)); });
            if (mothedUrl.length) {
                return run(countValue(mothedUrl));
            }
            return run(countValue(urls));
        }

        function run(filterUrlKV) {
            return returnResult(filterUrlKV[Math.max.apply(Math, Object.keys(filterUrlKV))], request, bodyData);
        }

        function countValue(filterUrls) {
            var filterUrlArray = {};
            filterUrls.map(function (i) {
                var value = 0;
                i.replace(/\[.*\]/, '').split('/').filter(function (i) { return !!i; }).forEach(function (i, index) {
                    value += (/:/.test(i) ? 0 : Math.pow(filterUrls.length, index));
                });
                filterUrlArray[value] = i;
            });
            return filterUrlArray;
        }
    };

    function getClientIp(req) {
        return req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
    };

    function copy(data){
        return JSON.parse(JSON.stringify(data||''));
    }

    function returnResult(key, request, bodyData) {
        var parameters = getParameters(key, request.url.split('?'),request.headers);
        var configStr = JSON.stringify(typeof returnData[key].js === 'function' ? returnData[key].js(copy(returnData[key].data), parameters, bodyData) : returnData[key].data);
        debugFn(request, parameters, bodyData, returnData[key].data, log);
        if (Object.keys(request.headers).indexOf('disable') !== -1) {
            if (request.headers.disable === 'true') {
                disableList.push(key);
            } else {
                disableList = disableList.filter(function (i) { return i !== key; });
            }
            return '改变API的可用性为' + request.headers.disable;
        }
        Object.keys(parameters).forEach(function (parm) {
            configStr = configStr.replace(new RegExp(':' + parm, 'g'), parameters[parm]);
        });
        Object.keys(bodyData).forEach(function (parm) {
            configStr = configStr.replace(new RegExp(':' + parm, 'g'), bodyData[parm]);
        });
        log(new Date(), getClientIp(request), request.headers['referer'], key, request.url.split('?').shift(),toxml('parameters',parameters), toxml('bodyData',bodyData));
        try {
            return JSON.parse(configStr);
        } catch (e) {
            return configStr;
        }

    }


    function initConfig(dirpath, configData, returnData) {
        watchDirectory(dirpath, function (item) {
            try {
                var info = fs.statSync(dirpath + '/' + item);
                if (info.isDirectory()) {
                    initConfig(dirpath + '/' + item, configData, returnData);
                } else if (/\.json$/.test(item.replace(/\.js$/, '.json'))) {
                    watchFiles([dirpath + '/' + item.replace(/\.js$/, '.json'), dirpath + '/' + item.replace(/\.json$/, '.js')], function (json, js) {
                        try {
                            var data = JSON.parse(json || '{}');
                            var javascript = eval('(function(){var module = {};' + (js || 'module.exports={};') + ';return module.exports;})()');

                            configData[dirpath + '/' + item.replace(/\.js(on)?$/, '')] = Object.assign({}, javascript, JSON.parse(JSON.stringify(data).replace(/</g, '&lt;').replace(/>/g, '&gt;')));

                            Object.keys(data).concat(Object.keys(javascript)).forEach(function (key) {
                                returnData[key] = {
                                    data: data[key],
                                    js: javascript[key]
                                };
                            });
                        }
                        catch (e) {

                        }
                    });
                }
            }
            catch (e) {
                log(new Date(), dirpath + '/' + item, e.message);
            }
        });
    }

    // 解析url获取参数
    function getParameters(key, urlAndParms,headers) {
        var parameters = {test:test};

        var keys = key.split('?')[0].replace(/\[.*\]/, '').split('/').filter(function (i) { return !!i; });
        var urls = urlAndParms[0].split('/').filter(function (i) { return !!i; });

        if (urlAndParms[1]) {
            urlAndParms[1].split('&').forEach(function (str) {
                parameters[str.split('=')[0]] = decodeURIComponent(str.split('=')[1]);
            });
        }
        for (var i = 0; i < keys.length; i++) {
            if (/:.*/.test(keys[i])) {
                parameters[keys[i].replace(':', '')] = urls[i];
            }
        }
        return Object.assign(parameters,headers);
    }


    function log() {
        var size = 100 * 1024;
        var message = '\n<log>\n   <item>' + Array.prototype.join.call(arguments, '</item>\n  <item>') + '</item>\n</log>\n';
        fs.readdir('log', function (error, files) {
            if (error) { return; }
            var file = files.find(function (item) {
                return /\.xml$/.test(item) && fs.statSync('log/' + item).size < size;
            });
            if (!file) {
                file = Date.now() + '.xml';
            }
            fs.appendFile('log/' + file, message, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        });
    }

    function toxml(name,obj){
        var content = Object.keys(obj).map(function(key){
            if(typeof obj[key] === 'object'){
                return toxml(key,obj[key]);
            }else{
                return `<${key}>${obj[key]}</${key}>`
            }
        })
        return `<${name}>${content}</${name}>`;
    }


})();