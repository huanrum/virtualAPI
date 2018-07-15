var helper = require('../../../bin/helper');


module.exports = (function(){
    var db = null;

    helper.initModule('sqlite3').then(sqlite3 => {
        var _db = new sqlite3.Database(__dirname + '/../../../data/task.db3', function (err,d) {
            db = _db;
        });
        
    });

    return Object.assign(dbHelper,{insertList:insertList,updateList:updateList,toLocaleLowerCase:toLocaleLowerCase});
    
    function dbHelper(resolve,runFn){
        if(db){
            runFn(db);
        }else{
            resolve('Wait a moment, Sqlite loading ...');
        }
        
    };
    
    function insertList(dbSql,table,list){
        var extendObj = {
            id:0,
            islive: 1,
            version: 1,
            insertby: 1,
            insertdate: new Date().toLocaleString().replace(/\d+/g, i => (i.length < 2 ? '0' : '') + i)
        };
        var field = {};
        list.forEach(item=>{
            Object.assign(item,extendObj);
            Object.keys(item).forEach(f=>{
                field[f] = typeof item[f];
            });
        });
        return new Promise(resolve=>{
            dbSql.run(`create table if not exists ${table} (${Object.keys(field).map(i=>i + (/id/.test(i)?' INT':' NVARCHAR')).join()});`.toLocaleUpperCase(),{},function(){
                dbSql.get(`select max(id) as maxid from ${table}`,{},function(error,data){
                    var sqls =  list.map((item,index)=>{
                        item.id = (+data.maxid || 0) + 1 + index;
                        return `insert into ${table} (${Object.keys(item)}) values (${Object.values(item).map(i=>'\'i\''.replace('i',i))});`;
                    });
                    Promise.all(sqls.map(sql=>new Promise(succ=>dbSql.run(sql,succ)))).then(()=>resolve((+data.maxid || 0)));
                });
            });
        });
    }
    
    function updateList(dbSql,table,list){
        return new Promise(resolve=>{
            var sqls =  list.map((item)=>{
                return `update ${table} set ${Object.keys(item).map(k=>(k+'=\''+item[k]+'\''))} where id=${item.id};`;
            });
            Promise.all(sqls.map(sql=>new Promise(succ=>dbSql.run(sql,succ)))).then(resolve);
        });
    }

    function toLocaleLowerCase(item){
        var result = {};
        Object.keys(item).forEach(k=>{
            result[k.toLocaleLowerCase()]=getValue(item[k]);
        });
        return result;

        function getValue(value){
            if(value && /^\d*\.?\d*$/.test(value)){
                return +value;
            }else if(/^(true|false|null)$/.test(value)){
                return JSON.parse(value);
            }else{
                return value;
            }
        }
    }
})();