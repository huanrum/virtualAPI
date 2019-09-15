var fs = require('fs');
module.exports = {
    "xinyu/studylogself":function(data,parms,body){
        if(body.name){
            data['data:50'].name = body.name;
        }
        return data;
    },
}