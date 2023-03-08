var fs = require('fs');
var path = require('path');

var setting  = {}, service = {};

setTimeout(function (){
    var websocket = require('./../../websocket');
    websocket(function (action){
        return action === '#*setting*#';
    }, function (data){
        Object.assign(setting, data);
    });

    service.title = process.title;
    service.env = process.env;
    service.version = process.versions;
    service.start = new Date().toLocaleString();
}, 1000);

module.exports = {
    /**
     * 把网站页面里面的<!--html>file</html-->替换称内容
     */
    replaceContent: function (parentDir, strContent, dataObj) {
        var self = this, helper = {};
        var replaceFileList = replaceFileList || [];
        Object.keys(this).filter(i => typeof this[i] === 'function').forEach(i => {
            try{
                helper[i] = this[i].toString().match(/(function((?!\().)*\(((?!\)).)*\)|\([^)]*\))/)[1];
            }catch(e){
                console.log(e);
            }
        });
            
        return (function replaceContent(baseDir, content, data){
            if(typeof content !== 'string'){
                content = content.toString();
            }
            return content.replace(/<body((?!>).)*>/, function(str){
                if(dataObj !== null && dataObj !== undefined){
                    return str + '\r\n'+ [
                        'window.$path ="'+ parentDir +'";',
                        'window.$helper ='+ JSON.stringify(helper, null, 4),
                        'window.$data ='+ JSON.stringify(data, null, 4),
                        'window.$setting ='+ JSON.stringify(setting, null, 4),
                        'window.$service ='+ JSON.stringify(service, null, 4),
                        'window.$secrecy ='+ self.secrecy.toString()
                    ].map(function(s){return '<script>\r'+ s +'\r\n</script>';}).join('\r\n\r\n') + '\r\n';
                }else {
                    return str;
                }
            })
            .replace(/<!--html>.*<\/html-->/img, function (str){
                var file = path.join(baseDir,/<!--html>(.*)<\/html-->/.exec(str)[1]);
                if(replaceFileList.indexOf(file)!==-1){
                    return '';
                }else{
                    replaceFileList.push(file);
                    if(fs.existsSync(file)){
                        return replaceContent(path.dirname(file),fs.readFileSync(file).toString());
                    }else{
                        return str.replace('</','[File is not found.]</');
                    }
                }
            }).replace(/<!--script>(.*)<\/script-->/img, function(str, $1){
                var _baseDir = baseDir,dir ='/';
                var filename = /<!--script>(.*)<\/script-->/.exec(str)[1];
                while(_baseDir && _baseDir !== path.dirname(_baseDir)){
                    var file = path.join(_baseDir , filename);
                    if(fs.existsSync(file)){
                        return `<script src="${(dir + filename).replace(/^[\/\\]*/,'')}"></script>`;
                    }else{
                        _baseDir = path.dirname(_baseDir);
                        dir += '../';
                    }
                }
            
                return str.replace('</','[File is not found.]</')
            }).replace(/@@([^@]+)@@/g, function($0, $1){
                return self.options[$1] || $0;
            });
            
        })(parentDir, strContent, dataObj);
    },
    /**
     * 使目标网站使用代理访问API
     */
    useProxy: function () {
        return `<script>
            window.$$debugRequest ={};
            (function(){
                
                var getRequestHeaderData = function(url){
                    var findRequestHeaderData = window.$$debugRequest[url.split('?').shift()];
                    var urlRequestHeaderData = {};
                    Object.keys(window.$$debugRequest).forEach(function(key){
                        if(key.substring(0,2) == '$$'){
                            urlRequestHeaderData[key.substring(2)] = window.$$debugRequest[key];
                        }
                    });
                    if(findRequestHeaderData){
                        Object.keys(findRequestHeaderData).forEach(function(key){
                            urlRequestHeaderData[key]= findRequestHeaderData[key];
                        });
                    }
                    return urlRequestHeaderData;
                };
                
                var XHRopen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function(){ 
                    var self = this;
                    var args = Array.prototype.slice.call(arguments,0)
                    var url = args[1];
                    if(/^https?:/.test(args[1]) && !(/^[\\d\\.]+(:\\d+)?$/.test(location.host))){
                        args[1]= location.origin + '/proxy?' + (url.split('?')[1] || '');
                        XHRopen.apply(self,args);
                        self.setRequestHeader('api',url.split('?')[0]);
                    }else{
                        if(/^\\/*bower_components\\//.test(args[1])){
                            args[1]= location.href +'\/../\/..\/'+ args[1];
                        }
                        XHRopen.apply(self,args);
                    }

                    var requestData = getRequestHeaderData('' + url);
                    Object.keys(requestData).forEach(function(key){
                        self.setRequestHeader('debug-'+ key,requestData[key]);
                    });
                }

                var $fetch = window.fetch;
                window.fetch = function(){
                    var args = Array.prototype.slice.call(arguments,0);
                    var url = args[0];
                    args[1]= args[1] || {method:'GET'};
                    args[1].headers = args[1].headers || {};

                    if(/^https?:/.test(args[0]) && !(/^[\\d\\.]+(:\\d+)?$/.test(location.host))){
                        args[0]= location.origin + '/proxy?' + (url.split('?')[1] || '');
                        args[1].headers.api = url.split('?')[0];
                    }else{
                        if(/^\\/*bower_components\\//.test(args[0])){
                            args[0]= location.href + '\/../\/..\/' + args[0];
                        }
                    }

                    var requestData = getRequestHeaderData(''+ url);
                    Object.keys(requestData).forEach(function(key){
                        args[1].headers['debug-'+ key]= requestData[key];
                    });
                    return $fetch.apply(this,args);
                };
            })();
        </script>`;
    },
    /**
     * 可以在dom元素上使用vue()
     */
    useVue: function () {
        return `
        <script>
            Node.prototype.$scope = function(){
                var key = Object.keys(this).filter(i=>/__reactInternalInstance\\$/.test(i)).pop();
                if(key){
                    return this[key];
                }else if(window.ng){
                    return ng.probe(this)._debugInfo;
                }else{
                    return this.__vue__;
                }
            };
        </script>
        `
    },
    /**
     * 可以在dom元素上使用react()
     */
    useReact: function () {
        return `
        <script>
            Node.prototype.react = function(){
                var key = Object.keys(this).filter(i=>/__reactInternalInstance\\$/.test(i)).pop();
                return this[key];
            }
        </script>
        `;
    },
    /**
     * 替换相应的内容
     */
    replaceHtml: function (content, replace) {
        if (!replace) {
            return content;
        } else {
            if(typeof replace === 'function'){
                replace = replace();
            }
            if (replace instanceof Array) {
                replace.reverse().forEach(rep => {
                    content = this.replaceHtml(content, rep);
                });
                return content;
            } else if (/\.css$/.test(replace)) {
                return content.replace(/<\/head>/i, str => `\n<link type="text/css" rel="stylesheet" href="${replace}">\n${str}`);
            } else if (/\.js(#\w*)?$/.test(replace)) {
                return content.replace(/<body((?!>).)*>/i, str => content.indexOf(`src="${replace}"`)!==-1?str:`${str}\n\r<script src="${replace}"></script>\n`);
            } else if (/<script>/.test(replace)) {
                if(/\$data\s*=/.test(replace)){
                    return content.replace(/<body((?!>).)*>/i, str => `${str}\n${replace}\n`);
                }else{
                    return content.replace(/<\/body>/i, str => `${replace}\n${str}`);
                }
            } else if (/(<style>|<link)/.test(replace)) {
                return content.replace(/<\/head>/i, str => `${replace}\n${str}`);
            } else if (/<.+>/.test(replace)) {
                return content.replace(/<\/body>/i, str => `${replace}\n${str}`);
            } else {
                if (/<title>[\s\S]*<\/title>/.test(content)) {
                    return content = content.replace(/<title>.*<\/title>/, function (str) {
                        var oldName = /<title>(.*)<\/title>/.exec(str)[1];
                        return '<title>' + (/\.html$/i.test(oldName)?replace:oldName || replace) + '</title>';
                    });
                } else {
                    return content = content.replace(/\?[0-9a-z]+/ig, '').replace(/<head>/, function (str) {
                        return str + '\n\r<title>' + replace + '</title>';
                    });
                }
            }
        }
    }
};
