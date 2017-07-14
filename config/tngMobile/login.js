
var tempData = {pushEnable:"false"};



module.exports = {
    "/tngMobile/consumer/get-consumer-by-id": function(data,parameters,bodyData){
        parameters.icon_id = eval(parameters.consumer_id.split().map(i=>i.charCodeAt()).join('+')) %7 + 1;
        return data;
    }
}