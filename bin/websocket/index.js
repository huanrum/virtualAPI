var child_process = require('child_process');

var helper = require('./../helper');

module.exports = function (options) {

    helper.initModule('ws').then(ws => {
        var wss = new ws.Server({ port: options.websocket }), wList = {};

        var send = function (w, data) {
            try {
                wList[w].send(JSON.stringify(data));
            } catch (e) {
                delete wList[w];
            }
        };

        wss.on('connection', function (client) {
            client.on('message', function (message) {
                var messageData = JSON.parse(message);
                var clientId = Object.keys(wList).find(function (i) { return client === wList[i]; });
                switch (messageData.action) {
                    case 'login':
                        //登录
                        clientId = messageData.data;
                        Object.keys(wList).forEach(function (w) {
                            send(w, {
                                action: messageData.action,
                                from: clientId
                            });
                        });
                        client.send(JSON.stringify({
                            action: messageData.action,
                            data: Object.keys(wList)
                        }));
                        wList[clientId] = client;
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
                    default:
                        //传递消息
                        Object.keys(wList).forEach(function (w) {
                            if (wList[w] !== client && (!messageData.to || messageData.to.indexOf(w) !== -1)) {
                                send(w, {
                                    action: messageData.action,
                                    from: clientId,
                                    data: messageData.data
                                });
                            }
                        });
                        break;
                }
            }).on('error', function (e) {

            });
        }).on('error', function (e) {

        });

        // 终端打印如下信息
        console.log('\x1B[32m', 'websocket running at http://' + options.ip + ':' + options.websocket + '/');
    });

};
