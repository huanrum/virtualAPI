var fs = require("fs");

var basePath = __dirname + '/views/!replace/'

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
        views:views,
        builds:builds
    };

    function builds(url){
        var _path = basePath.replace('/!replace', '/../builds/tng-mobile') + url.replace('/builds/','');
        if(fs.existsSync(_path)){
            return fs.readFileSync(_path);
        }else{
            return null;
        }
    }

    function views(_path,index){
        var actions = _path ? 'Gulp' : 'Commit';
        //basePath.replace('/!replace', '')
        var replace = _path?_path.replace(basePath.replace('/!replace', '/'),''):'';
        var dirs = JSON.stringify(fs.readdirSync(basePath.replace('/!replace', _path||'')).map(function (i) { return i; }));
        index = index || '';
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
                   #list li div{
                        display:inline-block;
                        width: 150px;
                        text-align: center;
                        cursor: pointer;
                        margin:0.5rem;
                        color:green;
                        border:1px solid green;
                    }
                    #list li div i{
                        color:#d3d3d3;
                        font-size:12px;
                    }
                    .common-dialog-back {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(123, 123, 123, 0.6);
                    }
                    .common-dialog-back .common-dialog {
                        position: absolute;
                        margin-left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        padding: 2px;
                        border-radius: 10px;
                        background: #f3f3f3;
                    }
                    .common-dialog-back .common-dialog .common-dialog-content textarea{
                        height: 200px;
                        width: 300px;
                    }
                    .common-dialog-back .common-dialog .common-dialog-footer button{
                        margin: 1rem;
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
                        var action = document.createElement('div');
                        var a = document.createElement('a');
                        item.append(action);
                        item.append(a);
                        list.append(item);
                        action.innerHTML = '${actions}';
                        a.innerHTML = dir;
                        a.onclick = function(){
                            window.open('..${replace}/'+dir +'${index}');
                        };
                        action.onclick = function(){
                            if('Commit' === '${actions}'){
                                showModal('Git Commit',runAction(dir,action));
                            }else{
                                runAction(dir,action);
                            }
                        };
                    });

                    function runAction(dir,action){
                        return function(message){
                            var count = 0,interval = setInterval(function(){
                                action.innerHTML = '${actions}' + (Array(count++%4+1).join('.'));
                            },500);
                            
                            fetch('action/?parent=${_path}&target='+dir+'&action=${actions}&message='+message, {method: 'GET'}).then(function(r){return r.text()}).then(function(id){
                                runMessage(id,function(){
                                    clearInterval(interval);
                                    action.innerHTML = '${actions} <i>' + new Date().getHours()+':'+new Date().getMinutes() + '</i>';
                                });
                            });
                        }
                    }

                    function runMessage(id,callBack){
                        fetch('action/?'+id, {method: 'GET'}).then(function(r){return r.text()}).then(function(data){
                            if(data){
                                setTimeout(function(){
                                    runMessage(id,callBack);
                                },200);
                                
                            }else{
                                callBack();
                            }
                        });
                    }

                    function showModal(title,callback){
                        var dialogPanl = document.createElement('div');
                        var dialog = document.createElement('div');
            
                        var header = document.createElement('div');
                        var content = document.createElement('div');
                        var text = document.createElement('textarea');
                        var message = document.createElement('textarea');
                        var footer = document.createElement('div');
                        var ok = document.createElement('button');
                        var cancel = document.createElement('button');
            
                        dialogPanl.className = 'common-dialog-back';
                        dialog.className = 'common-dialog';
                        header.className = 'common-dialog-header';
                        content.className = 'common-dialog-content';
                        footer.className = 'common-dialog-footer';
                        dialogPanl.appendChild(dialog);
                        dialog.appendChild(header);
                        dialog.appendChild(content);
                        dialog.appendChild(footer);
                        content.appendChild(text);
                        footer.appendChild(cancel);
                        footer.appendChild(ok);
            
                        document.body.appendChild(dialogPanl);


                        header.innerHTML =  title;
                        text.value = 'update ';
                        ok.innerHTML = 'Ok';
                        cancel.innerHTML = 'Cancel';
                        text.onkeyup = function(e){
                            if(e.keyCode === 13 || (e.altKey || e.ctrlKey || e.shiftKey)){
                                document.body.removeChild(dialogPanl);
                                callback(text.value);
                            }
                        }
                        ok.onclick = function(){
                            document.body.removeChild(dialogPanl);
                            callback(text.value);
                        };
                        cancel.onclick = function(){
                            document.body.removeChild(dialogPanl);
                        };
                    }
                
                </script>
            </body>
        </html>
        `;
    }

    function isView(request) {
        var url = request.url.split('/').filter(function (i) { return !!i; }).shift() || '';
        var referer = request.headers.referer && request.headers.referer.split('?').shift().replace(/^(http|https):\/\//, '').replace(request.headers.host, '').split('/').filter(function (i) { return !!i; }).shift() || '';
        var dirs = fs.readdirSync(basePath.replace('/!replace', '')).map(function (i) { return i.toLocaleLowerCase(); });
        return  fs.existsSync(basePath.replace('/!replace', '')+url) || fs.existsSync(basePath.replace('/!replace', '')+referer);
    }

    function getFile(request, response) {
        var onlyUrl = request.url.split('?').shift();
        var referer = request.headers.referer && request.headers.referer.split('?').shift().replace(/^(http|https):\/\//, '').replace(request.headers.host, '') || '';
        var refererFirst = referer.split('/').filter(function (i) { return !!i; }).shift() || '^$';
        if (files[referer] && fs.existsSync(basePath.replace('/!replace', files[referer]) + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html'))) {
            return transverter(response, onlyUrl.split('.').pop(), (basePath.replace('/!replace', files[referer]) + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html')));
        } else if (fs.existsSync(basePath.replace('/!replace', refererFirst) + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html'))) {
            files[onlyUrl] = refererFirst;
            return transverter(response, onlyUrl.split('.').pop(), (basePath.replace('/!replace', refererFirst) + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html')));
        } else if (fs.existsSync(basePath.replace('/!replace', '') + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html'))) {
            files[onlyUrl] = onlyUrl.split('/').filter(function (i) { return !!i; }).shift() || '';
            return transverter(response, onlyUrl.split('.').pop(), (basePath.replace('/!replace', '') + onlyUrl + (/\.\S*/.test(onlyUrl) ? '' : '/index.html')));
        } else if(fs.existsSync(basePath.replace('/!replace', '') + onlyUrl)){
            return views(onlyUrl,'/index.html');
        }else{
            return '';
        }
    }

    function transverter(response, type, file) {
        if (types[type]) {
            response.setHeader("Content-Type", types[type]);
        }

        var data = fs.readFileSync(file);
        if(/tng-mobile\/.*\/index\.html/.test(file)){
            data = new Buffer(data.toString().replace('<body>','<body>\t<script src="../_dev/dev.js"></script>\n\t'));
        }

        if (type === 'svg') {
            return data;
        } else {
            return data;
        }
    }

})();