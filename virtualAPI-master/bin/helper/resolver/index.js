var doc = require('./doc');


module.exports = (function () {

    var dataCache = [];

    manage(/\.(doc|docx)$/, doc);

    return manage;

    function manage(regular, resolver) {
        if(!regular){
            return dataCache.map(i=>i.regular);
        }else{
            if (resolver) {
                dataCache.push({
                    regular: regular,
                    resolver: resolver
                });
            } else {
                return new Promise(succ=>{
                    var _resolver = dataCache.filter(function (i) {
                        return i.regular === regular.split('.').pop() || (i.regular.test && i.regular.test(regular));
                    }).pop();
                    if (_resolver) {
                        _resolver.resolver(this,regular).then(succ);
                    } else {
                        succ(`
                            <div style="color:red;">没有相关的解析器</div>
                        `);
                    }
                });
            }
        }
    }

})();