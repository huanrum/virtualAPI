require('./bin/db')({method:'PUT',url:'/db/sqlite/START_INFO',body:{name:Date.now(),info:'打开服务的时间'}});

require('./bin')({
    debug:true,
    kill:false,
    port:8888,
    websocket:8889,
    weinre:8887
});

