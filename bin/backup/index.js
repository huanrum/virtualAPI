var fs = require("fs");
var child_process = require('child_process');

var  helper = require('./../helper');

module.exports = (function () {

    return {
        base: base,
        ping: ping
    };

    function base(url, value) {
        var key = url.split('?').shift().replace(/https?:\/{2}((?!\/).)*/, '');
        var file = __dirname + '/../../backup/' + key + '.json';

        helper.mkdirs(file.replace(/\/+((?!\/).)*$/, ''));
        try {
            if (!value) {
                console.log('\x1B[34m','use backup : ' + key);
                return helper.readFile(file);
            } else {
                var data = JSON.parse(value);
                if (data.status == 'success') {
                    fs.writeFileSync(file, JSON.stringify(data, null, 4));
                }
            }
        } catch (e) {
            console.log('fs error');
        }
    }

    

    function ping(urls) {
        var netInfo = helper.netInfo();
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        if(netInfo.offline){
            return Promise.resolve(false);
        }else if(urls.filter(function(i){return netInfo.address ===helper.getDomain(i) || ping[helper.getDomain(i)];}).length){
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