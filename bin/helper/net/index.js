var os = require('os');
var child_process = require('child_process');


module.exports = {
    /**
     * 提取域名或者IP
     */
    getDomain: function (url) {
        return /https?:\/\/(((?!\/).)*)/.exec(url)[1].split(/[:\/\\]/).shift();
    },
    /**
     * 获取当前的IP地址
     */
    netInfo: function () {
        var interfaces = os.networkInterfaces();
        for (var devName in interfaces) {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && /192\.168\.[0-1]\.\d+/.test(alias.address) && !alias.internal) {
                    return alias;
                }
            }
        }
        return {
            offline: true,
            address: '127.0.0.1'
        };
    },
    /**
     * 关闭对应端口下的进程
     */
    killPort: function (port) {
        return new Promise(succ => {
            getTaskPort(function (list) {
                Promise.all(list.filter(i => i.port == port).map(i => new Promise(resolve => {
                    child_process.exec('taskkill /pid ' + i.pid + ' -t -f ', function (err, stdout, stderr) {
                        resolve();
                    });
                }))).then(succ);
            });
        });

        function getTaskPort(callback) {
            if (process.platform !== 'win32') {
                return;
            }
            child_process.exec('tasklist', function (err1, stdout1, stderr1) {
                if (err1) {
                    return console.log(err1);
                }
                child_process.exec('netstat -aon', function (err2, stdout2, stderr2) {
                    if (err2) {
                        return console.log(err2);
                    }
                    var result = {};
                    var tasklist = stdout1.split('\n').map(i => i.trim().split(/\s+/));
                    stdout2.split('\n').map(i => i.trim().split(/\s+/)).filter(i => !!i[4]).forEach(i => {
                        result[i[1].split(':').pop()] = Object.assign(result[i[1].split(':').pop()] || {}, {
                            pid: i[4].split('/')[0],
                            port: i[1].split(':').pop(),
                            task: (tasklist.filter(t => t[1] == i[4].split('/')[0]).pop() || [])[0]
                        });
                    });

                    callback(Object.keys(result).map(i => result[i]).filter(i => i.pid > 1500));
                });
            });
        }
    }
};