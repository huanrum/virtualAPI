
var tempData = {pushEnable:"false"};

module.exports = {
    "tngMobile/getPushSettings": function(data,parameters,bodyData){
        data.data.pushEnable = tempData.pushEnable;
        return data;
    },
    "tngMobile/updatePushEnable": function(data,parameters,bodyData){
        tempData.pushEnable = parameters.enable;
        return data;
    }
}