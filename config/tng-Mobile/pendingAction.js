var tempData = new Date('2017-04-18');
var deleteList = [];

module.exports = {
    "tngMobile/consumer/get-pending-item-list": function (data, parameters, bodyData) {
        switch (parameters.test) {
            case 'file':
                return '[data/get-pending-item-list.json]';
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
                parameters.castoff = deleteList.join('+');
                return data;
        }
    },
    "tngMobile/consumer/delete-pending-item": function (data, parameters, bodyData) {
        deleteList.push(parameters.pendingItemId);
        return data;
    }
}