var fs = require('fs');

module.exports = (function(){

    return function(type){
        return readFile('common') + '\n\n' + readFile(type);
    };

    function readFile(type){
        if(fs.existsSync(__dirname+ `/${type}.html`)){
            return fs.readFileSync(__dirname+ `/${type}.html`);
        }else{
            return '';
        }
    }

})();