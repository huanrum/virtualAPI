var fs = require("fs");
var path = require('path');
var helper = require('../helper');
var utils = require('./utils');

module.exports =(function logon(){
  var file = __dirname +'/../../data/logon.json';
  helper.mkdirs(path.dirname(file));
  
  return function (request, response){
    var clientIp = (/\d+(\.\d+){3}/.exec(helper.clientIp(request)) || ['127.0.0.1'])[0];
    var data = JSON.parse(helper.readFile(file).toString()) || {};
    if(!response){
      return data[clientIp];
    } else {
      if(request.headers['sec-fetch-dest'] === 'document'){
        response.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
        utils.all(request).then(d => response.end(views(helper.localhost(request) ? d : [], data[clientIp]?'':clientIp)))
      } else if(helper.config(request.headers.referer) === __dirname){
        response.writeHead(200,{'Content-Type':'text/plan;charset=utf-8'});
        utils.logout(request).then(d => response.end(JSON.stringify(d)))
      } else {
        login(request, clientIp).then(function(){
          response.writeHead(200,{'Content-Type':'text/plan;charset=utf-8'});
          utils.logon(request).then(d => response.end(JSON.stringify(d)));
        }, function(){
          response.writeHead(401,{'Content-Type':'text/plan;charset=utf-8'});
          response.end(JSON.stringify({
            message: 'Login failed, please contact the administrator'
          }))
        })
      }
    }
  };

  function login(request, clientIp){
    var parameters = helper.parameters(request);
    var netInfo = helper.netInfo();
    return new Promise(function(resolve, reject){
      if(helper.hostname() === parameters.answer || parameters.answer === netInfo.address){
        var data = JSON.parse(helper.readFile(file).toString())|| {};
        data[clientIp] = parameters.username || clientIp;
        fs.writeFileSync(file, JSON.stringify(data, null, 4));
        resolve();
      } else {
        reject();
      }
    });
  }
    
  function views(logins, clientIp){
    const content = fs.readFileSync(__dirname + '/index.html')
    return helper.replaceContent(__dirname,content,{logins: logins || [], ip: clientIp});
  }

})();