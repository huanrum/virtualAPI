var fs = require("fs");
var path = require('path');

var helper = require('../helper');
var db = require('../db');

module.exports = (function log() {
    var baseDir = __dirname + '/../../log/';
    helper.mkdirs(baseDir);
    return function (request, response, key) {
        if (request.url) {
            var keyUrl = key || 'log/:filename';
            var parameters = helper.parameters(request,keyUrl);
            
            helper.getBodyData(request, true).then(bodyData => {
                if(bodyData){
                    log(new Date(), helper.clientIp(request), request.headers['referer'], keyUrl, request.url, bodyData);
                    response.end('{}');
                }else{
                    if(parameters.filename){
                        response.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
                        response.end(fs.readFileSync(baseDir + '/' + parameters.filename).toString());
                    }else{
                        response.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' });
                        response.end(helper.replaceHtml(fs.readFileSync(__dirname + '/index.html').toString(),'<script>\r\nwindow.$data = ' + JSON.stringify(fs.readdirSync(baseDir),null,4) + '\r\n</script>'));
                    }
                }
            });
        } else {
            log.apply(this,arguments);
        }
    };

    function log(){
        var size = 100 * 1024;
        var message = '\n' + Array(40).join('*') + '\n' + Array.prototype.join.call(arguments, '\n') + '\n' + Array(40).join('*') + '\n';
        //db({method:'PUT',url:'/db/mongodb/log',body:{name:Date.now(),arguments:Array.prototype.slice.call(arguments)}});
        fs.readdir('log', function (error, files) {
            if (error) {
                return;
            }
            var file = files.find(function (item) {
                return /\.log$/.test(item) && fs.statSync('log/' + item).size < size;
            });
            if (!file) {
                file = Date.now() + '.log';
            }
            fs.appendFile('log/' + file, message, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        });
    }
})();