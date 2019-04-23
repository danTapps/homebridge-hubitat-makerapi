
module.exports = {
    InternalError: InternalError
};

function InternalError(code, message, ...args) {
    Error.captureStackTrace(this, this.constructor);
    this.errorCode = code;
    this.name = this.constructor.name;
    this.additionalArguments = null;
    this.message = message;
    if (args)
        this.additionalArguments = args;
  };

InternalError.prototype.toString = function() {
    return this.errorCode.toString() + ' - ' + this.message + this.additionalArguments ? JSON.stringify(this.additionalArguments) : '';
};

InternalError.Codes = {
    RANDOM: 0,
    ACCESS_CODE_WRONG: 1,
    API_DISABLED: 2,
    API_NOT_AVAILABLE: 3
}

require('util').inherits(InternalError, Error);


/*
                                internalError = new InternalError(InternalError.Codes.API_NOT_AVAILABLE, '', error);    
                                errorMessage = 'Hubitat tells me that the MakerAPI instance you have configured is not available (code 404).';
                            }
                            else if (error.statusCode === 401)
                                internalError = new InternalError(InternalError.Codes.ACCESS_CODE_WRONG, '', error);
                                errorMessage = 'Hubitat tells me that your access code is wrong. Please check and correct it.';
                            else if (error.statusCode === 500)
                                internalError = new InternalError(InternalError.Codes.API_DISABLED, '', error);
                                errorMessage = 'Looks like your MakerAPI instance is disabled. Got code 500';
                        }
                        if (internalError === undefined)
                        {
                            internalError = new InternalError(InternalError.Codes.RANDOM, '', error);
                            errorMessage = 'Received an error trying to get the device summary information from Hubitat.' + util.inspect(error, false, null, true);

*/
/*
                if (error.statusCode === 404)
                {
                    that.log.error('Hubitat tells me that the MakerAPI instance you have configured is not available (code 404).');
                }
                else if (error.statusCode === 401)
                {
                    that.log.error('Hubitat tells me that your access code is wrong. Please check and correct it.');
                }
                else if (error.statusCode === 500)
                {
                    that.log.error('Looks like your MakerAPI instance is disabled. Got code 500');
                }
                else
                {
                    that.log.error('Got an unknown error code, ' + error.statusCode + ' tell dan.t in the hubitat forums and give him the following dump', error);
                }
            }
            else
            {
                that.log.error('Received an error trying to get the device summary information from Hubitat.', error);
            }
*/
