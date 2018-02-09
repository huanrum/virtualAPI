var fs = require("fs");
var path = require('path');


module.exports = {

    /**
     * 创建路径
     */
    mkdirs:function (dirpath) {
        if(dirpath && !fs.existsSync(dirpath)){
            this.mkdirs(dirpath.replace(/\/*((?!\/).)*$/,''));
            fs.mkdirSync(dirpath);
        }
    },
    /**
     * 读取文件
     */
    readFile:function (_path) {
        if (fs.existsSync(_path)) {
            return fs.readFileSync(_path).toString();
        } else {
            return 'null';
        }
    },
    /**
     * 获取目录下的所有文件
     */
    readAllJSFile:function (source, dir, to) {
        if (fs.statSync(dir).isDirectory()) {
            fs.readdirSync(dir).forEach(child => {
                if (/\.js$/.test(child)) {
                    source += to(dir, child);
                } else {
                    source = this.readAllJSFile(source, dir + '/' + child, to);
                }
    
            });
        }
        return source;
    },
    /**
     * 读取所有内容
     */
    readAllJSContent:function (source, dir) {
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            fs.readdirSync(dir).forEach(child => {
                if (/\.js$/.test(child)) {
                    source += "\r\n\r\n /****** " + (child) + " ******/ \r\n" + fs.readFileSync(dir + '/' + child, { encoding: 'utf-8' }) + ';';
                } else {
                    source = "\r\n\r\n" + this.readAllJSContent(source, dir + '/' + child);
                }
            });
        }
        return source;
    },
    /**
     * 文件的mete类型
     */
    type: function(type){
        return ({
            "css": "text/css",
            "gif": "image/gif",
            "html": "text/html;charset=utf-8",
            "ico": "image/x-icon",
            "jpeg": "image/jpeg",
            "jpg": "image/jpeg",
            "js": "text/javascript;charset=utf-8",
            "json": "application/json;charset=utf-8",
            "pdf": "application/pdf",
            "png": "image/png",
            "svg": "image/svg+xml",
            "swf": "application/x-shockwave-flash",
            "tiff": "image/tiff",
            "txt": "text/plain;charset=utf-8",
            "wav": "audio/x-wav",
            "wma": "audio/x-ms-wma",
            "wmv": "video/x-ms-wmv",
            "xml": "text/xml;charset=utf-8"
        })[type];
    }

};
