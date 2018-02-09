module.exports = {
    "ng2/mall/login":function(data,parameters,bodyData){
        if(parameters.name){
            return data;
        }else{
            return {
                message:'请输入用户名'
            }
        }
    },
    "ng2/mall/book/math":function(data,parameters,bodyData){
        return data;
    }
}