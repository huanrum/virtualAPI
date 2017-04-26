
module.exports = (function (getValue) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
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
    return random;

    function random(str, length, tempData) {
        tempData = (typeof tempData === 'function') ? tempData : tempDataFn();
        if (length) {
            return initLength('' + length, function (len) {
                var list = [];
                tempData(str);
                for (var i = 0; i < len; i++) {
                    list.push(random(str, null, tempData));
                }
                return list;
            });
        }

        if (typeof str === 'string') {
            return getString(str, tempData);
        } else {
            var obj = {};
            Object.keys(str).forEach(function (key) {
                var len = key.match(/:.*/);
                obj[random(key.replace(len && len[0], ''), null, tempData)] = random(str[key], len && len[0].replace(':', '').trim(), tempData);
            });
            return obj;
        }
    }

    function tempDataFn() {
        var activeKey = null, tempData = {};
        return function (model) {
            if (!/^\d*\+\d*/.test(model)) {
                activeKey = JSON.stringify(model);
            } else {
                tempData[activeKey] = tempData[activeKey] || ((+model.split('+')[0] || 1) - (+model.split('+')[1] || 1));
                tempData[activeKey] = tempData[activeKey] + (+model.split('+')[1] || 1);
                return tempData[activeKey];
            }
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
        var regs = regex.match(/\[((?!\[).)*\]/g);
        if (regs) {
            regs.forEach(function (reg) {
                if (!/[\(\)\{\}]/.test(reg)) {
                    var numbers = reg.replace(/[\[\]]/g, '').split(',').map(initNumber);
                    regex = regex.replace(reg, numbers[Math.floor(Math.random() * numbers.length)]);
                } else {
                    var splits = reg.replace(/[\[\]]/g, '').split(/[\(\)\{\}]/);
                    regex = regex.replace(reg, initLength(splits[3] || splits[2], function (length) {
                        var result = '';
                        for (var i = 0; i < length; i++) {
                            result += initChar(splits[1] || '0-Z');
                        }
                        return result;
                    }));
                }
            });
        }
        return regex;

        function initNumber(model) {
            if (/\-/.test(model)) {
                return initLength(model);
            } else if (/\+/.test(model)) {
                return tempData(model);
            } else {
                return getValue(model) || model;
            }
        }
    }

    function initChar(model) {
        while (/\-/.test(model)) {
            var start = model[model.indexOf('-') - 1] || '';
            var end = model[model.indexOf('-') + 1] || '';
            model = model.replace(start + '-' + end, chars.slice(chars.indexOf(start || chars[0]), chars.indexOf(end || chars[chars.length - 1])));
        }
        return model[Math.floor(Math.random() * model.length)];
    }
})(function getValue(model) {
    return ({
        date: Date.now,
        dir: __dirname
    })[model.toLocaleLowerCase()];
});