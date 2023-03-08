
var fs = require('fs');

var helper = require('./../helper');
var db = require('./../db');

module.exports = (function(){
  return function(request, response){
    if(!request.client){
      db({url:'/db/sqlite/web_tagging',method:'PUT',body:request},{end:i=>i})
    } else{
      helper.getBodyData(request).then(bodyData =>{
        if(!bodyData || !bodyData.length){
          db({url:'/db/sqlite/web_tagging',method:'==',body:{}},{end:fields=>{
            var contentReplace = helper.replaceContent(__dirname +'/../compatible/',fs.readFileSync(__dirname + '/../compatible/native.html').toString());
            var content = helper.replaceHtml(fs.readFileSync(__dirname + '/index.html').toString(), contentReplace)
            var data = (parseData(fields).data || []).slice(1,-6).map(i=>i.name)
            response.end(helper.replaceContent(__dirname,content,data));
          }});
        }else{
          db({url:'/db/sqlite/web_tagging',method:'GET',body:JSON.parse(bodyData.toString())},response);
        }
      });
    }
  }

  function parseData(data){
    try{
      return JSON.parse(data) || {};
    } catch(e){
      return {};
    }
  }

})();