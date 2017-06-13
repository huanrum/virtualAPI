module.exports = {
    "login": function(data,parameters,bodyData){
        if(parameters.user){
            return data;
        }else{
            return {
                message:'请输入用户名'
            }
        }
    }
}