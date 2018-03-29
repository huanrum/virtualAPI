export default (function(){

    return function run(getArguments, request, response, bodyData, count=3) {
        response.end(JSON.stringify({message:'mongodb not init'}));
    };

})();