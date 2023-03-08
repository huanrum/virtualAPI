var fs = require('fs');
var path = require('path');
var helper = require('../../helper');

module.exports =(function(){

  var userDir = (function findRoot(dir){
    var parent = path.dirname(dir);
    if(parent !== dir && path.basename(parent).toLocaleLowerCase() !== 'users'){
      return findRoot(parent);
    }
    return dir;
  })(__dirname);
  
  return function (request, response){
    if(!helper.localhost(request)){
      return response.end('只有local才可以获取');
    }
    switch(request.url.replace(/\/*[^/]+\/secrecy\/*/,'')){
      case '':
        response.end(JSON.stringify(acountPassword()));
        break;
      case 'helper':
        response.end('window.$secrecy ='+ helper.secrecy.toString());
        break;
      case 'chinasoftinc':
        response.end(JSON.stringify(chinasoftinc()));
        break;
      default:
          response.end('wating develop');
          break;
    }
  };
  
  function acountPassword(){
    var gitconfig = fs.readFileSync(userDir +'/.gitconfig').toString();
    var data = {};
    gitconfig.split(/[\r\n]/).filter(i=>i&&/=/.test(i)).forEach(s =>{
      var kv = s.replace(/^\s+/,'').replace(/\s+$/,'').split('=');
      data[kv[0].trim()]= helper.secrecy(kv[1] && kv[1].trim());
    });
    return data;
  }
  
  function chinasoftinc(){
    return JSON.parse(fs.readFileSync(__dirname + '/../../../data/chinasoftinc.json'));
  }

})();