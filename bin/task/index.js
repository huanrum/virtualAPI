var fs = require('fs');
var path = require('path');
var dbHelper = require('./db');

var helper = require('./../helper');

var imgspath = path.join(__dirname + '/../../files/task/');

helper.mkdirs(imgspath);

module.exports = function (request, response) {
    var url = request.url.replace(/^\/task\/*/, '');
    helper.getBodyData(request).then(function(bodyData){
        bodyData = JSON.parse(bodyData.toString()||'null');
        if(!bodyData){
            dbHelper(s=>response.end(s), dbSql => {
                if(/^\d*$/.test(url)){
                    dbSql.all('select id,description,value,status,insertdate from TaskList where parent=\'' + (url||'') + '\' order by insertdate desc', (err, req) => {
                        var data = (req||[]).map(dbHelper.toLocaleLowerCase);
                        var content = fs.readFileSync(__dirname + '/index.html').toString();
                        content = helper.replaceContent(__dirname + '/', content, data);
                        response.end(content);
                    });
                }else{
                    dbHelper(s=>response.end(s),dbSql=>{
                        dbSql.all('select id,file from TaskFile where id=\'' + (url.split('/').slice(-2,-1).pop()) + '\'', (err, req) => {
                            var file = dbHelper.toLocaleLowerCase(req&&req[0]||{});
                            if(fs.existsSync(imgspath + file.file)){
                                response.setHeader("Content-Type", file.type || 'text/plain;charset=utf-8');
                                response.end(fs.readFileSync(imgspath + file.file));
                            }else{
                                response.end('');
                            }
                        });
                    })
                }
            })
        }else if(request.method === 'POST'){
            bodyData = Object.assign({parent:url,description:'此数据不可用',value:'',status:1},bodyData);
            if(bodyData.id){
                dbHelper(s=>response.end(s),dbSql=>{
                    dbHelper.updateList(dbSql,'TaskList',[bodyData]).then(req=>{
                        dbSql.all('select id,description,value,status,insertdate from TaskList where id=\'' + bodyData.id + '\' order by insertdate desc', (err, req) => {
                            response.end(JSON.stringify(dbHelper.toLocaleLowerCase(req[0])));
                            helper.websocket({type:'task',data:dbHelper.toLocaleLowerCase(req[0])});
                        });
                    });
                });
            }else{
                dbHelper(s=>response.end(s),dbSql=>{
                    dbHelper.insertList(dbSql,'TaskList',[bodyData]).then(maxid=>{
                        dbSql.all('select id,description,value,status,insertdate from TaskList where id=\'' + (maxid+1) + '\' order by insertdate desc', (err, req) => {
                            response.end(JSON.stringify(dbHelper.toLocaleLowerCase(req[0])));
                            helper.websocket({type:'task',data:dbHelper.toLocaleLowerCase(req[0])});
                        });
                    });
                })
            }
        }else{
            var file = Date.now() + '-' + bodyData.name;
            var binaryData = new Buffer(bodyData.content.replace(/^data:\S+;base64,/,""),'base64');
            fs.writeFileSync(imgspath + file,binaryData);
            dbHelper(s=>response.end(s),dbSql=>{
                dbHelper.insertList(dbSql,'TaskFile',[{name:bodyData.name,file:file,type:/^data:(\S+);base64,/.exec(bodyData.content)[1]}]).then(maxid=>{
                    dbSql.all('select id,name,file from TaskFile where id=\'' + (maxid+1) + '\'', (err, req) => {
                        response.end(JSON.stringify(dbHelper.toLocaleLowerCase(req[0])));
                    });
                });
            })
        }
    })
}