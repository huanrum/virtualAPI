var child_process = require('child_process');

var file = require('./file');
var net = require('./net');
var resource = require('./resource');
var config = require('./config');

module.exports = Object.assign({},file,net,resource,config,{
    /**
     * 获取对应的依赖包，若没有就安装
     * @param {*配置} option 
     * @param {*端口} weinre 
     */
    initModule: function (module) {
        return new Promise(succ => {
            init(succ,4);
        });

        function init(succ,count){
            if(!count){return ;}
            try {
                succ(require(module));
            } catch (e) {
                child_process.exec(`npm install ${module} `+ (count%2?'-g':''), (err, stdout, stderr) => {
                    if(err){
                        console.log('\x1B[32m',`获取 ${module} 失败`);
                    }
                    init(succ,--count);
                });
            }
        }
    },

    /**
     * 获取当前git分支
     */
    branch :function(){
        try{
            return child_process.execSync('git symbolic-ref --short -q HEAD').toString().split('\n').shift();
        }catch(e){
            return '';
        }
    }
});
