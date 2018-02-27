
var request = require('./request');
var views = require('./views');
var action = require('./action');


module.exports =  function (configFn, helper){
    
    configFn('api', __dirname + '/config');

    configFn('proxy',request);

    configFn('action',action);

    configFn('views',views);
};

