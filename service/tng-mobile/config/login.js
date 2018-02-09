var fs = require("fs");

var tempData = {pushEnable:"false"};



module.exports = {
    "_/tngMobile/consumer/get-consumer-by-id": function(data,parameters,bodyData){
        parameters.icon_id = eval(parameters.consumer_id.split().map(i=>i.charCodeAt()).join('+')) %7 + 1;
        return data;
    },
    "tngMobile/takePhoto":function(data,parameters,bodyData){
        if(!parameters.encode){
            return 'http://127.0.0.1:8888/images/tng-mobile/takePhoto.png';
        }else{
            return new Buffer(fs.readFileSync('images/tng-mobile/takePhoto.png')).toString('base64');
        }
    }
}