var fs = require('fs');
var proxy = require('../proxy');
var db = require('../db');
var helper = require('../helper');

module.exports = (function (){
  var captureDB ='./data/capture.db3';
  var URL_TO_TABLE ='url_to_table';
  // sql 的格式是 table ? condition
  var dbFunc = (sql, data) =>{
    var toLocaleLowerCase = obj => {
      var newObj ={};
      Object.keys(obj).forEach(key => newObj[key.toLocaleLowerCase()] = obj[key]);
      return newObj;
    }
    return new Promise(resolve =>{
      db({
        url: '/db/sqlite/'+ sql,
        method: data ? 'PUT':'GET',
        body: data
      },{
        end: res => resolve(JSON.parse(res).data.map(toLocaleLowerCase))
      }, captureDB);
    });
  };
  
  var getValue =(obj, path)=>{
    return helper.initModule('lodash').then(lodash =>{
      return lodash.get(obj, path) || [];
    })
  }
  
  var mockResponse = fn => ({
    setHeader: helper.nothingFn,
    writeHeader: helper.nothingFn,
    end: fn
  });
  
  var getTable =(data) => {
    return dbFunc(URL_TO_TABLE + '?url=' + data.url).then(function(tables){
      return tables.length ? tables : dbFunc(URL_TO_TABLE, data).then(()=> dbFunc(URL_TO_TABLE + '?url=' + data.url));
    }).then(items => items[0])
  }

  return function(request, response){
    helper.getBodyData(request).then(body =>{ 
      if(body && body.length){
        var bodyData = Object.assign({
          url: request.headers.api && request.headers.api.split('?').shift(),
          name: 'API' + Date.now(),
          path:'',
          info: '暂无说明'
        }, JSON.parse(body.toString()));

        // 查询API对应的table，如果没有就需要创建
        getTable(bodyData).then(function(table){
          proxy({request:Object.assign({api:bodyData.url},request.headers)}, mockResponse(res =>{
            getValue(res, table.PATH).then(data => Promise.all(data.map(item => dbFunc(table.NAME, item))).then(()=>response.end(JSON.stringify(data))));
          }));
        });
      }else{
        dbFunc(URL_TO_TABLE).then(tables => {
          response.end(helper.replaceContent(__dirname, fs.readFileSync(__dirname +'/index.html'), tables));
        });
      }
    })
  }
})();
