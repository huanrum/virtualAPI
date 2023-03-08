var path = require('path');
var child_process = require('child_process');
var helper = require('../../helper');

module.exports = (function () {

    return function useCMD(sourceDiv, messageFn, dirs, cmd, isChild, callback) {
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

        sourceDiv = path.join(sourceDiv);

        var getbasePath = function(cmd, dir){
            if (/^\s*(cd)?\s*[A-Z]+:/i.test(cmd)) {
                return [
                    cmd.replace(/^\s*(cd)?\s*/i, '').split(':')[0] + ':',
                    cmd
                ];
            }
            return [
                sourceDiv.split(':')[0] + ':',
                'cd ' + sourceDiv.replace(/\\/g, '/') + '/' + dir,
                cmd
            ];
        }

        messageFn('命令 开始');
        setTimeout(function () {
            messageFn('切换位置');
            var cmdlist = dirs.map(dir=>cmd.map(c=>getbasePath(c, dir).join(' && ')));
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
                then(lts, stdout, error);
            };
            if (isChild) {
                var ls = child_process.spawn(list.shift(), ['-lh', '/usr']);
                ls.stdout.on('data', cb);
                ls.stderr.on('data', cb);
            } else {
                helper.console('grey', `run->cmd : ${list[0].replace(/{@+}/,data)}`)
                child_process.exec(list.shift().replace(/{@+}/,data), cb);
            }
        }

        function then(lts, data, err) {
            runFn(data);
            if (lts.length) {
                setTimeout(function () {
                    cmd(lts,data.split(/[\r\n]/).filter(i=>!!i).join(' '));
                }, 1000);
            } else {
                callback(data || err);
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