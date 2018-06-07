(function ($injector, $value) {

    var $wactchList = {};

    /**
     * 数组需要监视的方法
     */
    var arrayExtendPrototypes = ['push', 'pop', 'shift', 'unshift', 'sort'];
    /**
     * 循环指令 [*item]="items"
     */
    var forRegExp = /^\s*\[\s*\*.*\]\s*$/;

    /**
     * 暴露出去的接口
     */
    this.$ehr = $injector;

    /**
     * 用于取值
     */
    $injector('$value', function () {
        return $value;
    });
    /**
     * 组件
     */
    $injector('$control', {});
    /**
     * 数据格式化
     */
    $injector('$filter', function () {
        return function (str) {
            str = str.replace(/\$\S*\$/, '');
            return str.split(/\s+/).map(function (c) {
                return c[0].toLocaleUpperCase() + c.slice(1);
            }).join('');
        };
    });
    /**
     * 实现数据双向绑定
     */
    $injector('$binding', function () {
        return function (html, controller, parentNode) {
            var scope = {};
            if (typeof controller === 'function') {
                scope = controller(scope) || scope;
            } else {
                scope = controller;
            }
            parentNode = parentNode || document.body;
            $injector('$control');
            initElement(html, function (elements) {
                extendScope(scope);
                elements.forEach(function (element) {
                    setTimeout(function () {
                        parentNode.appendChild(element);
                        binding(element, scope);
                    });
                });
            });
        };

        /**
         * 模拟事件
         * @param {作用域} scope 
         */
        function _event(scope) {
            var templist = Array.prototype.slice.call(arguments, 1);
            return function (fn) {
                if (typeof fn === 'function' && arguments.length === 1) {
                    templist.push(fn);
                } else {
                    var args = arguments;
                    templist.forEach(function (i) {
                        i.apply(scope, args);
                    });
                }
            };
        }

        /**
         * 构建DOM
         * @param {url/字符串/Dom} html 
         * @param {回调函数} callBack 
         */
        function initElement(html, callBack) {
            if (typeof html === 'string') {
                if (/\.html$/.test(html)) {
                    fetch(html).then(function (r) {
                        return r.text();
                    }).then(function (text) {
                        callBack(getElements(text));
                    });
                } else {
                    callBack(getElements(html));
                }
            } else {
                if (typeof html.length !== 'number') {
                    html = [html];
                }
                callBack(html.filter(function (i) {
                    return i instanceof HTMLElement;
                }));
            }

            function getElements(content) {
                var div = document.createElement('div');
                div.innerHTML = content;
                return Array.prototype.slice.call(div.childNodes, 0);
            }
        }

        /**
         * 扩展DOM
         * @param {Dom} element 
         * @param {数据} scope 
         */
        function extendElement(element, scope) {
            element.scope = scope;
        }

        /**
         * 扩展Scope
         * @param {数据} scope 
         */
        function extendScope(scope) {
            extendScope.index = extendScope.index || 0;
            var templist = [],
                eventList = {};
            Object.defineProperty(scope, '$id', {
                value: ++extendScope.index
            });
            Object.defineProperty(scope, '$eval', {
                value: _event(scope)
            });
            Object.defineProperty(scope, '$value', {
                value: function (expression, value) {
                    $value(scope, expression, value);
                }
            });
            Object.defineProperty(scope, '$watch', {
                value: function (expression, fn) {
                    $wactch(scope, expression, fn);
                }
            });
            Object.defineProperty(scope, '$extend', {
                value: function (extendObj) {
                    extend();
                }
            });
            Object.defineProperty(scope, '$real', {
                value: function () {
                    return JSON.parse(JSON.stringify(scope));
                }
            });
            Object.defineProperty(scope, '$emit', {
                value: function (type, fn) {
                    if (typeof fn === 'function' && arguments.length === 2) {
                        eventList[type] = eventList[type] || [];
                        eventList[type].push(fn);
                    } else {
                        var args = Array.prototype.slice.call(arguments, 1);
                        (eventList[type] || []).forEach(function (i) {
                            i.apply(scope, args);
                        });
                        if (scope.__proto__ && scope.__proto__.$emit) {
                            scope.__proto__.$emit.apply(scope.__proto__, arguments);
                        }
                    }
                }
            });



            function extend(){
                Object.keys(scope).forEach(function (key) {
                    if (scope[key] instanceof Array) {
                        arrayExtendPrototypes.forEach(function (funName) {
                            var fun = Array.prototype[funName];
                            Object.defineProperty(scope[key], funName, {
                                configurable: true,
                                value: function () {
                                    setTimeout($wactchList[scope.$id + '<>' + key]);
                                    return fun.apply(scope[key], arguments);
                                }
                            });
                        });
                    }
                });
            }

            return scope;
        }

        /**
         * 属性设置双向绑定
         * @param {Dom} element 
         * @param {数据} scope 
         */
        function binding(element, scope) {

            if (element.nodeName === "#text") {
                //文本内容
                if (/\{\{.*\}\}/.test(element.nodeValue)) {
                    bindProperty(element, scope, 'data', element.nodeValue);
                }
            } else {
                var foreachAttribute = Array.prototype.filter.call(element.attributes || [], function (i) {
                    return forRegExp.test(i.name);
                }).pop();

                extendElement(element, scope);

                /* [*item]="items" 循环*/
                if (foreachAttribute) {
                    repartition(foreachAttribute);
                } else {
                    Array.prototype.forEach.call(element.attributes || [], function (attr) {
                        //组件 属性 事件
                        if (/\s*\[.*\]\s*/.test(attr.name)) {
                            var attrName = /\s*\[(.*)\]\s*/.exec(attr.name)[1].trim();
                            //组件
                            if ($injector('$control.' + attrName)) {
                                $injector('$control.' + attrName).call({}, element, scope, attr.value);
                                //事件
                            } else if (/^on/.test(attrName)) {
                                bindEvent(element, scope, attrName.replace(/^on/, ''), attr.value);
                                //属性
                            } else {
                                bindProperty(element, scope, attrName, attr.value);
                            }
                            //属性
                        } else if (/^:.+$/.test(attr.name)) {
                            bindProperty(element, scope, attr.name.replace(/^:/g, ''), attr.value);
                            //事件
                        } else if (/^\(.+\)$/.test(attr.name)) {
                            bindEvent(element, scope, attr.name.replace(/[\(\)]/g, ''), attr.value);
                            //事件
                        } else if (/^@.+$/.test(attr.name)) {
                            bindEvent(element, scope, attr.name.replace(/^@/g, ''), attr.value);
                        } else {
                            //属性
                            if (/\{\{.*\}\}/.test(attr.value)) {
                                bindProperty(element, scope, attr.name, attr.value);
                            }
                        }
                    });


                    Array.prototype.forEach.call(element.childNodes, function (el) {
                        binding(el, scope);
                    });
                }
            }



            /**
             * 循环，原来的那个改为注释
             * @param {循环的那个属性} attribute 
             */
            function repartition(attribute) {
                var comment = document.createComment(element.outerHTML);
                element.removeAttribute(attribute.name);
                element.replaceWith(comment);

                var html = element.outerHTML;
                var children = [];

                if (!$value(scope, attribute.value)) {
                    $value(scope, attribute.value, []);
                }

                $wactch(scope, attribute.value, function (data) {
                    var _field = /\[\s*\*(.*)\s*\]/.exec(attribute.name)[1];
                    var _children = children.slice(0);
                    children.forEach(function (el) {
                        el.parentNode.removeChild(el);
                    });
                    children.length = 0;
                    scope.$extend();

                    _foreach(data,function(html, item, index){
                        var findElement = _children.filter(function(i){return i.scope[_field] === item;}).pop();
                        
                        initElement(findElement || html, function (newElements) {
                            newElements.forEach(function (newElement) {
                                if (children.length) {
                                    children[children.length - 1].after(newElement);
                                } else {
                                    comment.after(newElement);
                                }
                                children.push(newElement);
                                if(!findElement){
                                    var childScope = extendScope(Object.create(scope));
                                    Object.defineProperty(childScope, '$index', {
                                        value: index
                                    });
                                    childScope[_field] = item;
    
                                    binding(newElement, childScope);
                                }
                                
                            });
                        });
                    });
                });

                /**
                 * 循环数据
                 * @param {数据} obj 
                 * @param {回调} fn 
                 */
                function _foreach(obj,fn){
                    if (obj && obj.length) {
                        Array.prototype.forEach.call(obj, function (item, index) {
                            fn(html, item, index);
                        });
                    } else {
                        Object.keys(obj || {}).forEach(function (key) {
                            fn(html, obj[key], key);
                        });
                    } 
                }
            }

            /**
             * 绑定相关事件
             * @param {dom} element 
             * @param {数据} scope 
             * @param {dom的属性} field 
             * @param {表达式} expression 
             */
            function bindEvent(element, scope, field, expression) {
                if (field === 'onload') {
                    fire();
                    scope.$eval();
                } else {
                    scope.$emit(field, fire);
                    element.addEventListener(field, fire);
                }

                function fire(e) {
                    var fn = runFn(e);
                    if (/^[0-9a-zA-Z\._$@]*$/.test(expression) && fn) {
                        fn.apply(scope, e ? (e.data || arguments) : element);
                    }
                    //scope.$eval();
                }

                function runFn(e) {
                    scope.$event = e || window.event;
                    scope.$element = element;
                    var fn = $value(scope, expression);
                    delete scope.$event;
                    delete scope.$element;
                    return fn;
                }
            }

            /**
             * 绑定相关属性
             * @param {dom} element 
             * @param {数据} scope 
             * @param {dom的属性} field 
             * @param {表达式} expression 
             */
            function bindProperty(element, scope, field, expression) {
                field = $name(element, field);
                if (field === 'value') {
                    element.addEventListener('keyup', function () {
                        $value(scope, expression, $value(element, field));
                        scope.$eval();
                    });
                    element.addEventListener('change', function () {
                        $value(scope, expression, $value(element, field));
                        scope.$eval();
                    });
                }

                $wactch(scope, expression, function (value) {
                    $value(element, field, value);
                });

                function $name(element, name) {
                    var fildEl = element;
                    return name.split('.').map(function (n1, i, list) {
                        var fildName = getAllName(fildEl).filter(function (n) {
                            return toName(n1).toLocaleLowerCase() === n.toLocaleLowerCase();
                        }).pop();
                        if (fildName) {
                            if (i < list.length - 1) {
                                fildEl = element[fildName];
                            }
                            return fildName;
                        } else {
                            return n1;
                        }
                    }).join('.');

                    function toName(name) {
                        var result = name,
                            replaces = {
                                class: 'className'
                            };
                        Object.keys(replaces).forEach(function (field) {
                            result = result.replace(field, replaces[field]);
                        });
                        result = result.split(/[_\-]/).map(function (i) {
                            return i[0].toLocaleUpperCase() + i.slice(1);
                        }).join('');
                        return result[0].toLocaleLowerCase() + result.slice(1);
                    }

                    function getAllName(elClass) {
                        if (elClass) {
                            return Object.keys(elClass).concat(getAllName(elClass.__proto__));
                        } else {
                            return [];
                        }
                    }

                }
            }

        }


        /**
         * 计算表达式需要关注里面的每一个变量
         * @param {数据} scope 
         * @param {表达式} expression 
         * @param {监视回调} fn 
         */
        function $wactch(scope, expression, fn) {

            var noEmypt = function (i) {
                return !!i.trim();
            };
            var wactchFn = function () {
                fn(null);
            };
            var fields = [];

            if (/{{.*}}/.test(expression)) {
                fields = expression.split('}}').map(i => i.split('{{').pop()).filter(noEmypt);
                wactchFn = function () {
                    var value = expression || '';
                    fields.forEach(function (field) {
                        value = value.replace(new RegExp('{{' + field + '}}', 'g'), $value(scope, field));
                    });
                    fn(value);
                };
            } else {
                fields = expression.replace(/\'((?!\').)*\'/g, '').split(/[+\-*/%\|\&\(\)=\?\:,!><]/).filter(noEmypt);
                wactchFn = function () {
                    fn($value(scope, expression));
                };
            }

            fields.forEach(function (field) {
                var data = scope;
                field.replace(/\[[0-9a-zA-Z\.]*\]/g, function (str) {
                    return '.' + $value(scope, str.replace(/[\[\]]/g, ''));
                }).split('.').forEach(function (f) {
                    defineProperty(data, f.trim(), $value(data, f.trim()));
                    data = data[f] || {};
                });
            });

            scope.$eval(wactchFn);
            setTimeout(wactchFn);

            /**
             * 添加defineProperty 或者添加相关监视回调
             * @param {数据} data 
             * @param {属性} field 
             * @param {值} value 
             */
            function defineProperty(data, field, value) {

                var baseDate = _baseScope(data, field);
                var baseDescriptor = Object.getOwnPropertyDescriptor(baseDate || {}, field);
                var key = (baseDate || data).$id + '<>' + field;
                if (!baseDate || !baseDescriptor || !$wactchList[key]) {
                    $wactchList[key] = _event(data, wactchFn);

                    baseDescriptor = baseDescriptor || {
                        enumerable: true
                    };
                    Object.defineProperty(baseDate || data, field, {
                        configurable: true,
                        enumerable: baseDescriptor.enumerable,
                        set: function (val) {
                            if (baseDescriptor.set) {
                                baseDescriptor.set(val);
                            } else {
                                baseDescriptor.value = val;
                            }
                            value = val;
                            setTimeout($wactchList[key]);
                        },
                        get: function () {
                            return _realValue(value, baseDescriptor.get && baseDescriptor.get(), baseDescriptor.value);
                        }
                    });
                } else {
                    $wactchList[key](wactchFn);
                }
            }

            /**
             * 取出有相关属性的直接对象
             * @param {当前数据} scope 
             * @param {相关属性} field 
             */
            function _baseScope(scope, field) {
                var obj = scope;
                if (field in obj) {
                    while (obj) {
                        if (Object.getOwnPropertyDescriptor(obj, field)) {
                            return obj;
                        } else {
                            obj = obj.__proto__;
                        }
                    }
                }
            }

            /**
             * 取出期望的有效数据
             */
            function _realValue() {
                for (var i = 0; i < arguments.length; i++) {
                    if (arguments[i]) {
                        return arguments[i];
                    }
                }
                for (var j = 0; j < arguments.length; j++) {
                    if (arguments[j] !== undefined) {
                        return arguments[j];
                    }
                }

            }
        }





    });

})(
    //注入器
    (function () {
        var chaceData = {
            temp: {},
            data: {},
            load: [],
            binding$id: 0
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
        return function ehuanrum(field, value) {
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
                    //如果是数组就表示要加载文件
                } else {
                    //其他的都认为是需要主动做数据双向绑定处理的，最好是DOM元素否则会报错，至于其他类型等以后再加
                    ehuanrum('$binding').apply(null, arguments);
                }
                return;
            }

            if (/\.(js|css|html)$/.test(field) || /^https?:\/\//.test(field)) {
                chaceData.files.push(field);
                return;
            }

            //field可能是a.b这样的结构所以需要拆分
            field = field.trim().replace(/_/g, '.');

            if (/^>/.test(field)) {
                return chaceData.temp[field.slice(1)];
            }

            //如果有两个参数，就是存数据
            if (value) {
                //如果以.结束的field是为了把value在包裹一下
                if (/\.$/.test(field)) {
                    var $value = value;
                    field = field.slice(0, field.length - 1);
                    value = function () {
                        return $value;
                    };
                }
                chaceData.temp[field] = value;

            } else {
                if (!Object.getOwnPropertyNames(chaceData.data).length) {
                    var temp = chaceData.temp;
                    chaceData.temp = {};
                    Object.keys(temp).sort(function (a, b) {
                        return a.length - b.length;
                    }).forEach(function (field) {
                        chaceData.temp[field] = temp[field];
                    });
                }

                //如果第一个参数为假时返回整个缓存
                if (!field) {
                    return chaceData.data;
                    //如果temp里面已经有了就可以计算出缓存值
                } else if (chaceData.temp[field]) {
                    var tempField, fields = field.split('.'),
                        lastField = fields.pop(),
                        chaceTempData = chaceData.data;
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

                var $fields = field.split('.'),
                    $chaceTempData = chaceData.data;
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
        };
    })(),
    //值解析
    (function () {
        var _eval = function (_obj, _str, _value) {
            /** jshint W085 */
            /** jshint W061 */
            with(_obj) {
                if (_value === undefined || !/^[0-9a-zA-Z\._$@]*$/.test(_str.trim())) {
                    return eval(_str);
                } else {
                    eval(_str + '=' + getValue(_value));
                }
            }

            function getValue(__value) {
                if (typeof __value === 'object') {
                    return JSON.stringify(__value);
                } else if (/^\s*\d+\s*$/i.test(__value) ||
                    /^\s*(true|false|null|undefined)\s*$/i.test(__value) ||
                    /^\s*\/.+\/\s*$/.test(__value) ||
                    /^\s*\[.+\]\s*$/.test(__value)) {
                    return __value;
                } else {
                    return JSON.stringify(__value);
                }
            }
        };

        //给对象设值或取值，field可以是复杂的路径:a.b.0.a
        return function $value($obj, $field, $value) {
            if (!/^[0-9a-zA-Z\._$@]*$/.test($field)) {
                //计算表达式
                return _eval($obj, $field.replace(/\s+/mg, ' '), $value);
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
                if (field instanceof Array) { //获取一个真值
                    for (var i = 0; i < field.length; i++) {
                        if ((typeof obj[field[i]] === 'number') || obj[field[i]]) {
                            return obj[field[i]];
                        }
                    }
                    if (typeof obj !== 'object') {
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
                if (typeof value !== 'undefined') {
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
                                ent = ent[v] = (typeof val !== 'undefined' ? val : ent[v] || {});
                            } else {
                                return ent[v];
                            }
                        }
                    });
                }
                return ent;
            }
        };
    })()
);