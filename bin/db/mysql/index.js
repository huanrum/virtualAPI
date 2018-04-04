var helper = require('./../../helper');


function extendObject(bodyData, extend) {
    return Object.assign(bodyData, {
        islive: 1,
        version: 1,
        insertby: 1,
        insertdate: new Date().toLocaleString().replace(/\d+/g, i => (i.length < 2 ? '0' : '') + i)
    }, extend);
}

function transverterValue(value) {
    switch (Object.prototype.toString.call(value)) {
        case '[object String]':
            return '\'' + value + '\'';
        case '[object Object]':
            return '\'' + JSON.stringify(value) + '\'';
        default:
            return value;
    }
}

module.exports = (function(){
    var db = null;
    helper.initModule('mysql').then(mysql => {
        // db = mysql.createConnection({
        //     host     : 'localhost',
        //     user     : 'root',
        //     password : '123456',
        //     database : 'test'
        // });
        // db.on('error',e=>{}).connect();
    });

    return function run(getArguments, request, response, bodyData, count = 3) {
        if (!db) {
            if (count) {
                setTimeout(() => {
                    run(getArguments, request, response, bodyData, count - 1);
                }, 1000);
            } else {
                response.end('Wait a moment, Mongodb loading ...');
            }
        } else {
            var [table, condition] = getArguments(request);
            if (!table) {
                db.query(`select * from sqlite_master where ${condition}`, {}, 'all').then((res) => {
                    response.end(JSON.stringify(res));
                });
            } else {
                bodyData = JSON.parse(JSON.stringify(bodyData).replace(/\[IP\]/gi, helper.getClientIp(request)) || '{}') || {};;
                switch (request.method) {
                    case 'GET':
                        db.query(`select * from ${table} where ${condition}`, {}, 'all').then((res) => {
                            response.end(JSON.stringify(res));
                        });
                        break;
                    case 'POST':
                        var update = Object.keys(bodyData).map(i => i + '=\'' + bodyData[i] + '\'').join(' and ');
                        db.query(`update ${table} set ${update} where ${condition}`, {}, 'all').then((res) => {
                            response.end(JSON.stringify(res));
                        });
                        break;
                    case 'PUT':
                        db.query(`select max(id) from ${table}`, {}, 'all').then((res) => {
                            var insert = extendObject(bodyData, {
                                id: res.data[0]['max(id)'] + 1
                            });
                            db.query(`insert into ${table} (${Object.keys(insert).join()}) values (${Object.values(insert).map(transverterValue).join()})`, {}, 'all').then((res) => {
                                response.end(JSON.stringify(res));
                            });
                        });
                        break;
                    case 'DELETE':
                        db.query(`delete * from ${table} where ${condition}`, {}, 'all').then((res) => {
                            response.end(JSON.stringify(res));
                        });
                        break;
                }
            }

        }
    };

})();