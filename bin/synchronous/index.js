var fs = require('fs');
var path = require('path');
var helper = require('./../helper');

module.exports = (function(){

  return function synchronous(request, response) {

    response.end();
    
  };
})();