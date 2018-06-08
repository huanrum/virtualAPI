var fs = require("fs");
var path = require('path');

var config = require('./../../config');

module.exports = (function () {


    return {
        /**
         * 文件的mete类型
         */
        type: function type(type) {
            return config().mete[type];
        },
        /**
         * 获取绝对地址
         */
        config: function configPath(webModule) {
            var paths = config().web;
            if (webModule) {
                var basePath = path.join(__dirname + '/../../../views/');
                if (/https?:\/\/.*\/views\/*/.test(webModule)) {
                    webModule = webModule.replace(/https?:\/\/.*\/views\/*/i, basePath);
                }
                if(Object.keys(paths).some(i=>i.toLocaleLowerCase()===webModule.toLocaleLowerCase())){
                    return paths[Object.keys(paths).filter(i=>i.toLocaleLowerCase()===webModule.toLocaleLowerCase()).pop()];
                }else{
                    var filterPath =  Object.keys(paths).sort((a, b) => a.length - b.length).filter(i => path.join(webModule).toLocaleLowerCase().indexOf(path.join(basePath, i).toLocaleLowerCase()) !== -1).pop();
                    if (filterPath) {
                        return path.join(webModule).toLocaleLowerCase().replace(path.join(basePath, filterPath).toLocaleLowerCase(), paths[filterPath]);
                    } else {
                        return path.join(webModule);
                    }
                }

            } else {
                return paths;
            }
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
         * 获取相应的打包工具
         */
        packTool: function (dir) {
            var packs = config().pack;
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                var allfiles = fs.readdirSync(dir);
                var packTool = Object.keys(packs).filter(p=>allfiles.some(i => i.toLocaleLowerCase() === packs[p])).pop();
                if (packTool) {
                    return packTool;
                } else if (path.dirname(dir) !== dir) {
                    return this.packTool(path.dirname(dir));
                } else {
                    return '';
                }
            } else {
                return '';
            }

        }
    };

})();