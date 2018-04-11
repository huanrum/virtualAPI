var fs = require("fs");

module.exports = (function(){
    var data = {
        web : getContent(__dirname +  '/../config/web.json'),
        mete : getContent(__dirname +  '/../config/mete.json')
    };

    var info = {
        web:'发布的网站配置',
        mete:'文件类型'
    };

    return function (helper,request,response){
        if(!request){
            return data;
        }else{
            var mod = request.url.split('?')[0].replace(/\/?((?!\/).)*\/*/,'');
            if(!mod){
                response.end(JSON.stringify(info)); 
            }else{
                var file = __dirname +  `/${mod}.json`;
                helper.getBodyData(request).then(bodyData => {
                    bodyData = bodyData.toString();
                    if(bodyData){
                        if(mod === 'web'){
                            response.end(JSON.stringify(addmodify(getContent(file),JSON.parse(bodyData))));
                        }else{
                            response.end('null');
                        }
                        fs.writeFileSync(file, JSON.stringify(JSON.parse(bodyData), null, 4));
                        data[mod] = JSON.parse(bodyData);
                    }else {
                        if(mod === 'web' && request.url.split('?')[1]){
                            createDir(request.url.split('?')[1]);
                            response.end('null');
                        }else{
                            if(fs.existsSync(file)){
                                response.end(fs.readFileSync(file).toString());
                            }else{
                                response.end('{}');
                            }
                        }
                    }
                });
            }
        }
    };

    function getContent(file){
        if(fs.existsSync(file)){
            return JSON.parse(fs.readFileSync(file).toString());
        }else{
            return {};
        }
    }

    function addmodify(oldObj,newObj){
        var result = {};
        Object.keys(newObj).forEach(k => {
            if(oldObj[k]){
                if(oldObj[k] !== newObj[k]){
                    result[k] = false;
                }
            }else{
                result[k] = !fs.existsSync(__dirname + '/../../service/' + module); 
            }
        });
        return result;
    }

    function createDir(module){
        var dir = __dirname + '/../../service/' + module;
        if(fs.existsSync(dir)){
            require("./../helper").rmdirs(dir);
        }
        fs.mkdirSync(dir);
        fs.writeFileSync(dir + '/index.js',`\n\nmodule.exports =  function (configFn, helper){\n\n};`);
    }

})();