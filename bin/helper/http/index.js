var http = require('http');
var https = require('https');

module.exports = (function(){
    return {
        /**
         * 访问其他API
         */
        httpGet: function httpGet(url){
            return new Promise((succ) => {
                http.get(url, (res) => {
                    var size = 0,
                        chunks = [];
                    res.on('data', (chunk) => {
                        size += chunk.length;
                        chunks.push(chunk);
                    });
                    res.on('end', () => {
                        if (/^2/.test(res.statusCode)) {
                            var responseText = Buffer.concat(chunks, size);
                            succ(responseText);
                        } else {
                            this.console(bodyData);
                        }
                    });
                }).on('error', (e) => {
                    this.console(e.message);
                });
            });
        },
        /**
         * 访问其他API
         */
        httpsGet: function httpGet(url){
            return new Promise(succ => {
                var options = {
                    method: 'GET',
                    host: url.split('//')[1].split(/(:|\/)/).shift(),
                    port: parseInt(url.split(':')[2] || 443),
                    path: url,
                    rejectUnauthorized: false
                };
                https.get(options, (res) => {
                    var size = 0,
                        chunks = [];
                    res.on('data', (chunk) => {
                        size += chunk.length;
                        chunks.push(chunk);
                    });
                    res.on('end', () => {
                        if (/^2/.test(res.statusCode)) {
                            var responseText = Buffer.concat(chunks, size);
                            succ(responseText);
                        } else {
                            this.console(bodyData);
                        }
                    });
                }).on('error', (e) => {
                    this.console(e.message);
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
                    
                    form.on('error',(e)=>{
                        this.console(request.url,e);
                    });
                    
                    form.parse(request, (err, fields, files) => {
                        this.console(fields);
                    });
                }catch(e){
                    this.console(request.url,e);
                }
            });
        }
    };

    
})();