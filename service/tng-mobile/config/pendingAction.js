var tempData = new Date('2017-04-18');
var deleteList = [];

module.exports = {
    "_tngMobile/consumer/get-pending-item": function (data, parameters, bodyData) {
        switch (parameters.test) {
            case 'random':
                parameters.castoff = deleteList.join('+');
                return data;
            case 'no':
                return {
                    "status": "success",
                    "errorCode": null,
                    "errorEN": null,
                    "errorZhHK": null,
                    "errorZhCN": null,
                    "action": null,
                    "pendingItems": []
                };
            default:

                return '[../data/get-pending-item-list.json]';
        }
    },
    "_tngMobile/consumer/delete-pending-item": function (data, parameters, bodyData) {
        deleteList.push(parameters.pendingItemId);
        return data;
    }
}