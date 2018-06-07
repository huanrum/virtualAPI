var fs = require("fs");
var path = require('path');


module.exports = (function () {

    return {
        webName: function(_path){
            return _path.split('\\service\\').pop().split('\\').shift();
        },
        /**
         * 创建路径
         */
        mkdirs: function (dirpath) {
            if (dirpath && !fs.existsSync(dirpath)) {
                this.mkdirs(path.dirname(dirpath));
                fs.mkdirSync(dirpath);
            }
        },
        /**
         * 删除文件
         */
        rmdirs: function(_path) {
            var files = [];
            if( fs.existsSync(_path) ) {
                files = fs.readdirSync(_path);
                files.forEach(function(file,index){
                    var curPath = _path + "/" + file;
                    if(fs.statSync(curPath).isDirectory()) { // recurse
                        this.rmdirs(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(_path);
            }
        },
        /**
         * 读取文件
         */
        readFile: function (_path) {
            if (fs.existsSync(_path)) {
                return fs.readFileSync(_path).toString();
            } else {
                return 'null';
            }
        },
        /**
         * 获取目录下的所有文件
         */
        readAllJSFile: function (source, dir, to, exclude) {
            exclude = exclude || function(){};
            if (fs.statSync(dir).isDirectory()) {
                fs.readdirSync(dir).forEach(child => {
                    if(exclude(path.join(dir , child))){return;}
                    if (/\.js$/.test(child)) {
                        source += to(dir, child);
                    } else {
                        source = this.readAllJSFile(source, dir + '/' + child, to, exclude);
                    }

                });
            }
            return source;
        },
        /**
         * 读取目录下所有内容
         */
        readAllJSContent: function (source, dir, exclude) {
            exclude = exclude || function(){};
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                fs.readdirSync(dir).forEach(child => {
                    if(exclude(path.join(dir , child))){return;}
                    if (/\.js$/.test(child)) {
                        source += "\r\n\r\n /****** " + (child) + " ******/ \r\n" + fs.readFileSync(dir + '/' + child, { encoding: 'utf-8' }) + ';';
                    } else {
                        source = "\r\n\r\n" + this.readAllJSContent(source, dir + '/' + child, exclude);
                    }
                });
            }
            return source;
        },
        /**
         * multiparty/express 提交文件
         */
        upload: function(request,dirPath){
            this.initModule(['multiparty','express']).then(multiparty => {
                try{
                    var form = new multiparty.Form();
                    form.encoding = 'utf-8';
                    form.uploadDir = dirPath;
                    //设置单文件大小限制
                    form.maxFilesSize = 2 * 1024 * 1024;
                    
                    form.on('error',function(e){
                        console.log(request.url,e);
                    });
                    
                    form.parse(request, function (err, fields, files) {
                        console.log(fields);
                    });
                }catch(e){
                    console.log(request.url,e);
                }
            });
        },
        /**
         * 获取git排除条件
         */
        gitignore: function(filePath){
            var gitignorePath = get(path.dirname(filePath));
            if(!gitignorePath){
                return false;
            }
            var gitignore = fs.readFileSync(gitignorePath+'/.gitignore').toString().replace(/(\\|\/)/mg,'\\\\').replace(/\./mg,'\\.').replace(/\*/mg,'\.\*').split('\r\n').filter(i=>!!i&&!/^\s*\#+/.test(i));
            filePath = path.join(filePath)+'\\';
            return gitignore.some(i=>new RegExp(gitignorePath.replace(/(\\|\/)/mg,'\\\\')+'\\\\'+i,'i').test(filePath));

            function get(dir){
                return fs.readdirSync(dir).some(i=>/\.gitignore/.test(i))? dir:(dir !== path.dirname(dir)&&get(path.dirname(dir)));
            }
        },
        /**
         * 
         */
        repalceContent: function(baseDir,strContent,data){
            var helper = {};
            Object.keys(this).forEach(i=>helper[i]=this[i].toString().match(/(function((?!\().)*\(((?!\)).)*\))/)[1]);
            return strContent.replace(/<body((?!>).)*>/, function(str){
                var dataStr = JSON.stringify(data, null, 4);
                var helperStr = JSON.stringify(helper, null, 4);
                return str + '\r\n<script>\r\nwindow.$helper = ' + helperStr + '\r\n</script>\r\n\r\n<script>\r\nwindow.$data = ' + dataStr + '\r\n</script>\r\n';
            })
            .replace(/<!--html>.*<\/html-->/img,function(str){
                return fs.readFileSync(baseDir + /<!--html>(.*)<\/html-->/.exec(str)[1]).toString();
            });
        }
    };
})();
