var fs = require("fs");
var child_process = require('child_process');

var cmd = require('./cmd');

module.exports = (function () {
    var configs = [];
    var sourceDiv = __dirname.replace('\\views\\_dev\\service', '') + '/views/';
    var baseDir = __dirname.replace('\\views\\_dev\\service', '') + '/views/';
    var messageList = {};

    action.config = function (fn) {
        configs.push(fn);
    };

    return action;


    function action(request, response) {
        var _actions = request.url.split('?')[1];
        if (!_actions) {
            allModules(baseDir).then(content => response.end(content));
        } else if (/^\d+$/.test(_actions)) {
            response.setHeader("Content-Type", 'text/plain;charset=utf-8');
            response.end(message(_actions));
        } else {
            actions(_actions.split('='),request.headers.referer).then(id => response.end(id));
        }
    }


    function allModules(_path) {
        return fs.readFileSync(__dirname + '/index.html').replace(/${dirs}/g, JSON.stringify(fs.readdirSync(_path)));
    }

    function message(actionId) {
        var messages = messageList[actionId] || '';
        messageList[actionId] = [];
        return JSON.stringify(messages);
    }


    function actions(_actions,referer) {
        var id = Date.now() + '';
        var promisses = configs.map(cfn => cfn(cmd, messageFn, _actions, referer)).filter(i => !!i);

        if (!promisses.length) {
            switch (_actions[0].toLocaleLowerCase()) {
                case 'branch':
                    cmd(sourceDiv, messageFn, '', 'git pull && git branch -a');
                    break;
                case 'checkout':
                    cmd(sourceDiv, messageFn, '', 'git checkout ' + _actions[1] + ' && git pull origin ' + _actions[1]);
                    break;
                case 'update':
                    cmd(sourceDiv, messageFn, '', 'git pull origin ' + child_process.execSync('git symbolic-ref --short -q HEAD').toString());
                    break;
                case 'scss':
                    cmd(sourceDiv, messageFn, _actions[1], 'gulp scss');
                    break;
                default:
                    messageFn('!!没有对应的处理');
                    break;
            }
        }

        return Promise.resolve(id);

        function messageFn(ms) {
            if (!messageList[id]) {
                messageList[id] = [];
            }
            messageList[id].push(ms);
        }
    }

})();