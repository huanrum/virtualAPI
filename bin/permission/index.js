

module.exports = (function(){
    var permission = [undefined,''];

    return function action(request,response){
        return new Promise(succ => {
            succ(); 
            // if(permission.indexOf(request.headers.token) !== -1){
            //     succ(); 
            // }else{
            //     succ({
            //         code:403,
            //         message:'没有权限'
            //     });
            // }
        });
    };

})();