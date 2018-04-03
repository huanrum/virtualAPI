var fs = require('fs');

var sqlite = require('./sqlite');
var helper = require('./../helper');

module.exports = (function () {
    
    var getArguments = function (request) {
        var [table, condition = ''] = request.url.replace(/.*\/db\/+((?![\/\?]).)+\/*/, '').split('?').map(i=>decodeURIComponent(i));
        return [table, condition?condition.split('&').map(i=>i.split('=')[0] + '=\''+i.split('=')[1]+'\'').join(' and ') : '1=1'];
    };

    return function (request, response = {}) {
        response.end = response.end || function(){};

        if(response.setHeader){
            response.setHeader("Content-Type", 'text/plain;charset=utf-8');
        }

        helper.getBodyData(request).then(bodyData => {
            var sqlType = /.*\/db\/+(((?![\/\?]).)+)/.exec(request.url);
            switch(sqlType && sqlType[1].toLocaleLowerCase()){
                case null:
                    var sqlTypes = JSON.stringify(fs.readdirSync(__dirname).filter(i=>fs.statSync(__dirname+'/'+i).isDirectory()));
                    response.setHeader('Content-Type', 'text/html;charset=utf-8');
                    return response.end(fs.readFileSync(__dirname + '/index.html').toString().replace(/window.\$data = \{\}/,'window.$data = ' + sqlTypes));
                case 'sqlite':
                    return sqlite(getArguments, request, response, JSON.parse(bodyData.toString()||'{}'));
                default:
                    return response.end(JSON.stringify({message:'没有对应的数据库'}));
            }
        });

    };

})();