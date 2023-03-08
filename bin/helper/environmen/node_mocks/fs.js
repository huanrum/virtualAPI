
module.exports = {
  readFile: function(url, callback){
    console.log('read : ' + url);
    fetch(url, {}).then(function(i){
      return i.text();
    }).then(function(rep){
      callback(null, rep);
    });
  },
  writeFile: function(url, data, callback){
    console.log('write : ' + url);
    fetch(url, {method:'POST',body:data}).then(function(i){
      return i.text();
    }).then(function(rep){
      callback(null, rep)
    });
  }
};