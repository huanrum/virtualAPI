var fs = require("fs");
var path = require('path');

var helper = require('./../../../bin/helper');

module.exports = {
    path: helper.config(__dirname + '/../../../views/tng-mobile/'),
    fn:views,
    version:version,
    files:[
        '/commonGZ/js/language.js',
        '/commonGZ/js/components.js',
        '/commonGZ/js/wal_ca.js'
    ]
};


function version(url) {
        var _path = helper.config(__dirname + '/../../../views/tng-mobile/') + '/../builds/' + url + '.zip';
        if (fs.existsSync(_path)) {
            return fs.statSync(_path);
        } else {
            return '';
        }
    }


function views(file,content,merge){

    var basePath = path.join(__dirname + '/../../../');

    return content.replace(/<body((?!>).)*>/, function (str) {
        var devPath = helper.config(basePath + '/views/tng-mobile/_dev/dev');
        return str + '\n\t<div id="devJS">\n\t<script src="/views/tng-mobile/_dev/dev.js"></script>\n\t' + 
            helper.readAllJSFile('', devPath, (fullpath, name) => {
                return '\n<script src="@src"></script>\n\t'.replace('@src', fullpath.replace(devPath, '/views/tng-mobile/_dev/dev') + '/' + name);
            }) + '\n\t</div>\n\t';
    })
    .replace(/(<script .*><\/script>)/gi, function (macth) {
        var _file = /src="(.*)"/.exec(macth)[1].split('"').shift().replace('.js', '/').replace('.css', '/');
        var _dir = helper.config(file.replace(/index\.html/, _file));
        if (fs.existsSync(_dir)) {
            if (merge) {
                return macth.replace('.js', '.js?merge=true');
            } else {
                return macth + '\n\t' + helper.readAllJSFile('', _dir, (fullpath, name) => {
                    return '\n<script src="@src"></script>\n\t'.replace('@src', fullpath.replace(file.replace(/index\.html/, ''), '') + '/' + name);
                });
            }
        } else {
            return macth;
        }
    })
    .replace(/\n\s*\t*\s*(\[\s*("|')(js|css)("|')\s*,\s*("|').*("|')\s*\])/gi, function (macth) {
        macth = macth.replace(/\'/g, '"');
        var _file = JSON.parse(macth).pop().replace('.js', '/').replace('.css', '/');
        var _dir = helper.config(file.replace(/index\.html/, _file));
        if (fs.existsSync(_dir)) {
            if (merge) {
                return macth.replace('.js', '.js?merge=true');
            } else {
                return macth + helper.readAllJSFile('', _dir, (fullpath, name) => {
                    return ",\n\t\t\t\t['@type','@src']".replace('@type', JSON.parse(macth).shift()).replace('@src', fullpath.replace(file.replace(/index\.html/, ''), '/').replace(/^\//, '') + '/' + name);
                }) + "\n";
            }
        } else {
            return macth;
        }
    });
}