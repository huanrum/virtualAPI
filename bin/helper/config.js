var fs = require("fs");
var path = require('path');


module.exports = (function () {
    var paths = {};

    return {
        type: type,
        config:config
    };


    /**
         * 文件的mete类型
         */
    function type(type) {
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

    function config(webModule, _path){
        if(_path){
            paths[path.join(webModule)] = path.join(_path);
        }else if(webModule){
            var basePath = __dirname + '/../../views/';
            var filterPath = Object.keys(paths).filter(i=>path.join(webModule).indexOf(path.join(basePath,i))!==-1).pop();
            if(filterPath){
                return path.join(webModule).replace(path.join(basePath,filterPath),paths[filterPath]);
            }else{
               return webModule; 
            }
        }else{
            return paths;
        }
    }

})();
