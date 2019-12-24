var http = require('http');

module.exports = (function(){
    return {
        /**
         * 访问其他API
         */
        httpGet: function httpGet(url){
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
        },
        /**
         * multiparty/express 提交文件
         */
        upload: function(request,dirPath){
            this.initModule(['multiparty','express']).then(multiparty => {
                try{
                    var form = new multiparty.Form();
                    form.encoding = 'utf-8';
                    form.uploadDir = dirPath;
                    //设置单文件大小限制
                    form.maxFilesSize = 2 * 1024 * 1024;
                    
                    form.on('error',function(e){
                        console.log(request.url,e);
                    });
                    
                    form.parse(request, function (err, fields, files) {
                        console.log(fields);
                    });
                }catch(e){
                    console.log(request.url,e);
                }
            });
        }
    };

    
})();