
var fs = require("fs");


module.exports = (function () {

    var returnData = {};
    var helpHtml = fs.readFileSync('help.html').toString().replace('window.configData = []', 'window.configData = ' + JSON.stringify(initConfig('config', returnData)));

    return function (request, bodyData) {
        if (!request) {
            return helpHtml;
        }
        var keys = Object.keys(returnData);
        var urls = Object.keys(returnData).filter(function (key) {
            return (!key.match(/\[(.*)\]/) || new RegExp('\[' + request.method + '\]', 'i').test(key))
                && new RegExp('^\\/*' + key.split('?')[0].replace(/\[(.*)\]/, '').replace(/\//g, '\\/+').replace(/:((?!\/).)*/g, '((?!\\/).)+') + '\\/*$', 'i').test(request.url.split('?')[0])
        });

        if (urls.length) {
            var mothedUrl = urls.filter(function (i) { return new RegExp('\\[' + request.method + '\\]', 'i').test(i.match(/\[(.*)\]/) ? i : ('[GET]' + i)); });
            if (mothedUrl.length) {
                return run(countValue(mothedUrl));
            }
            return run(countValue(urls));
        }

        function run(filterUrlKV) {
            return returnResult(filterUrlKV[Math.max.apply(Math, Object.keys(filterUrlKV))], request.url, bodyData);
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

    function returnResult(key, url, bodyData) {
        var parameters = getParameters(key, url.split('?'));
        var configStr = JSON.stringify(returnData[key]);
        Object.keys(parameters).forEach(function (parm) {
            configStr = configStr.replace(new RegExp(':' + parm, 'g'), parameters[parm]);
        });
        Object.keys(bodyData).forEach(function (parm) {
            configStr = configStr.replace(new RegExp('((?!\\).)+:' + parm, 'g'), bodyData[parm]);
        });
        return JSON.parse(configStr.replace(/\\:/g,':'));
    }

    function initConfig(dirpath, returnData) {
        var config = [];
        fs.readdirSync(dirpath).forEach(function (item) {
            var info = fs.statSync(dirpath + '/' + item);
            if (info.isDirectory()) {
                config = config.concat(initConfig(dirpath + '/' + item, returnData));
            } else if (/\.json$/.test(item)) {
                var data = JSON.parse(fs.readFileSync(dirpath + '/' + item).toString());
                config.push({
                    file: dirpath + '/' + item,
                    config: data
                });
                Object.keys(data).forEach(function (key) {
                    returnData[key] = data[key];
                });
            }
        });
        return config;
    }

    // 解析url获取参数
    function getParameters(key, urlAndParms) {
        var parameters = {};

        var keys = key.split('?')[0].replace(/\[.*\]/, '').split('/').filter(function (i) { return !!i; });
        var urls = urlAndParms[0].split('/').filter(function (i) { return !!i; });

        if (urlAndParms[1]) {
            urlAndParms[1].split('&').forEach(function (str) {
                parameters[str.split('=')[0]] = str.split('=')[1];
            });
        }
        for (var i = 0; i < keys.length; i++) {
            if (/:.*/.test(keys[i])) {
                parameters[keys[i].replace(':', '')] = urls[i];
            }
        }
        return parameters;
    }


})();