var helper = require('./../../helper');


module.exports = {
    "login": function (data, parameters, bodyData) {
        if (parameters.user) {
            return data;
        } else {
            return {
                message: '请输入用户名'
            }
        }
    },
    "[POST](file:file)upload": function (data, parameters, bodyData, request) {
        if (/multipart\/form-data/.test(request.headers['content-type'])) {
            helper.upload(request,__dirname + "/../../../uploads");
            return {
                message:'上传文件'
            };
        } else {
            return data;
        }
    }
};