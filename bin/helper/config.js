var fs = require("fs");
var path = require('path');

var config = require('./../config');

module.exports = (function () {
    

    return {
        type: type,
        config:configPath
    };


    /**
         * 文件的mete类型
         */
    function type(type) {
        return config().mete[type];
    }

    function configPath(webModule){
        var paths = config().web;
        if(webModule){
            var basePath = __dirname + '/../../views/';
            var filterPath = Object.keys(paths).sort((a,b)=> a.length-b.length?1:-1).filter(i=>path.join(webModule).indexOf(path.join(basePath,i))!==-1).shift();
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
