var os = require('os');


module.exports = {
    /**
     * 提取域名或者IP
     */
    getDomain: function (url){
        return /https?:\/\/(((?!\/).)*)/.exec(url)[1].split(/[:\/\\]/).shift();
    },
    /**
     * 获取当前的IP地址
     */
    netInfo: function (){  
        var interfaces = os.networkInterfaces();  
        for(var devName in interfaces){  
              var iface = interfaces[devName];  
              for(var i=0;i<iface.length;i++){  
                   var alias = iface[i];  
                   if(alias.family === 'IPv4' && /192\.168\.[0-1]\.\d+/.test(alias.address) && !alias.internal){  
                         return alias;  
                   }  
              }  
        }
        return {offline:true,address:'127.0.0.1'}; 
    }
};
