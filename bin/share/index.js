var fs = require('fs');
var path = require('path');
var helper = require('./../helper');

module.exports = (function(){
  return function(request,response){
    if(request.method  ==='GET'){
      response.setHeader('Content-Type','text/html;charset=utf-8');
      response.end(helper.replaceContent(__dirname, fs.readFileSync(__dirname + '/index.html').toString()));
    }else{
      var file = path.join(__dirname + '/../../data/'+ request.url.replace(/[\\\/]+$/,'').replace(/^\/*shares\/+/,'/share/') + '.txt');
      helper.mkdirs(path.dirname(file));
      helper.getResponse(request).then(bodyData=>{
        if(!bodyData.length){
          response.setHeader('Content-Type','text/plain;charset=utf-8');
          response.end(fs.existsSync(file)?fs.readFileSync(file).toString():'');
        }else{
          fs.writeFileSync(file, bodyData.toString());
          response.end('true');
        }
      });
    }
  };

})();