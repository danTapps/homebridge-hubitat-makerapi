var inherits = require('util').inherits;
var Accessory, Service, Characteristic, uuid, CommunityTypes, platformName, capabilityToAttributeMap;
const util = require('util');
var version = require('../package.json').version;
const pluginName = 'homebridge-hubitat-makerapi';

/*
 *   HE_ST Accessory
 */
module.exports = function(oAccessory, oService, oCharacteristic, oPlatformAccessory, ouuid, platName) {
    platformName = platName;
    if (oAccessory) {
        Accessory = oPlatformAccessory || oAccessory;
        Service = oService;
        Characteristic = oCharacteristic;
        CommunityTypes = require('../lib/communityTypes')(Service, Characteristic);
        uuid = ouuid;
        capabilityToAttributeMap = require('./exclude_capability').capabilityToAttributeMap();
//        inherits(HE_ST_Accessory, Accessory);
        HE_ST_Accessory.prototype.loadData = loadData;
        HE_ST_Accessory.prototype.getServices = getServices;
    }
    return HE_ST_Accessory;
};
module.exports.HE_ST_Accessory = HE_ST_Accessory;
module.exports.uuidGen = uuidGen;
module.exports.uuidDecrypt = uuidDecrypt;

function uuidGen(deviceid)
{
    return uuid.generate('hbdev:' + platformName.toLowerCase() + ':' + deviceid);
}
function uuidDecrypt(buffer)
{
    return uuid.unparse(buffer);
}
function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
function dump(name, inVar) {
    console.log(inVar);
    for (var k in inVar.accessory.services) {
            console.log(name + ':ser:' + inVar.accessory.services[k].UUID +':'+inVar.accessory.services[k].displayName);
            for (var l in inVar.accessory.services[k].optionalCharacteristics) {
                    console.log(name + ':opt:'.inVar.accessory.services[k].optionalCharacteristics[l].UUID+':'+inVar.accessory.services[k].optionalCharacteristics[l].displayName);
            }
            for (var l in inVar.accessory.services[k].characteristics) {
                    console.log(name + ':cha:'.inVar.accessory.services[k].characteristics[l].UUID+':'+inVar.accessory.services[k].characteristics[l].displayName);
            }
    }
}
function HE_ST_Accessory(platform, group, device, accessory) {
    // console.log("HE_ST_Accessory: ", platform, util.inspect(device, false, null, true));
    this.deviceid = device.deviceid;
    this.name = device.name;
    this.platform = platform;
    this.state = {};
    this.device = device;
    this.unregister = false;
    var id = uuidGen(this.deviceid);
    //Accessory.call(this, this.name, id);
      
    if ((accessory !== undefined) && (accessory !== null))
        this.accessory = accessory;
    else
        this.accessory = new Accessory(this.name, id);
    this.accessory.name = this.name;
    this.accessory.getServices = function() { return this.accessory.services };
    var that = this;
    function deviceIsFan()
    {
        if (device.attributes && device.attributes.hasOwnProperty('speed'))
            return true;
        if (device.commands && device.commands.hasOwnProperty('setSpeed'))
            return true;
        if (device.capabilities && device.capabilities.hasOwnProperty('FanControl'))
            return true;
        if ((device.type) && ((device.type.toLowerCase().indexOf('fan control') > -1) || (device.type.toLowerCase().indexOf('fan component') > -1)))
            return true;
        return false;
    }
    function deviceHasAttributeCommand(attribute, command)
    {
        return (that.device.attributes.hasOwnProperty(attribute) && that.device.commands.hasOwnProperty(command));
    }
    

    if ((accessory !== null) && (accessory !==undefined))
    {
        removeExculdedAttributes();
    }
    //Removing excluded attributes from config
    for (var i = 0; i < that.device.excludedAttributes.length; i++) {
        let excludedAttribute = device.excludedAttributes[i];
        if (that.device.attributes.hasOwnProperty(excludedAttribute)) {
            platform.log("Removing attribute: " + excludedAttribute + " for device: " + device.name);
            delete that.device.attributes[excludedAttribute];
        }
    }
    for (var i = 0; i < that.device.excludedCapabilities.length; i++) {
        let excludedCapability = device.excludedCapabilities[i].toLowerCase();
        if (that.device.capabilities.hasOwnProperty(excludedCapability)) {
            Object.keys(capabilityToAttributeMap).forEach(function(key) {
                if (key === excludedCapability) {
                    platform.log("Removing capability: " + excludedCapability + " for device: " + device.name); 
                    for (var k = 0; k < capabilityToAttributeMap[key].length; k++)
                    {
                        var excludedAttribute = capabilityToAttributeMap[key][k];
                        if (that.device.attributes.hasOwnProperty(excludedAttribute)) {
                            delete that.device.attributes[excludedAttribute];
                        }
                    }
                }   
            });
        }
    }

    //Removing excluded attributes from config
    function removeExculdedAttributes() {
        //that.platform.log('Having a cached accessory, build a duplicate and see if I can detect obsolete characteristics');
        var _device = device.deviceid;
        device.deviceid = 'filter'+_device.deviceid;
        var newAccessory = new HE_ST_Accessory(platform, group, device);
        //console.log('accessory', that.accessory.services);
        //console.log('newAccessory', newAccessory.accessory.services);

        for (var k in that.accessory.services) {
            for (var l in that.accessory.services[k].optionalCharacteristics) {
                var remove = true;
                for (var j in newAccessory.accessory.services) {
                    for (var t in newAccessory.accessory.services[j].optionalCharacteristics) {
                        if (that.accessory.services[k].optionalCharacteristics[l].UUID === newAccessory.accessory.services[j].optionalCharacteristics[t].UUID)
                            remove = false;
                    }
                }
                if (remove === true)
                    that.accessory.services[k].removeCharacteristic(that.accessory.services[k].optionalCharacteristics[l]);
            }
            
            for (var l in that.accessory.services[k].characteristics) {
                var remove = true;
                for (var j in newAccessory.accessory.services) {
                    for (var t in newAccessory.accessory.services[j].characteristics) {
                        if (that.accessory.services[k].characteristics[l].UUID === newAccessory.accessory.services[j].characteristics[t].UUID)
                            remove = false;
                    }
                }
                if (remove === true)
                    that.accessory.services[k].removeCharacteristic(that.accessory.services[k].optionalCharacteristics[l]);
            }
            var removeService = true;
            for (var l in newAccessory.accessory.services) {
                if (newAccessory.accessory.services[l].UUID === that.accessory.services[k].UUID)
                    removeService = false;
            }
            if (removeService === true)
                that.accessory.removeService(that.accessory.services[k]);
        }
        //console.log('accessory', that.accessory.services);
        //console.log('newAccessory', newAccessory.accessory.services);
        device.deviceid = _device;
        return;
    }

    that.getaddService = function(Service) {
        var myService = that.accessory.getService(Service);
        if (!myService) {
            myService = that.accessory.addService(Service);
        }
        return myService;
    };    

    that.getaddService(Service.AccessoryInformation).setCharacteristic(Characteristic.Name, that.name);
    that.accessory.getService(Service.AccessoryInformation).setCharacteristic(Characteristic.FirmwareRevision, version);
    that.accessory.getService(Service.AccessoryInformation).setCharacteristic(Characteristic.Manufacturer, 'Hubitat');
    that.accessory.getService(Service.AccessoryInformation).setCharacteristic(Characteristic.Model, platformName);
    that.accessory.getService(Service.AccessoryInformation).setCharacteristic(Characteristic.SerialNumber, group+':'+device.deviceid);
    that.accessory.on('identify', function(paired, callback) {
        that.platform.log("%s - identify", that.accessory.displayName);
        callback();
    });
    
    that.getaddService = function(Service) {
        var myService = that.accessory.getService(Service);
        if (!myService) {
            myService = that.accessory.addService(Service);
        }
        return myService;
    };
    that.deviceGroup = 'unknown'; // that way we can easily tell if we set a device group
    var thisCharacteristic;
    //platform.log('loading device: ' + JSON.stringify(device));

    if (group === "mode") {
        that.deviceGroup = "mode";
        thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
            .on('get', function(callback) {
                callback(null, that.device.attributes.switch === 'on');
            })
            .on('set', function(value, callback) {
                if (value && that.device.attributes.switch === 'off') {
                    platform.api.setMode(that.device.attributes.modeid).then(function(resp){callback(null, false);}).catch(function(err){callback(err);});
                }
            });
        platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
    }
    if (group === "reboot") {
        that.deviceGroup = "reboot";
        thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
            .on('get', function(callback) {
                callback(null, false);
            })
            .on('set', function(value, callback) {
                if (value) {
                    platform.api.rebootHub().then(function(resp){callback(null, false);}).catch(function(err){callback(err);});
                }
            });
        platform.addAttributeUsage('reboot', device.deviceid, thisCharacteristic);
    }
    if (that.device.attributes.hasOwnProperty('thermostatOperatingState')) {
        that.deviceGroup = "thermostat";
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                .on('get', function(callback) {
                    switch (that.device.attributes.thermostatOperatingState) {
                        case 'pending cool':
                        case 'cooling':
                            callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                            break;
                        case 'pending heat':
                        case 'heating':
                            callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
                            break;
                        default:
                            // The above list should be inclusive, but we need to return something if they change stuff.
                            // TODO: Double check if Smartthings can send "auto" as operatingstate. I don't think it can.
                            callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                            break;
                    }
                });
            platform.addAttributeUsage('thermostatOperatingState', device.deviceid, thisCharacteristic);
            // Handle the Target State
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TargetHeatingCoolingState)
                .on('get', function(callback) {
                    switch (that.device.attributes.thermostatMode) {
                        case 'cool':
                            callback(null, Characteristic.TargetHeatingCoolingState.COOL);
                            break;
                        case 'emergency heat':
                        case 'heat':
                            callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
                            break;
                        case 'auto':
                            callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
                            break;
                        default:
                            // The above list should be inclusive, but we need to return something if they change stuff.
                            callback(null, Characteristic.TargetHeatingCoolingState.OFF);
                            break;
                    }
                })
                .on('set', function(value, callback) {
                    switch (value) {
                        case Characteristic.TargetHeatingCoolingState.COOL:
                            platform.api.runCommand(device.deviceid, 'cool').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                            that.device.attributes.thermostatMode = 'cool';
                            break;
                        case Characteristic.TargetHeatingCoolingState.HEAT:
                            platform.api.runCommand(device.deviceid, 'heat').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                            that.device.attributes.thermostatMode = 'heat';
                            break;
                        case Characteristic.TargetHeatingCoolingState.AUTO:
                            platform.api.runCommand(device.deviceid, 'auto').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                            that.device.attributes.thermostatMode = 'auto';
                            break;
                        case Characteristic.TargetHeatingCoolingState.OFF:
                            platform.api.runCommand(device.deviceid, 'off').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                            that.device.attributes.thermostatMode = 'off';
                            break;
                    }
                });
            platform.addAttributeUsage('thermostatMode', device.deviceid, thisCharacteristic);
            if (that.device.attributes.hasOwnProperty('humidity')) {
                thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.humidity));
                    });
                platform.addAttributeUsage('humidity', device.deviceid, thisCharacteristic);
            }
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CurrentTemperature)
                .on('get', function(callback) {
                    let temp = 0;
                    if (platform.temperature_unit === 'C') {
                        temp = Math.round(that.device.attributes.temperature * 10) / 10;
                    } else {
                        temp = Math.round((that.device.attributes.temperature - 32) / 1.8 * 10) / 10;
                    }
                    callback(null, temp);
                });
            platform.addAttributeUsage('temperature', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TargetTemperature)
                .on('get', function(callback) {
                    var temp;
                    switch (that.device.attributes.thermostatMode) {
                        case 'cool':
                            temp = that.device.attributes.coolingSetpoint;
                            break;
                        case 'emergency heat':
                        case 'heat':
                            temp = that.device.attributes.heatingSetpoint;
                            break;
                        default:
                            // This should only refer to auto
                            // Choose closest target as single target
                            var high = that.device.attributes.coolingSetpoint;
                            var low = that.device.attributes.heatingSetpoint;
                            var cur = that.device.attributes.temperature;
                            temp = Math.abs(high - cur) < Math.abs(cur - low) ? high : low;
                            break;
                    }
                    if (!temp) {
                        callback('Unknown');
                    } else if (platform.temperature_unit === 'C') {
                        callback(null, Math.round(temp * 10) / 10);
                    } else {
                        callback(null, Math.round((temp - 32) / 1.8 * 10) / 10);
                    }
                })
                .on('set', function(value, callback) {
                    // Convert the Celsius value to the appropriate unit for Smartthings
                    var temp = value;
                    if (platform.temperature_unit === 'C') {
                        temp = value;
                    } else {
                        temp = value * 1.8 + 32;
                    }
                    temp = Math.round(temp);
                    // Set the appropriate temperature unit based on the mode
                    switch (that.device.attributes.thermostatMode) {
                        case 'cool':
                            platform.api.runCommand(device.deviceid, 'setCoolingSetpoint', {
                                value1: temp
                            }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                            that.device.attributes.coolingSetpoint = temp;
                            break;
                        case 'emergency heat':
                        case 'heat':
                            platform.api.runCommand(device.deviceid, 'setHeatingSetpoint', {
                                value1: temp
                            }).then(function(resp) {
                                if (callback) 
                                    callback(null, value); 
                            }).catch(function(err) {
                                if (callback) 
                                    callback(err); 
                            });
                            that.device.attributes.heatingSetpoint = temp;
                            break;
                        default:
                            // This should only refer to auto
                            // Choose closest target as single target
                            var high = that.device.attributes.coolingSetpoint;
                            var low = that.device.attributes.heatingSetpoint;
                            var cur = that.device.attributes.temperature;
                            var isHighTemp = Math.abs(high - cur) < Math.abs(cur - low);
                            if (isHighTemp) {
                                platform.api.runCommand(device.deviceid, 'setCoolingSetpoint', {
                                    value1: temp
                                }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                            } else {
                                platform.api.runCommand(device.deviceid, 'setHeatingSetpoint', {
                                    value1: temp
                                }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                            }
                            break;
                    }
                });
            platform.addAttributeUsage('thermostatMode', device.deviceid, thisCharacteristic);
            platform.addAttributeUsage('coolingSetpoint', device.deviceid, thisCharacteristic);
            platform.addAttributeUsage('heatingSetpoint', device.deviceid, thisCharacteristic);
            platform.addAttributeUsage('temperature', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.TemperatureDisplayUnits)
                .on('get', function(callback) {
                    if (platform.temperature_unit === 'C') {
                        callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
                    } else {
                        callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
                    }
                });
            // platform.addAttributeUsage("temperature_unit", "platform", thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.HeatingThresholdTemperature)
                .on('get', function(callback) {
                    if (platform.temperature_unit === 'C') {
                        callback(null, Math.round(that.device.attributes.heatingSetpoint * 10) / 10);
                    } else {
                        callback(null, Math.round((that.device.attributes.heatingSetpoint - 32) / 1.8 * 10) / 10);
                    }
                })
                .on('set', function(value, callback) {
                    // Convert the Celsius value to the appropriate unit for Smartthings
                    var temp = value;
                    if (platform.temperature_unit === 'C') {
                        temp = value;
                    } else {
                        temp = value * 1.8 + 32;
                    }
                    platform.api.runCommand(device.deviceid, 'setHeatingSetpoint', {
                        value1: temp
                    }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    that.device.attributes.heatingSetpoint = temp;
                });
            platform.addAttributeUsage('heatingSetpoint', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.Thermostat).getCharacteristic(Characteristic.CoolingThresholdTemperature)
                .on('get', function(callback) {
                    if (platform.temperature_unit === 'C') {
                        callback(null, Math.round(that.device.attributes.coolingSetpoint * 10) / 10);
                    } else {
                        callback(null, Math.round((that.device.attributes.coolingSetpoint - 32) / 1.8 * 10) / 10);
                    }
                })
                .on('set', function(value, callback) {
                    // Convert the Celsius value to the appropriate unit for Smartthings
                    var temp = value;
                    if (platform.temperature_unit === 'C') {
                        temp = value;
                    } else {
                        temp = value * 1.8 + 32;
                    }
                    platform.api.runCommand(device.deviceid, 'setCoolingSetpoint', {
                        value1: temp
                    }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    that.device.attributes.coolingSetpoint = temp;
                });
            platform.addAttributeUsage('coolingSetpoint', device.deviceid, thisCharacteristic);
        }
    if (that.device.attributes.hasOwnProperty('switch') && group !== 'mode' && !deviceIsFan())
    {
        var serviceType = null;
        if (deviceHasAttributeCommand('level', 'setLevel') || deviceHasAttributeCommand('hue', 'setHue') || deviceHasAttributeCommand('saturation', 'setSaturation'))
        {
            if (deviceIsFan())
            {
                that.deviceGroup = "fan";
                serviceType = Service.Fanv2;
            }
            else
            {
                that.deviceGroup = "lights";
                serviceType = Service.Lightbulb;
            }
        }
        else
        {
            that.deviceGroup = "switch";
            serviceType = Service.Switch;
        }

        thisCharacteristic = that.getaddService(serviceType).getCharacteristic(Characteristic.On)
            .on('get', function(callback) {
                callback(null, that.device.attributes.switch === 'on');
            })
            .on('set', function(value, callback) {
                if (value) {
                    platform.api.runCommand(device.deviceid, 'on').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                } else {
                    platform.api.runCommand(device.deviceid, 'off').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                }
            });
        platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
        /*if (device.attributes.hasOwnProperty('power')) {
            thisCharacteristic = that.getaddService(serviceType).getCharacteristic(CommunityTypes.CurrentConsumption1)
                .on('get', function(callback) {
                callback(null, Math.round(that.device.attributes.power));
            });
            platform.addAttributeUsage('power', device.deviceid, thisCharacteristic);
        }*/
    }
    if (deviceHasAttributeCommand('level', 'setLevel'))
    {
        if (group === "windowshade")   //TODO!!!!!
        {
            thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition)
                    .on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.level));
                    })
                    .on('set', function(value, callback) {
                        platform.api.runCommand(device.deviceid, 'setLevel', {
                            value1: value
                        }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    });
            platform.addAttributeUsage('level', device.deviceid, thisCharacteristic);
            thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition)
                    .on('get', function(callback) {
                        callback(null, parseInt(that.device.attributes.level));
                    });
            platform.addAttributeUsage('level', device.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.WindowCovering).setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
        }
        else
        {
                var serviceType = Service.Lightbulb;
                var characteristicType = Characteristic.Brightness;
                var factor = 1;
                if (deviceIsFan()) {
                    var listenTo = 'level';
                    if (deviceHasAttributeCommand('speed', 'setSpeed') === true)
                    {
                        delete that.device.attributes['speed'];
                    }
                    serviceType = Service.Fanv2;
                    characteristicType = Characteristic.RotationSpeed;
                    factor = 2.55;
                    this.deviceGroup = "fan";
                    thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.Active)
                        .on('get', function(callback) {
                            var state = that.device.attributes.level>0;
                            if (deviceHasAttributeCommand('switch', 'on') === true) {
                                state = that.device.attributes.switch === 'on' ? true : false;
                                listenTo = 'switch';
                            }
                            platform.log(that.name + ' -> getting fan state: ' + state + ' determined by ' + listenTo);
                            callback(null, state);
                        })
                        .on('set', function(value,callback) {
                            var cmd = 'setLevel';
                            var cmdValue = null;
                            if (value === 0)
                                cmdValue = "0";
                            else 
                                cmdValue = "100";
                            if (deviceHasAttributeCommand('switch', 'on') === true) {
                                if (value === 0) {
                                    cmd = 'off';
                                    cmdValue = null;
                                }
                                else {
                                    cmd = 'on';
                                    cmdValue = null;
                                }
                            }
                            platform.log(that.name + ' -> setting fan state to on with cmd: ' + cmd + ' and value: ' + cmdValue);
                            if (cmdValue)
                                platform.api.runCommand(device.deviceid, cmd, {
                                    value1: cmdValue
                                }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                            else
                                platform.api.runCommand(device.deviceid, cmd).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                        });
                        platform.addAttributeUsage(listenTo, device.deviceid, thisCharacteristic);
                }

                thisCharacteristic = that.getaddService(serviceType).getCharacteristic(characteristicType)
                    .on('get', function(callback) {
                    //    callback(null, parseInt(Math.round(that.device.attributes.level*factor)));
                        callback(null, that.device.attributes.level);
                    })
                    .on('set', function(value, callback) {
                        //that.platform.log('set value'+value+' factor:'+factor+' math:'+Math.round(value/factor));
                        platform.api.runCommand(device.deviceid, 'setLevel', {
                            //value1: Math.round(value/factor),
                            value1: value,
                            //value2: 1
                        }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    });
                platform.addAttributeUsage('level', device.deviceid, thisCharacteristic);
        }
    }
    if (deviceHasAttributeCommand('hue', 'setHue'))
    {
        that.deviceGroup = "lights";
        thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Hue)
                        .on('get', function(callback) {
                            callback(null, Math.round(that.device.attributes.hue * 3.6));
                        })
                        .on('set', function(value, callback) {
                            platform.api.runCommand(device.deviceid, 'setHue', {
                                value1: Math.round(value / 3.6)
                            }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                        });
        platform.addAttributeUsage('hue', device.deviceid, thisCharacteristic);
    }   
    if (deviceHasAttributeCommand('saturation', 'setSaturation'))
    {
        that.deviceGroup = "lights";
        thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.Saturation)
                        .on('get', function(callback) {
                            callback(null, parseInt(that.device.attributes.saturation));
                        })
                        .on('set', function(value, callback) {
                            platform.api.runCommand(device.deviceid, 'setSaturation', {
                                value1: value
                            }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                        });
        platform.addAttributeUsage('saturation', device.deviceid, thisCharacteristic);
    }
    if (that.device.attributes.hasOwnProperty('motion'))
    {
        that.deviceGroup = "motion";
        thisCharacteristic = that.getaddService(Service.MotionSensor).getCharacteristic(Characteristic.MotionDetected)
            .on('get', function(callback) {
                callback(null, that.device.attributes.motion === 'active');
            });
        platform.addAttributeUsage('motion', device.deviceid, thisCharacteristic);
        if (that.device.attributes.hasOwnProperty('tamper')) {
            thisCharacteristic = that.getaddService(Service.MotionSensor).getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {
                    callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
            platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
        }
    } 
    if (that.device.attributes.hasOwnProperty('presence'))
    {
        that.deviceGroup = "presence";
        thisCharacteristic = that.getaddService(Service.OccupancySensor).getCharacteristic(Characteristic.OccupancyDetected)
            .on('get', function(callback) {
                callback(null, that.device.attributes.presence === 'present');
            });
        platform.addAttributeUsage('presence', device.deviceid, thisCharacteristic);
        if (that.device.attributes.hasOwnProperty('tamper') ) {
            thisCharacteristic = that.getaddService(Service.OccupancySensor).getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {
                    callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
            platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
        }
    }
    if (deviceHasAttributeCommand('lock', 'lock')) {
        that.deviceGroup = "lock";
        thisCharacteristic = that.getaddService(Service.LockMechanism).getCharacteristic(Characteristic.LockCurrentState)
            .on('get', function(callback) {
                switch (that.device.attributes.lock) {
                    case 'locked':
                        callback(null, Characteristic.LockCurrentState.SECURED);
                        break;
                    case 'unlocked':
                        callback(null, Characteristic.LockCurrentState.UNSECURED);
                        break;
                    default:
                        callback(null, Characteristic.LockCurrentState.UNKNOWN);
                        break;
                }
            });
        platform.addAttributeUsage('lock', device.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.LockMechanism).getCharacteristic(Characteristic.LockTargetState)
            .on('get', function(callback) {
                switch (that.device.attributes.lock) {
                    case 'locked':
                        callback(null, Characteristic.LockCurrentState.SECURED);
                        break;
                    case 'unlocked':
                        callback(null, Characteristic.LockCurrentState.UNSECURED);
                        break;
                    default:
                        callback(null, Characteristic.LockCurrentState.UNKNOWN);
                        break;
                }
            })
            .on('set', function(value, callback) {
                if (value === 1 || value === true) {
                    platform.api.runCommand(device.deviceid, 'lock').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    that.device.attributes.lock = 'locked';
                } else {
                    platform.api.runCommand(device.deviceid, 'unlock').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    that.device.attributes.lock = 'unlocked';
                }
            });
        platform.addAttributeUsage('lock', device.deviceid, thisCharacteristic);
    }


    if (that.device.attributes.hasOwnProperty('temperature') && !platform.isAttributeUsed('temperature', device.deviceid)) {
        that.deviceGroup = "sensor";
        if (that.device.attributes.temperature !== null)
        {
            thisCharacteristic = that.getaddService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({
                    minValue: -100,
                    maxValue: 200
                })
                .on('get', function(callback) {
                    let temp = 0;
                    if (platform.temperature_unit === 'C') {
                        temp = Math.round(that.device.attributes.temperature * 10) / 10;
                    } else {
                        temp = Math.round((that.device.attributes.temperature - 32) / 1.8 * 10) / 10;
                    }
                    callback(null, temp);
                });
            platform.addAttributeUsage('temperature', device.deviceid, thisCharacteristic);
            if (that.device.attributes.hasOwnProperty('tamper')) {                
                thisCharacteristic = that.getaddService(Service.TemperatureSensor).getCharacteristic(Characteristic.StatusTampered)
                    .on('get', function(callback) {
                        callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                    });
                platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
            }
        }
    }
    if (that.device.attributes.hasOwnProperty('contact')) {
        that.deviceGroup = "sensor";
        thisCharacteristic = that.getaddService(Service.ContactSensor).getCharacteristic(Characteristic.ContactSensorState)
            .on('get', function(callback) {
                if (that.device.attributes.contact === 'closed') {
                    callback(null, Characteristic.ContactSensorState.CONTACT_DETECTED);
                } else {
                    callback(null, Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);                    
            }
        });
        platform.addAttributeUsage('contact', device.deviceid, thisCharacteristic);
        if (that.device.attributes.hasOwnProperty('tamper')) {
            thisCharacteristic = that.getaddService(Service.ContactSensor).getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {
                    callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
            platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
        }
    }
    if (that.device.attributes.hasOwnProperty('door')) {
        that.deviceGroup = "door";
        thisCharacteristic = that.getaddService(Service.GarageDoorOpener).getCharacteristic(Characteristic.TargetDoorState)
            .on('get', function(callback) {
                if (that.device.attributes.door === 'closed' || that.device.attributes.door === 'closing') {
                    callback(null, Characteristic.TargetDoorState.CLOSED);
                } else if (that.device.attributes.door === 'open' || that.device.attributes.door === 'opening') {
                    callback(null, Characteristic.TargetDoorState.OPEN);
                }
            })
            .on('set', function(value, callback) {
                if (value === Characteristic.TargetDoorState.OPEN || value === 0) {
                    platform.api.runCommand(device.deviceid, 'open').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    that.device.attributes.door = 'opening';
                } else if (value === Characteristic.TargetDoorState.CLOSED || value === 1) {
                    platform.api.runCommand(device.deviceid, 'close').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    that.device.attributes.door = 'closing';
                }
            });
        platform.addAttributeUsage('door', device.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.GarageDoorOpener).getCharacteristic(Characteristic.CurrentDoorState)
           .on('get', function(callback) {
                switch (that.device.attributes.door) {
                    case 'open':
                        callback(null, Characteristic.TargetDoorState.OPEN);
                        break;
                    case 'opening':
                        callback(null, Characteristic.TargetDoorState.OPENING);
                        break;
                    case 'closed':
                        callback(null, Characteristic.TargetDoorState.CLOSED);
                        break;
                    case 'closing':
                        callback(null, Characteristic.TargetDoorState.CLOSING);
                        break;
                    default:
                        callback(null, Characteristic.TargetDoorState.STOPPED);
                        break;
                }
            });
        platform.addAttributeUsage('door', device.deviceid, thisCharacteristic);
        that.getaddService(Service.GarageDoorOpener).setCharacteristic(Characteristic.ObstructionDetected, false);
    }
    if (that.device.attributes.hasOwnProperty('smoke')) {
        that.deviceGroup = "sensor";
        thisCharacteristic = that.getaddService(Service.SmokeSensor).getCharacteristic(Characteristic.SmokeDetected)
            .on('get', function(callback) {
                if (that.device.attributes.smoke === 'clear') {
                    callback(null, Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
                } else {
                    callback(null, Characteristic.SmokeDetected.SMOKE_DETECTED);
                }
        });
        platform.addAttributeUsage('smoke', device.deviceid, thisCharacteristic);
        if (that.device.attributes.hasOwnProperty('tamper')) {
            thisCharacteristic = that.getaddService(Service.SmokeSensor).getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {
                    callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
            platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
        }
    }
    if (that.device.attributes.hasOwnProperty('carbonMonoxide')) {
        that.deviceGroup = "sensor";
        thisCharacteristic = that.getaddService(Service.CarbonMonoxideSensor).getCharacteristic(Characteristic.CarbonMonoxideDetected)
            .on('get', function(callback) {
                if (that.device.attributes.carbonMonoxide === 'clear') {
                    callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
                } else {
                    callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
                }
            });
        platform.addAttributeUsage('carbonMonoxide', device.deviceid, thisCharacteristic);
        if (that.device.attributes.hasOwnProperty('tamper')) {
            thisCharacteristic = that.getaddService(Service.CarbonMonoxideSensor).getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {
                    callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
            platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
        }
    }
    if (that.device.attributes.hasOwnProperty('carbonDioxideMeasurement')) {
        that.deviceGroup = "sensor";
        thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.CarbonDioxideDetected)
            .on('get', function(callback) {
                if (that.device.attributes.carbonDioxideMeasurement < 2000) {
                    callback(null, Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
                } else {
                    callback(null, Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL);
                }
            });
        platform.addAttributeUsage('carbonDioxide', device.deviceid, thisCharacteristic);
        thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.CarbonDioxideLevel)
            .on('get', function(callback) {
                if (that.device.attributes.carbonDioxideMeasurement >= 0) {
                    callback(null, device.attributes.carbonDioxideMeasurement);
                }
            });
        platform.addAttributeUsage('carbonDioxideLevel', device.deviceid, thisCharacteristic);
        if (that.device.attributes.hasOwnProperty('tamper') && !platform.isAttributeUsed('tamper', device.deviceid)) {
            thisCharacteristic = that.getaddService(Service.CarbonDioxideSensor).getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {
                    callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
            platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
        }
    }
    if (that.device.attributes.hasOwnProperty('water')) {
        that.deviceGroup = "sensor";
        thisCharacteristic = that.getaddService(Service.LeakSensor).getCharacteristic(Characteristic.LeakDetected)
            .on('get', function(callback) {
                var reply = Characteristic.LeakDetected.LEAK_DETECTED;
                if (that.device.attributes.water === 'dry') {
                    reply = Characteristic.LeakDetected.LEAK_NOT_DETECTED;
                }
                callback(null, reply);
            });
        platform.addAttributeUsage('water', device.deviceid, thisCharacteristic);
        if (that.device.attributes.hasOwnProperty('tamper') && !platform.isAttributeUsed('tamper', device.deviceid)) {
            thisCharacteristic = that.getaddService(Service.LeakSensor).getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {
                    callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
            platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
        }
    }
    if (that.device.attributes.hasOwnProperty('humidity') && !platform.isAttributeUsed('humidity', device.deviceid)) {
        that.deviceGroup = "sensor";
        thisCharacteristic = that.getaddService(Service.HumiditySensor).getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', function(callback) {
                callback(null, Math.round(that.device.attributes.humidity));
            });
        platform.addAttributeUsage('humidity', device.deviceid, thisCharacteristic);
        if (that.device.attributes.hasOwnProperty('tamper') && !platform.isAttributeUsed('tamper', device.deviceid)) {
            thisCharacteristic = that.getaddService(Service.HumiditySensor).getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {
                    callback(null, (that.device.attributes.tamper === 'detected') ? Characteristic.StatusTampered.TAMPERED : Characteristic.StatusTampered.NOT_TAMPERED);
                });
            platform.addAttributeUsage('tamper', device.deviceid, thisCharacteristic);
        }
    }
    if (that.device.attributes.hasOwnProperty('illuminance')) {
        that.deviceGroup = "sensor";
        thisCharacteristic = that.getaddService(Service.LightSensor).getCharacteristic(Characteristic.CurrentAmbientLightLevel)
            .on('get', function(callback) {
                callback(null, Math.ceil(that.device.attributes.illuminance));
            });
        platform.addAttributeUsage('illuminance', device.deviceid, thisCharacteristic);
    }
    if (that.device.attributes.hasOwnProperty('battery')) {
        that.deviceGroup = "battery";
        thisCharacteristic = that.getaddService(Service.BatteryService).getCharacteristic(Characteristic.BatteryLevel)
            .on('get', function(callback) {
                callback(null, Math.round(that.device.attributes.battery));
            });
        platform.addAttributeUsage('battery', device.deviceid, thisCharacteristic);
        thisCharacteristic = that.getaddService(Service.BatteryService).getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', function(callback) {
                let battStatus = (that.device.attributes.battery < 20) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
                callback(null, battStatus);
            });
        that.getaddService(Service.BatteryService).setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING);
        platform.addAttributeUsage('battery', device.deviceid, thisCharacteristic);
    }
    if (that.device.attributes.hasOwnProperty('alarmSystemStatus')) {
        that.deviceGroup = "alarm";
        thisCharacteristic = that.getaddService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemCurrentState)
            .on('get', function(callback) {
                // platform.log('alarm1: ' + device.attributes.alarmSystemStatus + ' | ' + convertAlarmState(device.attributes.alarmSystemStatus, true));
                callback(null, convertAlarmState(that.device.attributes.alarmSystemCurrent, true));
            });
        platform.addAttributeUsage('alarmSystemCurrent', device.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.SecuritySystem).getCharacteristic(Characteristic.SecuritySystemTargetState)
            .on('get', function(callback) {
                // platform.log('alarm2: ' + device.attributes.alarmSystemStatus + ' | ' + convertAlarmState(device.attributes.alarmSystemStatus, true));
                callback(null, convertAlarmState(that.device.attributes.alarmSystemStatus.toLowerCase(), true));
            })
            .on('set', function(value, callback) {
                platform.log('setAlarm: ' + value + ' | ' + convertAlarmState(value));
                platform.api.setAlarmState(convertAlarmState(value)).then(function(resp) {
                    if (callback) 
                        callback(null, value); 
                }).catch(function(err) { if (callback) callback(err); });
                that.device.attributes.alarmSystemStatus = convertAlarmState(value);
            });
        platform.addAttributeUsage('alarmSystemStatus', device.deviceid, thisCharacteristic);
    }
    if (deviceHasAttributeCommand('position', 'setPosition')) {
        that.deviceGroup = "windowshade";
        thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition)
            .on('get', function(callback) {
                let curPos = parseInt(that.device.attributes.position);
                if (curPos > 98) {
                    curPos = 100;
                } else if (curPos < 2) {
                    curPos = 0;
                }
                callback(null, curPos);
            })
            .on('set', function(value, callback) {
                platform.log('setPosition(HE): ' + value);
                platform.api.runCommand(device.deviceid, 'setPosition', {
                    value1: value
                }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
            });
        platform.addAttributeUsage('position', device.deviceid, thisCharacteristic);
        thisCharacteristic = that.getaddService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition)
            .on('get', function(callback) {
                let curPos = parseInt(that.device.attributes.position);
                if (curPos > 98) {
                    curPos = 100;
                } else if (curPos < 2) {
                    curPos = 0;
                }
                callback(null, curPos);
            });
        platform.addAttributeUsage('position', device.deviceid, thisCharacteristic);
        thisCharacteristic = that.getaddService(Service.WindowCovering).setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
    }
    if (deviceHasAttributeCommand('speed', 'setSpeed'))
    {
        that.deviceGroup = "fan";
        thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.Active)
            .on('get', function(callback) {
                var fanLvl = 0;
                fanLvl = speedFanConversion(that.device.attributes.speed);
                callback(null, fanLvl>0);
            })
            .on('set', function(value,callback) {
                if (value === 0)
                    platform.api.runCommand(device.deviceid, "setSpeed", {
                        value1: "off"
                    }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                else
                {
                    var fanLvl = speedFanConversion(that.device.attributes.speed);
                    var fanValue = that.device.attributes.speed;
                    if (fanLvl === 0)
                        fanValue = "high";
                    platform.api.runCommand(device.deviceid, "setSpeed", {
                        value1: fanValue
                    }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                }
            });
        platform.addAttributeUsage('speed', device.deviceid, thisCharacteristic);

        thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.RotationSpeed)
            .on('get', function(callback) {
                var fanLvl = 0;
                fanLvl = speedFanConversion(that.device.attributes.speed);
                callback(null, fanLvl);
            })
            .on('set', function(value, callback) {
            if (value > 0) {
                let cmdStr = 'setSpeed';
                let cmdVal = fanSpeedConversion(value);
                platform.api.runCommand(device.deviceid, cmdStr, {
                    value1: cmdVal
                }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
            }
            else {
                platform.api.runCommand(device.deviceid, "setSpeed", { 
                    value1: "off" 
                }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
            }
                
        });
        platform.addAttributeUsage('speed', device.deviceid, thisCharacteristic);
    }
    if (that.device.attributes.hasOwnProperty('valve')) 
    {
        that.deviceGroup = "valve";
        let valveType = 0;
        //Gets the inUse Characteristic
        thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.InUse)
            .on('get', function(callback) {
                callback(null, that.device.attributes.valve === 'open' ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE);
            });
        platform.addAttributeUsage('valve', device.deviceid, thisCharacteristic);

        //Defines the valve type (irrigation or generic)
        thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.ValveType)
            .on('get', function(callback) {
                callback(null, valveType);
            });
        platform.addAttributeUsage('valve', device.deviceid, thisCharacteristic);

        //Defines Valve State (opened/closed)
        thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.Active)
            .on('get', function(callback) {
                callback(null, that.device.attributes.valve === 'open' ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE);
            })
            .on('set', function(value, callback) {
                // if (device.attributes.inStandby !== 'true') {
                if (value) {
                    platform.api.runCommand(device.deviceid, 'open').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                } else {
                    platform.api.runCommand(device.deviceid, 'close').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                }
                // }
            });
        platform.addAttributeUsage('valve', device.deviceid, thisCharacteristic);
    }
/*
    if (device && device.capabilities) {
        if ((device.capabilities['Switch Level'] !== undefined || device.capabilities['SwitchLevel'] !== undefined) && !isSpeaker && !isFan && !isMode && !isRoutine && !isWindowShade) {
            if (device.commands.levelOpenClose || device.commands.presetPosition) {
            } else if (isLight === true || device.commands.hasOwnProperty('setLevel')) {
            }
        }
        if (platformName === 'Hubitat' && isWindowShade) {
        }
        if (device.capabilities['Garage Door Control'] !== undefined || device.capabilities['GarageDoorControl'] !== undefined) {
        }
        if (device.capabilities['Lock'] !== undefined) {
        }
        if (device.capabilities["Valve"] !== undefined) {
            this.platform.log("valve: " + device.attributes.valve);
            deviceGroup = "valve";
            let valveType = (device.capabilities['Irrigation'] !== undefined ? 0 : 0);

            //Gets the inUse Characteristic
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.InUse)
                .on('get', function(callback) {
                    callback(null, device.attributes.valve === 'open' ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE);
                });
            platform.addAttributeUsage('inUse', device.deviceid, thisCharacteristic);

            //Defines the valve type (irrigation or generic)
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.ValveType)
                .on('get', function(callback) {
                    callback(null, valveType);
                });
            platform.addAttributeUsage('valveType', device.deviceid, thisCharacteristic);

            //Defines Valve State (opened/closed)
            thisCharacteristic = that.getaddService(Service.Valve).getCharacteristic(Characteristic.Active)
                .on('get', function(callback) {
                    callback(null, device.attributes.valve === 'open' ? Characteristic.InUse.IN_USE : Characteristic.InUse.NOT_IN_USE);
                })
                .on('set', function(value, callback) {
                    // if (device.attributes.inStandby !== 'true') {
                    if (value) {
                        platform.api.runCommand(device.deviceid, 'on').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    } else {
                        platform.api.runCommand(device.deviceid, 'off').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    }
                    // }
                });
            platform.addAttributeUsage('valve', device.deviceid, thisCharacteristic);
        }

        //Defines Speaker Device
        if (isSpeaker === true) {
            that.deviceGroup = 'speakers';
            thisCharacteristic = that.getaddService(Service.Speaker).getCharacteristic(Characteristic.Volume)
                .on('get', function(callback) {
                    callback(null, parseInt(that.device.attributes.level || 0));
                })
                .on('set', function(value, callback) {
                    if (value > 0) {
                        platform.api.runCommand(device.deviceid, 'setLevel', {
                            value1: value
                        }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    }
                });
            platform.addAttributeUsage('volume', device.deviceid, thisCharacteristic);

            thisCharacteristic = that.getaddService(Service.Speaker).getCharacteristic(Characteristic.Mute)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.mute === 'muted');
                })
                .on('set', function(value, callback) {
                    if (value) {
                        platform.api.runCommand(device.deviceid, 'mute').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    } else {
                        platform.api.runCommand(device.deviceid, 'unmute').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    }
                });
            platform.addAttributeUsage('mute', device.deviceid, thisCharacteristic);
        }
        //Handles Standalone Fan with no levels
        if (isFan === true && (device.capabilities['Fan Light'] !== undefined || device.capabilities['FanLight'] !== undefined || that.deviceGroup === 'unknown')) {
            that.deviceGroup = 'fans';
            thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.Active)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                })
                .on('set', function(value, callback) {
                    if (value) {
                        platform.api.runCommand(device.deviceid, 'on').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    } else {
                        platform.api.runCommand(device.deviceid, 'off').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    }
                });
            platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);

            if (that.device.attributes.level !== undefined || that.device.attributes.fanSpeed !== undefined) {
                let fanLvl = that.device.attributes.fanSpeed ? fanSpeedConversion(that.device.attributes.fanSpeed, (device.command['medHighSpeed'] !== undefined)) : parseInt(that.device.attributes.level);
                platform.log("Fan with (" + that.device.attributes.fanSpeed ? "fanSpeed" : "level" + ') | value: ' + fanLvl);
                thisCharacteristic = that.getaddService(Service.Fanv2).getCharacteristic(Characteristic.RotationSpeed)
                    .on('get', function(callback) {
                        callback(null, fanLvl);
                    })
                    .on('set', function(value, callback) {
                        if (value > 0) {
                            let cmdStr = (that.device.attributes.fanSpeed) ? 'fanspeed' : 'setLevel';
                            let cmdVal = (that.device.attributes.fanSpeed) ? fanSpeedConversion(value, (device.command['medHighSpeed'] !== undefined)) : parseInt(value);
                            platform.log("Fan Command (Str: " + cmdStr + ') | value: (' + cmdVal + ')');
                            platform.api.runCommand(device.deviceid, cmdStr, {
                                value1: cmdVal
                            }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                        }
                    });
                platform.addAttributeUsage('level', device.deviceid, thisCharacteristic);
            }
        }
        if (isMode === true) {
            that.deviceGroup = 'mode';
            platform.log('Mode: (' + that.name + ')');
            thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                })
                .on('set', function(value, callback) {
                    if (value && that.device.attributes.switch === 'off') {
                        platform.api.runCommand(device.deviceid, 'mode', {
                            value1: that.name.toString()
                        }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                    }
                });
            platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
        }
        if (isRoutine === true) {
        }
        if (device.capabilities['Button'] !== undefined) {
            that.deviceGroup = 'button';
            platform.log('Button: (' + that.name + ')');
            thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
                .on('get', function(callback) {
                    callback(null, that.device.attributes.switch === 'on');
                })
                .on('set', function(value, callback) {
                    if (value && that.device.attributes.switch === 'off') {
                        platform.api.runCommand(device.deviceid, 'button');
                    }
                }).then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
            platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
        }

        // This should catch the remaining switch devices that are specially defined
        if (device.capabilities['Switch'] !== undefined && (device.capabilities['Fan Light'] !== undefined || device.capabilities['FanLight'] !== undefined || that.deviceGroup === 'unknown')) {
            //Handles Standalone Fan with no levels
            if (isLight === true) {
                that.deviceGroup = 'light';
                if (device.capabilities['Fan Light'] || device.capabilities['FanLight']) {
                    platform.log('FanLight: ' + device.name);
                }
                thisCharacteristic = that.getaddService(Service.Lightbulb).getCharacteristic(Characteristic.On)
                    .on('get', function(callback) {
                        callback(null, that.device.attributes.switch === 'on');
                    })
                    .on('set', function(value, callback) {
                        if (value) {
                            platform.api.runCommand(device.deviceid, 'on').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                        } else {
                            platform.api.runCommand(device.deviceid, 'off').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                        }
                    });
                platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);
            } else {
                that.deviceGroup = 'switch';
                thisCharacteristic = that.getaddService(Service.Switch).getCharacteristic(Characteristic.On)
                    .on('get', function(callback) {
                        callback(null, that.device.attributes.switch === 'on');
                    })
                    .on('set', function(value, callback) {
                        if (value) {
                            platform.api.runCommand(device.deviceid, 'on').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                        } else {
                            platform.api.runCommand(device.deviceid, 'off').then(function(resp) {if (callback) callback(null, value); }).catch(function(err) { if (callback) callback(err); });
                        }
                    });
                platform.addAttributeUsage('switch', device.deviceid, thisCharacteristic);

                if (device.capabilities['Energy Meter'] || device.capabilities['EnergyMeter']) {
                    thisCharacteristic = that.getaddService(Service.Switch).addCharacteristic(CommunityTypes.TotalConsumption1)
                        .on('get', function(callback) {
                            callback(null, Math.round(that.device.attributes.power));
                        });
                    platform.addAttributeUsage('energy', device.deviceid, thisCharacteristic);
                }
                if (device.capabilities['Power Meter'] || device.capabilities['PowerMeter']) {
                    thisCharacteristic = that.getaddService(Service.Switch).addCharacteristic(CommunityTypes.CurrentConsumption1)
                        .on('get', function(callback) {
                            callback(null, Math.round(that.device.attributes.power));
                        });
                    platform.addAttributeUsage('power', device.deviceid, thisCharacteristic);
                }
            }
        }
        if ((device.capabilities['Smoke Detector'] !== undefined || device.capabilities['SmokeDetector'] !== undefined) && that.device.attributes.smoke) {
        }
        if ((device.capabilities['Carbon Monoxide Detector'] !== undefined || device.capabilities['CarbonMonoxideDetector'] !== undefined) && that.device.attributes.carbonMonoxide) {
        }
        if ((device.capabilities['Carbon Dioxide Measurement'] !== undefined || device.capabilities['CarbonDioxideMeasurement'] !== undefined) && that.device.attributes.carbonDioxideMeasurement) {
        }
        if (device.capabilities['Motion Sensor'] !== undefined || device.capabilities['MotionSensor'] !== undefined) {
        }
        if (device.capabilities['Water Sensor'] !== undefined || device.capabilities['WaterSensor'] !== undefined) {
        }
        if (device.capabilities['Presence Sensor'] !== undefined || device.capabilities['PresenceSensor'] !== undefined) {
        }
        if (device.capabilities['Relative Humidity Measurement'] !== undefined || device.capabilities['RelativeHumidityMeasurement'] !== undefined) {
        }
        if (device.capabilities['Temperature Measurement'] !== undefined || device.capabilities['TemperatureMeasurement'] !== undefined) {
        }
        if (device.capabilities['Illuminance Measurement'] !== undefined || device.capabilities['IlluminanceMeasurement'] !== undefined) {
        }
        if ((device.capabilities['Contact Sensor'] !== undefined && device.capabilities['Garage Door Control'] === undefined) || (device.capabilities['ContactSensor'] !== undefined && device.capabilities['GarageDoorControl'] === undefined)) {
        }
        if (device.capabilities['Battery'] !== undefined) {
        }
        // if (device.capabilities['Energy Meter'] !== undefined && that.deviceGroup === 'unknown') {
        //     that.deviceGroup = 'EnergyMeter';
        //     thisCharacteristic = that.getaddService(Service.Outlet).addCharacteristic(CommunityTypes.TotalConsumption1)
        //     .on('get', function(callback) {
        //         callback(null, Math.round(that.device.attributes.energy));
        //     });
        //     platform.addAttributeUsage('energy', device.deviceid, thisCharacteristic);
        // }
        // if (device.capabilities['Power Meter'] !== undefined && that.deviceGroup === 'unknown') {
        //     thisCharacteristic = that.getaddService(Service.Outlet).addCharacteristic(CommunityTypes.CurrentConsumption1)
        //     .on('get', function(callback) {
        //         callback(null, Math.round(that.device.attributes.power));
        //     });
        //     platform.addAttributeUsage('power', device.deviceid, thisCharacteristic);
        // }
        if (device.capabilities['Acceleration Sensor'] !== undefined || device.capabilities['AccelerationSensor'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
        }
        if (device.capabilities['Three Axis'] !== undefined || device.capabilities['ThreeAxis'] !== undefined) {
            if (that.deviceGroup === 'unknown') {
                that.deviceGroup = 'sensor';
            }
        }
        if (device.capabilities['Thermostat'] !== undefined) {
        }
        // Alarm System Control/Status
        if (that.device.attributes['alarmSystemStatus'] !== undefined) {
        }
    }
*/
    //this.loadData(device, that);
    //if ((accessory !== null) && (accessory !==undefined))
    //    removeExculdedAttributes();
}

function speedFanConversion(speedVal) {
    switch (speedVal) {
        case "low":
            return 20;
        case "medium-low":
            return 40;
        case "medium":
            return 60;
        case "medium-high":
            return 80;
        case "high":
            return 100;
        default:
            return 0;
        }
    return speedVal;
}
function fanSpeedConversion(speedVal) {
    if (speedVal <= 0) {
        return "off";
    } else if (speedVal > 0 && speedVal <= 20) {
        return "low";
    } else if (speedVal > 20 && speedVal <= 40) {
        return "medium-low";
    } else if (speedVal > 40 && speedVal <= 60) {
        return "medium";
    } else if (speedVal > 60 && speedVal <= 80) {
        return "medium-high";
    } else if (speedVal > 80 && speedVal <= 100) {
        return "high";
    }
    return speedVal;
}

function convertAlarmState(value, valInt = false) {
    switch (value) {
        case 'stay':
        case 'armHome':
        case 'armedHome':
        case 'armhome':
        case 'armedhome':
        case 0:
            return valInt ? Characteristic.SecuritySystemCurrentState.STAY_ARM : 'armHome';
        case 'away':
        case 'armaway':
        case 'armAway':
        case 'armedaway':
        case 'armedAway':
        case 1:
            return valInt ? Characteristic.SecuritySystemCurrentState.AWAY_ARM : 'armAway';
        case 'night':
        case 'armnight':
        case 'armNight':
        case 'armednight':
        case 'armedNight':
        case 2:
            return valInt ? Characteristic.SecuritySystemCurrentState.NIGHT_ARM : 'armNight';
        case 'off':
        case 'disarm':
        case 'disarmed':
        case 3:
            return valInt ? Characteristic.SecuritySystemCurrentState.DISARMED : 'disarm';
        case 'alarm_active':
        case 4:
            return valInt ? Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED : 'alarm_active';
    }
}

function loadData(data, myObject) {
    var that = this;
    if (myObject !== undefined) {
        that = myObject;
    }
    if (data !== undefined) {
        this.device = data;
        for (var i = 0; i < that.accessory.services.length; i++) {
            for (var j = 0; j < that.accessory.services[i].characteristics.length; j++) {
                that.accessory.services[i].characteristics[j].getValue();
            }
        }
    } else {
        this.log.debug('Fetching Device Data');
        this.platform.api.getDevice(this.deviceid, function(data) {
            if (data === undefined) {
                return;
            }
            this.device = data;
            for (var i = 0; i < that.accessory.services.length; i++) {
                for (var j = 0; j < that.accessory.services[i].characteristics.length; j++) {
                    that.accessory.services[i].characteristics[j].getValue();
                }
            }
        });
    }
}

function getServices() {
    return this.accessory.services;
}



