
var request = require('./request');
var views = require('./views');
var action = require('./action');


module.exports =  function (configFn, helper){
    
    configFn('api', __dirname + '/config');

    configFn('proxy',request);

    configFn('action',action);

    
    configFn('views',{
        path: helper.config(__dirname + '/../../views/tng-mobile/'),
        fn:views,
        files:[
            '/commonGZ/js/language.js',
            '/commonGZ/js/components.js',
            '/commonGZ/js/wal_ca.js'
        ]
    });


};

