var os = require('os');  
var http = require('http');
var child_process = require('child_process');

var random = require('./random');
var helper = require('./helper');

var getSomeValue = function(){
    var someValue = {host:os.hostname(),ips:[]};
    
    Object.values(os.networkInterfaces()).forEach(function(networkInterfaces){
        for(var i=0;i<networkInterfaces.length;i++){  
            if(networkInterfaces[i].family=='IPv4'){  
                someValue.ips.push(networkInterfaces[i].address);  
            }  
        }  
    });
    someValue.ip = someValue.ips.sort().reverse()[0];
    return someValue;
}

var createServer = function (port,exits) {
    if (exits) { return; }
    
    randomFn = random(getSomeValue());
    http.createServer(function (request, response) {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With,User,Language,IsPc,Token')
        if (/^[\/\s]*$/.test(request.url)) {
            response.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
            response.end(helper());
        } else if(request.url.toLocaleLowerCase() === '/test'){
            response.end(JSON.stringify(true));
        }else{
            try {
                var bodyData = '';
                request.on('data', function (chunk) {
                    bodyData += chunk;
                });
                request.on('end', function () {
                    var returnData = helper(request, JSON.parse(bodyData || '{}'));
                    if (returnData) {
                        response.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' });
                        response.end(JSON.stringify(randomFn(returnData)));
                    } else {
                        response.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' });
                        response.end('404 地址不存在');
                    }
                });

            } catch (e) {
                response.writeHead(500, { 'Content-Type': 'text/plain;charset=utf-8' });
                response.end('500 服务器异常' + e.message);
            }
        }
    }).listen(port);

    // 终端打印如下信息
    console.log('Server running at http://127.0.0.1:' + port + '/');

};


child_process.exec(process.platform == 'win32' ? 'netstat -aon' : 'netstat –apn', function (err, stdout, stderr) {
    var port = 8888, count = 0, thenList = [];
    if (err) { return console.log(err); }
    stdout.split('\n').filter(function (line) { return line.trim().split(/\s+/).length > 4; }).forEach(function (line) {
        var p = line.trim().split(/\s+/);
        if (process.platform == 'win32') {
            p.splice(1, 0, "0");
        }
        if (p[2].split(':')[1] == port || p[3].split(':')[1] == port) {
            ++count;
            child_process.exec('taskkill /pid ' + p[5].split('/')[0] + ' -t -f ', function (err, stdout, stderr) {
                createServer(port, --count);
            });
        }
    });
    createServer(port, count);
});