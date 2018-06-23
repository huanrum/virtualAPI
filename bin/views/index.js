var fs = require("fs");
var path = require('path');
var child_process = require('child_process');

var helper = require('./../helper');


module.exports = (function () {
    var configs = [];
    var basePath = __dirname.replace('\\bin\\views', '\/').replace('/bin/views', '\/');
    
    //外部配置web站点的物理地址
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

    helper.mkdirs(basePath + '/views');
    return view;

    //根据文件找到web对应的配置
    function findConfig(file,filetr){
        return configs.filter(cfn => cfn.path && filetr(cfn) && path.join(file).toLocaleLowerCase().indexOf(path.join(cfn.path).toLocaleLowerCase()) !== -1);
        
    }

    //控制url对应的显示
    function view(options, request, response) {
        var onlyUrl = decodeURIComponent(request.url.split('?').shift());
        var type = onlyUrl.split('.').slice(1).pop() || 'html';
        var file = helper.config(basePath + onlyUrl);
        
        if (fs.existsSync(file)) {
            if (fs.statSync(file).isDirectory()) {
                //默认主页存在就重定向否则显示列表
                if(redirect(file)){
                    var params = request.url.split('?')[1] || '';
                    response.writeHead(302, { 'Location': onlyUrl + '/' + redirect(file) + (params ? '?' : '') + params });
                    response.end();
                } else {
                    response.setHeader('Content-Type', 'text/html;charset=utf-8');
                    views(options, request, response, onlyUrl).then(content => response.end(content));
                }
            } else {
                if(helper.parameters(request).preview){
                    response.setHeader('Content-Type', 'text/html;charset=utf-8');
                    transverter(options, request, response, file, true).then(content => response.end(content));
                }else{
                    response.setHeader("Content-Type", helper.type(type) || 'text/plain;charset=utf-8');
                    transverter(options, request, response, file).then(content => response.end(content));
                }
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

    //文件列表
    function views(options,request, response, _path) {
        var host = request.headers.host;
        return new Promise(succ => {
            var htmlPath = helper.config(__dirname + '/../../service/' + _path.replace('/views', '') + '/views/index.html');
            var publish = !/^(10|127|192)\./.test(request.headers.host);
            var replace = request.headers.host + `/${_path}`;
            var addToolbar = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath).toString() : '';
            var divPath = helper.config(basePath + _path || basePath);
            var dirs = {}, menus = [], branch = helper.branch(divPath);
            var netSegment = helper.parameters(request).netSegment;
            var preview = helper.resolver().map(i=>i.toString());

            fs.readdirSync(divPath).forEach(function (i) {
                if(!exclude(i)){
                    var config = configs.filter(cfn => cfn.path && cfn.version && path.join(divPath + '/' + i).toLocaleLowerCase().indexOf(path.join(cfn.path).toLocaleLowerCase()) !== -1).pop();
                    dirs['['+ (helper.gitignore(divPath + '/' + i)?'':helper.packTool(path.join(divPath + '/' + i))) + ']' + i] =  config?config.version(i):{};
                }
            });

            if (/\/views\/*$/.test(_path)) {
                var allPath = helper.config();
                Object.keys(allPath).filter(include).forEach(function (i) {
                    dirs['['+helper.packTool(allPath[i]) + ']' + i] = {};
                });
                menus = ['editor[打开编辑器]','pull[#更新代码]'];
            }

            succ(helper.replaceContent(__dirname + '/view/' ,fs.readFileSync(__dirname + '/index.html', 'utf-8').toString(),{
                publish: publish, _path: _path, dirs: dirs, replace: replace, options: options, branch: branch, netSegment:netSegment, menus:menus, preview:preview
            })
            .replace(/<title>.*<\/title>/,`<title>${hump(_path.replace(/\/*views\/*/,''))||'Views'}<\/title>`)
            .replace('/*addToolbar:(function(){})();*/', addToolbar.replace(/<\/?script>/gi, '')));
        });

        function include(w){
            if(/^[\\d\\.]+(:\\d+)?$/.test(request.headers.host)){
                return !options.exclude||!options.exclude(w);
            }else{
                return true;
            }
        }

        function exclude(d){
            return [
                /^\./i,/\.sh$/i,/\.template$/i,
                /(node_modules|dev-server\.js|webpack\.config\.js|gulpfile\.js|Gruntfile\.js|package\.json|web\.config|package-lock\.json)/i
            ].some(i=>i.test(d));
            
        }

        function hump(s){
            return s.split('-').map(i=>i.slice(0,1).toLocaleUpperCase() + i.slice(1).toLocaleLowerCase()).join('');
        }
    }

    //读取文件
    function transverter(options, request, response, file, preview) {

        var filterConfigs = findConfig(file,cfn=>cfn.fn);
        return new Promise(succ => {
            var parameters = helper.parameters(request);
            var data = fs.readFileSync(file.replace(/\/\//g, '/'));
            //启动页而非模板加载
            if (/(\/|\\)(\S+)\.html/.test(file) && /<\/html>/.test(data.toString())) {
                var content = data.toString();
                //补充标题
                content = helper.replaceHtml(content,path.basename(file.replace('index.html', '')).replace(/\b\w+\b/g, word=>word.substring(0,1).toUpperCase()+word.substring(1)));
                //添加远程调试
                if(options.ip !== '127.0.0.1' && options.weinre && !helper.localhost(request)){
                    content = helper.replaceHtml(content,'http://' + options.ip + ':' + options.weinre + '/target/target-script-min.js#anonymous');
                }

                filterConfigs.forEach(cfn => {
                    content = cfn.fn(file, content, parameters.merge, parameters.debug || options.debug, request);
                });

                if(parameters.simulator){
                    content = helper.replaceHtml(content,helper.simulator(parameters.simulator));
                }

                if(parameters.debug || options.debug){
                    content = helper.replaceHtml(content,fs.readFileSync(__dirname + '/../debug/index.html').toString().replace('_$pack$_',helper.packTool(path.dirname(file))).replace(/\^\//mg,'http://' + request.headers.host + '/'));
                }

                data = new Buffer(content.toString());
                succ(data);
            } else if (parameters.merge && fs.existsSync(file.replace(/\.js.*/, '')) || filterConfigs.some(cfn => cfn.files.some(i => path.join(cfn.path + '/' + i).toLocaleLowerCase() === path.join(file).toLocaleLowerCase()))) {
                data = new Buffer(helper.readAllJSContent(data.toString(), file.replace(/\.js.*/, ''),f=>filterConfigs.some(cfn=>cfn.exclude&&cfn.exclude.test(f))));
                succ(data);
            } else {
                if(preview){
                    helper.resolver(file).then(succ);
                } else {
                    succ(data);
                }
            }
        });

    }

})();
