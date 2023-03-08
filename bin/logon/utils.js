var helper = require('../helper');

module.exports = (function utils() {
  var loginList = {};

  return {
    all: extendFn(all),
    logon: extendFn(logon),
    logout: extendFn(logout)
  }

  function extendFn(fn) {
    return request => {
      return new Promise((resolve, reject) => {
        var clientIp = /\d+(\.\d+){3}/.exec(helper.clientIp(request));
        var parameters = helper.parameters(request);
        helper.getBodyData(request, true).then(bodyData => {
          try {
            resolve(fn(clientIp ? clientIp[0] : '',JSON.parse(bodyData || 'null') || parameters));
          } catch (e) {
            reject(e);
          }
        }, reject);
      });
    }
  }

  function all() {
    return Object.keys(loginList).map(ip => Object.assign({
      ip: ip
    },loginList[ip]));
  }

  function logon(clientIp, bodyData) {
    if (bodyData) {
      loginList[clientIp] = bodyData;
    }
    return loginList[clientIp] || { message: 'no login' };
  }

  function logout(clientIp, parameters) {
    delete loginList[parameters.ip || clientIp];
    return true;
  }

})();
