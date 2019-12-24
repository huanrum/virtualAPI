var fs = require('fs');
var path = require('path');

module.exports = (function () {
    var replaces = [
        'document->html','body->body','p->div','t->p','tbl->tabel','tr->tr','tc->td'
    ];
    return function (helper, file) {
        return new Promise(succ => {
            helper.initModule('adm-zip').then(function (AdmZip) {
                var zip = new AdmZip(file);
                var contentXml = zip.readAsText("word/document.xml");


                //标签
                replaces.forEach(function(replace){
                    var _replace = replace.split('->');
                    contentXml = contentXml.replace(new RegExp('w:'+_replace[0] + '((?![a-zA-Z0-9]).)+','g'), function(str){
                        return str.replace('w:'+_replace[0],_replace[1]);
                    });
                });


                //图片
                contentXml = contentXml.replace(/<wp:docPr ((?!\/).)+\/>/g, function (str) {
                    var id = /id="(\d+)"/.exec(str)[1];
                    try {
                        return `<img src="data:image/png;base64,${Buffer(zip.readFile('word/media/image'+id+'.png')).toString('base64')}">`;
                    } catch (e) {
                        return '';
                    }

                });

                //下载
                contentXml = contentXml.replace(/<body((?!>).)*>/, function (str) {
                    return `
                <head>
                    <title>${path.basename(file)}</title>
                </head>
                ` + str + `
                <div style="text-align: center;font-weight: 600;color: #00aaef;font-size: 26px;">
                    文档解析成html有变形，请下载查看！
                </div>
                <script>

                </script>`;
                });
                contentXml = contentXml.replace(/<\/body>/, function (str) {
                    return `
                    <style>
                        #download {
                            position: fixed;
                            top: 50px;
                            left: 200px;
                            background: #00AAEF;
                            color: #ffffff;
                            padding: 2px;
                            border-radius: 8px;
                        }
                    </style>
                    <div id="download">下载该文件</div>
                    <script>
                        document.getElementById('download').onclick = function(){
                            if(confirm('确定下载这个文件？')){
                                window.open(location.href.split('?').shift());
                            }
                        };
                    </script>
                ` + str;
                });

                succ(contentXml);

            });
        });
    };
})();