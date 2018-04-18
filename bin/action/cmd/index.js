
var child_process = require('child_process');

module.exports = (function () {

    return function useCMD(sourceDiv,messageFn, dirs, cmd, isChild, callback) {
        if(!Array.isArray(dirs)){
            dirs = [dirs];
        }
        if(!Array.isArray(cmd)){
            cmd = [cmd];
        }
        if(typeof isChild === 'function'){
            callback = isChild;
            isChild = false;
        }
        messageFn('命令 开始');
        setTimeout(function () {
            messageFn('切换位置');
            var cmdlist = dirs.map(dir=>cmd.map(c=>[sourceDiv.split(':')[0] + ':', 'cd ' + sourceDiv.replace(/\\/g,'/') + '/' + dir, c].join(' && ')));
            runCmd(isChild, cmdlist.reduce((ls,l)=>ls.concat(l)), function (data) {
                if (!data) {
                    messageFn('....');
                } else {
                    messageFn('' + (data.message || '......'));
                }
            }, function (message) {
                if(callback){
                    callback(message);
                }else{
                    messageFn('命令 完成');
                    setTimeout(function () {
                        messageFn('!!' + message);
                    }, 1000);
                }
            });
        }, 500);
    };

    function runCmd(isChild, list, runFn, callback) {
        var _callback = callback || function () {};

        function cmd(lts,data) {
            var cb = function (error,stdout) {
                then(lts, stdout);
            };
            if (isChild) {
                var ls = child_process.spawn(list.shift(), ['-lh', '/usr']);
                ls.stdout.on('data', cb);
                ls.stderr.on('data', cb);
            } else {
                child_process.exec(list.shift().replace(/{@+}/,data), cb);
            }
        }

        function then(lts, data) {
            console.log(`end: ${data}`);
            runFn(data);
            if (lts.length) {
                setTimeout(function () {
                    cmd(lts,data.split(/[\r\n]/).filter(i=>!!i).join(' '));
                }, 1000);
            } else {
                callback(data);
            }
        }

        return new Promise(function (success) {
            callback = function(){
                _callback(...arguments);
                success(...arguments);
            };
            cmd(list,'');
        });
    }
})();