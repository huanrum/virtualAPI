var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var helper = require('./../../helper');

module.exports = {
  "io/:filename":function (data,parameters,bodyData){
    var file = path.join(__dirname +'/../../../data/mix/' + parameters.filename);
    helper.mkdirs(path.dirname(file));
    if(Object.keys(bodyData).length){
      helper.writeFile(file, bodyData);
      return data;
    } else {
      return helper.readFile(file);
    }
  },
  "io":function (data,parameters,bodyData,request,response){
    if(!helper.localhost(request)){
      response.writeHead(403,{'Content-Type':'text/html;charset=utf-8'});
      response.end(helper[403]({},'只有服务器同机可以访问'));
    }else if(!('dir'in parameters)){
      response.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
      response.end(helper.replaceContent(__dirname,`
        <body>
          <!--html>style.html</html-->
          <!--html>/../../compatible/native.html</html-->
          <!--html>/../../compatible/dialog.html</html-->
          <!--html>/../../compatible/drag.html</html-->
          <button onclick="onSelectDialog()">Click Me</button>
          <script>
            function onSelectDialog(){
              selectDialog().then(function(file){alert(file);});
            }
          </script>
        </body>
      `));
    } else {
      response.setHeader('Content-Type','text/html;charset=utf-8');
      return new Promise(succ=>{
        if(!parameters.dir){
          child_process.exec('wmic logicaldisk where drivetype=3 get deviceid',(error,stdout)=>{
            var pans = {};
            stdout.split(/[\r\n]/).forEach(i=>{
              if(!!i&&/:\s*$/.test(i)&&fs.existsSync(i.trim()+'\\'))pans[i.trim()] = fs.statSync(i.trim()+'\\');
            });
            succ(pans);
          });
        }else{
        var dir = parameters.dir.replace(/\\/i, '\\\\');
        if(fs.existsSync(dir)){
          if(fs.statSync(dir).isDirectory()){
            var dirs = {};
            fs.readdirSync(dir + '\\').forEach(i=>{
              if(fs.existsSync(dir + '\\' + i)){
                var stat = fs.statSync(dir + '\\' + i);
                dirs[i] = Object.assign({type:stat.isDirectory()?'':i.split('.').pop()}, stat);
              }
            });
            succ(dirs);
          }else{
            var file = parameters.dir&&parameters.dir.replace(/[\\\/]+\s*$/,'');
            var type = helper.type(file) || 'text/plain';
            response.setHeader('Content-Type', type);
            if(helper.filetype(file) === 'text'){
              succ(fs.readFileSync(dir).toString());
            }else{
              succ(fs.readFileSync(dir));
            }
          }
        }else{
          succ('不存在或无权限访问');
        }
      }
      });
      
    }
  }
};