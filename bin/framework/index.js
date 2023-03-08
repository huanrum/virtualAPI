var fs = require("fs");
var path = require('path');

module.exports = (function () {

    return function(request, response, helper){
        var framework = request.url.replace(/^\/*framework\/+/,'').split('.').shift();
        var type = request.url.split('.').pop();

        response.setHeader("Content-Type", helper.type(type) || '');

        if(fs.existsSync(__dirname +'/'+framework + '.' + type)){
            response.end(fs.readFileSync(__dirname +'/'+framework + '.' + type));
        }else{
            response.end('//no file');
        }

    };

})();