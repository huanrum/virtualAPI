var fs = require("fs");

module.exports = (function(){
    var data = {
        web : JSON.parse(fs.readFileSync(__dirname +  '/../config/web.json').toString()),
        mete : JSON.parse(fs.readFileSync(__dirname +  '/../config/mete.json').toString())
    };

    return function (helper,request,response){
        if(!request){
            return data;
        }else{
            var mod = request.url.replace(/\/?((?!\/).)*\/*/,'');
            var file = __dirname +  `/${mod}.json`;
            helper.getBodyData(request).then(bodyData => {
                if(bodyData){
                    fs.writeFileSync(file, JSON.stringify(JSON.parse(bodyData), null, 4));
                    data[mod] = JSON.parse(bodyData);
                    response.end(null);
                }else if(fs.existsSync(file)){
                    response.end(fs.readFileSync(file).toString());
                }else{
                    response.end('{}');
                }
            });
        }
    };

})();