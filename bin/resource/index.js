var fs = require("fs");

module.exports = {
    /**
     * 是否是资源文件
     * @param {*} url 
     */
    test: function (url){
        return /^\/*(bin|service|debug|lib|images|document)\/*/i.test(url);
    },
    /**
     * 读取资源文件
     * @param {*} url 
     */
    read: function (url){
        return new Promise(succ => {
            if (fs.existsSync(__dirname + '/../../' + url.split('?').shift())) {
                try {
                    succ(fs.readFileSync(__dirname + '/../../' +  url.split('?').shift()));
                }
                catch (e) {
                    succ('The File Not Found');
                }
            } else {
                succ('The File Not Found');
            }
        });
    }
}