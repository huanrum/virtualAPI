
var fs = require("fs");


module.exports = (function () {

    var returnData = {};
    var helpHtml = fs.readFileSync('help.html').toString().replace('window.configData = []', 'window.configData = '+ JSON.stringify(initConfig('config',returnData)));

    return function (request,bodyData) {
        if(!request){
            return helpHtml;
        }
        var keys = Object.keys(returnData);
        for (var index = 0; index < keys.length; index++) {
            //判断是否是对应的url
            if ((!keys[index].match(/\[(.*)\]/) || new RegExp('^\[' + request.method + '\]', 'i').test(keys[index]))
                && new RegExp('^\\/*' + keys[index].replace(/\//g, '\\/+').replace(/:((?!\/).)*/g, '((?!\\/).)+') + '\\/*$').test(request.url.split('?')[0])) {
                var parameters = getParameters(keys[index], request.url.split('?'));
                var configStr = JSON.stringify(returnData[keys[index]]);
                Object.keys(parameters).forEach(function (parm) {
                    configStr = configStr.replace(new RegExp(':' + parm, 'g'), parameters[parm]);
                });
                Object.keys(bodyData).forEach(function (parm) {
                    configStr = configStr.replace(new RegExp(':' + parm, 'g'), bodyData[parm]);
                });
                return JSON.parse(configStr);
            }
        }
    };

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

        var keys = key.replace(/\[.*\]/, '').split('/').filter(function (i) { return !!i; });
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