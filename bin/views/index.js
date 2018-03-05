var fs = require("fs");
var path = require('path');
var child_process = require('child_process');

var helper = require('./../helper');


module.exports = (function () {
    var configs = [], mergeList = [];
    var basePath = __dirname.replace('\\bin\\views', '\/').replace('/bin/views', '\/');
    var webmap = i => i;

    view.config = function (fn) {
        if (fn instanceof Array) {
            fn.forEach(i => view.config(i));
        } if (typeof fn === 'string') {
            mergeList.push(path.join(fn));
        } else if (fn && typeof fn === 'object') {
            configs.push(fn);
        }
    };

    if (fs.existsSync(__dirname + '/../../views/__config.js')) {
        webmap = require(__dirname + '/../../views/__config.js');
    }

    return view;


    function view(options, request, response) {
        var onlyUrl = request.url.split('?').shift();
        var type = onlyUrl.split('.').slice(1).pop() || 'html';
        var file = helper.config(basePath + onlyUrl);

        if (fs.existsSync(file)) {
            if (fs.statSync(file).isDirectory()) {
                if(redirect(file)){
                    var params = request.url.split('?')[1] || '';
                    response.writeHead(302, { 'Location': onlyUrl + '/' + redirect(file) + (params ? '?' : '') + params });
                    response.end();
                } else {
                    response.setHeader('Content-Type', 'text/html;charset=utf-8');
                    views(options, request, response, onlyUrl).then(content => response.end(content));
                }
            } else {
                response.setHeader("Content-Type", helper.type(type) || 'text/plain;charset=utf-8');
                transverter(options, request, response, file).then(content => response.end(content));
            }
        } else {
            response.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' });
            response.end(helper[404](options,'地址不存在'));
        }
    }

    function redirect(file){
        var defaultPages = ['index.html','default.html'];
        for(var i=0;i<defaultPages.length;i++){
            if (fs.existsSync(file + '/' + defaultPages[i])) {
                return  defaultPages[i];
            } 
        }
        return '';
    }

    function views(options,request, response, _path) {
        return new Promise(succ => {
            var htmlPath = helper.config(__dirname + '/../../service/' + _path.replace('/views', '') + '/views/index.html');
            var replace = `${options.ip}:${options.port}/${_path}`;
            var addToolbar = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath).toString() : '';
            var divPath = helper.config(basePath + _path || basePath);
            var dirs = {}, branch = helper.branch(divPath);
            var netSegment = helper.net(request) || helper.localhost(request);

            fs.readdirSync(divPath).forEach(function (i) {
                var config = configs.filter(cfn => cfn.path && cfn.version && path.join(divPath + '/' + i).indexOf(path.join(cfn.path)) !== -1).pop();
                dirs['['+ helper.packTool(path.join(divPath + '/' + i)) + ']' + i] =  config?config.version(i):{};
            });

            if (/\/views\/*$/.test(_path)) {
                var allPath = helper.config();
                Object.keys(allPath).forEach(function (i) {
                    dirs['['+helper.packTool(allPath[i]) + ']' + i] = {};
                });
            }

            succ(fs.readFileSync(__dirname + '/index.html', 'utf-8').toString().replace('window.$data = {};', 'window.$data = ' + decodeURIComponent(JSON.stringify({
                _path: _path, dirs: dirs, replace: replace, options: options, branch: branch, netSegment:netSegment
            }, null, 4))).replace('/*addToolbar:(function(){})();*/', addToolbar.replace(/<\/?script>/gi, '')));
        });
    }


    function transverter(options, request, response, file) {

        var filterConfigs = configs.filter(cfn => cfn.path && cfn.fn && path.join(file).indexOf(path.join(cfn.path)) !== -1);

        return new Promise(succ => {
            var merge = request.url.split('?').pop().split('&').filter(i => /merge=/.test(i)).pop();
            var data = fs.readFileSync(file.replace(/\/\//g, '/'));
            if (/(\/|\\)index\.html/.test(file)) {
                var weinre = options.ip + ':' + options.weinre;
                var content = data.toString().replace(/\?\d+/g, '').replace(/<head>/, function (str) {
                    return str + '<title>' + path.basename(file.replace('index.html', '')) + '</title>';
                }).replace(/<body((?!>).)*>/, function (str) {
                    return str + '\n\t' + (options.ip !== '127.0.0.1' && options.weinre && !helper.localhost(request)? ('<script src="http://' + weinre + '/target/target-script-min.js#anonymous"></script>') : '');
                });

                filterConfigs.forEach(cfn => {
                    content = cfn.fn(file, content, merge);
                });

                data = new Buffer(content.toString());
            } else if (merge && fs.existsSync(file.replace(/\.js.*/, '')) || filterConfigs.some(cfn => cfn.files.some(i => path.join(cfn.path + '/' + i) === path.join(file)))) {
                data = new Buffer(helper.readAllJSContent(data.toString(), file.replace(/\.js.*/, '')));
            }

            succ(data);
        });


    }

})();