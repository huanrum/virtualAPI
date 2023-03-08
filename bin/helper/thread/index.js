var fs = require("fs");
var path = require('path');

module.exports = (function(){

  return {
    /**
     * 模拟线程池
     * @param {*} array 
     * @param {*} fn 
     * @param {*} count 
     */
    runthread: function(array, fn, count){
      var helper = this;
      return new Promise(function(done){
        var list = array.slice();
        var result = [];

        for(var i=0;i<Math.min(count||5,array.length); i++){
          addthread(i);
        }

        function addthread(index){
          if(list.length){
            var md = list.shift();
            setTimeout(function(){
              helper.console('green', index, '. thread run "' + md + '"');
              fn(md, function(rep){
                result.push(rep);
                addthread(index);
                if (result.length === array.length){
                  helper.console('green', '**all. thread run done**********');
                  done(result);
                }
              });
            });
          }
        }
      });
    }
  };
})();