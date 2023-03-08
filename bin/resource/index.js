var fs = require("fs");
var iconv = require('iconv-lite');
var helper = require("./../helper");

module.exports = {
    /**
     * 是否是资源文件
     * @param {*} url 
     */
    test: function (request){
        return helper.regexpUrl('(bin|service|debug|lib|images|document|data|backup)', request.url);
    },
    /**
     * 读取资源文件
     * @param {*} url 
     */
    read: function (request, response){
        return new Promise(succ => {
            var file = __dirname + '/../../' + decodeURIComponent(request.url.split('?').shift());
            if (fs.existsSync(file)) {
                try {
                    var content = '';
                    if(fs.statSync(file).isFile()){
                        content = fs.readFileSync(file);
                    }else{
                        content = JSON.stringify(fs.readdirSync(file));
                    }

                    if(/\.html/.test(file)){
                        content = helper.replaceContent(file.replace(/((?!\/).)+\.html/,''),content.toString(),{});
                    }

                    if(/\.csv/.test(file) && request.headers.referer){
                        content = iconv.decode(content, 'GBK');
                    }

                    response.setHeader("Content-Type", helper.type(request.url) || 'text/plain;charset=utf-8');
                    succ(content);
                }
                catch (e) {
                    succ('The File Not Read');
                }
            } else {
                succ('The File Not Found');
            }
        });
    }
}