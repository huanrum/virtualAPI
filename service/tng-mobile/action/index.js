var fs = require("fs");
var child_process = require('child_process');


module.exports = (function () {
    var sourceDiv = __dirname + '/../../../';

    return function (cmd, messageFn, _actions) {
        if (/^\/?views\/tng-mobile/.test(_actions[1])) {
            switch (_actions[0].toLocaleLowerCase()) {
                case 'branch':
                    cmd(sourceDiv,messageFn, '', 'git pull && git branch -a');
                    break;
                case 'checkout':
                    cmd(sourceDiv,messageFn, '', 'git checkout ' + _actions[1] + ' && git pull origin ' + _actions[1]);
                    break;
                case 'update':
                    cmd(sourceDiv,messageFn, '', 'git pull origin ' + child_process.execSync('git symbolic-ref --short -q HEAD').toString());
                    break;
                case 'gulp':
                    cmd(sourceDiv,messageFn, _actions[1], 'gulp build --prod --test');
                    break;
                case 'scss':
                    cmd(sourceDiv,messageFn, _actions[1], 'gulp scss');
                    break;
                case 'build':
                    build(cmd,messageFn, _actions[1]);
                    break;
                case 'deploy':
                    deploy(cmd,messageFn, _actions[1]);
                    break;
            }
            return Promise.resolve();
        }
    };



    function deploy(cmd,messageFn, list, target) {
        list = list.split(',').filter(function (i) { return !!i; });
        target = target || '';

        if (!list || !list.length) {
            messageFn('准备上传');
            setTimeout(function () {
                messageFn('!!没有选中ZIP上传');
            }, 1000);
        } else {
            messageFn('准备上传' + list.join());
            ftp(sourceDiv + target + '\\..\\builds\\', list, messageFn);
        }
    }

    function build(cmd,messageFn, parent, target) {
        parent = parent.replace(/^\//, '');
        target = target || '';

        messageFn('build');
        setTimeout(function () {
            messageFn('查找哪些需要更新');
            getList(parseInt(parent)).then(function (data) {
                var list = data.filter(function (m) {
                    return !!m && !/(_dev|common|splash)/.test(m) && fs.existsSync(sourceDiv + target + m);
                });
                messageFn('打包所有需要更新的模块');
                Promise.all(list.map(function (m) {
                    var filePath = sourceDiv + target + '\\..\\builds\\' + m + '.zip';
                    if (!fs.existsSync(filePath) || Date.now() - fs.statSync(filePath).mtime > (5 * 60) * 1000) {
                        messageFn('开始打包 ' + m);
                        return cmd(sourceDiv + target,s=>{
                            if(/^!!/.test(s)){
                                messageFn('完成打包 ' + m);
                            }
                        },m,'gulp build --prod --test',false);
                    } else {
                        Promise.resolve();
                    }
                })).then(function () {
                    var needList = list.filter(function (l) {
                        return !fs.existsSync(sourceDiv + target + '\\..\\builds\\' + l + '.zip');
                    });
                    if (needList.length) {
                        messageFn('未能完全打包，现在继续 ' + needList.join());
                        build(messageFn, parent, target);
                    } else {
                        ftp(sourceDiv + target + '\\..\\builds\\', list, messageFn);
                    }
                });
            });
        }, 1000);


        function getList(count) {
            return new Promise(function (succ) {
                var callback = function (list) {
                    list(function (data) {
                        succ(list.filter(i => data.indexOf(i) !== -1));
                    }, messageFn);
                };
                if (!count) {
                    messageFn('打包所有的模块');
                    callback(fs.readdirSync(sourceDiv));
                } else {

                    cmd(sourceDiv + target,s =>{
                        if(/^!!/.test(s)){
                            var list = {};
                            s.replace(/^!!/,'').split('\n').filter(function (i) {
                                return /^\t/.test(i) && !/^\t\S*\s+_dev/.test(i);
                            }).forEach(function (i) {
                                list[i.split(/\s+/).pop().split('/').shift()] = true;
                            });
                            if (Object.keys(list).length) {
                                messageFn('修改过的模块 ' + Object.keys(list).join());
                                callback(Object.keys(list));
                            } else {
                                messageFn('代码已经提交 现在查找最近提交的模块');
                                cmd(sourceDiv + target, d => {
                                    if(/^!!/.test(d)){
                                        var list = {};
                                        d.replace(/^!!/,'').split('\n').filter(function (i) {
                                            return /^\s*\.{3}/.test(i);
                                        }).forEach(function (i) {
                                            list[i.replace(/^\s*\.{3}\/(views)?\/*/, '').split('/').shift()] = true;
                                        });
                                        messageFn('最近提交过的模块 ' + Object.keys(list).join());
                                        callback(Object.keys(list));
                                    }
                                },target,'git pull origin ' + child_process.execSync('git symbolic-ref --short -q HEAD').toString() + '&& git log --stat -n' + count);
                            }
                        }
                    },target,'git pull origin ' + child_process.execSync('git symbolic-ref --short -q HEAD').toString() +' && git status',false);
                }
            });
        }
    }

    function list(callback, message) {
        http.get('http://10.0.101.248/mockapi/VersionEngine/gzdev/Version.json', function (res) {
            var size = 0,
                chunks = [];
            res.on('data', function (chunk) {
                size += chunk.length;
                chunks.push(chunk);
            });
            res.on('end', function () {
                if (/^2/.test(res.statusCode)) {
                    var version = JSON.parse(Buffer.concat(chunks, size).toString());
                    callback(Object.keys(version).map(function (i) {
                        return version[i].unzipPath && version[i].unzipPath.replace(/\/*views\//i, '');
                    }).filter(i => !!i));
                }
            });
        }).on('error', function (e) {
            message('!!网络或服务器异常');
        });
    }

    function ftp(zipPath, modules, message) {

        message('获取所有模块的版本号');
        manageVersion().then(version => {
            var updateVersion = {};
            Promise.all(modules.map(function (m) {
                return new Promise(function (succ) {
                    var moduleName = Object.keys(version).filter(function (i) {
                        return version[i].unzipPath === '/views/' + m;
                    }).pop();
                    if (moduleName) {
                        updateVersion[moduleName] = {
                            minVersion: version[moduleName].minVersion + 1,
                            version: version[moduleName].version + 1
                        };

                        updateZIP(zipPath + m + '.zip', version[moduleName].downloadPath.replace('http:\/\/192.168.1.135', '\\\\192.168.1.135\\htdocs')).then(data => {
                            succ(data);
                        });

                    } else {
                        succ();
                    }
                });
            })).then(function () {
                manageVersion(updateVersion);
            });
        });

        function initFTP(option, readFn) {
            try {
                var client = new (require('ssh2').Client)();
                client.on('ready', function () {
                    readFn(client);
                });
                client.connect(option);
            } catch (e) {
                child_process.exec('npm install ssh2', function (err, stdout, stderr) {
                    ftp(zipPath, modules, message);
                });
            }
        }

        function manageVersion(upVersion) {
            return new Promise(function (succ) {
                http.get('http://10.0.101.248/mockapi/VersionEngine/gzdev/Version.json', function (res) {
                    var size = 0,
                        chunks = [];
                    res.on('data', function (chunk) {
                        size += chunk.length;
                        chunks.push(chunk);
                    });
                    res.on('end', function () {
                        if (/^2/.test(res.statusCode)) {
                            var version = JSON.parse(Buffer.concat(chunks, size).toString());
                            if (upVersion) {
                                Object.keys(upVersion).forEach(function (i) {
                                    version[i].minVersion = Math.max(upVersion[i].minVersion, version[i].minVersion);
                                    version[i].version = Math.max(upVersion[i].minVersion, version[i].minVersion);
                                });
                                updateVersion(version);
                            }

                            succ(version);
                        }
                    });
                }).on('error', function (e) {
                    message('!!网络或服务器异常');
                });
            });
        }

        function updateVersion(version) {
            message('修改所有模块的版本号');

            fs.writeFileSync(zipPath + 'Version.json', JSON.stringify(version, null, 4));
            message('上传版本号');
            initFTP({
                host: '10.0.101.248',
                username: 'gzdev',
                password: 'sino1234'
            }, function (ftpClient) {
                ftpClient.sftp(function (err, sftp) {
                    if (err) {
                        message('!!' + err.message);
                    } else {
                        sftp.fastPut(zipPath + 'Version.json', '/home/gzdev/mockapi/VersionEngine/gzdev/Version.json', function (err, result) {
                            ftpClient.end();
                            message('!!');
                        });
                    }
                });

            });
        }

        function updateZIP(origin, target) {
            return new Promise(function (succ) {
                var readStream = fs.createReadStream(origin);
                var writeStream = fs.createWriteStream(target);
                readStream.pipe(writeStream);
                readStream.on('end', function (error) {
                    succ(origin);
                });
            });
        }
    }

})();