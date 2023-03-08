var os = require('os');
var fs = require("fs");
var path = require('path');
var child_process = require('child_process');

var BufferHelper = require('./bufferhelper');


module.exports = {
    /**
     * 获取请求者的ip
     */
    clientIp: function (request) {
        return (request.headers && request.headers['x-forwarded-for']) ||
            (request.connection && request.connection.remoteAddress) ||
            (request.socket && request.socket.remoteAddress) ||
            (request.connection && request.connection.socket && request.connection.socket.remoteAddress);
    },
    /**
     * 客户端是否跟服务端在同一个网段
     */
    network: function (request) {
        var netsegment = this.netInfo().address.split('.').slice(0, -1).join('.');
        return this.clientIp(request).indexOf(netsegment) !== -1;
    },
    /**
     * 是否是同网段
     */
    localhost: function (request) {
        var clientIp = (typeof request === 'object' ?  this.clientIp(request) : request + '').replace(/::(ffff:)?/, '');
        return clientIp==='1' || /^(127|172|192|10|133)/.test(clientIp);
    },
    /*
     * 是否是本机
     */
    isSelf: function(ip){
        ip = ip.replace(/::(ffff:)?/, '');
        return ip === '1' || ip === this.netInfo().address;
    },
    /**
     * 解析url获取参数
     * @param {*} urlAndParms 
     * @param {*} key 
     */
    parameters: function (request,key) {
        if(typeof request !== 'object'){
            request = {
                url: request
            };
        }

        key = key || request.url || '';
        request.url = request.url || '';

        if(!request.url.split){
            debugger;
        }

        var urlAndParms = request.url.split('?'), headers = request.headers || {};
        var parameters = {
            clientIp: this.clientIp(request),
            test: headers.test
        };

        var keys = key.split('?')[0].replace(/\[.*\]/, '').split('/').filter(function (i) {
            return !!i;
        });
        var urls = urlAndParms[0].split('/').filter(function (i) {
            return !!i;
        });

        if (urlAndParms[1]) {
            urlAndParms[1].split('#').shift().split('&').forEach(function (str) {
                var value = decodeURIComponent(str.split('=')[1]).trim();
                if(/^(true|false|\d+|null|\[.*\])$/.test(value)){
                    parameters[str.split('=')[0]] = JSON.parse(value);
                } else if(/^undefined$/.test(value)){
                    parameters[str.split('=')[0]] = undefined;
                } else {
                    parameters[str.split('=')[0]] = value;
                }
            });
        }
        for (var i = 0; i < keys.length; i++) {
            if (/:.*/.test(keys[i])) {
                parameters[keys[i].replace(':', '')] = urls[i]?decodeURIComponent(urls[i]):urls[i];
            }
        }
        return Object.assign(parameters, headers);
    },
    /**
     * 
     * @param {*} request 
     * @param {*} replace 
     */
    getBodyData: function (request, replace) {
        var parameters = this.parameters(request);
        return new Promise(succ => {
            var bufferHelper = new BufferHelper();
            if (!request.on) {
                succ(JSON.stringify(request.body || {}));
            } else {
                request.on("data", (chunk) => {
                    bufferHelper.concat(chunk);
                });
                request.on('end', () => {
                    if (replace) {
                        var result = bufferHelper.toString();
                        Object.keys(parameters).forEach(k => {
                            result = result.replace(new RegExp(':\s*' + k, 'ig'), parameters[k]);
                        });
                        succ(result);
                    } else {
                        succ(bufferHelper.toBuffer());
                    }
                });
                request.on('error', (e) => {
                    this.console(e)
                })
            }
        });
    },
    /**
     * 获取请求的返回
     * @param {*} rsp 
     */
    getResponse: function (rsp) {
        return new Promise(succ => {
            var responseText = [];
            var size = 0;
            rsp.on('data', function (data) {
                responseText.push(data);
                size += data.length;
            });
            rsp.on('end', function () {
                responseText = Buffer.concat(responseText, size);
                succ(responseText);
            });
        });
    },
    browser: function (request){
        var userAgentInfo = request.headers['user-agent'];
        return Info() + '(' + myBrowser(userAgentInfo) + ')' + '['+ IsPC()+']';

        function IsPC(){
            return ["Android","iPhone","SymbianOS","Windows Phone","iPad","iPod"].some(i => new RegExp(i, 'i').test(userAgentInfo)) ? 'Mobile' : 'PC';
        }

        function Info(){
            var data = {
                trident: userAgentInfo.indexOf('Trident')>-1,//IE内核
                presto: userAgentInfo.indexOf('Presto')>-1, //opera内核
                webKit: userAgentInfo.indexOf('AppleWebKit')>-1,//苹果、谷歌内核
                gecko: userAgentInfo.indexOf('Gecko')>-1 && userAgentInfo.indexOf('KHTML')==-1, //火狐内核
                mobile: !!userAgentInfo.match(/AppleWebKit.*Mobile.*/),//是否为移动终端
                ios: !!userAgentInfo.match(/\(i[^;]+;( U;)? CPuserAgentInfo.+Mac OS X/),//ios终端
                android: userAgentInfo.indexOf('Android')>-1 || userAgentInfo.indexOf('Adr')>-1, //android终端
                iPhone: userAgentInfo.indexOf('iPhone')>-1,//是否为iPhone或者QQHD浏览器
                iPad: userAgentInfo.indexOf('iPad')>-1,//是否iPad
                webApp: userAgentInfo.indexOf('Safari') == -1,//是否web应该程序，没有头部与底部
                weixin: userAgentInfo.indexOf('MicroMessenger')>-1,//是否微信（2015-01-22新增)
                qq: userAgentInfo.match(/\sQQ/i) == " qq" //是否QQ
            };

            var name = Object.keys(data).filter(k => data[k]).shift();

            if(!name){
                if(userAgentInfo.indexOf("compatible")>-1 && userAgentInfo.indexOf("MSIE") > -1){
                    name = 'IE';
                } else {
                    name = 'Unknow';
                }
            }
            return name;
        }
                
        function myBrowser(userAgent){
            var isOpera = userAgent.indexOf("Opera")>-1; //判断是否Opera浏览器
            var isIE = userAgent.indexOf("compatible")>-1 &&
                userAgent.indexOf("MSIE")>-1 && !isOpera;//判断是否IE浏览器
            var isEdge = userAgent.indexOf("Edge")>-1;//判断是否IE的Edge浏览器
            var isFF = userAgent.indexOf("Firefox")>-1;//判断是否Firefox浏览器
            var isSafari = userAgent.indexOf("Safari")>-1 &&
                userAgent.indexOf("Chrome") == -1;//判断是否Safar浏览器
            var isChrome = userAgent.indexOf("Chrome")>-1 && 
                userAgent.indexOf("Safari")>-1;//判断Chrome浏览器
                
            if(isIE){
                var reIE = new RegExp("MSIE (\\d+\\.\\d+);");
                reIE.test(userAgent);
                var fIEVersion = parseFloat(RegExp["$1"]);
                if(fIEVersion == 7){
                    return "IE7";
                 } else if (fIEVersion == 8){
                    return "IE8";
                } else if (fIEVersion == 9){ 
                    return "IE9";
                }else if (fIEVersion == 10){
                    return "IE10";
                } else if (fIEVersion == 11){
                    return "IE11";
                }
            }
            if(isOpera){
                return "Opera";
            }
            if(isEdge){
                return "Edge";
            }
            if(isFF){
                return "FF";
            }
            if(isSafari){
                return "Safari";
            }
            if(isChrome){
                return "Chrome";
            }
            //IE版本过低
            return 'IE';
        }
    }

};
