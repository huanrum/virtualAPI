

(function(entityScript){
  entityScript.parentNode.removeChild(entityScript);

  var startTime = Date.now();

  var commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
      cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^"'\s]+)["']\s*\)/g,
      filenameExp = /\s+__filename\s*=\s*['"](((?!['"]).)*)['"]/mig;

  var baseUrl = location.href.split(/[\?#]/).shift();

  var entityUrl = entityScript.getAttribute('data-main');
  var node_module = entityScript.getAttribute('node-module') || baseUrl.replace(/[\\\/]((?![\\\/]).)+$/, 'node_modelus');


  var cacheJs = {}, fileMap = {};


  var  initModule = (function(){
    var callbacks = [], runSetTimeout;

    var loading = document.createElement('div');
    loading.className = 'loading';
    document.body.appendChild(loading);

    loading.innerHTML = [
      '<span></span><span></span><span></span><span></span><span></span>',
      [
        '<style>                                                        ',
        '  .loading{                                                    ',
        '    width: 160px;                                              ',
        '    height: 80px;                                              ',
        '    margin: 0;                                                 ',
        '    margin-top: 200px;                                         ',
        '  }                                                            ',
        '  .loading span{                                               ',
        '    display: inline-block;                                     ',
        '    width: 16px;                                               ',
        '    height: 100%;                                              ',
        '    border-radius: 8px;                                        ',
        '    background: lightgreen;                                    ',
        '    -webkit-animation: load 1s ease infinite;                  ',
        '  }                                                            ',
        '  @-webkit-keyframes load{                                     ',
        '    0%,100%{                                                   ',
        '      height: 80px;                                            ',
        '      background: lightgreen;                                  ',
        '    }                                                          ',
        '    50%{                                                       ',
        '      height: 140px;                                           ',
        '      margin: -15px 0;                                         ',
        '      background: lightblue;                                   ',
        '    }                                                          ',
        '  }                                                            ',
        '  .loading span:nth-child(2){                                  ',
        '    -webkit-animation-delay:0.2s;                              ',
        '  }                                                            ',
        '  .loading span:nth-child(3){                                  ',
        '    -webkit-animation-delay:0.4s;                              ',
        '  }                                                            ',
        '  .loading span:nth-child(4){                                  ',
        '    -webkit-animation-delay:0.6s;                              ',
        '  }                                                            ',
        '  .loading span:nth-child(5){                                  ',
        '    -webkit-animation-delay:0.8s;                              ',
        '  }                                                            ',
        '</style>                                                       ',
      ].join('\n')
    ].join('\n');

    return function(add){
      if(add){
        callbacks.push(add);
      }else{
        loop();
      }
    }

    function loop(){
      clearTimeout(runSetTimeout);
      run(callbacks.slice(0));
      if(callbacks.length){
        if(Date.now() - startTime < 60 * 1000){
          runSetTimeout = setTimeout(loop, 1000);
        }else{
          run(callbacks.slice(0), true);
        }
      }
    }

    function run(list, initing){
      while(list.length){
        var callback = list.pop();
        callback.deps = callback.deps.filter(function(i){return !callback.require(i)});

        if(initing || !callback.deps.length){
          var module = { exports: {}};
          try{
            callback.fn(callback.require, module.exports, module);
          }catch(e){
            module.exports.error = e;
            console.log('\x1B[39m', callback.fileName, e)
          }
          cacheJs[callback.fileName.toLocalLowerCase()] = module;
          callbacks = callbacks.filter(function(i){return i!==callback;});
          if(getfullpath(baseUrl, entityUrl).toLocalLowerCase() === callback.fileName.toLocalLowerCase()){
            document.body,removeChild(loading);
          }
        }
      }
    }

  })();






  var loadjs = (function(){
    var flagIndex = Date.now(), fetching = {};
    return function loadjs(url){
      if(!fetching[url]) {
        fetching[url] = true;
        sendWesocket({url:url}, 'require-file', 'FLAG-' + (flagIndex++)).then(function(data){
          if(!data.url){return;}
          fileMap[data.url] = data.redirect || data.url;
          if (/\.[jt]s/.test(fileMap[data.url])){
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.charset = 'utf-8';
            script.setAttribute('require', 'js');
            script.onerror = function(e){
              console.error(e);
            }
            script.onload = function(){
              document.head.removeChild(script);
              initModule();
            }
            script.src = fileMap[data.url];
            setTimeout(function(){
              document.head.appendChild(script);
            }, script.src.indexOf(node_module) === -1?0:5);
          }else {
            var link = document.createElement('link');
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.href = fileMap[data.url].replace(getfullpath(baseUrl), './');
            // link.onload = function(){
            //    document.head.removeChild(link);
            // }
            document.head.appendChild(link);
            cacheJs[data.url.toLocalLowerCase()] = {exports: true};
          }
        });
      }
    };
  })();

  function getfullpath(callfile,childurl){

    var dirpath = '';
    childurl = childurl || '';
    if(!/\.(js|less|css|scss)/.test(childurl)){
      childurl += '.js';
    }

    if(/\./.test(childurl)){
      dirpath = callfile.replace(/[\\\/]((?![\\/]).)+$/, '');
    } else if(/^[\\\/]/.test(childurl)){
      dirpath = baseUrl.replace(/[\\\/]((?![\\/]).)+$/, '');
    } else{
      dirpath = node_module;
    }
    if(childurl === '.js'){
      childurl = '';
    }

    var url = (dirpath + '/' + childurl.replace(/^~/,'').replace('..', '/..').replace(/^\.*[\\\/]+/,''));
    try{
      return new URL(url) + '';
    }catch(e){
      return url;
    }
  }


  function define(name, deps, callback) {

    //Allow for anonymous modules
    if (typeof name !== 'string') {
      callback = deps;
      deps = name;
      name = null;
    }

    //This module may not have dependencies
    if(!(deps instanceof Array)) {
      callback = deps;
      deps = null;
    }

    if(!deps && (typeof callback === 'function')) {
      deps = [];
      if(callback.length) {
        callback
            .toString()
            .replace(commentRegExp, '')
            .replace(cjsRequireRegExp, function(match, dep){
              deps.push(dep);
            });
        deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
      }
    }

    var fileNameExec = callbacl.toString().splt(/[\r\n]/).map(function(s){return filenameExp.exec(s)}).filter(function(i){return !!i;}).shift();
    var fileName = baseUrl.replace(/[\\\/]((?![\\\/]).)+$/, '/' + (fileNameExec?fileNameExec[1]:''));

    deps = deps.filter(function(i){return ['require', 'exports', 'module'].indexOf(i) !== -1; });
    deps.forEach(function(dep){
      var fillName = getfullpath(fileName, dep);
      loadjs(fillName);
      if(/\.[jt]s/.test(fillName)){
        loadjs(fillName.replace(/\.[jt]s/, 'css'));
      }
    });
    initModule({fileName: fileName, deps:deps, require:function(url){
      var file = fileMap[getfullpath(fileName || baseUrl, url)] || '';
      return (cacheJs[file.replace(/\\/g, '\/').toLocalLowerCase()] || {}).exports;
    },fn: callback});
  };




  window.define = define;

  window.addEventListener('load', function(){
    window.waiting(function(){return window.sendWesocket;}).then(function(){
      loadjs(getfullpath(baseUrl, entityUrl));
    })
  });
  
})(Array.prototype.filter.call(document.getElementsByTagName('script'), function(i){return i.getAttribute('data-main')}).pop());