
setTimeout(()=>require('./bin/db')({method:'PUT',url:'/db/sqlite/START_INFO',body:{name:Date.now(),info:'打开服务的时间'}}),2000);

require('./bin')({
    debug:true,
    kill:false,
    backup:true,
    port:process.argv[2] || 8888,
    websocket:8844 + Math.floor(Math.random()*44),
    weinre:8800 + Math.floor(Math.random()*44),
    exclude:i=>/career/.test(i)
});
