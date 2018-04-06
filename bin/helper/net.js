var os = require('os');
var child_process = require('child_process');


module.exports = {
    /**
     * 提取域名或者IP
     */
    getDomain: function (url){
        return /https?:\/\/(((?!\/).)*)/.exec(url)[1].split(/[:\/\\]/).shift();
    },
    /**
     * 获取当前的IP地址
     */
    netInfo: function (){  
        var interfaces = os.networkInterfaces();  
        for(var devName in interfaces){  
              var iface = interfaces[devName];  
              for(var i=0;i<iface.length;i++){  
                   var alias = iface[i];  
                   if(alias.family === 'IPv4' && /192\.168\.[0-1]\.\d+/.test(alias.address) && !alias.internal){  
                         return alias;  
                   }  
              }  
        }
        return {offline:true,address:'127.0.0.1'}; 
    },
    /**
     * 关闭对应端口下的进程
     */
    killPort: function (port) {
        return new Promise(succ =>{
            child_process.exec(process.platform == 'win32' ? 'netstat -aon' : 'netstat –apn', function (err, stdout, stderr) {
                var count = 0, thenList = [];
                if (err) { return console.log(err); }
                stdout.split('\n').filter(function (line) { return line.trim().split(/\s+/).length > 4; }).forEach(function (line) {
                    var p = line.trim().split(/\s+/);
                    if (process.platform == 'win32') {
                        p.splice(1, 0, "0");
                    }
                    if (p[2].split(':')[1] == port || p[3].split(':')[1] == port) {
                        ++count;
                        child_process.exec('taskkill /pid ' + p[5].split('/')[0] + ' -t -f ', function (err, stdout, stderr) {
                            if(!--count){
                                succ(); 
                            }
                        });
                    }
                });
                succ();
            });
        });
    }
};
