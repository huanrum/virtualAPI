
module.exports = {
    "_tngMobile/merchant-dollar/exchange-merchant-dollar": function (data, parameters, bodyData) {
        var entity = JSON.parse(parameters.detail);
        if (entity.amount < 500) {
            data.status = "fail";
            switch (entity.amount) {
                case 100:
                    data.errorCode = "0018";
                    break;
                case 200:
                    data.errorCode = "0099";
                    break;
            }
        }
        return data;
    }
}