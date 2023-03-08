var fs = require('fs');
var path = require('path');
var helper = require('../../helper');

module.exports = {
  npmlink: npmlink
};

function npmlink(cmd, dir, messageFn, links){
  var json = fs.readFileSync(dir +'/package.json').toString();
  var modules = Object.assign({},JSON.parse(json).dependencies,JSON.parse(json).devDependencies);
  
  helper.runthread(links,function(md,callback){
    var moduleurl = modules[md].replace('git+','').split('#');

    if(fs.existsSync(dir +'/../'+ md) && fs.readdirSync(dir +'/../'+ md).length){
      //依赖的代码更新了或原来没有npm-link的
      if(gettag(dir +'/../'+ md) !== moduleurl[1] || !fs.existsSync(dir +'/node_modules/' + md + '/.git')){
        cmd(dir +'/../', messageFn, md,'git checkout '+ moduleurl[1],function(){
          link(md,callback);
        });
      } else {
        callback();
      }
    } else {
      helper.rmdirs(dir +'/../'+ md);
      //拉取代码做npm-link
      cmd(dir +'/../', messageFn,'','git clone '+ moduleurl[0],function(){
        cmd(dir +'/../', messageFn, md,'git checkout '+ moduleurl[1],function(){
          cmd(dir +'/../', messageFn, md,'npm link',function(){
            link(md,callback);
            cmd(dir +'/../', messageFn, md,'git checkout .');
          });
        })
      });
    }
  },10).then(function(){
    messageFn('!!link done')
  });

  function gettag(moduledir){
    try {
      var version = fs.readFileSync(moduledir +'/.git/HEAD').toString().replace(/[\r\n\s]/g,'');
      return fs.readFileSync(moduledir +'/.git/packed-refs').toString().split(/[\t\n]/).filter(function(lv){
        return lv.indexOf(version) !== -1;
      }).map(function(i){return i.split(/[\s\/\\]/).pop();}).pop();
    }catch(e){
      return '';
    }
  }
  
  function link(md,callback){
    new Promise(function(succ){ 
      if(fs.existsSync(dir + '/node_modules/'+ md)){
        if(fs.existsSync(dir +'/node_modules/'+ md +'/.git')){
          cmd(dir,messageFn,'','npm unlink '+ md,function(){
            helper.rmdirs(dir +'/node_modules/'+ md);
            succ();
          });
        }else{
          helper.rmdirs(dir +'/node_modules/'+ md);
          succ();
        }
      }else{
        succ();
      }
    }).then(function(){
      cmd(dir,messageFn,'','npm link '+ md,function(){
        callback(true);
      });
    });
  }
}