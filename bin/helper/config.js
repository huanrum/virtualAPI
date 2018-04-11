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
            var basePath = path.join(__dirname + '/../../views/');
            if(/https?:\/\/.*\/views\/*/.test(webModule)){
                webModule = webModule.replace(/https?:\/\/.*\/views\/*/i,basePath);
            }
            var filterPath = Object.keys(paths).sort((a,b)=> a.length-b.length).filter(i=>path.join(webModule).toLocaleLowerCase().indexOf(path.join(basePath,i).toLocaleLowerCase())!==-1).pop();
            if(filterPath){
                return path.join(webModule).toLocaleLowerCase().replace(path.join(basePath,filterPath).toLocaleLowerCase(),paths[filterPath]);
            }else{
               return webModule; 
            }
            
        }else{
            return paths;
        }
    }

})();
