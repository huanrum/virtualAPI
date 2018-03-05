var helper = require('./../../helper');
var resource = require('./../../resource');

module.exports = (function(){

    return function(request){
        if (/^[\/\s]*$/.test(request.url)) {
            return true;
        }
        //测试API
        else if (/^\/*test\/+/.test(request.url)) {
            return true;
        }
        else if (/^\/*framework\/+/.test(request.url)) {
            return true;
        }
        //展示对应的视图
        else if (/^\/*views\/*/i.test(request.url)) {
            return true;
        }
        //用于模拟手机APP处理缓存数据
        else if (/^\/*cache\/*/i.test(request.url)) {
            return true;
        }
        //用于处理数据库相关数据
        else if (/^\/*db\/*/i.test(request.url)) {
            return true;
        }
        //用于处理其他域名下的API请求
        else if (/^\/*proxy\/*/i.test(request.url)) {
            return true;
        }
        //对请求的数据处理后再返回
        else if (/^\/*random/.test(request.url)) {
            return true;
        }
        //配置Web
        else if (/^\/*config\/+/.test(request.url)) {
            return helper.localhost(request);
        }
        //WEB操作控制服务端
        else if (/^\/*action\/+/i.test(request.url)) {
            return helper.localhost(request);
        }
        //资源文件
        else if (resource.test(request.url)) {
            return true;
        }
        else {
            return true;
        }
    };

})();