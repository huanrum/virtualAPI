var fs = require("fs");

module.exports = (function (emnuData, getValue) {
    var _someValue = null;
    //根据传入的模型对象构建出一个完整的对象
    //第二个参数是产生数组的 例如 3-5 表示生成数组长度3-5
    //str是字符串或者是对象
    //   字符串：表示是简单数据'Name[(a-z)][(0-9)1-3]'
    //   对象：表示生成的是一个对象，按照传入的对象为模板
    // 参数模板允许的字符串：所有需要生成的字符串都必须用[]包含起来,里面的内容标准模式为[(chars里面的一段){长度}]
    //     {}是可以省略的。
    //      [(0-9)]表示0-9生成的任意长度字符串,
    //      [()2-3]表示chars生成的2-3个长度的字符串,
    //      [10-100]表示生成10-100之间的一个数字,
    //      [aaa,bbb,100-200]表示冲三个字符串中随机一个,里面的100-200会被替换成100-200之前的一个数字
    //      [1+1]表示从1开始步长1递增,数字1是可以省略的
    //      [@]表示拼音
    //      [[a?1000+b:b]]表示计算表达式
    return function (someValue) {
        var _path = '';
        if(typeof someValue === 'object'){
            _someValue = someValue;
            _path = someValue.path;
        }else{
            _path = someValue;
        }
        
        var replaceValue = getValue(_someValue);
        return random;

        /**
         * 
         * @param {*} str 
         * @param {*} length 
         * @param {*} tempData 
         * @param {*} level :迭代调用的深度 
         */
        function random(str, length, tempData, level) {
            tempData = (typeof tempData === 'function') ? tempData : tempDataFn();
            if(level > 10){
                return;
            }
            if (length) {
                return initLength('' + length, function (len) {
                    var list = [];
                    tempData(str);
                    for (var i = 0; i < len; i++) {
                        list.push(random(str, null, tempData, level+1));
                    }
                    return list;
                });
            }

            if (typeof str === 'string') {
                return getRealValue(str,tempData, d=>random((function(){
                    try{
                        return JSON.parse(d);
                    }catch(e){
                        return d;
                    }
                })(),null,tempData,level+1));
            } else if (str instanceof Array) {
                return str.map(function (item) {
                    return random(item, null, tempData, level+1);
                });
            } else if (str && typeof str === 'object') {
                var obj = {};
                Object.keys(str).forEach(function (key) {
                    var len = key.match(/:.*/);
                    tempData([key, str[key]]);
                    obj[random(key.replace(len && len[0], ''), null, tempData, level+1)] = random(str[key], len && len[0].replace(':', '').trim(), tempData, level+1);
                });
                return obj;
            } else {
                return str;
            }
        }

        function getRealValue(str,tempData, fileFn) {
            var raelValue = {
                true: true,
                false: false,
                null: null
            };
            
            if(/^\s*\[((?!(\[|\])).)*\]\s*$/i.test(str)){
                str = replace(str,fileFn);
            }else{
                str = str.replace(/\[(((?!(\[|\])).)*)\]/mg,function(strChild){
                    return replace(strChild,i=>i);
                });
            }

            if(typeof str === 'object'){
                return str;
            }else{
                var regex = getString(str, tempData);
                var value = raelValue[regex.toLocaleLowerCase().trim()];
                return typeof value === 'undefined' ? regex : value;
            }

            function replace(strChild,fn){
                var value = /\[(.*)\]/.exec(strChild)[1];
                if (/^\-?\s*\d*\s*(\.\s*\d*\s*)?$/.test(value)) {
                    return parseFloat(value);
                } else if(/\.json$/i.test(value)){
                    if (fs.existsSync(value)) {
                        return fn(fs.readFileSync(value).toString());
                    }else if(_path && fs.existsSync(_path + '/' + value)){
                        return fn(fs.readFileSync(_path + '/' + value).toString());
                    }
                }else{
                    return strChild;
                } 
            }
        }

        function tempDataFn() {
            var activeKey = null, tempData = {};
            return function (model) {
                if (typeof model === 'string') {
                    if (/^\-?\d*\+\-?\d*/.test(model)) {
                        var newModel = model.split('!')[0],castoff = model.split('!')[1];
                        tempData[activeKey] = tempData[activeKey] || ((+model.split('+')[0] || 1) - (+model.split('+')[1] || 1));
                        tempData[activeKey] = tempData[activeKey] + (+model.split('+')[1] || 1);
                        while(castoff && castoff.split('+').indexOf(''+tempData[activeKey])!==-1){
                            tempData[activeKey] = tempData[activeKey] + (+model.split('+')[1] || 1);
                        }
                        return tempData[activeKey];
                    } else if (/^((?!\+).)+(\+((?!\+).)+)+$/.test(model)) {
                        var items = model.split('+');
                        tempData[activeKey] = tempData[activeKey] || -1;
                        tempData[activeKey] = items[items.indexOf(tempData[activeKey]) + 1];
                        return tempData[activeKey];
                    }
                }
                activeKey = JSON.stringify(model);
            };
        }

        function initLength(length, fn) {
            fn = fn || function (l) { return l; };
            length = length && length.trim() || '1-100';
            length = length.split('-');
            length[1] = length[1] || length[0];
            if (length[1].length === length[0].length) {
                length = (Array(length[1].length).join('0') + Math.floor(+ (length[0]) + Math.random() * (length[1] - length[0]))).slice(- length[1].length);
            } else {
                length = Math.floor(+ (length[0]) + Math.random() * (length[1] - length[0]));
            }

            return fn(length);

        }

        function getString(regex, tempData) {
            var regs = regex.match(/\[((?!(\[|\])).)*\]/g);
            if (regs) {
                regs.forEach(function (reg) {
                    if (!/[\(\)\{\}]/.test(reg)) {
                        var numbers = reg.replace(/[\[\]]/g, '').split(',').map(initNumber);
                        regex = regex.replace(reg, numbers[Math.floor(Math.random() * numbers.length)]);
                    } else {
                        var splits = reg.replace(/[\[\]]/g, '').replace(/\(\s*\)/, '(0-Z)').split(/[\(\)\{\}]/).filter(function (i) { return !!i.trim(); });
                        regex = regex.replace(reg, Array(+splits[2] || 1).join().split(',').map(function () {
                            return initLength(splits[1], function (length) {
                                var result = '';
                                for (var i = 0; i < length; i++) {
                                    if (!splits[0] || /^[\-0-9a-zA-Z]+$/.test(splits[0])) {
                                        result += initChar(splits[0] || '0-Z');
                                    } else if (/^@+$/.test(splits[0])) {
                                        result += initName(emnuData.chinese, splits[0].length);
                                    } else if (/^\$+$/.test(splits[0])) {
                                        result += initName(emnuData.english, splits[0].length);
                                    }

                                }
                                return result;
                            });
                        }).join());
                    }
                });
            }

            if(/\[\((.*)\)\]/.test(regex)){
                return regex.replace(/\[\((((?!\)).)*)\)\]/g, function($0,$1){
                    try{
                        return eval($1);
                    }catch(e){
                        return $0;
                    }
                });
            }
            return regex;

            function initNumber(model) {
                if (/^[\-0-9]+$/.test(model)) {
                    return initLength(model);
                } else if (/\+/.test(model)) {
                    return tempData(model);
                } else {
                    return replaceValue(model) || (model);
                }
            }
        }

        function initName(names, length) {
            var result = []; for (var i = 0; i < length; i++) {
                result.push(names[Math.floor(Math.random() * names.length)]);
            }
            return ' ' + result.join(' ') + ' ';
        }

        function initChar(model) {
            while (/\-/.test(model)) {
                var start = model[model.indexOf('-') - 1] || '';
                var end = model[model.indexOf('-') + 1] || '';
                model = model.replace(start + '-' + end, emnuData.chars.slice(emnuData.chars.indexOf(start || emnuData.chars[0]), emnuData.chars.indexOf(end || emnuData.chars[emnuData.chars.length - 1])));
            }
            return model[Math.floor(Math.random() * model.length)];
        }
    };
})({
    chars: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    chinese: 'a,ai,an,ang,ao,ba,bai,ban,bang,bao,bei,ben,beng,bi,bian,biao,bie,bin,bing,bo,bu,ca,cai,can,cang,cao,ce,cen,ceng,cha,chai,chan,chang,chao,che,chen,cheng,chi,chong,chou,chu,chua,chuai,chuan,chuang,chui,chun,chuo,ci,cong,cou,cu,cuan,cui,cun,cuo,da,dai,dan,dang,dao,de,dei,den,deng,di,dia,dian,diao,die,ding,diu,dong,dou,du,duan,dui,dun,duo,e,en,eng,er,fa,fan,fang,fei,fen,feng,fiao,fo,fou,fu,ga,gai,gan,gang,gao,ge,gei,gen,geng,gong,gou,gu,gua,guai,guan,guang,gui,gun,guo,ha,hai,han,hang,hao,he,hei,hen,heng,hong,hou,hu,hua,huai,huan,huang,hui,hun,huo,ji,jia,jian,jiang,jiao,jie,jin,jing,jiong,jiu,ju,juan,jue,#NAME?,ka,kai,kan,kang,kao,ke,ken,keng,kong,kou,ku,kua,kuai,kuan,kuang,kui,kun,kuo,la,lai,lan,lang,lao,le,lei,leng,li,lia,lian,liang,liao,lie,lin,ling,liu,lo,long,lou,lu,luan,lun,luo,lv,lve,ma,mai,man,mang,mao,me,mei,men,meng,mi,mian,miao,mie,min,ming,miu,mo,mou,mu,na,nai,nan,nang,nao,ne,nei,nen,neng,ni,nian,niang,niao,nie,nin,ning,niu,nong,nou,nu,nuan,nun,nuo,nv,nve,o,ou,pa,pai,pan,pang,pao,pei,pen,peng,pi,pian,piao,pie,pin,ping,po,pou,pu,qi,qia,qian,qiang,qiao,qie,qin,qing,qiong,qiu,qu,quan,que,qun,ran,rang,rao,re,ren,reng,ri,rong,rou,ru,rua,ruan,rui,run,ruo,sa,sai,san,sang,sao,se,sen,seng,sha,shai,shan,shang,shao,she,shei,shen,sheng,shi,shou,shu,shua,shuai,shuan,shuang,shui,shun,shuo,si,song,sou,su,suan,sui,sun,suo,ta,tai,tan,tang,tao,te,tei,teng,ti,tian,tiao,tie,ting,tong,tou,tu,tuan,tui,tun,tuo,wa,wai,wan,wang,wei,wen,weng,wo,wu,xi,xia,xian,xiang,xiao,xie,xin,xing,xiong,xiu,xu,xuan,xue,xun,ya,yan,yang,yao,ye,yi,yin,ying,yo,yong,you,yu,yuan,yue,yun,za,zai,zan,zang,zao,ze,zei,zen,zeng,zha,zhai,zhan,zhang,zhao,zhe,zhei,zhen,zheng,zhi,zhong,zhou,zhu,zhua,zhuai,zhuan,zhuang,zhui,zhun,zhuo,zi,zong,zou,zu,zuan,zui,zun,zuo,ń,ň,ê,hng'.split(','),
    english: ''

}, function getValue(someValue) {
    var data = {
        now: ()=>Date.now(),
        date: new Date().toLocaleString(),
        dir: __dirname
    };
    Object.keys(someValue || {}).forEach(function (key) {
        data[key.toLocaleLowerCase()] = someValue[key];
    });
    return function (model) {
        var result = data[model.toLocaleLowerCase()];
        return (typeof result === 'function')?result(data):result;
    };
});