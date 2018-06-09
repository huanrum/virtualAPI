var fs = require('fs');

module.exports = {
    /**
     * 把网站页面里面的<!--html>file</html-->替换称内容
     */
    replaceContent: function (baseDir, strContent, data) {
        var helper = {};
        Object.keys(this).forEach(i => helper[i] = this[i].toString().match(/(function((?!\().)*\(((?!\)).)*\))/)[1]);
        return strContent.replace(/<body((?!>).)*>/, function (str) {
                var dataStr = JSON.stringify(data, null, 4);
                var helperStr = JSON.stringify(helper, null, 4);
                return str + '\r\n<script>\r\nwindow.$helper = ' + helperStr + '\r\n</script>\r\n\r\n<script>\r\nwindow.$data = ' + dataStr + '\r\n</script>\r\n';
            })
            .replace(/<!--html>.*<\/html-->/img, function (str) {
                return fs.readFileSync(baseDir + /<!--html>(.*)<\/html-->/.exec(str)[1]).toString();
            });
    },
    /**
     * 使目标网站使用代理访问API
     */
    useProxy: function () {
        return `<script>
        var XHRopen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(){
            if(/^https?:/.test(arguments[1]) && !(/^[\\d\\.]+(:\\d+)?$/.test(location.host))){
                var url =  arguments[1];
                arguments[1] = location.origin + '/proxy?' + (url.split('?')[1] || '');
                XHRopen.apply(this,arguments);
                this.setRequestHeader('api',url);
            }else{
                XHRopen.apply(this,arguments);
            }
        };
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
                replace.forEach(rep => {
                    content = this.replaceHtml(content, rep);
                });
                return content;
            } else if (/\.css$/.test(replace)) {
                return content.replace(/<\/head>/i, str => `\n<link type="text/css" rel="stylesheet" href="${replace}">\n${str}`);
            } else if (/\.js$/.test(replace)) {
                return content.replace(/<body((?!>).)*>/i, str => `${str}\n\r<script src="${replace}"></script>\n`);
            } else if (/<script>/.test(replace)) {
                return content.replace(/<\/body>/i, str => `${replace}\n${str}`);
            } else if (/<style>/.test(replace)) {
                return content.replace(/<\/head>/i, str => `${replace}\n${str}`);
            } else if (/<.+>/.test(replace)) {
                return content.replace(/<\/body>/i, str => `${replace}\n${str}`);
            } else {
                if (/<title>.*<\/title>/.test(content)) {
                    return content = content.replace(/<title>.*<\/title>/, function (str) {
                        return '<title>' + (/<title>(.*)<\/title>/.exec(str)[1] || replace) + '</title>';
                    });
                } else {
                    return content = content.replace(/\?\d+/g, '').replace(/<head>/, function (str) {
                        return str + '\n\r<title>' + replace + '</title>';
                    });
                }
            }
        }
    }
};
