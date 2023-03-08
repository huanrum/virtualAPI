var fs = require("fs");
var path = require('path');


module.exports = (function () {

    return {
        /**
         * 创建路径
         */
        mkdirs: function (dirpath) {
            if (dirpath && !fs.existsSync(dirpath)) {
                this.mkdirs(path.dirname(dirpath));
                fs.mkdirSync(dirpath);
            }
        },
        /**
         * 删除文件
         */
        rmdirs: function(_path, check = (()=>true)) {
            var self = this;
            try{
                if( fs.existsSync(_path) ) {
                    if (fs.statSync(_path).isDirectory()){
                        fs.readdirSync(_path).forEach(function(file){
                            var curPath = _path + "/" + file;
                            if(fs.statSync(curPath).isDirectory()) { // recurse
                                self.rmdirs(curPath, check);
                            } else { // delete file
                                check(curPath) && self.rmfile(curPath);
                            }
                        });
                        fs.rmdirSync(_path);
                    } else {
                        self.rmfile(_path);
                    }
                }
            }catch(e){

            }
        },
        rmfile:function(file){
            try{
                if(fs.existsSync(file) && fs.statSync(file).isFile()){
                    fs.unlinkSync(file);
                    this.rmCount = this.rmCount || 0;
                    this.console(++this.rmCount + ' delete file: ' + file);
                }
            }catch(e){

            }
        },
        /**
         * 读取文件
         */
        readFile: function (_path) {
            if (fs.existsSync(_path)) {
                if(this.filetype(_path) === 'text'){
                    return fs.readFileSync(_path).toString();
                }else{
                    return fs.readFileSync(_path);
                }
            } else {
                return 'null';
            }
        },
        /**
         * 读取文件 
         */
        writeFile: function (_path, data){
            if(/^data:\S+;base64,/.test(data)){
                data = new Buffer(data.replace(/^data:\S+;base64,/,''), 'base64');
                return fs.writeFileSync(_path, data);
            }else{
                if(this.filetype(_path) === 'text'){
                    if(typeof data !== 'string'){
                        data = JSON.stringify(data, null, 4)+ '\n\n';
                    }
                }else{

                }
                return fs.appendFileSync(_path, data);
            }
        },
        readAllFile: function (dir) {
            var files =[];
            if (fs.statSync(dir).isDirectory()){
                fs.readdirSync(dir).forEach(child =>{
                    var childpath = dir +'/'+ child;
                    if (fs.statSync(childpath).isDirectory()){
                        Array.prototype.push.apply(files,this.readAllFile(childpath));
                    } else {
                        files.push(childpath);
                    }
                });
            }
            return files;
        },
        /**
         * 获取目录下的所有文件
         */
        readAllJSFile: function (source, dir, to, exclude) {
            exclude = exclude || function(){};
            if (fs.statSync(dir).isDirectory()) {
                fs.readdirSync(dir).forEach(child => {
                    if(exclude(path.join(dir , child))){return;}
                    if (/\.js$/.test(child)) {
                        source += to(dir, child);
                    } else {
                        source = this.readAllJSFile(source, dir + '/' + child, to, exclude);
                    }

                });
            }
            return source;
        },
        /**
         * 读取目录下所有内容
         */
        readAllJSContent: function (source, dir, exclude) {
            exclude = exclude || function(){};
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                fs.readdirSync(dir).forEach(child => {
                    if(exclude(path.join(dir , child))){return;}
                    if (/\.js$/.test(child)) {
                        source += "\r\n\r\n /****** " + (child) + " ******/ \r\n" + fs.readFileSync(dir + '/' + child, { encoding: 'utf-8' }) + ';';
                    } else {
                        source = "\r\n\r\n" + this.readAllJSContent(source, dir + '/' + child, exclude);
                    }
                });
            }
            return source;
        },
        /**
         * 根据API请求修改文件
         */
        modifyFile:function (file, request, response){
            return new Promise((resolve)=>{
                this.getBodyData(request).then(bodyData =>{
                    if(bodyData && bodyData.length){
                        fs.writeFile(file, bodyData, resolve);
                    }else {
                        var content = fs.readFileSync(__dirname +'/modify.html').toString();
                        response.setHeader('Content-Type', 'text/html;charset=utf-8');
                        content = this.replaceHtml(content, path.basename(file));
                        resolve(this.replaceContent(__dirname, content.replace('${content}',this.readFile(file))));
                    }
                })
            });
        },
        /**
         * 复制文件 
         */
        copyFiles: function(source, target){ 
            try{
                if(fs.existsSync(target)){
                    throw `target(${target}) is exists`;
                }
                if(fs.statSync(source).isDirectory()){
                    this.mkdirs(target);
                    fs.readdirSync(source).forEach(child => this.copyFiles(path.join(source,child),path.join(target,child)))
                } else {
                    fs.writeFileSync(target, fs.readFileSync(source));
                }
            }catch(e){
                this.console(`复制文件失败 ${source}-> ${target}`);
            }
        },
        /**
         * 只可以看出source比target多的和改变的 
         */
        compareFiles: function(source, target){
            try{
                if(!fs.existsSync(target)){
                    return [`${target}`];
                }
                if(fs.statSync(source).isDirectory()){
                    return Array.prototype.concat.apply([], fs.readdirSync(source).map(child => this.compareFiles(path.join(source,child),path.join(target,child))))
                }else {
                    var sourceBuffer = fs.readFileSync(source);
                    var targetBuffer = fs.readFileSync(target);
                    if(sourceBuffer.length !== targetBuffer.length || Array.prototype.filter.call(sourceBuffer,(v,i)=>v!==targetBuffer[i]).length){
                        return [`${source}--> ${target}`];
                    }
                }
            }catch(e){
                        
            }
            return [];
        },
        /**
         * 压缩文件
         */
        zip: function(url, cb){
            var helper = this;
            if(!this.zip.archiverPromise){
                this.zip.archiverPromise = helper.initModule('archiver');
            }
            this.zip.archiverPromise.then(archiver => {
                if(fs.existsSync(url +'.zip')){
                    cb(url);
                } else setTimeout(()=>{
                    var output = fs.createWriteStream(url + '.zip');
                    var archive = archiver('zip');
                        
                    archive.on('error', function (){
                        helper.rmdirs(url + '.zip');
                        cb();
                    });
                    archive.on('end', function (){
                        cb(url);
                    })
                        
                    archive.pipe(output);
                    archive.directory(url, false);
                    archive.finalize();
                });
            });
        }
    };
})();
