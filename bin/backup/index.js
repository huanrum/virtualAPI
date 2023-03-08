var fs = require("fs");
var child_process = require('child_process');

var helper = require('./../helper');
var dir = require('./dir');

module.exports = (function () {

    return {
        base: base,
        ping: ping,
        dir: dir
    };

    /**
     * 入口，备份数据
     * @param {*} url 
     * @param {*} value 
     */
    function base(method, url, value) {
        var key = url.split('?').shift().replace(/https?:\/{2}((?!\/).)*/, '');
        var file = __dirname + '/../../backup/' + key + '/' + (method||'ALL') + '.json';

        helper.mkdirs(file.replace(/\/+((?!\/).)*$/, ''));
        try {
            if (!value) {
                helper.console('blue','use backup : ' + key);
                if(fs.existsSync(file)){
                    return helper.readFile(file);
                }else{
                    return helper.readFile(file.replace(`${method}.json`,'ALL.json'));
                }
            } else {
                var data = JSON.parse(value);
                if (data.status == 'success') {
                    fs.writeFileSync(file, JSON.stringify(data, null, 4));
                }
            }
        } catch (e) {
            helper.console('fs error');
        }
    }

    
    /**
     * ping 对应的地址
     * @param {*} urls 
     */
    function ping(urls) {
        // ping与原来理解的不同
        return Promise.resolve(true);

        var netInfo = helper.netInfo();
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        if(netInfo.offline){
            return Promise.resolve(false);
        }else if(urls.filter(function(i){return [netInfo.address, helper.hostname()].indexOf(helper.getDomain(i).toLocaleLowerCase()) !== -1 || ping[helper.getDomain(i)];}).length){
            return Promise.resolve(true);
        }else{
            return new Promise(function (succ) {
                var count = urls.length;
                urls.forEach(function (url) {
                    url = helper.getDomain(url);
                    //telnet 10.0.101.246 8080 
                    child_process.exec('ping ' + url, function (err, stdout, stderr) {
                        count--;
                        if (!err) {
                            ping[url] = true;
                            setTimeout(function(){
                                ping[url] = null; 
                            },5*60*1000);
                            succ(true);
                        } else if (err && !count) {
                            succ(false);
                        }
                    });
                });
            });
        }
    }

})();