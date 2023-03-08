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
                //log(new Date(), helper.clientIp(request), request.headers['referer'],request.headers['user-agent'], keyUrl, request.url, bodyData);
                if(bodyData){
                    response.end('{}');
                }else{
                    var content = '';
                    response.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
                    if(parameters.filename){
                        content = `
                            <!--html>/../compatible/native.html</html-->
                            <!--html>/../compatible/dialog.html</html-->
                            <!--html>/view/transform.html</html-->
                            <style>
                                .dialog .content{
                                    max-height: 90vh!important;
                                    max-width: 98vw;
                                }
                            </style>
                            <pre class="transform">
                                ${fs.readFileSync(baseDir + '/' + parameters.filename).toString()}
                            </pre>
                        `;
                    }else{
                        content = fs.readFileSync(__dirname + '/index.html').toString();
                    }
                    response.end(helper.replaceContent(__dirname,content,fs.readdirSync(baseDir)));
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
                return /\.log$/.test(item) && item.replace(/\.log$/,'')>new Date(new Date().toDateString()).valueOf() && fs.statSync('log/' + item).size < size;
            });
            if (!file) {
                file = Date.now() + '.log';
            }
            fs.appendFile('log/' + file, message, function (err) {
                if (err) {
                    helper.console(err);
                }
            });
        });
    }
})();