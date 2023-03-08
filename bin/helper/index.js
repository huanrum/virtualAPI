var fs = require('fs');
var child_process = require('child_process');

var file = require('./file');
var html = require('./html');
var net = require('./net');
var http = require('./http');
var ftp = require('./ftp');
var request = require('./request');
var config = require('./config');
var error = require('./error');
var css = require('./css');
var thread = require('./thread');
var language = require('./language');
var environmen = require('./environmen');

var resolver = require('./resolver');
var simulator = require('./simulator');
var format = require('./format');

function Helper(){
    this.nothingFn = function(){};
}

/**
 * @class Helper
 * @mixes file,html,net,http,ftp,request,config,error,css,thread,language,environmen,format
 */
module.exports = Object.assign(new Helper(),file,html,net,http,ftp,request,config,error,css,thread,language,environmen,format,{
    resolver:resolver,
    simulator:simulator,
    /**
     * 获取对应的依赖包，若没有就安装
     * @param {*配置} modules
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
            if(!count){
                this.console('red', `获取 ${module} 失败，尝试机会用完！！！`);
                return ;
            }
            try {
                succ(require(module));
            } catch (e) {
                if(fs.existsSync(__dirname + '/../../node_modules/' + module.replace(/@.*$/,''))){
                    succ(null);
                }else{
                    child_process.exec(`npm install ${module} `+ (count%2?'-g':''), (err, stdout, stderr) => {
                        if(err){
                            this.console('red',`获取 ${module} 失败`);
                        }
                        init(module,succ,--count);
                    });
                }
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
    },
    /**
     * 利用setTimeout来实现循环调用
     */
    loop: function(fn, ms){
        var handle = null;
        setTimeout(function loop(){
            fn();
            // loop fn
            handle = setTimeout(loop, ms);
        });
        return() => clearTimeout(handle);
    },
    /**
     * 路径/rex/xx 或者 /rex
     */
    regexpUrl: function(rex, url){
        return new RegExp(`^\\/*${rex}\\/+`,'i').test(url) || new RegExp(`^\\/*${rex}$`,'i').test(url);
    },
    /**
     * 加密解密字符串，比如乘以-1
     */
    secrecy: function(str){
        var result  = [];
        var to = function to(char){
            if(char.charCodeAt()> 31 && char.charCodeAt()< 127){
                return String.fromCharCode(127 + 31 - char.charCodeAt());
            }
            return char;
        };
        for(var i=0; i<str.length; i=i+2){
            if(str[i+1] !== undefined){
                result.push(to(str[i+1]));
            }
            result.push(to(str[i]));
        }
        return result.join('');
    },
    /**
     * console
     * type 使用类似api返回的status值区分
     */
    console: function(type){
        var color = this.colors(type);
        var messages = Array.prototype.slice.call(arguments, color ? 1 : 0);
        if(color){
            messages.unshift(color);
        } else {
            messages.unshift(this.colors('grey'));
        }
        console.log.apply(console, messages);
    }
    
});
