
module.exports = (function(){
  var methods = {
    equel: function(target){
      return function(value){
        return target === value;
      };
    }
  };

  return {
    /**
     * 404
     */
    lanuage: function(obj){
      var data = obj || this;
      var proxy = new Proxy({}, {get:function(target, property){
        if(typeof methods[property] === 'function'){
          data = methods[property](data);
        }
        if(typeof data === 'function'){
          return data;
        }else {
          return proxy;
        }
      }});
      return proxy;
    }
  };


})();