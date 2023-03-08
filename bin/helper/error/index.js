

module.exports = (function () {

    return {
        /**
         * 404
         */
        403: function(options, message){
            return `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="X-UA-Compatible" content="ie=edge">
                    <title>Error 403</title>
                </head>

                <body>
                    <div style="text-align: center;font-size: 26px;color: #ff3333;margin: 4em 0 1em;">${message}</div>
                    <div style="margin: 0.5em 4em;">请联系管理员</div>
                </body>
            </html>
        `;
        },
        /**
             * 404
             */
        404: function (options,message) {
            return `
                <!DOCTYPE html>
                <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <meta http-equiv="X-UA-Compatible" content="ie=edge">
                        <title>Error 404</title>
                    </head>

                    <body>
                        <div style="text-align: center;font-size: 26px;color: #ff3333;margin: 4em 0 1em;">${message}</div>
                        <div style="margin: 0.5em 4em;">请检查地址是否正确，如需添加请去<a href="http://${options.ip}:${options.port}/bin/config/index.html">配置页面</a>添加相关地址</div>
                    </body>
                </html>
            `;
        }
    };

})();