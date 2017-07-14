module.exports = {
    "tngMobile/consumer/pre-pay": function(data,parameters,bodyData){
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