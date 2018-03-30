/**
 * Created by Seto Sun on 2017/3/28.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global.ehr = global.$ehr = factory());
})(this, (function (global,_eval) {
    'use strict';

    var chaceData = { temp: {}, data: {}, load: [], binding$id: 0 };

    if (window) {
        chaceData.menu = document.createElement('div');
        chaceData.content = document.createElement('div');
        chaceData.menu.className = 'ehuanrum-menu';
        chaceData.content.className = 'ehuanrum-content';
        //界面加载完成后去主动给界面做数据绑定处理
        window.addEventListener('load', function () {
            var routerUrl = {}, active = null, history = [],paths = location.hash.replace('#', '').split('/');
            binding(document.body, window);
            binding(chaceData.menu, window);
            binding(chaceData.content, window);
            //根据对应的router功能构建菜单
            chaceData.menu.appendChild(__createMenu(ehuanrum('router') || {}, routerUrl, go, ''));
            //如果有对应的main处理逻辑就先运行它
            if (ehuanrum('main')) {
                ehuanrum('main')(goin);
            } else {
                goin();
            }

            function goin(hideMenu,defaultUrl) {
                //添加菜单和内容显示用的容器,并根据路径初始化界面
                if (ehuanrum('router') && !hideMenu) {
                    document.body.appendChild(chaceData.menu);
                    document.body.appendChild(chaceData.content);
                } else {
                    document.body.appendChild(chaceData.content);
                }
                if(ehuanrum('router')){
                    var menu = paths.filter(function (i) { return !!i; }).join('/');
                    go(menu?('/' + menu):(defaultUrl || 'router.main'), paths.pop() || paths.pop() || 'default');
                }
                Object.defineProperty(ehuanrum('router')||{},'goto',{value:go});
            }

            /**
             * 跳转路由 menu是字符串页面注入名称/一个方法
             * @param {menu}
             */
            function go(menu) {
                //路由跳转
                if(typeof menu === 'number'){
                    var hash = location.hash;
                    if(menu<0){
                        hash = history[history.length + menu];
                    }else{
                        hash = history[history.lastIndexOf(hash) + menu];
                    }
                    arguments[0] = hash.replace('#','') || ('#/no-Found-'+Date.now());
                    go.apply(this, arguments);
                }else if (typeof menu === 'string') {
                    history.push(location.hash);
                    location.hash = '#' + menu.replace(/^\s*router\./, '/');
                    arguments[0] = routerUrl[menu.replace(/^\s*router\./, '/')];
                    go.apply(this, arguments);
                } else if (typeof menu === 'function') {
                    chaceData.content.innerHTML = '';
                    if (active && active.scope()) {
                        active.scope().$destroy();
                    }
                    active = menu.apply(this, Array.prototype.slice.call(arguments, 1));
                } else if (!menu) {
                    chaceData.content.innerHTML = '<div style="position: absolute;top:10em;left:50%;">没有对应的页面,请确认输入的地址！</div>';
                }
            }
        });
    }

    //把下面的几个功能提供出去
    ehuanrum('filter', function () { return filter; });
    ehuanrum('binding', function () { return binding; });
    ehuanrum('value', function () { return $value; });

    return function () {
        return ehuanrum;
    };

    /**
     * 用来做依赖相关的处理，这是这个框架的入口,
     * 如果第一个参数是字符串就表示要注入第二个变量，如果第二个变量不存在就是取值
     * 如果第一个参数是方法就表示是要添加界面加载完成和关闭界面的时候需要的事件处理
     * 如果第一个参数是布尔量就表示要设置全局的绑定相关的信息是否显示在界面
     * 如果第一个参数是数字就表示要设置版本号
     * @param {*} field 
     * @param {*} value 
     */
    function ehuanrum(field, value) {
        field = field || '';
        if (typeof field !== 'string' || /^\d+$/.test(field)) {
            //如果第一个参数是方法就表示是要添加界面加载完成和关闭界面的时候需要的事件处理
            if (typeof field === 'function' && window) {
                window.addEventListener('load', field);
                if (typeof value === 'function') {
                    //$window.addEventListener('unload',value);
                    window.addEventListener('beforeunload', value);
                }
                //如果是布尔量就表示要设置全局的绑定相关的信息是否显示在界面
            } else if (typeof field === 'boolean') {
                chaceData.binding = field;
                //如果是数字就表示要设置版本号
            } else if (/^\d+$/.test(field)) {
                chaceData.version = field;
                //其他的都认为是需要主动做数据双向绑定处理的，最好是DOM元素否则会报错，至于其他类型等以后再加
            } else {
                binding(field, value)
            }
            return;
        }

        //field可能是a.b这样的结构所以需要拆分
        field = field.trim().replace(/_/g, '.');

        if (field[0] === '>') {
            return chaceData.temp[field.slice(1)];
        }

        //如果有两个参数，就是存数据
        if (value) {
            //如果以.结束的field是为了把value在包裹一下
            if (field[field.length - 1] === '.') {
                var $value = value;
                field = field.slice(0, field.length - 1);
                value = function () { return $value; };
            }
            chaceData.temp[field] = value;

        } else {
            if (!Object.getOwnPropertyNames(chaceData.data).length) {
                var temp = chaceData.temp;
                chaceData.temp = {};
                Object.keys(temp).sort(function (a, b) { return a.length - b.length; }).forEach(function (field) {
                    chaceData.temp[field] = temp[field];
                });
            }

            //如果第一个参数为假时返回整个缓存
            if (!field) {
                return chaceData.data;
                //如果temp里面已经有了就可以计算出缓存值
            } else if (chaceData.temp[field]) {
                var tempField, fields = field.split('.'), lastField = fields.pop(), chaceTempData = chaceData.data;
                value = chaceData.temp[field];

                while (fields.length) {
                    tempField = fields.shift();
                    chaceTempData = chaceTempData[tempField] = chaceTempData[tempField] || {};
                }
                if (!chaceTempData[lastField] && value) {
                    if (typeof value === 'function' || (value instanceof Array && typeof value[value.length - 1] === 'function')) {
                        var parameters = [];
                        if (typeof value === 'function') {
                            var str = value.toLocaleString().slice(value.toLocaleString().indexOf('(') + 1, value.toLocaleString().indexOf(')'));
                            parameters = str ? str.split(',') : [];
                        } else {
                            var fn = value.pop();
                            parameters = value;
                            value = fn;
                        }

                        for (var i = 0; i < parameters.length; i++) {
                            if (parameters[i].trim().toLocaleLowerCase() === 'self') {
                                parameters[i] = chaceData.data[field.split('.')[0]];
                            } else {
                                parameters[i] = ehuanrum(parameters[i].trim());
                            }
                        }
                        chaceTempData[lastField] = value.apply(value, parameters);
                    } else {
                        chaceTempData[lastField] = value;

                    }
                }
            }

            for (var f in chaceData.temp) {
                if (f !== field && check(f.split('.'), field.split('.'))) {
                    ehuanrum(f);
                }
            }

            var $fields = field.split('.'), $chaceTempData = chaceData.data;
            while ($fields.length > 1) {
                $chaceTempData = $chaceTempData[$fields.shift()];
            }
            return $chaceTempData[$fields.shift()];
        }

        function check(bases, news) {
            for (var ck = 0; ck < news.length; ck++) {
                if (bases[ck] !== news[ck]) {
                    return false;
                }
            }
            return true;
        }
    }

    function filter(str) {
        str = str.replace(/\$\S*\$/, '');
        return str.split(/\s+/).map(function (c) {
            return c[0].toLocaleUpperCase() + c.slice(1);
        }).join('');
    }

    function _realValue(){
        for(var i=0;i<arguments.length;i++){
            if(arguments[i]){
                return arguments[i];
            }
        }
        for(var j=0;j<arguments.length;j++){
            if(arguments[j] !== undefined){
                return arguments[j];
            }
        }
        
    }

    function _event(scope) {
        var templist = [];
        return function (fn) {
            if (typeof fn === 'function' && arguments.length === 1) {
                templist.push(fn);
            } else {
                var args = arguments;
                templist.forEach(function (i) { i.apply(scope, args) });
            }
        }
    }

    //完成菜单和路由的构建，它是不对外公开的,若外部定义了相关的menuAction操作就用外部的，否则就用默认的
    function __createMenu(menus, router, go, hash) {
        var element = document.createElement('ul');
        Object.keys(menus).forEach(function (m) {
            var menuElement = document.createElement('div');
            var menuSpan = createElement(m, menus[m], (hash || '') + '/' + m.replace(/\$\S*\$/, ''));
            element.appendChild(menuElement);
            menuElement.appendChild(menuSpan);
            if (Object.keys(menus).length) {
                var childMenu = __createMenu(menus[m], router, go, (hash || '') + '/' + m.replace(/\$\S*\$/, ''));
                menuElement.appendChild(childMenu);
                menuSpan.addEventListener('click', menuAction(menuSpan, childMenu, m.replace(/\$\S*\$/, '')));
            }
        });
        return element;


        function menuAction(menuSpan, childMenu, m) {
            if (ehuanrum('menuAction')) {
                return function () {
                    ehuanrum('menuAction')(m, menuSpan, childMenu);
                };
            } else {
                childMenu.style.display = new RegExp('#' + (hash || '') + '/' + m).test(location.hash) ? 'block' : 'none';
                return function () {
                    Array.prototype.forEach.call(this.parentNode.parentNode.children, function (menuEle) {
                        Array.prototype.forEach.call(menuEle.getElementsByTagName('UL'), function (ul) {
                            ul.style.display = 'none';
                        });
                    });
                    childMenu.style.display = childMenu.style.display === 'none' ? 'block' : 'none';
                }
            }
        }

        function createElement(name, menu, fullHash) {
            var parent = document.createElement('span');
            parent.innerHTML = ehuanrum('filter')(name);
            if (ehuanrum('filter.menu')) {
                parent.innerHTML = ehuanrum('filter.menu')(parent.innerHTML, name);
            }

            parent.addEventListener('click', function () {
                if (location.hash !== '#' + fullHash) {
                    go(fullHash, name);
                }
            });
            router[fullHash] = menu;
            return parent;
        }
    }

    function __getOwnPropertyDescriptor(obj, field) {
        if (field in obj) {
            while (obj) {
                if (Object.getOwnPropertyDescriptor(obj, field)) {
                    return Object.getOwnPropertyDescriptor(obj, field);
                } else {
                    obj = obj.__proto__;
                }
            }
        }
        return { enumerable: true };
    }

    //计算表达式需要关注里面的每一个变量
    function _descriptorFileds(data, expression, fn) {
        expression.replace(/\'((?!\').)*\'/g, '').split(/[+\-*/%\|\&\(\)=\?\:,!><]/).filter(function (i) { return !!i.trim(); }).forEach(function (fi) {
            if (/\[.*\]/.test(fi)) {
                fi.match(/\[[0-9a-zA-Z\.]*\]/g).forEach(function (f) {
                    fi = fi.replace(f, '.' + $value(data, f.replace(/[\[\]]/g, '')));
                });
            }

            var td = data;
            fi.split('.').forEach(function (f) {
                de(td, f.trim());
                td = td[f] || {};
            });
        });
        setTimeout(function () {
            fn();
        }, 500);

        function de(td, tf) {
            var descriptor = __getOwnPropertyDescriptor(td, tf);
            Object.defineProperty(td, tf, {
                configurable: true,
                enumerable: descriptor.enumerable,
                set: function (val) {
                    if (descriptor.set) {
                        descriptor.set(val);
                    } else {
                        descriptor.value = val;
                    }
                    fn();
                },
                get: function () {
                    return [descriptor.get && descriptor.get() , descriptor.value , $value(td.__proto__, tf)].sort(function(a,b){
                        return [false,0,'',null,undefined].indexOf(a) - [false,0,'',null,undefined].indexOf(b);
                    }).shift();
                }
            });
        }
    }

    //给对象设值或取值，field可以是复杂的路径:a.b.0.a
    function $value($obj, $field, $value) {
        if (!/^[0-9a-zA-Z\._$@]*$/.test($field)) {
            //计算表达式
            return _eval($obj, $field.replace(/\s+/mg,' '), valuer);
        } else {
            //取值
            return valuer($obj, $field, $value);
        }

        function valuer(obj, field, value) {
            field = field || '';
            var fields = field.trim().split('.');
            if (!obj) {
                return;
            }
            if (obj instanceof HTMLElement && ((!fields[0] in obj) && obj.hasAttribute(fields[0]))) {
                var newObj = obj.attributes[fields[0]];
                fields[0] = 'value';
                return valuer(newObj, fields.join('.'), value);
            }
            if (field instanceof Array) {//获取一个真值
                for (var i = 0; i < field.length; i++) {
                    if ((typeof obj[field[i]] === 'number') || obj[field[i]]) {
                        return obj[field[i]];
                    }
                }
                if (!(typeof obj === 'object')) {
                    return obj;
                } else {
                    return null;
                }
            }

            while (fields.length > 1) {
                if (!fields[0].trim()) {
                    fields.shift();
                } else {
                    obj = fill(obj, fields.shift(), true);
                }
            }
            if (!(typeof value === 'undefined')) {
                fill(obj, fields.shift(), true, value);
            } else {
                return fill(obj, fields.shift(), false);
            }
        }

        function fill(ent, tempField, run, val) {
            if (!/\[\d+\]/.test(tempField)) {
                if (run) {
                    if (typeof val === 'undefined') {
                        if (!ent[tempField]) {
                            ent[tempField] = {};
                        }
                    } else {
                        ent[tempField] = val;
                    }
                    ent = ent[tempField];
                } else {
                    return ent[tempField];
                }
            } else {
                var fieldT = tempField.replace(/\[\d+\]/g, '');
                if (fieldT) {
                    ent = ent[fieldT] = ent[fieldT] || [];
                }
                Array.prototype.map.call(tempField.match(/\[\d+\]/g), function (v, i, list) {
                    v = v.replace('[', '').replace(']', '');
                    if (i < list.length - 1) {
                        ent = ent[v] = ent[v] || [];
                    } else {
                        if (run) {
                            ent = ent[v] = (!(typeof val === 'undefined') ? val : ent[v] || {});
                        } else {
                            return ent[v];
                        }
                    }
                });
            }
            return ent;
        }
    }

    //用作双向绑定的功能部分
    function binding(elements, data, parentNode, controller) {
        if (typeof parentNode === 'string') {
            chaceData.content.innerHTML = '';
            location.hash = '#' + parentNode.replace(/\./g, '/')
            parentNode = null;
        } else if (typeof parentNode === 'function') {
            controller = parentNode;
            parentNode = null;
        }
        if (typeof data === 'function') {
            controller = data;
            data = {};
        }

        if (typeof elements[0] === 'string' && typeof elements[1] === 'object') {
            Object.keys(elements[1]).forEach(function (k) {
                elements[0] = elements[0].replace(new RegExp('\\{\\s*' + k + '\\s*\\}', 'g'), elements[1][k] || '');
            });
            elements = elements[0];
        }
        if (typeof elements === 'string') {
            elements = createElement(elements);
            elements.forEach(function (element) {
                (parentNode || chaceData.content).appendChild(element)
            });
        }
        if (data && !(elements instanceof Array) && !(elements instanceof HTMLElement)) {
            throw new Error('element必须是DOM元素。');
        }

        data = data || {};
        initBindingDefineProperty();
        //先扩展element保证后面initBindingElement里面可用
        extendElement(elements, data);
        if (elements instanceof Array) {
            elements.forEach(function (element) {
                extendElement(element, data);
                initBindingElement(element);
            });
        } else {
            initBindingElement(elements);
        }

        data.$eval();
        return elements;

        function _$extend(oldObject, newObject, pros) {
            var fromPros = pros, toPros = pros;
            if (!(pros instanceof Array)) {
                fromPros = Object.keys(pros);
                toPros = Object.values(pros);
            }
            toPros.forEach(function (to, i) {
                var from = fromPros[i], tempData = $value(oldObject, from);
                Object.defineProperty(oldObject, from, {
                    configurable: true,
                    enumerable: true,
                    set: function (val) {
                        $value(newObject, to, val);
                    },
                    get: function () {
                        return $value(newObject, to);
                    }
                });
                Object.defineProperty(newObject, to, {
                    configurable: true,
                    enumerable: true,
                    set: function (val) {
                        tempData = val;
                    },
                    get: function () {
                        return tempData;
                    }
                });
            });
            return newObject;
        }

        function initBindingDefineProperty() {
            if (!data.$eval || (data.$eval === data.__proto__.$eval)) {

                Object.defineProperty(data, '$id', { value: ++chaceData.binding$id });
                Object.defineProperty(data, '$destroy', { value: _event(data) });
                Object.defineProperty(data, '$eval', { value: _event(data) });
                Object.defineProperty(data, '$real', { value: function () { return JSON.parse(JSON.stringify(data) || 'null'); } });
                Object.defineProperty(data, '$extend', { value: function (newObject, pros) { return _$extend(data, newObject, pros); } });
                Object.defineProperty(data, '$value', { value: function (filed,value) { return $value(data, filed,value); } });


                if (controller) {
                    controller(data, elements);
                }
                if (data === global) { return; }//不给window/global添加set/get
                Object.keys(data).filter(function (i) { return typeof data[i] !== 'function' && !(data[i] instanceof Node); }).forEach(function (pro) {
                    var oldVal = data[pro], descriptor = __getOwnPropertyDescriptor(data, pro) || {};
                    Object.defineProperty(data, pro, {
                        configurable: true,
                        enumerable: descriptor.enumerable,
                        set: function (val) {
                            oldVal = val;
                            if (descriptor.set) {
                                descriptor.set(val);
                            }
                            data.$eval();
                        },
                        get: function () {
                            var getValue = (descriptor.get && descriptor.get());
                            return typeof getValue === 'number' ? getValue : (getValue || oldVal);
                        }
                    });
                });
            }
        }

        function initBindingElement(element) {
            //把[]关起来的属性设置双向绑定
            var controls = ehuanrum('control');

            Array.prototype.filter.call(element.attributes || [], function (attr) {
                /*ng,Vue都支持这个*/ /*ng,Vue属性*/ /*ng,Vue事件*/
                return /\{\{.*\}\}/.test(attr.value) || /^\[.+\]$/.test(attr.name) || /^:.+$/.test(attr.name) || /^\(.+\)$/.test(attr.name) || /^@.+$/.test(attr.name);
            }).sort(function (a, b) {
                return /:/.test(b.name) - /:/.test(a.name);
            }).forEach(function (attr) {
                if (!/:/.test(attr.name) && !/^\[style\./.test(attr.name) && $value(controls, attr.name.slice(1, -1)) && element.parentNode) {
                    $value(controls, attr.name.slice(1, -1).replace(/[_\-]/g, '.')).call({ defineProperty: _descriptorFileds }, element, data, attr.value);
                } else if (/\{\{.*\}\}/.test(attr.value)) {
                    defineProperty(element, data, $name(element,attr.name), attr.value.replace(/\{\{/g, '').replace(/\}\}/g, ''));
                } else {
                    defineProperty(element, data, $name(element,((/^\(.+\)$/.test(attr.name) || /^@.+$/.test(attr.name)) ? 'on' : '') + attr.name.replace(/^[\[\]\(\):@]/g, '').replace(/[\[\]\(\):@]$/g, '')), attr.value);

                }
                if (!chaceData.binding) {
                    setTimeout(function () {
                        if (/^\[.+\]$/.test(attr.name) || /\{\{.*\}\}/.test(attr.value)) {
                            element.removeAttribute(attr.name);
                        }
                    }, 50);
                }
            });

            if (!element.parentNode || ['SCRIPT'].indexOf(element.tagName) !== -1) { return; }
            initChildren.apply(element, element.childNodes);
        }

        function initChildren() {
            Array.prototype.forEach.call(arguments, function (child) {
                if (child instanceof Element) {
                    if (!child.scope) {
                        binding(child, data);
                        //DOM元素的孩子是否已经绑定过，绑定过就不要在绑定
                    } else if (child.scope() !== data && data !== window) {
                        child.scope().__proto__ = data;
                        data.$eval(child.scope().$eval);
                    }
                } else if (/\{\{.*\}\}/.test(child.data)) {
                    defineProperty(child, data, 'data', child.data.replace(/\{\{/g, '').replace(/\}\}/g, ''));
                }
            });
        }

        function extendElement(element, data) {
            element.scope = function () {
                return data;
            };
            element.update = function (parent, next) {
                if (element instanceof Array) {
                    element.forEach(function (el) {
                        update(el, parent, next);
                    });
                } else {
                    update(element, parent, next)
                }
            };
            element.$emit = function (type) {
                var args = Array.prototype.slice.apply(arguments);
                args[0] = document.createEvent("HTMLEvents");
                args[0].initEvent(type, true, true);
                args[0].data = args;

                if (element instanceof Array) {
                    element.forEach(function (dom) {
                        dom.dispatchEvent(args[0]);
                    });
                } else {
                    element.dispatchEvent(args[0]);
                }

            }

            function update(el, parent, next) {
                if (parent) {
                    if (next) {
                        if (next.before) {
                            next.before(el);
                        } else if (parent.insertBefore) {
                            parent.insertBefore(el, next);
                        }
                    } else {
                        parent.appendChild(el);
                    }
                } else if (el.parentNode) {
                    el.parentNode.removeChild(el);
                    data.$destroy();
                }
            }
        }

        function $name(element,name) {
            var fildEl = element;
            return name.split('.').map(function(n1,i,list){
                var fildName = getAllName(fildEl).filter(function(n){return toName(n1).toLocaleLowerCase() === n.toLocaleLowerCase();}).pop();
                if(fildName){
                    if(i<list.length-1){
                        fildEl = element[fildName];
                    }
                    return fildName;
                }else{
                    return n1;
                }
            }).join('.');

            function toName(name){
                var result = name ,replaces = {
                    class: 'className'
                };
                Object.keys(replaces).forEach(function (field) {
                    result = result.replace(field, replaces[field]);
                });
                result = result.split(/[_\-]/).map(function (i) { return i[0].toLocaleUpperCase() + i.slice(1); }).join('');
                return result[0].toLocaleLowerCase() + result.slice(1);
            }

            function getAllName(elClass){
                if(elClass){
                    return Object.keys(elClass).concat(getAllName(elClass.__proto__));
                }else{
                    return [];
                }
            }

        }

        function createElement(string) {
            var parent = document.createElement('div');
            parent.innerHTML = string;
            return Array.prototype.slice.call(parent.children, 0);
        }

    }



    ///defineProperty,实现双向绑定
    function defineProperty(element, data, field, value) {
        if (!element.parentNode) { return; }
        //关联的element属性名以on开头的都是事件
        if (/^\s*on/.test(field)) {
            events();
            //以a:b这种结构的是循环此时的其他的绑定暂时不需要了
        } else if (/\S+:\S+/.test(field)) {
            foreach(field.split(':'));
            //其他的都是element的普通属性
        } else {
            //简单属性名
            if (/^[0-9a-zA-Z\._$@]*$/.test(value)) {
                if (typeof $value(data, value) === 'function') {
                    $value(element, field, $value(data, value));
                } else {
                    property();
                }
            } else {
                _descriptorFileds(data, value, applyElement);
                data.$eval(applyElement);
            }
        }

        function applyElement() {
            var regExp = /\|\s*[0-9a-zA-Z_$@]+\s*\(?\S*\)?/g;
            var tempV = $value(data, value.replace(regExp, '')) || '';
            if (value.match(regExp)) {
                value.match(regExp).forEach(function (filter) {
                    var filterFn = ehuanrum('filter.' + filter.split('(')[0].replace('|', '').trim());
                    if (filterFn) {
                        if (filter.split(/[\(\)]/g)[1]) {
                            var filterArgs = filter.split(/[\(\)]/g)[1].split(',').map(function (arg) {
                                return $value(data, arg.trim());
                            });
                            tempV = filterFn.apply(ehuanrum('filter'), [tempV].concat(filterArgs));
                        } else {
                            tempV = filterFn(tempV);
                        }
                    }
                });
            }
            if($value(element, field) !== tempV){
                $value(element, field, tempV);
            }
        }

        //on开头的都被认为是事件
        function events() {
            if (field === 'onload') {
                var fn = getFn();
                if (/^[0-9a-zA-Z\._$@]*$/.test(value) && fn) {
                    fn.call(data, element)
                }
            } else {
                element.addEventListener(field.replace('on', '').trim(), function (e) {
                    var fn = getFn(e);
                    if (/^[0-9a-zA-Z\._$@]*$/.test(value) && fn) {
                        fn.apply(data, e.data || arguments)
                    }
                });
            }

            function getFn(e) {
                data.$event = e || window.event;
                data.$element = element;
                var fn = $value(data, value);
                delete data.$event;
                delete data.$element;
                return fn;
            }
        }

        function property() {
            var values = value.split('.'), lastValue = values.pop();
            var descriptor = __getOwnPropertyDescriptor(values.length ? $value(data, values.join('.')) : data, lastValue);
            data.$eval(function () { $value(element, field, $value(data, value)); });
            if (field === 'value') {
                element.addEventListener('keyup', function () {
                    $value(data, value, $value(element, field));
                    data.$eval();
                });
                element.addEventListener('change', function () {
                    $value(data, value, $value(element, field));
                    data.$eval();
                });
                $value(element, field, $value(data, value));
            } else {
                element.addEventListener('click', function (e) {
                    if (field !== 'value' || ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(e.target.nodeName) === -1) {
                        $value(data, value, $value(element, field));
                    }
                    e.target.focus();
                });
            }
            Object.defineProperty(values.length ? $value(data, values.join('.')) : data, lastValue, {
                configurable: true,
                enumerable: descriptor.enumerable,
                set: function (val) {
                    $value(element, field, val);
                    if (descriptor.set) {
                        descriptor.set(val);
                    } else if (descriptor.writable) {
                        descriptor.value = val;
                    }
                },
                get: function () {
                    return _realValue((field === 'value' && element.value) , (descriptor.get && descriptor.get()) , descriptor.value);
                }
            });
        }

        function foreach(fields) {
            var elements = [], nextSibling = element.nextSibling, parentNode = element.parentNode, descriptor = __getOwnPropertyDescriptor(data, value || fields[1]);
            var outerHTML = element.outerHTML.replace('[' + field + ']="' + value + '"', '');
            element.parentNode.removeChild(element);
            descriptor.value = descriptor.value || [];
            Object.defineProperty(data, fields[1], {
                configurable: true,
                enumerable: descriptor.enumerable,
                get: function () {
                    return descriptor.get && descriptor.get() || descriptor.value;
                },
                set: function (val) {
                    if (descriptor.set) {
                        descriptor.set(val);
                    } else {
                        descriptor.value = val;
                    }
                    render(extendArray(val));
                }
            });

            if (value) {
                _descriptorFileds(data, value, function () {
                    descriptor = __getOwnPropertyDescriptor(data, value || fields[1]);
                    render(extendArray($value(data, value || fields[1])));
                });
            }
            if (chaceData.binding) {
                binding(document.createComment(element.outerHTML)).update(parentNode, nextSibling);
            }
            render(extendArray($value(data, value || fields[1])));

            function extendArray(list) {
                if (list instanceof Array) {
                    ['push', 'pop', 'shift', 'unshift','sort'].forEach(function (funName) {
                        Object.defineProperty(list, funName, {
                            configurable: true,
                            value: function () {
                                var result = Array.prototype[funName].apply(list, arguments);
                                render(list);
                                return result;
                            }
                        });
                    });
                    Object.defineProperty(list, 'replace', {
                        configurable: true,
                        value: function () {
                            list.length = 0;
                            Array.prototype.forEach.call(arguments,function(arg){
                                Array.prototype.push.apply(list, arg||[]);
                            });
                            render(list);
                            return list;
                        }
                    });
                }
                return list;
            }

            function render(vals) {
                elements.forEach(function (it,index) {
                    if(vals[index] !== it.t){
                        it.e.update();
                    }
                });
                elements = map(vals || [], function (item, i, obj, da) {
                    var bindElement = (elements.filter(function (it) { return it.t === item; })[0] || { t: item, e: bindElement });
                    if (!bindElement.e || bindElement.e.scope().item !== bindElement.t) {
                        if (typeof i === 'number') {
                            Object.defineProperty(da, '$index', {
                                enumerable: false,
                                get: function () {
                                    return map($value(data, fields[1]) || [], function (x) { return '' + JSON.stringify(x); }).indexOf('' + JSON.stringify(item));
                                }
                            });
                        }
                        Object.defineProperty(da, fields[0], {
                            configurable: true,
                            enumerable: true,
                            get: function () {
                                return vals[i];
                            },
                            set: function (val) {
                                vals[i] = val;
                            }
                        });
                        da.__proto__ = data;
                        bindElement.e = binding(outerHTML, da);
                        bindElement.e.update(parentNode, nextSibling);
                        data.$eval(function(){da.$eval.apply(da,arguments);});
                    } else {
                        bindElement.e.update(parentNode);
                        bindElement.e.scope().$eval();
                    }

                    return bindElement;
                });

                function map(obj, fn) {
                    if (obj.length) {
                        return Array.prototype.map.call(obj, function (v, i, list) {
                            return mapEach(v, i, i, list.length);
                        });
                    } else if (obj && typeof obj === 'object') {
                        return Array.prototype.map.call(Object.keys(obj), function (k, i, list) {
                            return mapEach(obj[k], k, i, list.length);
                        });
                    }
                    return [];

                    function mapEach(val, pro, index, count) {
                        var result = { $index: pro };
                        Object.defineProperty(result, '$first', { value: index === 0 });
                        Object.defineProperty(result, '$last', { value: index + 1 === count });
                        return fn(val, pro, obj, result);
                    }
                }
            }
        }

    }


})(this,function (_obj, _str, _valuer) {
    with (_obj) {
        return eval(_str);
    }
}));

/**
 * Created by Administrator on 2017/3/28.
 */
(function ($e) {
    'use strict';

    //功能部分
    $e('functions.color', function () {
        //根据index计算出一种颜色
        return function (index) {
            if (!index) {
                var color = Math.floor(Math.random() * 256 * 256 * 256).toString(16).slice(-6);
                while (color.length < 6) {
                    color = 0 + color;
                }
                return '#' + color;
            } else {
                if (typeof index !== 'number') {
                    index = 0;
                    Array.prototype.forEach.call('' + index, function (i) {
                         index = index + i.charCodeAt(); 
                    });
                }
                return '#' + new Date(10000).setYear(index).toString(16).slice(-8, -2);
            }
        };
    });

    $e('functions.event', function () {
        //构建一个事件对象
        return function (scope) {
            var thenlist = [];

            function push(fn){
                thenlist.push(fn);
                return push;
            }
            return Object.create({
                in: push,
                out: function (fn) {
                    if (!fn) { return; };
                    thenlist = thenlist.filter(function (i) {
                        return (typeof fn === 'function' && i !== fn) ||
                            (typeof fn === 'string' && i.name !== fn)
                    });
                },
                fire: function () {
                    var args = arguments;
                    thenlist.forEach(function (fn) { fn.apply(scope, args); });
                }
            })
        }
    });

    $e('functions.style', function () {
        var style = document.createElement('style');
        style.id = 'functions.style';
        document.head.appendChild(style); 
        return function (content) {
            style.innerHTML += '\r\n' + content;
        };
    });

})(window.$ehr);
/**
 * Created by Administrator on 2017/3/28.
 */
(function ($e) {
    'use strict';

    //功能部分
    $e('random', function () {
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
            length = (Array(length[1].length).join('0') + Math.floor(+ (length[0]) + Math.random() * (length[1] - length[0]))).slice(- length[1].length);
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

        function getValue(model){
            return ({
                date:new Date(),
                host:location.host
            })[model.toLocaleLowerCase()];
        }

        function initChar(model) {
            while (/\-/.test(model)) {
                var start = model[model.indexOf('-') - 1] || '';
                var end = model[model.indexOf('-') + 1] || '';
                model = model.replace(start + '-' + end, chars.slice(chars.indexOf(start || chars[0]), chars.indexOf(end || chars[chars.length - 1])));
            }
            return model[Math.floor(Math.random() * model.length)];
        }
    });

})(window.$ehr);