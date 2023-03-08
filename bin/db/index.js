var fs = require('fs');

var helper = require('./../helper');

module.exports = (function () {
    
    var getArguments = function (request) {
        var data = request.url.replace(/.*\/db\/+((?![\/\?]).)+\/*/, '').split('?').map(i=>decodeURIComponent(i));
        var table = data[0], condition = data[1] || '';
        //var [table, condition = ''] = request.url.replace(/.*\/db\/+((?![\/\?]).)+\/*/, '').split('?').map(i=>decodeURIComponent(i));
        return [table, condition?condition.split('&').map(i=>i.split('=')[0] + '=\''+i.split('=')[1]+'\'').join(' and ') : '1=1',condition.split('&').map(i=>i.split('='))];
    };

    return function (request, response = {}, database) {
        response.end = response.end || function(){};

        if(response.setHeader){
            response.setHeader("Content-Type", 'text/plain;charset=utf-8');
        }

        if(typeof request === 'string'){
            request = {method:'GET',url:'/db/' + request};
        }

        helper.getBodyData(request).then(bodyData => {
            var sqlType = /.*\/db\/+(((?![\/\?]).)+)/.exec(request.url);
           
            if(sqlType && sqlType[1].toLocaleLowerCase()){
                var dbFun = getDbFun(sqlType[1])(database);
                if(dbFun){
                    dbFun(getArguments, request, response, JSON.parse(bodyData.toString()||'{}'));
                }else{
                    return response.end(JSON.stringify({message:'没有对应的数据库'}));
                }
            }else{
                var sqlTypes = JSON.stringify(fs.readdirSync(__dirname).filter(i=>fs.statSync(__dirname+'/'+i).isDirectory()));
                response.setHeader('Content-Type', 'text/html;charset=utf-8');
                return response.end(fs.readFileSync(__dirname + '/index.html').toString().replace(/window.\$data = \{\}/,'window.$data = ' + sqlTypes));
            }
        });

    };

    function getDbFun(type){
        var item = fs.readdirSync(__dirname).filter(i=>i.toLocaleLowerCase()===type.toLocaleLowerCase()).pop();
        if(item){
            return require('./' + item);
        }else{
            return () => null;
        }
    }

})();