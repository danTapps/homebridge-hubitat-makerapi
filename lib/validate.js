// CODE WAS TAKEN FROM HOMEBRIDGE IMPLEMENTATION TO KEEP EXPECTATIN OF THE PLATFORM THE SAME WITHOUT IMPORTING MODULES
// ALL COPYRIGHTS BELONG TO THE HOMEBRIDGE TEAM AT https://github.com/homebridge/homebridge

const Formats = {
  BOOL: 'bool',
  /**
   * Signed 32-bit integer
   */
  INT: 'int', // signed 32-bit int
  /**
   * Signed 64-bit floating point
   */
  FLOAT: 'float',
  /**
   * String encoded in utf8
   */
  STRING: 'string',
  /**
   * Unsigned 8-bit integer.
   */
  UINT8: 'uint8',
  /**
   * Unsigned 16-bit integer.
   */
  UINT16: 'uint16',
  /**
   * Unsigned 32-bit integer.
   */
  UINT32: 'uint32',
  /**
   * Unsigned 64-bit integer.
   */
  UINT64: 'uint64',
  /**
   * Data is base64 encoded string.
   */
  DATA: 'data',
  /**
   * Base64 encoded tlv8 string.
   */
  TLV8: 'tlv8',
  /**
   * @deprecated Not contained in the HAP spec
   */
  ARRAY: 'array',
  /**
   * @deprecated Not contained in the HAP spec
   */
  DICTIONARY: 'dict',
}

const Units = {
  /**
   * Celsius is the only temperature unit in the HomeKit Accessory Protocol.
   * Unit conversion is always done on the client side e.g. on the iPhone in the Home App depending on
   * the configured unit on the device itself.
   */
  CELSIUS: 'celsius',
  PERCENTAGE: 'percentage',
  ARC_DEGREE: 'arcdegrees',
  LUX: 'lux',
  SECONDS: 'seconds',
}

const Perms = {
  // noinspection JSUnusedGlobalSymbols
  /**
   * @deprecated replaced by {@link PAIRED_READ}. Kept for backwards compatibility.
   */
  READ: 'pr',
  /**
   * @deprecated replaced by {@link PAIRED_WRITE}. Kept for backwards compatibility.
   */
  WRITE: 'pw',
  PAIRED_READ: 'pr',
  PAIRED_WRITE: 'pw',
  NOTIFY: 'ev',
  EVENTS: 'ev',
  ADDITIONAL_AUTHORIZATION: 'aa',
  TIMED_WRITE: 'tw',
  HIDDEN: 'hd',
  WRITE_RESPONSE: 'wr',
}

function isNumericFormat(format) {
  switch (format) {
    case Formats.INT:
    case Formats.FLOAT:
    case Formats.UINT8:
    case Formats.UINT16:
    case Formats.UINT32:
    case Formats.UINT64:
      return true;
    default:
      return false;
  }
}

function isUnsignedNumericFormat(format) {
  switch (format) {
    case Formats.UINT8:
    case Formats.UINT16:
    case Formats.UINT32:
    case Formats.UINT64:
      return true;
    default:
      return false;
  }
}

function isIntegerNumericFormat(format) {
  switch (format) {
    case Formats.INT:
    case Formats.UINT8:
    case Formats.UINT16:
    case Formats.UINT32:
    case Formats.UINT64:
      return true;
    default:
      return false;
  }
}

function numericLowerBound(format) {
  switch (format) {
    case Formats.INT:
      return -2147483648;
    case Formats.UINT8:
    case Formats.UINT16:
    case Formats.UINT32:
    case Formats.UINT64:
      return 0;
    default:
      throw new Error("Unable to determine numeric lower bound for " + format);
  }
}
function numericUpperBound(format){
  switch (format) {
    case Formats.INT:
      return 2147483647;
    case Formats.UINT8:
      return 255;
    case Formats.UINT16:
      return 65535;
    case Formats.UINT32:
      return 4294967295;
    case Formats.UINT64:
      return 18446744073709551615; // don't get fooled, javascript uses 18446744073709552000 here
    default:
      throw new Error("Unable to determine numeric lower bound for " + format);
  }
}
function maxWithUndefined(a, b) {
  if (a === undefined) {
    return b;
  } else if (b === undefined) {
    return a;
  } else {
    return Math.max(a, b);
  }
}

function minWithUndefined(a, b) {
  if (a === undefined) {
    return b;
  } else if (b === undefined) {
    return a;
  } else {
    return Math.min(a, b);
  }
}

function validateValue(characteristic, value) {
    if ((characteristic === null) || (characteristic === undefined)) {
        return value; //I don't know what I am so rather return something than nothing....
    }
    if (value === null) {
      if (characteristic.UUID === Characteristic.Model.UUID || characteristic.UUID === Characteristic.SerialNumber.UUID) { // mirrors the statement in case: Formats.STRING
        return characteristic.value; // don't change the value
      }

      /**
       * A short disclaimer here.
       * null is actually a perfectly valid value for characteristics to have.
       * The Home app will show "no response" for some characteristics for which it can't handle null
       * but ultimately its valid and the developers decision what the return.
       * BUT: out of history hap-nodejs did replaced null with the last known value and thus
       * homebridge devs started to adopting this method as a way of not changing the value in a GET handler.
       * As an intermediate step we kept the behavior but added a warning printed to the console.
       * In a future update we will do the breaking change of return null below!
       */

      if (characteristic.UUID.endsWith(BASE_UUID)) { // we have a apple defined characteristic (at least assuming nobody else uses the UUID namespace)
        if (characteristic.UUID === ProgrammableSwitchEvent.UUID) {
          return value; // null is allowed as a value for ProgrammableSwitchEvent
        }
        // if the value has been set previously, return it now, otherwise continue with validation to have a default value set.
        if (characteristic.value !== null) {
          return characteristic.value;
        }
      } else {
        // we currently allow null for any non custom defined characteristics
        return value;
      }
    }

    let numericMin;//: number | undefined = undefined;
    let numericMax;//: number | undefined = undefined;
    let stepValue;//: number | undefined = undefined;

    switch (characteristic.props.format) {
      case Formats.BOOL: {
        if (typeof value === "boolean") {
          return value;
        } else if (typeof value === "number") {
          return value === 1;
        } else if (typeof value === "string") {
          return value === "1" || value === "true";
        } else {
          return false;
        }
      }
      case Formats.INT: {
        if (typeof value === "boolean") {
          value = value ? 1: 0;
        }
        if (typeof value === "string") {
          value = parseInt(value, 10);
        }
        if (typeof value === 'number' && isNaN(value)) {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }
        if (typeof value !== "number") {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }

        numericMin = maxWithUndefined(characteristic.props.minValue, numericLowerBound(Formats.INT));
        numericMax = minWithUndefined(characteristic.props.maxValue, numericUpperBound(Formats.INT));
        stepValue = maxWithUndefined(characteristic.props.minStep, 1);
        break;
      }
      case Formats.FLOAT: {
        if (typeof value === "boolean") {
          value = value? 1: 0;
        }
        if (typeof value === "string") {
          value = parseFloat(value);
        }
        if (typeof value === 'number' && isNaN(value)) {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }
        if (typeof value !== "number") {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }

        if (characteristic.props.minValue != null) {
          numericMin = characteristic.props.minValue;
        }
        if (characteristic.props.maxValue != null) {
          numericMax = characteristic.props.maxValue;
        }
        stepValue = characteristic.props.minStep;
        break;
      }
      case Formats.UINT8: {
        if (typeof value === "boolean") {
          value = value? 1: 0;
        }
        if (typeof value === "string") {
          value = parseInt(value, 10);
        }
        if (typeof value === 'number' && isNaN(value)) {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }
        if (typeof value !== "number") {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }

        numericMin = maxWithUndefined(characteristic.props.minValue, numericLowerBound(Formats.UINT8));
        numericMax = minWithUndefined(characteristic.props.maxValue, numericUpperBound(Formats.UINT8));
        stepValue = maxWithUndefined(characteristic.props.minStep, 1);
        break;
      }
      case Formats.UINT16: {
        if (typeof value === "boolean") {
          value = value? 1: 0;
        }
        if (typeof value === "string") {
          value = parseInt(value, 10);
        }
        if (typeof value === 'number' && isNaN(value)) {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }
        if (typeof value !== "number") {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }

        numericMin = maxWithUndefined(characteristic.props.minValue, numericLowerBound(Formats.UINT16));
        numericMax = minWithUndefined(characteristic.props.maxValue, numericUpperBound(Formats.UINT16));
        stepValue = maxWithUndefined(characteristic.props.minStep, 1);
        break;
      }
      case Formats.UINT32: {
        if (typeof value === "boolean") {
          value = value? 1: 0;
        }
        if (typeof value === "string") {
          value = parseInt(value, 10);
        }
        if (typeof value === 'number' && isNaN(value)) {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }
        if (typeof value !== "number") {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }

        numericMin = maxWithUndefined(characteristic.props.minValue, numericLowerBound(Formats.UINT32));
        numericMax = minWithUndefined(characteristic.props.maxValue, numericUpperBound(Formats.UINT32));
        stepValue = maxWithUndefined(characteristic.props.minStep, 1);
        break;
      }
      case Formats.UINT64: {
        if (typeof value === "boolean") {
          value = value? 1: 0;
        }
        if (typeof value === "string") {
          value = parseInt(value, 10);
        }
        if (typeof value === 'number' && isNaN(value)) {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }
        if (typeof value !== "number") {
          value = typeof characteristic.value === 'number' ? characteristic.value : characteristic.props.minValue || 0;
        }

        numericMin = maxWithUndefined(characteristic.props.minValue, numericLowerBound(Formats.UINT64));
        numericMax = minWithUndefined(characteristic.props.maxValue, numericUpperBound(Formats.UINT64));
        stepValue = maxWithUndefined(characteristic.props.minStep, 1);
        break;
      }
      case Formats.STRING: {
        if (typeof value === "number") {
          value = String(value);
        }
        if (typeof value !== "string") {
          value = typeof characteristic.value === 'string' ? characteristic.value : value + '';
        }

        if (value.length <= 1 && (characteristic.UUID === Characteristic.Model.UUID || characteristic.UUID === Characteristic.SerialNumber.UUID)) { // mirrors the case value = null at the beginning
          return characteristic.value; // just return the current value
        }

        const maxLength = characteristic.props.maxLen || 64; // default is 64 (max is 256 which is set in setProps)
        if (value.length > maxLength) {
          value = value.substring(0, maxLength);
        }

        return value;
      }
      case Formats.DATA:
        if (typeof value !== "string") {
          throw new Error("characteristic with DATA format must have string value");
        }

        if (characteristic.props.maxDataLen != null && value.length > characteristic.props.maxDataLen) {
          // can't cut it as we would basically yet binary rubbish afterwards
          throw new Error("characteristic with DATA format exceeds specified maxDataLen");
        }
        return value;
      case Formats.TLV8:
        if (value === undefined) {
          return characteristic.value;
        }
        return value; // we trust that this is valid tlv8
    }

    if (typeof value === "number") {
      if (numericMin != null && value < numericMin) {
        value = numericMin;
      }
      if (numericMax != null && value > numericMax) {
        value = numericMax;
      }

      if (characteristic.props.validValues && !characteristic.props.validValues.includes(value)) {
//        return characteristic.props.validValues.includes(characteristic.value as number) ? characteristic.value : (characteristic.props.validValues[0] || 0);
      }

      if (characteristic.props.validValueRanges && characteristic.props.validValueRanges.length === 2) {
        if (value < characteristic.props.validValueRanges[0]) {
          value = characteristic.props.validValueRanges[0];
        } else if (value > characteristic.props.validValueRanges[1]) {
          value = characteristic.props.validValueRanges[1];
        }
      }

      if (stepValue != undefined) {
        if (stepValue === 1) {
          value = Math.round(value);
        } else if (stepValue > 1) {
          value = Math.round(value);
          value = value - (value % stepValue);
        } // for stepValue < 1 rounding is done only when formatting the response. We can't store the "perfect" .step anyways
      }
    }

    // hopefully it shouldn't get to this point
    if (value === undefined) {
      return characteristic.value;
    }
    return value;
}

module.exports = {
        validateValue: validateValue
    }

