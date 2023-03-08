
module.exports = function nodeMock(file, request){
  if(request.headers.mockapi){
    var mockapi = require('./' + request.headers.mockapi);
    if(request.method === 'POST'){
      return this.getBodyData(request).then(function(data){
        return mockapi.write(file, data);
      });
    }else{
      return mockapi.read(file);
    }
  }
};