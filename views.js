var fs = require("fs");

module.exports = (function () {
    var files = {};
    var types = {
        "css": "text/css",
        "gif": "image/gif",
        "html": "text/html",
        "ico": "image/x-icon",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "js": "text/javascript",
        "json": "application/json",
        "pdf": "application/pdf",
        "png": "image/png",
        "svg": "image/svg+xml",
        "swf": "application/x-shockwave-flash",
        "tiff": "image/tiff",
        "txt": "text/plain",
        "wav": "audio/x-wav",
        "wma": "audio/x-ms-wma",
        "wmv": "video/x-ms-wmv",
        "xml": "text/xml"
    };
    return {
        is: isView,
        get: getFile,
        views:views
    };


    function views(){
        var dirs = JSON.stringify(fs.readdirSync(__dirname.replace('_dev\\service', '')).map(function (i) { return i.toLocaleLowerCase(); }));
        
        return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="X-UA-Compatible" content="ie=edge">
                <title>View List</title>
                <style>
                    #list li{
                        padding:0.2rem 1rem;
                    }
                </style>
            </head>
            <body>
                <ul id="list"></ul>
                <script>
                    var dirs = ${dirs};
                    var list = document.getElementById('list');
                    dirs.forEach(function(dir){
                        var item = document.createElement('li');
                        var a = document.createElement('a');
                        item.append(a);
                        list.append(item);
                        a.innerHTML = dir;
                        a.onclick = function(){
                            window.open('../'+dir);
                        };
                    });
                
                </script>
            </body>
        </html>
        `;
    }

    function isView(request) {
        var url = request.url.split('/').filter(function (i) { return !!i; }).shift() || '';
        var referer = request.headers.referer && request.headers.referer.split('?').shift().replace(/^(http|https):\/\//, '').replace(request.headers.host, '').split('/').filter(function (i) { return !!i; }).shift() || '';
        var dirs = fs.readdirSync(__dirname.replace('_dev\\service', '')).map(function (i) { return i.toLocaleLowerCase(); });
        return dirs.indexOf(url.toLocaleLowerCase()) || dirs.indexOf(referer.toLocaleLowerCase());
    }

    function getFile(request, response) {
        var onlyUrl = request.url.split('?').shift();
        var referer = request.headers.referer && request.headers.referer.split('?').shift().replace(/^(http|https):\/\//, '').replace(request.headers.host, '') || '';
        var refererFirst = referer.split('/').filter(function (i) { return !!i; }).shift() || '^$';
        if (files[referer] && fs.existsSync(__dirname.replace('_dev\\service', files[referer]) + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html'))) {
            return transverter(response, onlyUrl.split('.').pop(), fs.readFileSync(__dirname.replace('_dev\\service', files[referer]) + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html')));
        } else if (fs.existsSync(__dirname.replace('_dev\\service', refererFirst) + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html'))) {
            files[onlyUrl] = refererFirst;
            return transverter(response, onlyUrl.split('.').pop(), fs.readFileSync(__dirname.replace('_dev\\service', refererFirst) + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html')));
        } else if (fs.existsSync(__dirname.replace('_dev\\service', '') + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html'))) {
            files[onlyUrl] = onlyUrl.split('/').filter(function (i) { return !!i; }).shift() || '';
            return transverter(response, onlyUrl.split('.').pop(), fs.readFileSync(__dirname.replace('_dev\\service', '') + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html')));
        } else {
            return '';
        }
    }

    function transverter(response, type, data) {
        if (types[type]) {
            response.setHeader("Content-Type", types[type]);
        }

        if (type === 'svg') {
            return data;
        } else {
            return data;
        }
    }

})();