var tempData = new Date('2017-04-18');

module.exports = {
    "_tngMobile/consumer/get-activity-history": function(data,parameters,bodyData){
        if(!parameters.previous_page_last_id){
            tempData = new Date('2017-04-18');
            if(parameters.test){
                return '[../data/AH_request.json]';
            }else{
                return '[../data/GET_ACTIVITY_HISTORY.json]';
            }
        }else if(new Date('2017-04-18') - tempData < 3 * 24 * 60 *60 *1000){
            tempData.setDate(tempData.getDate() - 1);
            parameters.previous_page_last_id = parameters.previous_page_last_id - 1;
            parameters.date = tempData.getFullYear() +'-'+ (tempData.getMonth()>8?'':0)+(tempData.getMonth()+1) +'-'+ (tempData.getDate()>9?'':0) + tempData.getDate();
            parameters.time = (tempData.getHours()>9?'':0)+tempData.getHours() +':'+ (tempData.getMinutes()>9?'':0)+tempData.getMinutes() +':'+ (tempData.getSeconds()>9?'':0)+tempData.getSeconds();
            return data;
        }else{
            return {status: "success",activityHistorys:[],dailyAmtInOut:[]};
        }
    }
}