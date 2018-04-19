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

module.exports = (function () {

    return function (database) {
        var db = null;

        helper.initModule('mongodb').then(mongodb => {
            new mongodb.MongoClient("mongodb://" + helper.netInfo().address + ":27017/").on('error', e => {}).connect(function (error, client) {
                if (error) {
                    return;
                }
                db = client.db(database||'runoob');
            });
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
                var [table, condition, conditions] = getArguments(request);

                if (!table) {
                    db.listCollections().toArray(function (err, collection_list) {
                        response.end(JSON.stringify({
                            data: collection_list
                        }));
                    });
                } else {
                    var collection = db.collection(table);
                    bodyData = JSON.parse(JSON.stringify(bodyData).replace(/\[IP\]/gi, helper.getClientIp(request)) || '{}') || {};
                    collection.find().toArray(function (error, list) {
                        var conditionObj = {};
                        list.forEach(it => Object.keys(it).forEach(key => {
                            var val = conditions.filter(kv => kv[0].toLocaleLowerCase() === key.toLocaleLowerCase()).pop();
                            if (val) {
                                conditionObj[key] = val[1];
                            }
                        }));

                        switch (request.method) {
                            case 'GET':
                                collection.find(conditionObj).toArray(function (error, req) {
                                    response.end(JSON.stringify({
                                        data: req
                                    }));
                                });
                                break;
                            case 'POST':
                                collection.update(conditionObj, extendObject(bodyData, {})).then(req => response.end(JSON.stringify(req)));
                                break;
                            case 'PUT':
                                collection.insert(extendObject(bodyData, {})).then(req => response.end(JSON.stringify(req)));
                                break;
                            case 'DELETE':
                                collection.remove(conditionObj).then(req => response.end(JSON.stringify(req)));
                                break;
                        }
                    });
                }

            }
        };
    }

})();