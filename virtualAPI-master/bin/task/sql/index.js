

module.exports = (function(){

    return {
        select:select,
        insert:insert,
        update:update
    };

    function select(id){
        
        return 'select id,description,value,status,insertdate from TaskList where parent=\'' + (url||'') + '\' order by insertdate desc'
    }

    function insert(){
        
    }

    function update(){
        
    }
})();