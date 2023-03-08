var fs = require('fs');

module.exports = {
  read: function(file){
    if(fs.existsSync(file)){
      return fs.readFileSync(file);
    }else{
      return '// file not found';
    }
  },
  write: function(file, data){
    return fs.writeFileSync(file, data);
  }
};