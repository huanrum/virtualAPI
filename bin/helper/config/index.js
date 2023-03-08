var fs = require("fs");
var path = require('path');

var config = require('./../../config');

module.exports = (function () {


    return {
        /**
         * 文件的mete类型
         */
        type: function type(type) {
            type = type.split('.').pop() || '';
            return config().mete[type.toLocaleLowerCase()];
        },
        /**
         * 文件编码类型
         */
        filetype: function(file){
            var type = this.type(file);
            if(!type || /(html|text|json|javascript|xmls|sh|dat|cmd)/.test(type)){
                return 'text';
            } else if(/image/.test(type)){
                return 'img';
            } else if(/(audio|video)/.test(type)){
                return 'media';
            } else if(/pdf/.test(type)){
                return 'new';
            }
            return 'null';
        },
        /**
         * 获取绝对地址
         */
        config: function configPath(webModule) {
            var paths = config().web, result = webModule;
            if (webModule) {
                var basePath = path.join(__dirname + '/../../../views/');
                if (/https?:\/\//.test(webModule)) {
                    if (/https?:\/\/.*\/views\/*/.test(webModule)) {
                        webModule = webModule.replace(/https?:\/\/.*\/views\/*/i, basePath);
                    }else{
                        webModule = basePath + '/../';
                    }
                }
                webModule = path.join(webModule);

                if(Object.keys(paths).some(i=>i.toLocaleLowerCase()===webModule.toLocaleLowerCase())){
                    result = paths[Object.keys(paths).filter(i=>i.toLocaleLowerCase()===webModule.toLocaleLowerCase()).pop()];
                }else{
                    var filterPath =  Object.keys(paths).sort((a, b) => a.length - b.length).filter(i => path.join(webModule).toLocaleLowerCase().indexOf(path.join(basePath, i).toLocaleLowerCase()) !== -1).pop();
                    if (filterPath) {
                        result = path.join(webModule).replace(new RegExp(path.join(basePath, filterPath).replace(/\\/g, '\\\\'), 'i') , paths[filterPath]);
                    } else {
                        result = path.join(webModule);
                    }
                }
                if(/https?:\/\/.*\/views\/*/.test(result)){
                    return this.config(result);
                }else{
                    return result;
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
                } else if (path.basename(dir) !== 'node_modules' && path.dirname(dir) !== dir) {
                    return this.packTool(path.dirname(dir));
                }
            }
            return '';
        },
        /**
         * 获取版本信息
         */
        package: function(dir){
            try{
                if(fs.existsSync(dir + '/package.json')){
                    return JSON.parse(fs.readFileSync(dir + '/package.json').toString());
                }
            }catch(e){

            }
            return {};
        },
        /**
         * 获取相对路径
         */
        relativelyPath: function(referer, file){
            var basePath = path.join(__dirname + '/../../../views/');
            var files = file.split(/\?#/).shift().toLocaleLowerCase().split(/[\\\/]/).filter(function(i){return !!i;});
            var refererPaths = (this.config((referer || '').split(/[\?#]/).shift() || basePath) || basePath).toLocaleLowerCase().replace(/((?![\\\/]).)+\.html$/,'').split(/[\\\/]/).filter(function(i){return !!i;});
            while(files[0] === refererPaths[0]){
                files.shift();
                refererPaths.shift();
            }
            return refererPaths.map(function(){return '../';}).join('') + files.join('/');
        }
    };

})();