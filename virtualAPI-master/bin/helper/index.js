
var child_process = require('child_process');

var file = require('./file');
var html = require('./html');
var net = require('./net');
var http = require('./http');
var ftp = require('./ftp');
var request = require('./request');
var config = require('./config');
var error = require('./error');

var resolver = require('./resolver');
var simulator = require('./simulator');

function Helper(){}

module.exports = Object.assign(new Helper(),file,html,net,http,ftp,request,config,error,{
    resolver:resolver,
    simulator:simulator,
    /**
     * 获取对应的依赖包，若没有就安装
     * @param {*配置} option 
     * @param {*端口} weinre 
     */
    initModule: function (modules) {
        if(!(modules instanceof Array)){
            modules = [modules];
        }
        return new Promise(succ => {
            var results = [];
            Promise.all(modules.map((module,index) => {
                return new Promise(resolve => {
                    init(module,res =>{
                        results[index] = res;
                        resolve();
                    },4);
                });
            })).then(() => succ(...results));
        });

        function init(module,succ,count){
            if(!count){return ;}
            try {
                succ(require(module));
            } catch (e) {
                child_process.exec(`npm install ${module} `+ (count%2?'-g':''), (err, stdout, stderr) => {
                    if(err){
                        console.log('\x1B[32m',`获取 ${module} 失败`);
                    }
                    init(module,succ,--count);
                });
            }
        }
    },

    /**
     * 获取当前git分支
     */
    branch :function(sourceDiv){
        try{
            return child_process.execSync([
                sourceDiv.split(':')[0] + ':', 'cd ' + sourceDiv.replace(/\\/g,'/'), 'git symbolic-ref --short -q HEAD'
            ].join(' && ')).toString().split('\n').shift();
        }catch(e){
            return '';
        }
    }
});
