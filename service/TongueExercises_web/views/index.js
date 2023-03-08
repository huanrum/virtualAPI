var fs = require("fs");

var helper = require('./../../../bin/helper');

module.exports = {
    fn: views,
    extend: extend
};

function views(file, content, merge, debug, request) {
    var extendScript = '';
    if(fs.existsSync(__dirname + '/../data/account.json')){
        var accounts = JSON.parse(fs.readFileSync(__dirname + '/../data/account.json').toString());
        extendScript = [
            '<script>',
            '   var accounts = ' + JSON.stringify(accounts,null,4) + ';',
            '   var account = accounts.filter(function(i){return i.username===sessionStorage[\'[TongueExercises]/username\'];}).pop() || accounts[0];',
            '   sessionStorage[\'[TongueExercises]/username\']=sessionStorage[\'[TongueExercises]/username\'] || account.username;',
            '   sessionStorage[\'[TongueExercises]/password\']=sessionStorage[\'[TongueExercises]/password\'] || account.password;',
            '   window.baseurl = account.url;',
            '</script>'
        ].join('\n');
    }
    
    if(/\\dist\\/.test(file)){
        return content
    }else{
        return helper.replaceHtml(content, [
            '<script  src="../base.js"></script>',
            '<script  data-main="index" src="require.js"></script>',
            extendScript,
        ]).replace('require(\'./index.js\');', '//调试').replace('index.css','../dist/index.css');
    }
}

function extend(file, content, request) {
    if (/require\.js/.test(file) ||/base\.js/.test(file) || /\\dist\\/.test(file) || /\\lib\\/.test(file)) {
        return content;
    } else {
        return `//调试\r\ndefine(function (require, exports, module) {\r\n\r\n${content}\r\n\r\n\r\n\r\n});`;
    }
}