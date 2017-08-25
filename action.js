var fs = require("fs");
var child_process = require('child_process');

module.exports = (function () {
    var dirs = {
        'tng-mobile': 'D:\\Developer\\mvp-frameworks-tng4.0-vuejs\\mvp-frameworks-tng4.0-vuejs\\views\\'
    }

    var messageList = {};
    return function (request, response) {
        var _actions = request.url.split('?')[1];
        if (/\d+/.test(_actions)) {
            return message(_actions);
        } else if (/=/.test(_actions)) {
            return actions(toObject(_actions.split('&')));
        } else {
            return allModules((_actions||'').replace(/^\//,''));
        }

        function toObject(list) {
            var obj = {};
            list.forEach(function (ls) {
                obj[ls.split('=')[0]] = ls.split('=')[1];
            });
            return obj;
        }
    };

    function runCmd(list, runFn, callback) {
        child_process.exec(list.shift(), function (data) {
            runFn(data);
            if (list.length) {
                setTimeout(function () {
                    runCmd(list, runFn, callback);
                }, 1000);
            } else {
                callback();
            }
        });
    }

    function allModules(_path) {
        var dirs = JSON.stringify(fs.readdirSync(__dirname + '/views/' + (_path || '')).map(function (i) { return i; }));
        var actions = _path ? (/\//.test(_path)?'\'\'':'\'Gulp\'') : '\'Commit\'';
        return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="X-UA-Compatible" content="ie=edge">
                <title>View List</title>
                <style>
                    body>div{
                        padding:0.2rem 1rem;
                        margin:0.2rem;
                        border:1px solid #9a9a9a;
                    }
                    body>div>div:first-child{
                        color: #9393d3;
                        font-weight: 700;
                    }
                    body>div>div>a{
                        cursor: pointer;
                        margin:0.5rem;
                        color:green;
                        border:1px solid green;
                    }
                    body>div>div>a.runing{
                        color:#ff0000;
                    }
                </style>
            </head>
            <body>
                <script>
                    var dirs = ${dirs};
                    var useInterval = (function(){
                        var getMessage = {};
                        setInterval(function(){
                            Object.keys(getMessage).forEach(function(id){
                                fetch('action?'+id, {method: 'GET'}).then(function(req){return req.text()}).then(function(message){
                                    getMessage[id](message);
                                    if(!message){
                                        delete getMessage[id];
                                    }
                                });
                            });
                        },1000);

                        return function(id,callBack){
                            getMessage[id] = callBack;
                        }
                    })();
                    dirs.forEach(function(dir){
                        var item = document.createElement('div');
                        var module = document.createElement('div');
                        var actions = document.createElement('div');
                        var message = document.createElement('div');
                        
                        item.append(module);
                        item.append(actions);
                        item.append(message);
                        document.body.append(item);
                        module.innerHTML = dir;
                        module.onclick = function(){
                            window.open('?'+('${_path}'?('${_path}/'):'')+dir);
                        };

                        [${actions}].forEach(function(actionName){
                            var action = document.createElement('a');
                            actions.append(action);
                            action.innerHTML = actionName;
                            action.onclick = function(){
                                if(!message.innerHTML){
                                    fetch('action?parent=${_path}&target='+dir+'&action='+actionName, {method: 'GET'}).then(function(req){return req.text()}).then(function(id){
                                        useInterval(id,function(data){
                                            message.innerHTML = data;
                                            if(message.innerHTML){
                                                action.className = 'runing';
                                            }else{
                                                action.className = ''; 
                                            }
                                        });
                                    });
                                }
                            };
                        })
                    });
                </script>
            </body>
        </html>
        `;
    }

    function message(actionId) {
        return messageList[actionId];
    }

    function actions(_actions) {
        var id = Date.now() + '';
        switch (_actions.action.toLocaleLowerCase()) {
            case 'gulp':
                gulp(id, _actions.parent||'', _actions.target);
                break;
            case 'commit':
                commit(id, _actions.parent||'', _actions.target);
                break;
        }
        return id;
    }

    function gulp(id, parent, target) {
        parent = parent.replace(/^\//,'');
        if (dirs[parent]) {
            messageList[id] = 'gulp';
            setTimeout(function () {
                messageList[id] = '切换位置';
                runCmd([[
                    dirs[parent].split(':')[0] + ':',
                    'cd ' + dirs[parent] + target,
                    'gulp build --prod --test'
                ].join(' && ')], function (data) {
                    if (!data) {
                        messageList[id] = '....';
                    } else {
                        messageList[id] = '' + message.message || '......';
                    }
                }, function () {
                    messageList[id] = '构建完成';
                    setTimeout(function () {
                        messageList[id] = '';
                    }, 1000);
                })
            }, 1000);
        }
    }

    function commit(id, parent, target) {
        if (dirs[target]) {
            messageList[id] = 'commit';
            setTimeout(function () {
                messageList[id] = '切换位置';
                runCmd([[
                    dirs[target].split(':')[0] + ':',
                    'cd ' + dirs[target],
                    'git add .',
                    'git commit -m \'update\'',
                    'git pull origin dev',
                    'git push origin dev'
                ].join(' && ')], function (data) {
                    if (!data) {
                        messageList[id] = '....';
                    } else {
                        messageList[id] = '' + message.message || '......';
                    }
                }, function () {
                    messageList[id] = '提交成功';
                    setTimeout(function () {
                        messageList[id] = '';
                    }, 1000);
                })
            }, 1000);
        }
    }

})();