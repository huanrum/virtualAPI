var fs = require('fs');
var path = require('path');
var proxy = require('./../../proxy');
var helper = require('./../../helper');


module.exports = {
    "path": function(data, parameters, bodyData, request){
        return path.dirname(helper.config(parameters.referer));
    },
    "[POST](4)api": function(data, parameters, bodyData, request){
        return bodyData.length || 0;
    },
    "websocket": function(data, parameters, bodyData, request){
        parameters.wss = /https:/.test(parameters.referer || request.protocol);
        parameters.protocol = parameters.wss?'wss':'ws';
        parameters.portadd = parameters.wss?'10000':'0';
        return data;
    },
    "javascript": function(data, parameters, bodyData, request){
        var scripts = [];
        var content = helper.replaceContent(__dirname, [
            '<!--html>../../compatible/native.html</html-->'
        ].join('\n'),{}).replace(/(<script(((?!>).)*)>(((?!<script)[\s\S])*)<\/script>)/igm,function($0,$1,$2,$3,$4){
            scripts.push('//' + $2 + ' localhost-javascript-{' + (scripts.length + 1) + '} \n' + $4);
            return '<!--lj-- ' + $2 + '>localhost-javascript-{' + (scripts.length) + '}</!--lj-->'
        });
        request.html = true;
        return [
            '(function(){',
            '   var js = document.createElement(\'div\');',
            '   js.id = \'localhost-javascript\';',
            '   js.style.display = \'none\';',
            '   js.innerHTML = `' + content.replace(/`/g, '\\`') + '`;',
            '   document.body.appendChild(js);',
                scripts.join('\n'),
            '})()'
        ].join('\n');
    },
    "[POST](file:file)upload": function (data, parameters, bodyData, request) {
        helper.mkdirs(__dirname + "/../../../uploads");
        if (/multipart\/form-data/.test(request.headers['content-type'])) {
            helper.upload(request, __dirname + "/../../../uploads");
            return {
                message: '上传文件'
            };
        } else if(bodyData.file){
            var file = bodyData.file.split(',').shift();
            var content = bodyData.file.split(',').pop();
            fs.writeFile(__dirname + "/../../../uploads/" + file, new Buffer(content, 'base64'));
            return {
                message: '上传文件'
            };
        }else{
            return data;
        }
    },
    "upload": function(data, parameters, bodyData, request, response){
        return fs.readdirSync(__dirname + "/../../../uploads/");
    },
    "upload/:file": function(data, parameters, bodyData, request, response){
        if(!parameters.file){
            return fs.readdirSync(__dirname + "/../../../uploads/");
        }
        var tempdir = __dirname + "/../../../uploads/" + parameters.file.replace(/\./g, '-');
        var file = __dirname + "/../../../uploads/" + (parameters.path || '') + parameters.file;
        if(!+parameters.part){
            helper.rmfile(file);
            helper.rmdirs(tempdir);
            helper.mkdirs(tempdir);
        }

        fs.writeFileSync(tempdir + '/' + parameters.part + '.temp', bodyData);

        //合并文件
        if(Math.ceil(parameters.total/parameters.size) === fs.readdirSync(tempdir).length){
            try{
                var content = fs.readdirSync(tempdir).sort(function(a,b){return parseInt(a)-parseInt(b);}).map(function(i){
                    return fs.readFileSync(tempdir + '/' + i).toString();
                }).join('');
                fs.writeFileSync(file, new Buffer(content, 'base64'));
                helper.rmdirs(tempdir);
                return 'done';
            }catch(e){
                return e;
            }
        }
        return 'uploading';
    },
    "download/:file": function(data, parameters, bodyData, request, response){
        var domain = request.headers.referer.split('//').pop().split('/').shift().replace(/[\.:]/g,'-');
        var filePath = __dirname + "/../../../downloads/" + domain + '/' + parameters.file;

        helper.mkdirs(__dirname + "/../../../downloads/" + domain);
        if(bodyData.length){
            fs.writeFileSync(filePath, bodyData, 'utf-8');
            return 'true';
        }else{
            setTimeout(function(){
                setTimeout(() => fs.unlinkSync(filePath), 1000*60*15);
                response.writeHead(200,{
                    "Content-Type": "application/octet-stream;charset=utf-8",
                    "Content-Disposition": "attachment;filename=" + parameters.file
                });
                response.end(fs.readFileSync(filePath, 'utf-8'), 'utf-8');
            });
        }
    },
    "media/:id:type": function(data, parameters, bodyData, request){
        return data;
    }
};