var fs = require("fs");
var path = require('path');


module.exports = (function () {

    return {
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
        }
    };
})();
