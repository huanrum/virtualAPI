
var child_process = require('child_process');

module.exports = (function () {

    return function useCMD(sourceDiv,messageFn, dir, cmd, isChild) {
        messageFn('命令 开始');
        setTimeout(function () {
            messageFn('切换位置');
            runCmd(isChild, [
                [sourceDiv.split(':')[0] + ':', 'cd ' + sourceDiv.replace(/\\/g,'/') + '/' + dir, cmd].join(' && ')
            ], function (data) {
                if (!data) {
                    messageFn('....');
                } else {
                    messageFn('' + (data.message || '......'));
                }
            }, function (message) {
                messageFn('命令 完成');
                setTimeout(function () {
                    messageFn('!!' + message);
                }, 1000);
            });
        }, 1000);
    };

    function runCmd(isChild, list, runFn, callback) {
        var _callback = callback || function () {};

        function cmd(lts) {
            var cb = function (error,stdout) {
                then(lts, stdout);
            };
            if (isChild) {
                var ls = child_process.spawn(list.shift(), ['-lh', '/usr']);
                ls.stdout.on('data', cb);
                ls.stderr.on('data', cb);
            } else {
                child_process.exec(list.shift(), cb);
            }
        }

        function then(lts, data) {
            console.log(`end: ${data}`);
            runFn(data);
            if (list.length) {
                setTimeout(function () {
                    runCmd(lts);
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
            cmd(list);
        });
    }
})();