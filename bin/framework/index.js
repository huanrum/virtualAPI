var fs = require("fs");
var path = require('path');

module.exports = (function () {

    return function(helper,request, response){
        var framework = request.url.replace(/^\/*framework\/+/,'').split('.').shift();
        var type = request.url.split('.').pop();

        response.setHeader("Content-Type", helper.type(type) || '');
        switch(framework){
            case 'ehuanrum':
                response.end(fs.readFileSync(helper.config(__dirname + '/../../views/framework/demo/framework.' + type)));
            break;
            default :
                response.end('//no file');
            break;
        }

    };

})();