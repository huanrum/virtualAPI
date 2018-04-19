var fs = require("fs");
var path = require('path');
var child_process = require('child_process');

var helper = require('./../helper');


module.exports = (function () {
    var configs = [];
    var basePath = __dirname.replace('\\bin\\views', '\/').replace('/bin/views', '\/');

    view.config = function (web,fn) {
        if (fn instanceof Array) {
            fn.forEach(i => view.config(web,i));
        } if (typeof fn === 'function') {
            configs.push(Object.assign({},getObj(),{fn:fn}));
        } else if (fn && typeof fn === 'object') {
            configs.push(Object.assign({},getObj(),fn));
        }

        function getObj(){
            return {
                fn:()=>'',
                version:()=>'',
                files:[],
                path : helper.config(__dirname + '/../../views/'+ web +'/')
            }
        }
    };

    return view;

    function findConfig(file,filetr){
        return configs.filter(cfn => cfn.path && filetr(cfn) && path.join(file).toLocaleLowerCase().indexOf(path.join(cfn.path).toLocaleLowerCase()) !== -1);
        
    }

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
            var webBaseUrl = new RegExp('https?:\/\/'+request.headers.host.replace(/\./g,'\\.'));
            var filterConfigs = findConfig(request.headers.referer?helper.config(basePath + request.headers.referer.replace(webBaseUrl,'')) : file, cfn=>cfn.api);
            if(filterConfigs.length){
                response.setHeader("Content-Type", helper.type(type) || 'text/plain;charset=utf-8');
                filterConfigs.forEach(config => {
                    if(config.api){
                        config.api(options, request, response, file);
                    }
                });
            }else{
                response.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' });
                response.end(helper[404](options,'地址不存在'));
            }
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
            var dirs = {}, menus = [], branch = helper.branch(divPath);
            var netSegment = helper.net(request) || helper.localhost(request);

            fs.readdirSync(divPath).forEach(function (i) {
                if(!exclude(i)){
                    var config = configs.filter(cfn => cfn.path && cfn.version && path.join(divPath + '/' + i).toLocaleLowerCase().indexOf(path.join(cfn.path).toLocaleLowerCase()) !== -1).pop();
                    dirs['['+ (helper.gitignore(divPath + '/' + i)?'':helper.packTool(path.join(divPath + '/' + i))) + ']' + i] =  config?config.version(i):{};
                }
            });

            if (/\/views\/*$/.test(_path)) {
                var allPath = helper.config();
                Object.keys(allPath).forEach(function (i) {
                    dirs['['+helper.packTool(allPath[i]) + ']' + i] = {};
                });
                menus = ['editor[打开编辑器]','pull[#更新代码]'];
            }

            succ(fs.readFileSync(__dirname + '/index.html', 'utf-8').toString()
            .replace(/<title>.*<\/title>/,`<title>${_path.replace(/\/*views\/*/,'')||'Views'}<\/title>`)
            .replace('window.$data = {};', 'window.$data = ' + decodeURIComponent(JSON.stringify({
                _path: _path, dirs: dirs, replace: replace, options: options, branch: branch, netSegment:netSegment, menus:menus
            }, null, 4)))
            .replace('/*addToolbar:(function(){})();*/', addToolbar.replace(/<\/?script>/gi, '')));
        });

        function exclude(d){
            return [
                /^\./i,/\.sh$/i,/\.template$/i,
                /(node_modules|dev-server\.js|webpack\.config\.js|gulpfile\.js|Gruntfile\.js|package\.json|web\.config|package-lock\.json)/i
            ].some(i=>i.test(d));
            
        }
    }


    function transverter(options, request, response, file) {

        var filterConfigs = findConfig(file,cfn=>cfn.fn);
        var getParm = name => request.url.split('?').pop().split('&').filter(i=>i.split('=')[0].toLocaleLowerCase()===name.toLocaleLowerCase()).pop();
        return new Promise(succ => {
            var merge = getParm('merge'),debug = getParm('debug') || options.debug;
            var title = path.basename(file.replace('index.html', '')).replace(/\b\w+\b/g, word=>word.substring(0,1).toUpperCase()+word.substring(1));
            var data = fs.readFileSync(file.replace(/\/\//g, '/'));
            if (/(\/|\\)(index|default)\.html/.test(file)) {
                var weinre = options.ip + ':' + options.weinre;
                var content = data.toString().replace(/<body((?!>).)*>/, function (str) {
                    return str + '\n\t' + (options.ip !== '127.0.0.1' && options.weinre && !helper.localhost(request)? ('<script src="http://' + weinre + '/target/target-script-min.js#anonymous"></script>') : '');
                });

                if(/<title>.*<\/title>/.test(content)){
                    content = content.replace(/<title>.*<\/title>/,function(str){
                        return '<title>' + (/<title>(.*)<\/title>/.exec(str)[1] || title) + '</title>';
                    });
                }else{
                    content = content.replace(/\?\d+/g, '').replace(/<head>/, function (str) {
                        return str + '\n\r<title>' + title + '</title>';
                    });
                }

                filterConfigs.forEach(cfn => {
                    content = cfn.fn(file, content, merge, debug, request.url.split('?')[1]||'');
                });

                if(debug){
                    content = content.replace(/<\/body>/,function(src){
                        return fs.readFileSync(__dirname + '/../debug/index.html').toString().replace('_$pack$_',helper.packTool(path.dirname(file))) + '\r\n' + src;
                    });
                }

                data = new Buffer(content.toString());
            } else if (merge && fs.existsSync(file.replace(/\.js.*/, '')) || filterConfigs.some(cfn => cfn.files.some(i => path.join(cfn.path + '/' + i).toLocaleLowerCase() === path.join(file).toLocaleLowerCase()))) {
                data = new Buffer(helper.readAllJSContent(data.toString(), file.replace(/\.js.*/, ''),f=>filterConfigs.some(cfn=>cfn.exclude&&cfn.exclude.test(f))));
            }

            

            succ(data);
        });


    }

})();