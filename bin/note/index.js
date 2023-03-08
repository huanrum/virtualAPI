var fs = require('fs');
var path = require('path');
var helper = require('./../helper');

module.exports =(function(){
  var getBasedir = function(url){
    var base = url.split(/[\\\/]/).filter(Boolean).shift();
    var backdir = getBackdir(url.split(/[\\\/]/).filter(Boolean)[1]);
    if(backdir){
      return path.join(backdir,'data', base);
    }
    var dir = path.join(__dirname + '/../../data/', base);
    helper.mkdirs(dir);
    return dir +'/';
  };
    
  var getBackdir = function(rex){
    var regex = new RegExp('\\\\+'+ rex +'$','i');
    return helper.backdirs && helper.backdirs.filter(i => regex.test(i)).pop()
  };
    
  return function(request,response){ 
    var url = decodeURIComponent(request.url.split('?').shift().replace(/\/note[^/]*\/*/,''));
    if(!url || getBackdir(url)){
      helper.getResponse(request).then(bodyData =>{
        if(!bodyData.length){
          response.setHeader('Content-Type','text/html;charset=utf-8');
          view(request).then(data=>response.end(data));
        }else{
          update(request, helper.parameters(request),bodyData.toString()).then(data=>response.end(data));
        }
      });
    }else{
      var backdir = getBackdir(url.split(/[\\\/]/).filter(Boolean).shift());
      var file = path.join(getBasedir(request.url), url.replace(backdir && backdir.split(/[\\\/]/).filter(Boolean).pop(), ''));
      helper.mkdirs(path.dirname(file));
      helper.getResponse(request).then(bodyData=>{
        if(!bodyData.length){
          if(/document/.test(request.headers['sec-fetch-dest'])){
            response.end(share(file));
          }else{
            readNote(helper.parameters(request), file).then(data=>response.end(data));
          }
        }else{
          writeNote(helper.parameters(request), file, bodyData.toString()).then(data=>response.end(data));
        }
      });
    }
  };

  function share(file){
    var html = fs.readFileSync(__dirname +'/../share/index.html').toString();
    try{
      var data = JSON.parse(helper.readFile(file +'.json'));
      return helper.replaceContent(__dirname,html,data);
    }catch(e){
      return helper.replaceContent(__dirname,html,`36[${e.message}]`);
    }
  }
  
  function view(request){
    var base = request.url.split(/[\\\/]/).filter(Boolean).shift();
    var userdir = /c:\\Users\\((?!\\).)+\\/i.test(__dirname) ? /c:\\Users\\((?!\\).)+\\/i.exec(__dirname)[0] : '';
    var files = {};
    fs.readdirSync(getBasedir(request.url)).forEach(f=>files[f.replace(/\.json$/,'')]=true);
    return new Promise(function(resovle){
      var content = helper.replaceContent(__dirname,fs.readFileSync(__dirname+'/index.html').toString(),{
        list: Object.keys(files),
        backdirs: helper.backdirs.map(i=>i.split(/[\\\/]/).filter(Boolean).pop()).filter(i=>fs.existsSync(getBasedir(base + '/' + i))),
        userdir: userdir
      });
      resovle(content);
    });
  }
  
  function writeNote(parameters,file,body){
    try{body = JSON.parse(body);}catch(e){}
    return new Promise(function(resove){ 
      Object.keys(body).forEach(f=>{
        if(!body[f]){
          // delete file
        }else if(body[f].length > 50){
          helper.mkdirs(file);
          fs.writeFileSync(file + '/' + f + '.txt', body[f]);
          delete body[f];
        }
      })
      fs.writeFileSync(file + '.json', JSON.stringify(body));
      resove('true');
    });
  }

  function readNote(parameters,file){
    return new Promise(function(resove){
      var data = JSON.parse(helper.readFile(file +'.json')) || {};
      if (fs.existsSync(file)){
        fs.readdirSync(file).forEach(f=>{
          data[f.replace(/\.((?!\/).)+/,'')] = fs.readFileSync(file + '/' + f).toString();
        });
      }
      resove(JSON.stringify(data));
    });
  }

  function update(request, parameters,bodyData){
    var basedir = getBasedir(request.url);
    try{bodyData = JSON.parse(bodyData);}catch(e){}
    return new Promise(function(resove){
      var dataFrom = JSON.parse(helper.readFile(path.join(basedir, bodyData.from) + '.json')) || {};
      var dataTo = JSON.parse(helper.readFile(path.join(basedir, bodyData.to) + '.json')) || {};
      if(dataFrom[bodyData.data]){
        dataTo[bodyData.data]= dataFrom[bodyData.data];
        delete dataFrom[bodyData.data];
        fs.writeFileSync(path.join(basedir, bodyData.from)+'.json', JSON.stringify(dataFrom));
        fs.writeFileSync(path.join(basedir, bodyData.to)+'.json', JSON.stringify(dataTo));
        resove();
      }else{
        helper.mkdirs(path.join(basedir, bodyData.to));
        fs.renameSync(path.join(basedir, bodyData.from, bodyData.data)+'.txt', path.join(basedir, bodyData.to, bodyData.data) + '.txt');
        resove();
      }
    });
  }

})();