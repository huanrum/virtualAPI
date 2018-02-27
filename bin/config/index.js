var fs = require("fs");

module.exports = (function(){
    var data = {
        web : getContent(__dirname +  '/../config/web.json'),
        mete : getContent(__dirname +  '/../config/mete.json')
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

    function getContent(file){
        if(fs.existsSync(file)){
            return JSON.parse(fs.readFileSync(file).toString());
        }else{
            return {};
        }
    }

})();