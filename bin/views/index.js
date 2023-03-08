var fs = require("fs");
var path = require('path');
var child_process = require('child_process');

var proxy = require('./../proxy');
var helper = require('./../helper');


module.exports = (function () {
    var configs = [];
    var basePath = __dirname.replace('\\bin\\views', '\/').replace('/bin/views', '\/');

    //外部配置web站点的物理地址
    view.config = function (web, fn) {
        if (fn instanceof Array) {
            fn.forEach(i => view.config(web, i));
        } if (typeof fn === 'function') {
            configs.push(Object.assign({}, getObj(), { fn: fn }));
        } else if (fn && typeof fn === 'object') {
            configs.push(Object.assign({}, getObj(), fn));
        }

        function getObj() {
            return {
                fn: () => '',
                version: () => ({}),
                files: [],
                path: helper.config(__dirname + '/../../views/' + web + '/')
            }
        }
    };

    helper.mkdirs(basePath + '/views');
    return view;

    //根据文件找到web对应的配置
    function findConfig(file, filetr) {
        return configs.filter(cfn => cfn.path && filetr(cfn) && path.join(file).toLocaleLowerCase().indexOf(path.join(cfn.path.replace(/[\/\\\s]*$/,'')).toLocaleLowerCase()) !== -1);

    }

    //控制url对应的显示
    function view(options, request, response) {
        var onlyUrl = decodeURIComponent(request.url.split('?').shift());
        var type = onlyUrl.split('.').slice(1).pop() || 'html';
        var urlFile = onlyUrl.replace(/\/*views\/+/, '');
        var file = fs.existsSync(urlFile) ? urlFile : helper.config(basePath + onlyUrl);
        var filterConfigs = findConfig(file, cfn => cfn.fn);

        if(/^https?:\/\//.test(file)){
            request.headers.cookie = request.headers.cookie || 'XXX';
            request.headers.api = `${file}/${request.url.replace(onlyUrl,'').replace(/^\/+/,'')}`;
            request.headers.domain = `${request.protocol}////${request.headers.host}${onlyUrl}`;
            request.headers.remote = helper.clientIp(request);
            return proxy(request, response, false);
        } else if (fs.existsSync(file)) {
            if (fs.statSync(file).isDirectory()) {//
                if(/\.html([\?#].*)?/.test(request.headers.referer) && !/https?:\/\/((?!\/).)+\/bin/.test(request.headers.referer)){
                    defaultFn();
                }else{
                    //默认主页存在就重定向否则显示列表
                    if (redirect(file,request)) {
                        var params = request.url.split('?')[1] || '';
                        response.writeHead(302, { 'Location': onlyUrl + '/' + redirect(file,request,response) + (params ? '?' : '') + params });
                        response.end();
                    } else {
                        response.setHeader('Content-Type', 'text/html;charset=utf-8');
                        views(options, request, response, onlyUrl).then(content => response.end(helper.replaceContent(path.dirname(file),content)));
                    }
                }
            } else {
                if (helper.parameters(request).preview) {
                    response.setHeader('Content-Type', 'text/html;charset=utf-8');
                    transverter(options, request, response, file, true).then(content => response.end(helper.replaceContent(path.dirname(file),content)));
                } else {
                    response.setHeader("Content-Type", helper.type(type) || 'text/plain;charset=utf-8');
                    Promise.all(filterConfigs.filter(i=>i.redirect).map(f=>f.redirect(file,request,response))).then(function(datas){
                        var data = datas.filter(i=>!!i).pop();
                        if(data){
                            transverter(options, request, response, file, false, data).then(content => response.end(content));
                        } else if(/index\.html/.test(file)){
                            transverter(options, request, response, file).then(content => response.end(helper.replaceContent(path.dirname(file),content)));
                        } else {
                            transverter(options, request, response, file).then(content => response.end(content));
                        }
                    })
                }
            }
        } else if(filterConfigs.filter(i=>!!i.redirect && !!i.redirect(file,request,response)).length && file.indexOf(redirect(file,request,response)) !== -1){
            response.setHeader('Content-Type', 'text/html;charset=utf-8');
            Promise.all(filterConfigs.filter(i=>i.redirect).map(f=>f.redirect(file,request,response))).then(function(datas){
                var data = datas.filter(i=>!!i).pop();
                if(data){
                    transverter(options, request, response, file, false, data).then(content => response.end(content));
                } else {
                    views(options, request, response, onlyUrl).then(content => response.end(content));
                }
            });
        } else{
            defaultFn();
        }

        function defaultFn(){
            var webBaseUrl = new RegExp('https?:\/\/' + request.headers.host.replace(/\./g, '\\.'));
            var filterConfigs = findConfig(request.headers.referer ? helper.config(basePath + request.headers.referer.replace(webBaseUrl, '')) : file, cfn => cfn.api);
            if (filterConfigs.length) {
                response.setHeader("Content-Type", helper.type(type) || 'text/plain;charset=utf-8');
                filterConfigs.forEach(config => {
                    if (config.api) {
                        config.api(options, request, response, file);
                    }
                });
            } else {
                response.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' });
                response.end(helper[404](options, '地址不存在'));
            }
        }
    }

    function redirect(file,request,response) {
        var filterConfigs = findConfig(file, cfn=>cfn.fn);
        var defaultPages = ['index.html', 'default.html'];
        if(filterConfigs.filter(i=>!!i.redirect && !!i.redirect(file,request,response)).length){
            return 'dev.html';
        }else{
            for (var i = 0; i < defaultPages.length; i++) {
                if (fs.existsSync(file + '/' + defaultPages[i])) {
                    return defaultPages[i];
                }
            }
            return '';
        }
    }

    //文件列表
    function views(options, request, response, _path) {
        var host = request.headers.host;
        return new Promise(succ => {
            var contextMenus = helper.localhost(request)?['editor[打开编辑器]', 'editonline[#在线编辑代码]']:[]
            var htmlPath = helper.config(__dirname + '/../../service/' + _path.replace('/views', '') + '/views/index.html');
            var publish = !/^(10|127|192)\./.test(request.headers.host);
            var replace = request.headers.host + `/${_path}`;
            var addToolbar = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath).toString() : '';
            var divPath = helper.config(basePath + _path || basePath);
            var dirs = {}, menus = [], branch = helper.branch(divPath);
            var netsegment = helper.parameters(request).netsegment;
            var preview = helper.resolver().map(i => i.toString());
            var filterConfigs = findConfig(divPath, cfn => cfn.list);

            fs.readdirSync(divPath).forEach(function (i) {
                if (!exclude(i)) {
                    try{
                        var config = configs.filter(cfn => cfn.path && cfn.version && path.join(divPath + '/' + i).toLocaleLowerCase().indexOf(path.join(cfn.path).toLocaleLowerCase()) !== -1).pop();
                        dirs['[' + (helper.gitignore(divPath + '/' + i) ? '' : helper.packTool(path.join(divPath + '/' + i))) + ']' + i] = Object.assign(config ? (config.version(i,path.join(divPath +'/' +i))||{}) : {}, {
                            menus: contextMenus.concat(['.git','.svn'].some(f=>fs.existsSync(divPath+'/'+i+'/'+f))?['pull[#更新代码]']:(config&&config.menus||[])),
                            package: helper.package(path.join(divPath + '/' + i))
                        });
                    }catch(e){
                        console.log(e);
                    }
                }
            });

            if (/\/views\/*$/.test(_path)) {
                var allPath = helper.config();
                Object.keys(allPath).filter(include).forEach(function (i) {
                    dirs['[' + helper.packTool(allPath[i]) + ']' + i] = {
                        menus: contextMenus.concat(['.git','.svn'].some(f=>fs.existsSync(i+'/'+f))?['pull[#更新代码]']:[])
                    };
                });
            }

            if(fs.existsSync(divPath + '/.github.config')){
                fs.readFileSync(divPath + '/.github.config').toString().split(/[\r\n]/).filter(function(i){return !!i;}).forEach(function(github){
                    var i = github.split('/').pop().replace(/.git$/,'');
                    var tool = helper.gitignore(divPath + '/' + i)?'':helper.packTool(path.join(divPath + '/' + i));
                    dirs['[' + tool + ']' + i] = dirs['[' + tool + ']' + i] || github;
                });
            }

            Promise.all(filterConfigs.map(function(filterConfig){
                return filterConfig.list(divPath, menus, dirs);
            })).then(function(replaceContents){
                succ(helper.replaceContent(__dirname + '/view/', helper.replaceHtml(fs.readFileSync(__dirname + '/index.html', 'utf-8').toString(),`
                    <script>${replaceContents.join('\n\n')}</script>
                `), {
                    publish: publish, _path: _path, dirs: dirs, replace: replace, options: options, branch: branch, netsegment: netsegment, menus: menus, preview: preview
                })
                    .replace(/<title>.*<\/title>/, `<title>${hump(_path.replace(/\/*views\/*/, '')) || 'Views'}<\/title>`)
                    .replace('/*addToolbar:(function(){})();*/', addToolbar.replace(/<\/?script>/gi, '')));
            });
        });

        function include(w) {
            if (/^[\\d\\.]+(:\\d+)?$/.test(request.headers.host)) {
                return !options.exclude || !options.exclude(w);
            } else {
                return true;
            }
        }

        function exclude(d) {
            return [
                /^\./i, /\.sh$/i, /\.template$/i,
                /(node_modules|dev-server\.js|webpack\.config\.js|gulpfile\.js|Gruntfile\.js|package\.json|web\.config|package-lock\.json)/i
            ].some(i => i.test(d));

        }

        function hump(s) {
            return s.split('-').map(i => i.slice(0, 1).toLocaleUpperCase() + i.slice(1).toLocaleLowerCase()).join('');
        }
    }

    //读取文件
    function transverter(options, request, response, file, preview, data) {

        var filterConfigs = findConfig(file, cfn => cfn.fn);
        data = data || fs.readFileSync(file.replace(/\/\//g, '/'));
        return new Promise(succ => {
            var parameters = helper.parameters(request);
            //启动页而非模板加载
            if (/(\/|\\)(\S+)\.html/.test(file) && /<\/html>/.test(data.toString())) {
                var content = data.toString();
                //补充标题
                content = helper.replaceHtml(content, path.basename(file.replace('index.html', '')).replace(/\b\w+\b/g, word => word.substring(0, 1).toUpperCase() + word.substring(1)));
                //添加远程调试
                if (options.ip !== '127.0.0.1' && options.weinre && /\[Mobile\]/i.test(helper.browser(request))) {
                    content = helper.replaceHtml(content, 'http://' + options.hostname + ':' + options.weinre + '/target/target-script-min.js#anonymous');
                }

                content = helper.replaceHtml(content, helper.replaceContent(__dirname + '/../compatible/', fs.readFileSync(__dirname + '/../compatible/native.html').toString()));

                filterConfigs.forEach(cfn => {
                    content = cfn.fn(file, content, parameters.merge, parameters.debug || options.debug, request);
                });

                if (parameters.simulator) {
                    content = helper.replaceHtml(content, helper.simulator(parameters.simulator));
                }

                if (parameters.debug || options.debug) {
                    content = helper.replaceHtml(content, helper.replaceContent(__dirname + '/../debug/', fs.readFileSync(__dirname + '/../debug/index.html').toString().replace('_$pack$_',helper.packTool(path.dirname(file))).replace(/\^\//mg,'http://' + request.headers.host + '/')));
                }

                data = new Buffer(content.toString());
                succ(data);
            } else if (parameters.merge && fs.existsSync(file.replace(/\.js.*/, '')) || filterConfigs.some(cfn => cfn.files.some(i => path.join(cfn.path + '/' + i).toLocaleLowerCase() === path.join(file).toLocaleLowerCase()))) {
                data = new Buffer(helper.readAllJSContent(data.toString(), file.replace(/\.js.*/, ''), f => filterConfigs.some(cfn => cfn.exclude && cfn.exclude.test(f))));
                succ(data);
            } else {
                if (preview) {
                    helper.resolver(file).then(succ);
                } else {
                    if (/\.jsx?$/.test(file)) {
                        filterConfigs.forEach(cfn => data = cfn.extend ? cfn.extend(file, data, request) : data);
                    }
                    succ(data);
                }
            }
        });

    }

})();
