var fs = require('fs');


module.exports = (function () {

    return {
        ftpClient:ftpClient,
        ftpUpload:ftpUpload
    };

    /**
     * 初始化ftp
     * @param {*} option 
     */
    function ftpClient(option) {
        return new Promise(succ => {
            this.initModule('ssh2').then(shh2 => {
                var client = new(shh2.Client)();
                client.on('ready', function () {
                    client.sftp(function (err, sftp) {
                        if (err) {
                            message('!!' + err.message);
                        } else {
                            succ({sftp,client});
                        }
                    });
                });
                client.connect(option);
            });
        });
    }
    /**
     * ftp上传文件
     * @param {*} origin 
     * @param {*} target 
     */
    function ftpUpload(origin, target) {
        return new Promise(function (succ) {
            var readStream = fs.createReadStream(origin);
            var writeStream = fs.createWriteStream(target);
            readStream.pipe(writeStream);
            readStream.on('end', function (error) {
                succ(origin);
            });
        });
    }

})();