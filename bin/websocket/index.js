var https = require('https');
var fs = require('fs');

var helper = require('./../helper');
var tagging = require('./../tagging');

var privateKey = fs.readFileSync(__dirname + '/../credentials/private.pem', 'utf8');
var certificate = fs.readFileSync(__dirname + '/../credentials/file.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var fnlist = [];

/**
 * 客户端列表
 */
var wList = {};
var send = function (w, data) {
    try {
        if (wList[w].send){
            wList[w].send(JSON.stringify(data));
        }
    } catch (e) {
        delete wList[w];
    }
};

module.exports = function (options,fn) {

    if(typeof options === 'function'){
        if(!fn){
            fn = options;
            options = function(){return true;};
        }
        return fnlist.push({is:options,fn:fn});
    }

    if(options.url && fn.end){
        return simulation(options, fn);
    }

    helper.initModule('ws').then(socket => {
        var ws = new socket.Server({port: options.websocket}),
            wss = new socket.Server({server: https.createServer(credentials, fn||function(){}).listen(10000 + options.websocket)});

        [ws, wss].forEach(w => w && w.on('connection', function(client){
            client.on('message', message => handleMessage(client, message)).on('error', function(e){});
        }).on('error', function(e){

        }));

        // 终端打印如下信息
        helper.console('green', 'websocket running at ws://' + options.ip + ':' + options.websocket + '/');
        helper.console('green', 'websocket running at wss://' + options.ip + ':' + (10000 + options.websocket) + '/');

    });
};

function simulation(request, response){
    if(!request.headers.websocket){
        return response.end('websocket is miss');
    }
    var clientId = (request.headers.websocket || '').trim();
    return helper.getBodyData(request).then(bodyData => {
        if(!bodyData || !bodyData.length){
            if(wList[clientId]){
                wList[clientId].send = res => fn.end(res);
            } else {
                wList[clientId] = {
                    id: clientId,
                    send: res => {response.end(res);delete wList[clientId];}
                };
            }
            if(wList[clientId].data){
                send(clientId, wList[clientId].data);
                delete wList[clientId].data;
            }
        } else {
            handleMessage(Object.assign(wList[clientId] || {id: clientId, send: res=> response.end(res)}, {
                _socket: {remoteAddress: helper.clientIp(request)}
            }), bodyData.toString());
            response.end();
        }
    });
}

function handleMessage(client, message){
    var messageData = JSON.parse(message);
    var clientId = (Object.keys(wList).find(function (i) {
        return client === wList[i];
    }) || client.id || '').trim();;
    try {
        switch (messageData.action) {
            case 'login':
                //登录
                var data = {
                    action: messageData.action,
                    data: Object.keys(wList).filter(w=>w!==clientId)
                };
                clientId = messageData.data.trim();
                Object.keys(wList).forEach(function (w) {
                    if(w !== clientId){
                        send(w, {
                            action: messageData.action,
                            from: clientId
                        });
                    }
                });
                client.data = data;
                wList[clientId] = client;
                setTimeout(() => send(clientId, JSON.stringify(data)));
                break;
            case 'logout':
                //登出
                Object.keys(wList).forEach(function (w) {
                    if (w === clientId) {
                        delete wList[w];
                    } else {
                        send(w, {
                            action: messageData.action,
                            from: clientId
                        });
                    }
                });
                break;
            case 'tagging':
                tagging(Object.assign(messageData.data,{remote:helper.clientIp({socket:client._socket})}));
                break;
            default:
                //传递消息
                if(messageData.flag){
                    var data = fnlist.map(function(fn){
                        return fn.is(messageData.action) && fn.fn(messageData.data)
                    }).filter(i=>!!i).shift();
                    send(clientId,Object.assign(messageData,{data:data||{}}));
                }else{
                    Object.keys(wList).forEach(function (w) {
                        if (wList[w] !== client && (!messageData.to || messageData.to.indexOf(w) !== -1)) {
                            send(w, {
                                flag: messageData.flag,
                                action: messageData.action,
                                from: clientId,
                                data: messageData.data
                            });
                        }
                    });
                }
                break;
        }
    } catch (e){ 
    
    }
}