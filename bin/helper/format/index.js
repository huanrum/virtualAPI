
module.exports = (function(){
  return {
    dateFomet: function(date, format){
      [
        ['YYYY', date.getFullYear()],
        ['MM', date.getMonth() + 1],
        ['DD', date.getDate()]
      ].forEach(function(item){
        format = format.replace(item[0], (Array(item[0].length).fill(0) + item[1]).slice(-item[0].length))
      }) 
      return format;
    },
    base64: function(str, fromTo){
      if(fromTo){
        return new Buffer.from(str).toString('base64');
      } else {
        return new Buffer.from(str, 'base64').toString();
      }
    }
  };
})();
