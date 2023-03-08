var fs = require("fs");
var path = require("path");
var child_process = require('child_process');

var cmd = require('./cmd');
var node = require('./node');
var extend = require('./extend');

var config = require('./../config');
var helper = require('./../helper');

module.exports = (function () {
    var configs = [], messageList = {};

    action.config = function (web,fn) {
        configs.push({
            web:web,
            path:helper.config(__dirname + '/../../views/' + web),
            fn:fn
        });
    };

    return action;


    function action(request, response) {
        var _actions = request.url.split('?')[1];
        if(!_actions){
            runCMD(request).then(id => response.end(id));
        }else if (/^\d+$/.test(_actions)) {
            response.setHeader("Content-Type", 'text/plain;charset=utf-8');
            response.end(message(_actions));
        } else {
            actions(_actions.split('=').map(i=>decodeURIComponent(i)),request.headers.referer || '').then(id => response.end(id));
        }
    }

    function message(actionId) {
        var messages = messageList[actionId] || '';
        messageList[actionId] = [];
        return JSON.stringify(messages);
    }

    function contextmenu(_actions,referer,messageFn){
        var dirPath = _actions[1];
        if (!fs.existsSync(dirPath)) {
            dirPath = helper.config((referer+'/'+_actions[1]).replace(/\/views\/*$/,'/views/../'));
        }
        
        var actions = /contextmenu\[(.+)\]/i.exec(_actions[0])[1].trim().toLocaleLowerCase().split(':');
        if(!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()){
            dirPath = path.dirname(dirPath);
        }
        switch (actions[0].split(/\s/).shift()){
            case 'open':
                if(fs.existsSync(path.join(dirPath,_actions[1]))){
                    cmd(path.dirname(dirPath), messageFn, '', 'start '+ path.join(dirPath,_actions[1]));
                }else{
                    cmd(path.dirname(dirPath), messageFn, '', 'start '+ dirPath)
                }
                break;
            case 'clone':
                var divPath = helper.config(referer), github_config ='';
                if(fs.existsSync(divPath + '/.github.config')){
                    github_config = fs.readFileSync(divPath + '/.github.config').toString();
                }
                if(!github_config.split(/[\r\n]/).filter(function(i){return i.trim().toLocaleLowerCase() === _actions[1].trim().toLocaleLowerCase();}).length){
                    github_config += '\n' + _actions[1];
                }
                fs.writeFileSync(divPath + '/.github.config', github_config);
                cmd(divPath, messageFn,'','git clone '+ _actions[1]);
                break;
            case 'pull':
                cmd(dirPath, messageFn,'', ['git symbolic-ref --short -q HEAD', 'git pull origin {@@@@}']);
                break;
            case 'editor': 
                var dirs = fs.readdirSync(dirPath);
                var software = config().software[Object.keys(config().software).filter(i=>dirs.some(d=>i==d)).shift() || '.vscode'];
                cmd(path.dirname(software), messageFn,'', path.basename(software) + ' ' + dirPath);
                break;
            case 'npmrun':
                cmd(dirPath, messageFn, '', [actions[0].replace('npmrun', 'npm run')]);
                break;
            case 'npmlink':
                extend.npmlink(cmd, dirPath, messageFn, actions[0].replace(/^npmlink\s+/, '').split(','));
                break;
            case 'editonline':
                messageFn('!!>>/editonline/' + dirPath);
                break;
        }
    }


    function actions(_actions,referer) {
        var web = /\[(.*)\]/.exec(_actions[1]);
        var id = Date.now() + '';

        referer = web && helper.config(web[1]) || referer;
        _actions[1] = _actions[1].replace(/\[(.*)\]/, '');

        var sourceDiv = helper.config(referer);
        
        var promisses = configs.filter(cf=>new RegExp('\/?views\/+'+cf.web.replace(/\-/g,'\\-')+'\/','i').test(referer + '/' + _actions[1]+ '/')).map(cfn => cfn.fn(cmd, messageFn, _actions, referer)).filter(i => !!i);
        if(/contextmenu\[.+\]/.test(_actions[0])){
            Promise.all(promisses).then(()=>contextmenu(_actions,referer.split('?').shift(),messageFn));
        }else if (!promisses.length) {
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
                default:
                    return Promise.resolve('!!没有对应的处理');
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

    function runCMD(request){
        return new Promise(function(succ){
            helper.getBodyData(request).then(function(runData){
                var id = Date.now() + '';
                messageList[id] = [];
                try{
                    Promise.all(JSON.parse(decodeURI(runData.toString())).map(i => {
                        try {
                            return node(request,i)
                        }catch(e){
                            return new Promise(function(resolve){
                                var sourceDiv = helper.config(request.headers.referer);
                                cmd(sourceDiv,()=>{},'', i,resolve,resolve);
                            });
                        }
                    })).then(function(messages){
                        messageList[id].push('!!'+ JSON.stringify(messages.map(function(m){
                            if(typeof m === 'object'){
                                return JSON.stringify(m,null,4);
                            } else{
                                return m;
                            }
                        })));
                    });
                }catch(e){
                    cmd(__dirname, ms=>messageList[id].push(ms), '', JSON.parse(runData.toString()).join(' && '));
                }
                succ(id);
            });
        });
        
    }

})();