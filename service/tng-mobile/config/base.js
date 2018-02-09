module.exports = {
    "tngMobile": function(data,parameters,bodyData){
        return {
            status: "success",
            parameters:parameters,
            bodyData:bodyData
        };
    },
    "tngMobile/consumer/v5/pre-pay": function(data,parameters,bodyData){
        if(parameters.pin === '999999'){
            data.status = 'fail';
        }
        return data;
    },
    "tngMobile/encode": function(data,parameters,bodyData){
        if(parameters.pin === '999999'){
            data.status = 'fail';
        }
        return data;
    }
}