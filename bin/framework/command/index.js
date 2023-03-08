(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        (global.$commond = factory(global));
})(this, (function (global) {
    'use strict';

    var keys = {
        SENDKEYS:'发送按键模拟'
    }, cacheData = {
        fullscreen: fullscreen
    };

    Object.keys(cacheData).forEach(function(i){keys[i.toLocaleUpperCase()] = i;});

    return new Proxy(keys,{set:function(target, name, value){
        //helper.console(target, name, value);
        return new Promise(function (resolve) {
            var method = target[name];
            if(!(value instanceof Array)){
                value = [value];
            }
            if (target[name] && cacheData[method]) {
                resolve(cacheData[method].apply(cacheData, value));
            } else {
                fetch(window.location.origin + '/debug/' + name, {
                    method: 'POST',
                    body: JSON.stringify(value)
                }).then(function (i) {
                    return i.json();
                }).then(resolve);
            }
        });
    }});

    /**
     * 
     * @param {是否全屏} full 
     */
    function fullscreen(full) {
        if (full) {
            var element = document.documentElement; // 整个网页
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        } else {
            // 退出全屏模式!
            if (document.exitFullscreen) {  
                document.exitFullscreen(); 
            } else if (document.mozCancelFullScreen) {  
                document.mozCancelFullScreen(); 
            } else if (document.webkitExitFullscreen) {  
                document.webkitExitFullscreen(); 
            }
        }
    }

}));