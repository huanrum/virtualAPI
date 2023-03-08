var fs = require('fs');
var path = require('path');
var helper = require('./../helper');

var log = require('./../log');

module.exports = (function(){
  require('../permission').config(function(request, data){
    var permission =(data.permissions||[]).filter(p =>/^\/*editonlines?\/*/.test(p.url)).pop();
    return permission ? permission.write : false;
  });
  
  return function editonline(request, response){
    helper.getBodyData(request).then(function(body){
      var file = decodeURIComponent(request.url.replace(/^\/*editonlines?\/*/,'').replace('?','/').replace('!','').replace(/#.*/,''));
      if(/\?/.test(request.url)){
        if(body && body.length){
          helper.mkdirs(path.dirname(file));
          fs.writeFileSync(file, body);
          response.end('true');
        }else if(/!/.test(request.url)){
          helper.rmdirs(file);
          response.end('true');
        } else {
          if(fs.statSync(file).isDirectory()){
            var dir = request.url.replace(/^\/*editonlines?\/*/,'').split('?').shift();
            response.end(JSON.stringify(getCatalogue(dir, file)));
          }else{
            response.setHeader('Content-Type', helper.type(file) || '');
            response.end(fs.readFileSync(file));
          }
        }
      } else {
        response.setHeader('Content-Type','text/html;charset=utf-8');
        if(body && body.length){
          optionCache(body);
          response.end('true');
        } else if(fs.existsSync(file)){
          var codemirror = path.join(__dirname,'/../../lib/codemirror/');
          var html = fs.readFileSync(__dirname +'\\index.html');
          var data = {
            dirs: getCatalogue(file, file),
            options: optionCache(),
            addons: Array.prototype.concat.apply([],['comment','mode','hint','fold','dialog','search','edit','scroll','display','selection'].map(dir=>helper.readAllFile(codemirror + '/addon/' + dir).map(f=>f.replace(codemirror, '/lib/codemirror/')))),
            modes: fs.readdirSync(codemirror + '/mode').map(dir=>`/lib/codemirror/mode/${dir}/${dir}.js`).filter(f=>fs.existsSync(__dirname + '/../../' + f)),
            themes: fs.readdirSync(codemirror + '/theme').map(i=>i.replace('.css',''))
          };
          log(request, response,'editonlines/:dir');
          response.end(helper.replaceContent(__dirname, html, data));
        } else if(/^\/*editonlines\/*$/.test(request.url)){
          var defaultHtml = [
            '<html><head><title>Edit Code</title></head>',
            '<!--html>/../compatible/native.html</html-->',
            '<!--html>/../compatible/dialog.html</html-->',
            '<!--html>/../compatible/drag.html</html-->',
            '<!--html>/../debug/index.html</html-->',
            '<body>',
            '<div class="iframe-panel"></div>',
            `<script>
              var panel = document.querySelector('.iframe-panel');
              Object.keys(localStorage).filter(function(i){return /^\\/+editonline\\/+.*\\/path/.test(i);}).forEach(function(path){
                var iframe = document.createElement('iframe');
                iframe.width  = '100%';
                iframe.height = window.screen.height + 'px';
                iframe.src = location.origin + \'/editonline/\'+ /^\\/+editonline\\/+(.*)\\/path/.exec(path)[1];
                iframe.title = /^\\/+editonline\\/+(.*)\\/path/.exec(path)[1];
                panel.appendChild(iframe);
              });
            </script>`,
            '</body></html>'
          ].join('\n');
          response.end(helper.replaceContent(__dirname, defaultHtml,{}));
        } else {
          var defaultHtml = [
            '<html><head><title>Edit Code</title></head>',
            '<!--html>/../compatible/native.html</html-->',
            '<!--html>/../compatible/dialog.html</html-->',
            '<!--html>/../compatible/drag.html</html-->',
            '<!--html>/../debug/index.html</html-->',
            '<body>',
            '<script>\nselectDialog().then(function(path){\n ',
            'location.href = location.origin +\'/editonline/\'+ path;',
            '\n})\n</script>',
            '</body></html>'
          ].join('\n');
          response.end(helper.replaceContent(__dirname, defaultHtml, {}));
        }
      }
    });
  };

  function getCatalogue(base, dir, level = 0){
    try{
      if(level > 2){return;}
      var files = fs.readdirSync(dir).map(function(d){
        var childDir = dir +'/'+ d;
        var isDirectory = fs.statSync(childDir).isDirectory();
        return Object.assign({
          name: d,
          path: childDir.replace(base,'')
        }, isDirectory ?{
          children: getCatalogue(base, childDir, level + 1)
        } : {
          mime: helper.type(d)||'text/plan',
          edit: helper.filetype(d)
        });
      });
      return files.filter(i=>i.children).concat(files.filter(i=>!i.children));
    }catch(e){
      return {
        path:'',
        mime: helper.type(base) || 'text/plan',
        edit: helper.filetype(base)
      };
    }
  }
    
  function optionCache(cache) {
    var file = __dirname + '/../../data/editonline.json';
    if(cache){
      fs.writeFileSync(file, JSON.stringify(cache));
    } else if(fs.existsSync(file)){
      return JSON.parse(fs.readFileSync(file).toString());
    }
    return {};
  }

})();