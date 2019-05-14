var getLastHttpRequest = require('./util_http.js').getLastHttpRequest;

module.exports = {
    InternalError: InternalError
};

function InternalError(code, message, ...args) {
    Error.captureStackTrace(this, this.constructor);
    this.errorCode = code;
    this.name = this.constructor.name;
    this.additionalArguments = null;
    this.message = message;
    this.lastHttpRequest = getLastHttpRequest();
    if (args)
        this.additionalArguments = args;
  };

InternalError.prototype.toString = function() {
    return this.errorCode.toString() + ' - ' + this.message + this.additionalArguments ? JSON.stringify(this.additionalArguments) : '' + ' ' + this.stack;
};

InternalError.Codes = {
    RANDOM: 0,
    ACCESS_CODE_WRONG: 1,
    API_DISABLED: 2,
    API_NOT_AVAILABLE: 3
}

require('util').inherits(InternalError, Error);

