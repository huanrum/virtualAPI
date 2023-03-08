var fs = require('fs');
var path = require('path');
var helper = require('./../helper');
var cmd = require('./../action/cmd');

module.exports = (function(){ 
  var author = i=>i&&(/(Merge pull request #|Merge branch)/.test(i)?false:/(seto|44127791)/.test(i));
  var editWebs = [];
  var basedir = path.join(__dirname + '/../../data/work/');
  var gitfile = path.join(basedir,'git.txt');
  var file = path.join(basedir,'index.json');
  var userDir = findRoot(__dirname); //当前用户文件夹

  helper.mkdirs(basedir);

  if(!fs.existsSync(file)){
    fs.writeFileSync(file, JSON.stringify({}));
  }
  if(fs.existsSync(gitfile) &&(new Date()- fs.statSync(gitfile).ctime < 1000*3600*24 * 7)){
    editWebs = fs.readFileSync(gitfile).toString().split(/[\r\n]/).filter(i=>!!i);
  }
  
  /**
   * 每隔10分钟检测一次是否过期，过期时间为7天
   */
  setInterval(()=> {
    if(fs.existsSync(gitfile)){
      if(new Date()- fs.statSync(gitfile).ctime > 1000*3600*24 * 7){
        editWebs = [];
        fs.writeFileSync(gitfile,'');
      }
    }
  },1000*60*10);

  return function(request,response){
    var date = request.url.split('?').shift().replace(/\/works?\/*/,'');
    var isNotCommit = !/\/work[^\/]+\/*/.test(request.url);
    if(!date || !/^\d+(\-\d+)+$/.test(date)){
      view(file, date, isNotCommit).then(data=>response.end(data));
    }else if(date === 'true'){
      editWebs =[];
      getWork(isNotCommit).then(()=>response.end('true'));
    }else {
      helper.getResponse(request).then(bodyData=>{
        if(!bodyData.length){
          getWork(isNotCommit).then(data=>response.end(JSON.stringify(data[date], null, 2)));
        }else{
          write(helper.parameters(request),file,date,bodyData.toString()).then(data=>response.end(data));
        }
      });
    }
  };

  function view(file, last, isNotCommit){
    return new Promise(function(resovle){
      var data ={},readDate = JSON.parse(fs.readFileSync(file).toString());
      getWork(isNotCommit).then(function(logs){
        if(!isNotCommit){
          var regex = new RegExp((last || '.*').replace(/\//,'\\\/'),'i');
          data.log = {};
          Object.keys(logs).filter(i=>regex.test(i)).forEach(k=>data.log[k]=logs[k]);
        }else{
          var days = (/^\d{8}$/.test(last)?getDays(last):(+last)) || 10;
          Array(Math.min(days, 10000)).fill(true).forEach(function(v, i){
            var date = new Date(new Date().setDate(new Date().getDate() - i)).toLocaleDateString();
            data[date] = {
              plan: readDate[date],
              log: logs[date]
            };
          });
        }
        resovle(helper.replaceContent(__dirname, fs.readFileSync(__dirname + '/index.html').toString(), data));
      });
    });

    function getDays(startDay){
      var start = new Date(+startDay.slice(0,4),+startDay.slice(4,6)-1,+startDay.slice(6,8),0,0,0,0);
      return Math.ceil((Date.now()- start)/(24 * 3600 * 1000));
    }
  }

  function write(parameters,file,date,body){
    return new Promise(function(resove){
      var data = JSON.parse(fs.readFileSync(file).toString());
      data[date] = body;
      fs.writeFileSync(file, JSON.stringify(data));
      resove('true');
    });
  }

  function findRoot(dir){
    var parent = path.dirname(dir);
    if(parent !== dir && path.basename(parent).toLocaleLowerCase() !== 'users'){
      return findRoot(parent);
    }
    return dir;
  }

  function getGits(){
    var lv0Ignored = (d,l) => !l && /^(AppData)$/i.test(d);
    return (function get(dir,level=0){
      var dirs = fs.readdirSync(path.join(dir));
      return Array.prototype.concat.apply([],dirs.map(d=>{
        try{
          if(fs.statSync(path.join(dir,d)).isDirectory()){
            if(fs.existsSync(path.join(dir,d,'.git'))){
              return [path.join(dir,d).replace(userDir,'').replace(/^[\\\/]+/,'')];
            }else if(level<15 && !/^(\.|__back)/.test(d) && !lv0Ignored(d,level)){
              return get(path.join(dir,d),level + Math.ceil(dirs.length/10));
            }
          }
        }catch(e){}
        return [];
      }));
  })(userDir);
}

function getWork(commitNotStatus){
  var result = {};
  var webs = editWebs;
  var cmdAction = commitNotStatus ? commit : statue;
  if(!webs.length){
    webs = getGits();
  }
  return new Promise(function(resovle){
    Promise.all(webs.map(cmdAction)).then(function(){
      if(!editWebs.length){
        editWebs = Object.keys(editWebs);
        fs.writeFileSync(gitfile, editWebs.join('\n'));
      }
      helper.console('work:-> get all commits done');
      resovle(result);
    });
  });
  
  function commit(web){
    return new Promise(function(resolve){
      cmd(userDir,i=>i, web,'git log --pretty=[%cd][%cn]%s', false, function(message){
        message.split(/[\r\n]/).filter(i=>i&&author(i)).forEach(i=>{
          var date = new Date(/\[(((?!\]).)*)\]/.exec(i)[1]).toLocaleDateString();
          var time = new Date(/\[(((?!\]).)*)\]/.exec(i)[1]).toLocaleTimeString()
          result[date]= result[date] || {};
          result[date][web] = result[date][web] || [];
          result[date][web].push('[' + time + ']' + i.replace(/\[((?!\]).)*\]/g, ''));
          if(webs.length !== editWebs.length || !editWebs.length){
            editWebs[web] = true;
          }
        });
        resolve(true);
      });
    });
  }
  
  function statue(web){
    return new Promise(function(resolve){ 
      cmd(userDir,i=>i, web,'git status', false, function(message){
        message.split(/[\r\n]/).filter(i=>i&&/^\s*[a-z]+:\s*/.test(i)).forEach(i=>{
          result[web] = result[web] || [];
          result[web].push(i);
          if(webs.length !== editWebs.length || !editWebs.length){
            editWebs[web] = true;
          }
        });
        resolve(true);
      });
    })
  }
}

})();

