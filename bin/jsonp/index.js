
var http = require('http');

var helper = require('./../helper');

module.exports = (function () {
    return function proxy(request, response) {
        if(request.method.toLocaleLowerCase() !== 'get'){
            response.setHeader("Content-Type", 'text/plain;charset=utf-8');
            response.end(JSON.stringify({errorCode: '不支持get以外的jsonp'}));
        }else{
            var api = decodeURIComponent(request.url.split('?').pop().split('&').filter(i=>/url=/.test(i)).pop().replace(/url=/,'')).replace(/\[[a-z]+\]/ig,'');
            var callback = request.url.split('?').pop().split('&').filter(i=>/callback=/.test(i)).pop().replace(/callback=/,'');
            http.get(api,rsp =>{
                if (!/^4/.test('' + rsp.statusCode)) {
                    helper.getResponse(rsp).then(responseText => {
                        response.writeHead(rsp.statusCode, rsp.headers);
                        response.end(callback + '(' + responseText.toString() + ')');
                    });
                } else {
                    response.setHeader("Content-Type", 'text/plain;charset=utf-8');
                    response.end(callback + '(' + JSON.stringify({errorCode: rsp.statusCode}) + ')');
                }
            }).on('error', function (e) {
                var errorMessage = '服务器错误';
                response.setHeader("Content-Type", 'text/plain;charset=utf-8');
                response.end(JSON.stringify({
                    errorCode: e.code,
                    errorEn: errorMessage,
                    errorZhCn: errorMessage,
                    errorZhHk: errorMessage,
                }));
            });
        }

    };

})();