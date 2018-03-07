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
            helper.initModule(['multiparty','express']).then(multiparty => {
                var form = new multiparty.Form();
                form.encoding = 'utf-8';
                form.uploadDir = __dirname + "/../../../uploads";
                //设置单文件大小限制
                form.maxFilesSize = 2 * 1024 * 1024;
                form.parse(request, function (err, fields, files) {
                    console.log(fields);
                });
            });
            return {
                message:'上传文件'
            };
        } else {
            return data;
        }
    }
};