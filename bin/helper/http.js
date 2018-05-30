var http = require('http');

module.exports = (function(){
    return {
        httpGet:httpGet
    };

    function httpGet(url){
        return new Promise(function(succ){
            http.get(url, function (res) {
                var size = 0,
                    chunks = [];
                res.on('data', function (chunk) {
                    size += chunk.length;
                    chunks.push(chunk);
                });
                res.on('end', function () {
                    if (/^2/.test(res.statusCode)) {
                        var responseText = Buffer.concat(chunks, size);
                        succ(responseText);
                    } else {
                        console.log(bodyData);
                    }
                });
            }).on('error', function (e) {
                console.log(e.message);
            });
        });
    }
})();