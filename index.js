const pluginName = 'homebridge-hubitat-makerapi';
const platformName = 'Hubitat-MakerAPI';

if (pluginName === 'homebridge-hubitat-makerapi') {
    var he_st_api = require('./lib/api-homebridge-hubitat-makerapi.js').api;
} else {
    var he_st_api = require('./lib/api-homebridge-hubitat-hubconnect.js').api;
}
const ignoreTheseAttributes = require('./lib/ignore-attributes.js').ignoreTheseAttributes;

const InternalError = require('./lib/InternalError').InternalError;
var Service,
    Characteristic,
    Accessory,
    uuid,
    HE_ST_Accessory,
    User,
    PlatformAccessory;
const util = require('util');
const URL = require('url');
const os = require('os');
const uuidGen = require('./accessories/he_st_accessories').uuidGen;
const uuidDecrypt = require('./accessories/he_st_accessories').uuidDecrypt;
const Logger = require('./lib/Logger.js').Logger;

module.exports = function(homebridge) {
    console.log("Homebridge Version: " + homebridge.version);
    console.log("Plugin Version: " + npm_version);
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    User = homebridge.user;
    uuid = homebridge.hap.uuid;
    PlatformAccessory = homebridge.platformAccessory;
    HE_ST_Accessory = require('./accessories/he_st_accessories')(Accessory, Service, Characteristic, PlatformAccessory, uuid, platformName);
    homebridge.registerPlatform(pluginName, platformName, HE_ST_Platform, true);
};
const npm_version = require('./package.json').version;
function HE_ST_Platform(log, config, api) {
    if ((config === null) || (config === undefined))
    {
        this.disabled = true;
        log('Plugin not configured in config.json, disabled plugin');
        return null;
    }
    var logFileSettings = null;
    if (config['logFile']) {
        if (config['logFile'].enabled) {
           logFileSettings = {};
           logFileSettings.path = config['logFile'].path || api['user'].storagePath();
           logFileSettings.file = config['logFile'].file || "homebridge-hubitat.log";
           logFileSettings.compress = config['logFile'].compress || true;
           logFileSettings.keep = config['logFile'].keep || 5;
           logFileSettings.size = config['logFile'].size || '10m';
        }
    }
 
    this.config = config; 
    if (pluginName === 'homebridge-hubitat-makerapi')
        this.log = Logger.withPrefix( this.config['name']+ ' hhm:' + npm_version, config['debug'] || false, logFileSettings);
    else
        this.log = Logger.withPrefix( this.config['name']+ ' hhh:' + npm_version, config['debug'] || false, logFileSettings);
    this.platformName = platformName;
    this.temperature_unit = config['temperature_unit'];
    if (this.temperature_unit === null || this.temperature_unit === undefined || (this.temperature_unit !== 'F' && this.temperature_unit !== 'C'))
        this.temperature_unit = 'F'; 
    this.hubconnect_key = config['hubconnect_key'];
    this.local_port = config['local_port'];
    if (this.local_port === undefined || this.local_port === '') {
        this.local_port = 20009;
    }

    this.local_ip = config['local_ip'];
    if (this.local_ip === undefined || this.local_ip === '') {
        this.local_ip = getIPAddress();
        this.log.good('Setting "local_ip" not set in config, tried to determine it and found ' + this.local_ip + " -> I hope this is correct");    
    }    
    this.app_url = config['app_url'];
    this.app_id = config['app_id'];
    this.access_token = config['access_token'];
    this.excludedAttributes = config["excluded_attributes"] || [];
    this.excludedCapabilities = config["excluded_capabilities"] || [];
    // This is how often it does a full refresh
    this.polling_seconds = config['polling_seconds'];
    // Get a full refresh every hour.
    if (!this.polling_seconds) {
        this.polling_seconds = 300;
    }
    this.enable_modes = config['mode_switches'] || false;
    this.enable_hsm = config['hsm'] || false;
    this.mode_switches =  config['mode_switches'] || false;
    this.add_reboot_switch = config['add_reboot_switch'] || false;

    // This is how often it polls for subscription data.
    this.api = he_st_api;
    this.deviceLookup = {};
    this.firstpoll = true;
    this.attributeLookup = {};
    this.hb_api = api;
    this.version_speak_device = this.config['version_speak_device'];
    this.versionCheck = require('./lib/npm_version_check')(pluginName,npm_version,this.log,null);
    this.doVersionCheck();
    he_st_api.init(this.app_url, this.app_id, this.access_token, this.local_hub_ip, this);
    if (pluginName === 'homebridge-hubitat-makerapi')
        this.receiver = require('./lib/receiver-homebridge-hubitat-makerapi.js').receiver;
    else
        this.receiver = require('./lib/receiver-homebridge-hubitat-hubconnect.js').receiver;
    this.hb_api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    this.asyncCallWait = 0;
}

HE_ST_Platform.prototype = {
    doVersionCheck: function (){
        var that = this;
        if (that.versionCheck)
        {
            that.versionCheck().then(function(resp){
                if (resp.versionCheckComplete && !resp.versionIsCurrent)
                {
/*                    if (that.version_speak_device != undefined && that.version_speak_device != null)
                        that.log('send pushover');
                        that.api.runCommand(that.version_speak_device, 'speak', {
                                value1: ('a_newer_version_(' + resp.npm_version + ')_of_the_' + pluginName + '_plugin_is_available_on_NPMJS.')
                            }).then(function(resp) { }).catch(function(err) { });
*/
                }
            }).catch(function(resp){
            });
        }
    },
    addUpdateAccessory: function(deviceid, group, inAccessory = null, inDevice = null)
    {
        var that = this;
        return new Promise(function(resolve, reject) {
            //that.log.error('addUpdateAccessory', deviceid, group, inAccessory, inDevice);
            var accessory;
            if (that.deviceLookup && that.deviceLookup[uuidGen(deviceid)]) {
                if (that.deviceLookup[uuidGen(deviceid)] instanceof HE_ST_Accessory)
                {
                    accessory = that.deviceLookup[uuidGen(deviceid)];
                    //accessory.loadData(devices[i]);
                    resolve(accessory);
                }
            } else { 
                if ((inDevice === null) || (inDevice === undefined)) {
                    he_st_api.getDeviceInfo(deviceid)
                        .then(function(data) {
                            var fromCache = ((inAccessory !== undefined) && (inAccessory !== null))
                            data.excludedAttributes = that.excludedAttributes[deviceid] || ["None"];
                            data.excludedCapabilities = that.excludedCapabilities[deviceid] || ["None"];
                            accessory = new HE_ST_Accessory(that, group, data, inAccessory);
                            // that.log(accessory);
                            if (accessory !== undefined) {
                                if (accessory.accessory.services.length <= 1 || accessory.deviceGroup === 'unknown') {
                                    if (that.firstpoll) {
                                        that.log.warn('Device Skipped - Name ' + accessory.name + ', ID ' + accessory.deviceid + ', JSON: ' + JSON.stringify(accessory.device));
                                    }
                                    resolve(accessory);
                                } else {
                                    that.log.good("Device Added" + (fromCache ? ' (Cache)' : '') + " - Name " + accessory.name + ", ID " + accessory.deviceid); //+", JSON: "+ JSON.stringify(device));
                                    that.deviceLookup[uuidGen(accessory.deviceid)] = accessory;
                                    if (inAccessory === null)
                                        that.hb_api.registerPlatformAccessories(pluginName, platformName, [accessory.accessory]);
                                    accessory.loadData(data);
                                    resolve(accessory);
                                }
                            }
                        })
                        .catch(function(error){
                            var errorMessage;
                            var internalError = undefined;
                            if (error.hasOwnProperty('statusCode'))
                            {
                                if (error.statusCode === 404)
                                    internalError = new InternalError(InternalError.Codes.API_NOT_AVAILABLE, '', error);
                                else if (error.statusCode === 401)
                                    internalError = new InternalError(InternalError.Codes.ACCESS_CODE_WRONG, '', error);
                                else if (error.statusCode === 500)
                                    internalError = new InternalError(InternalError.Codes.API_DISABLED, '', error);
                            }
                            if (internalError === undefined) {
                                that.log.error(error);
                                internalError = new InternalError(InternalError.Codes.RANDOM, '', error);
                            }
                            reject(internalError);
                        });
                }
                else {
                    var fromCache = ((inAccessory !== undefined) && (inAccessory !== null))
                    accessory = new HE_ST_Accessory(that, group, inDevice, inAccessory);   
                    if (accessory !== undefined) {
                        if (accessory.accessory.services.length <= 1 || accessory.deviceGroup === 'unknown') {
                            if (that.firstpoll) {
                                that.log.warn('Device Skipped - Name ' + accessory.name + ', ID ' + accessory.deviceid + ', JSON: ' + JSON.stringify(inDevice));
                            }
                        } else {
                            that.log.good("Device Added" + (fromCache ? ' (Cache)' : '') + " - Name " + accessory.name + ", ID " + accessory.deviceid); //+", JSON: "+ JSON.stringify(device));
                            that.deviceLookup[uuidGen(accessory.deviceid)] = accessory;
                            if (inAccessory === null)
                                that.hb_api.registerPlatformAccessories(pluginName, platformName, [accessory.accessory]);
                            accessory.loadData(inDevice);
                            resolve(accessory);
                        }
                    }
                }
            }
        });
    },
    _didFinishLaunching: function() {
        this.didFinishLaunching('me');
    },
    didFinishLaunching: function(caller) {
        var that = this;
        if (this.disabled === true)
            return;
        //this.log.error('didFinishLaunching', (caller ? caller : 'homebridge'));
        if (that.asyncCallWait !== 0) {
            that.log("Configuration of cached accessories not done, wait for a bit...", that.asyncCallWait);
            setTimeout(that._didFinishLaunching.bind(that), 1000);
            return;
        }
        this.log('Fetching ' + platformName + ' devices. This can take a while depending on the number of devices are configured!');
        var that = this;
        var starttime = new Date();
        this.reloadData(function(foundAccessories) {
            var timeElapsedinSeconds = Math.round((new Date() - starttime)/1000);
            if (timeElapsedinSeconds >= that.polling_seconds) {
                that.log('It took ' + timeElapsedinSeconds + ' seconds to get all data and polling_seconds is set to ' + that.polling_seconds);
                that.log(' Changing polling_seconds to ' + (timeElapsedinSeconds * 2) + ' seconds');
                that.polling_seconds = timeElapsedinSeconds * 2;
            } else if (that.polling_seconds < 30)
            {
                that.log('polling_seconds really shouldn\'t be smaller than 30 seconds. Setting it to 30 seconds');
                that.polling_seconds = 30;
            }
            setInterval(that.reloadData.bind(that), that.polling_seconds * 1000);
            setInterval(that.doVersionCheck.bind(that), 24 * 60 * 60 * 1000); //60 seconds
            that.receiver.start(that);
        });
    },
    removeAccessory: function(accessory) {
        var that = this;
        return new Promise(function(resolve, reject) {
            if (accessory instanceof HE_ST_Accessory)
            {
                that.hb_api.unregisterPlatformAccessories(pluginName, platformName, [accessory.accessory]);
                if (that.deviceLookup[accessory.accessory.UUID]) {
                    that.log.warn("Device Removed - Name " + that.deviceLookup[accessory.accessory.UUID].name + ', ID ' + that.deviceLookup[accessory.accessory.UUID].deviceid);
                    that.removeDeviceAttributeUsage(that.deviceLookup[accessory.accessory.UUID].deviceid);
                    if (that.deviceLookup.hasOwnProperty(accessory.accessory.UUID))
                        delete that.deviceLookup[accessory.accessory.UUID];
                }
            }
            else
            {   
                that.log.warn("Remove stale cache device " + that.deviceLookup[accessory.UUID].displayName);
                that.hb_api.unregisterPlatformAccessories(pluginName, platformName, [that.deviceLookup[accessory.UUID]]);
                delete that.deviceLookup[accessory.UUID];
            }
            resolve('');
        });
    },
    removeOldDevices: function(devices) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var accessories = [];
            Object.keys(that.deviceLookup).forEach(function(key) {
            if (!(that.deviceLookup[key] instanceof HE_ST_Accessory))
                that.removeAccessory(that.deviceLookup[key]).catch(function(error) {});
            });
            Object.keys(that.deviceLookup).forEach(function(key) {
                if (that.deviceLookup[key].deviceGroup === 'reboot')
                    return;
                var unregister = true;
                for (var i = 0; i < devices.length; i++) {
                    if (that.deviceLookup[key].accessory.UUID === uuidGen(devices[i].id))
                        unregister = false;
                }
                if (unregister)
                    that.removeAccessory(that.deviceLookup[key]).catch(function(error) {});
            });
            resolve(devices);
        });
    },
    populateDevices: function (devices) {
        var that = this;
        return new Promise(function(resolve, reject) {
            for (var i = 0; i < devices.length; i++) {
                var device = devices[i];
                var group = "device";
                if (device.type) 
                    group = device.type;
                var deviceData = null;
                if (device.data)
                    deviceData = device.data;
                that.addUpdateAccessory(device.id, group, null, deviceData)
                    .catch(function(error)
                    {
                        that.log.error(error);
                    });
            }
            resolve(devices);
        });
    },
    updateDevices: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            if (!that.firstpoll) {
                var updateAccessories = [];
                Object.keys(that.deviceLookup).forEach(function(key) {
                    if (that.deviceLookup[key] instanceof HE_ST_Accessory)
                        updateAccessories.push(that.deviceLookup[key].accessory);
                });
                if (updateAccessories.length)
                    that.hb_api.updatePlatformAccessories(updateAccessories);
            }
            resolve('');
        });
    },
    reloadData: function(callback) {
        var that = this;
        // that.log('config: ', JSON.stringify(this.config));
        var foundAccessories = [];
        that.log('Refreshing All Device Data');
        he_st_api.getDevicesSummary().then(function(myList) {
            that.log('Received All Device Data');//,  util.inspect(myList, false, null, true));
            if (that.add_reboot_switch === true) {
                    var rebootDevice = {};
                    rebootDevice.excludedAttributes = ["None"];
                    rebootDevice.excludedCapabilities = ["None"];
                    rebootDevice.deviceid = 'reboot';
                    rebootDevice.name = 'Reboot Hub';
                    rebootDevice.attributes = {};
                    rebootDevice.attributes['reboot'] = 'true';
                    rebootDevice.capabilities = {};
                    rebootDevice.commands = {};
                    myList.push( {id: 'reboot', name: 'Reboot Hub', label: 'Reboot Hub', type: 'reboot', data: rebootDevice });
            }
            return myList;
        }).then(function(myList) {
            if (that.enable_modes === true) {
                that.log('Loading Modes');
                return he_st_api.getModes().then(function(modes) {
                    that.log('Processing Modes');
                    if (modes === null)
                    {
                        that.log.warn('Modes not available, old HE firmware? skipping modes');
                        return myList;
                    }
                    for (var key in modes) {
                        var mode = {};
                        mode.deviceid = modes[key].name + ' ' + that.config['name'];
                        mode.label = 'Mode - ' + modes[key].name;
                        mode.name = mode.label;
                        mode.attributes = {};
                        mode.attributes['switch'] = (modes[key].active === true ? "on": "off");
                        mode.attributes['modeid'] = modes[key].id;
                        mode.capabilities = {};
                        mode.commands = {};
                        mode.excludedAttributes = ["None"];
                        mode.excludedCapabilities = ["None"];
                        myList.push( {id: mode.deviceid, name: mode.label, label: mode.label, type: 'mode', data: mode});
                    }
                    return myList;
                });
            }
            else
                return myList;
        }).then(function(myList) {
            if (that.enable_hsm === true) {
                that.log('Loading HSM');
                return he_st_api.getAlarmState().then(function(alarmState) {
                    if (alarmState.hsm === null)
                    {
                            that.log.warn('HSM not configured, skipping');
                            return myList;
                    }
                    that.log('Processing HSM');
                    var alarmSystem = {};
                    alarmSystem.deviceid = 'hsm' + that.config['name'];
                    alarmSystem.label = 'Alarm System ' + that.config['name'];
                    alarmSystem.name = alarmSystem.label;
                    alarmSystem.attributes = {};
                    alarmSystem.attributes['alarmSystemStatus'] = alarmState.hsm;
                    alarmSystem.attributes['alarmSystemCurrent'] = alarmState.hsm;
                    alarmSystem.capabilities = {};
                    alarmSystem.commands = {};
                    alarmSystem.excludedAttributes = ["None"];
                    alarmSystem.excludedCapabilities = ["None"];
                    myList.push({id: alarmSystem.deviceid, name: alarmSystem.name, label: alarmSystem.label, type: 'alarmSystem', data: alarmSystem});
                    return myList;
                });
            }
            else
                return myList;
        }).then(function(myList) {
            return that.removeOldDevices(myList);
        }).then(function(myList) {
            return that.populateDevices(myList);
        }).then(function(myList) {
            return that.updateDevices();
        }).then(function(myList) {
            if (callback)
                callback(foundAccessories);
            that.firstpoll = false;
        }).catch(function(error) {
            if (error.hasOwnProperty('statusCode'))
            {
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
            that.log.error('I am stopping my reload here and hope eveything fixes themselves (e.g. a firmware update of HE is rebooting the hub');
        });
    },
    configureAccessory: function (accessory) {
        var done = false;

        if (this.disabled === true)
            return;
        var that = this;
        var deviceIdentifier = accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.split(':');
        if (deviceIdentifier.length > 1) {
            that.asyncCallWait++;
            if (deviceIdentifier[0] === 'device') {
                that.addUpdateAccessory(deviceIdentifier[1], deviceIdentifier[0], accessory).then(function() {
                    that.asyncCallWait--;
                    done = true;
                }).catch(function(error) {
                    if (error.errorCode === InternalError.Codes.API_NOT_AVAILABLE)
                    {
                        that.log.warn('Device Skipped - Name ' + accessory.name + ', ID ' + deviceIdentifier[1] + ' - Received Code 404, mark for removal from cache');
                        that.deviceLookup[accessory.UUID] = accessory;
                    }
                    else
                    {
                        that.log(error);
                        that.log.error('Going to exit here to not destroy your room assignments.');
                        process.exit(1);
                    }
                    that.asyncCallWait--;
                    done = true;
                });
            } else if (deviceIdentifier[0] === 'mode') {
                if (that.enable_modes === false) {
                    that.log.warn('Device Mode - Name ' + accessory.name + ', ID ' + deviceIdentifier[1] + ' - marked for removal from cache');
                    that.deviceLookup[accessory.UUID] = accessory;
                    that.asyncCallWait--;
                    done = true;
                } else {
                he_st_api.getModes().then(function(modes) {
                    var mode = {};
                    if (modes === null)
                    {
                        that.log.warn('Modes not available, old HE firmware? removing mode tiles');
                        that.deviceLookup[accessory.UUID] = accessory;
                        that.asyncCallWait--;
                        done = true;
                        return;
                    }
                    for (var key in modes) {
                        if (modes[key].name === deviceIdentifier[1].replace(' ' + that.config['name'], ''))
                        {
                            mode.deviceid = modes[key].name + ' ' + that.config['name'];    
                            mode.label = 'Mode - ' + modes[key].name;
                            mode.name = mode.label;
                            mode.attributes = {};
                            mode.attributes['switch'] = (modes[key].active === true ? "on": "off");
                            mode.attributes['modeid'] = modes[key].id;
                            mode.capabilities = {};
                            mode.commands = {};
                            mode.excludedAttributes = ["None"];
                            mode.excludedCapabilities = ["None"];
                        }
                    }
                    if (mode.deviceid) {
                        that.addUpdateAccessory(deviceIdentifier[1], deviceIdentifier[0], accessory, mode).then(function() {
                            that.asyncCallWait--;
                            done = true;
                        }).catch(function(error) {
                            if (error.errorCode === InternalError.Codes.API_NOT_AVAILABLE)
                            {
                                that.log.warn('Device Mode - Name ' + accessory.name + ', ID ' + deviceIdentifier[1] + ' - marked for removal from cache');
                                that.deviceLookup[accessory.UUID] = accessory;
                            }
                            else
                            {
                                that.log(error);
                                that.log.error('Going to exit here to not destroy your room assignments.');
                                process.exit(1);
                            }
                            that.asyncCallWait--;
                            done = true;
                        });
                    }
                    else {
                        that.log.warn('Device Mode - Name ' + accessory.name + ', ID ' + deviceIdentifier[1] + ' - marked for removal from cache');
                        that.deviceLookup[accessory.UUID] = accessory;
                        that.asyncCallWait--;
                        done = true;
                    }
                }).catch(function(error) {
                        that.log(error);
                        that.log.error('Going to exit here to not destroy your room assignments.');
                        process.exit(1);
                    that.asyncCallWait--;
                    done = true;
                });
                }
            } else if (deviceIdentifier[0] === 'reboot') {
                var rebootDevice = {};
                rebootDevice.excludedAttributes = ["None"];
                rebootDevice.excludedCapabilities = ["None"];
                rebootDevice.deviceid = 'reboot';
                rebootDevice.name = 'Reboot Hub';
                rebootDevice.attributes = {};
                rebootDevice.attributes['reboot'] = 'true';
                rebootDevice.capabilities = {};
                rebootDevice.commands = {};
                that.addUpdateAccessory(deviceIdentifier[1], deviceIdentifier[0], accessory, rebootDevice).then(function() {
                    that.asyncCallWait--;
                    done = true;
                }).catch(function(error) {
                    if (error.errorCode === InternalError.Codes.API_NOT_AVAILABLE)
                    {
                        that.log.warn('Device Skipped - Name ' + accessory.name + ', ID ' + deviceIdentifier[1] + ' - Received Code 404, mark for removal from cache');
                        that.deviceLookup[accessory.UUID] = accessory;
                    }
                    else
                    {
                        that.log(error);
                        that.log.error('Going to exit here to not destroy your room assignments.');
                        process.exit(1);
                    }
                    that.asyncCallWait--;
                    done = true;
                });
            } else if (deviceIdentifier[0] === 'alarmSystem') {
                var alarmSystem = {};
                if (that.enable_hsm === true && ('hsm' + that.config['name'] === deviceIdentifier[1])) {
                    he_st_api.getAlarmState().then(function(alarmState) {
                        if (alarmState.hsm === null)
                        {
                            that.log.warn('HSM not configured, removing tile');
                            that.deviceLookup[accessory.UUID] = accessory;
                            that.asyncCallWait--;
                            done = true;
                            return;
                        }
                        alarmSystem.deviceid = 'hsm' + that.config['name'];
                        alarmSystem.label = 'Alarm System ' + that.config['name'];
                        alarmSystem.name = alarmSystem.label;
                        alarmSystem.attributes = {};
                        alarmSystem.attributes['alarmSystemStatus'] = alarmState.hsm;
                        alarmSystem.attributes['alarmSystemCurrent'] = alarmState.hsm; 
                        alarmSystem.capabilities = {};
                        alarmSystem.commands = {};
                        alarmSystem.excludedAttributes = ["None"];
                        alarmSystem.excludedCapabilities = ["None"];
                        that.addUpdateAccessory(deviceIdentifier[1], deviceIdentifier[0], accessory, alarmSystem).then(function() {
                            that.asyncCallWait--;
                            done = true;
                        }).catch(function(error) {
                            that.log(error);
                            that.log.error('Going to exit here to not destroy your room assignments.');
                            process.exit(1);
                        });
                    });
                }
                else {
                    that.log.warn('Device Skipped - Name ' + accessory.name + ', ID ' + deviceIdentifier[1] + ' - marked for removal from cache');
                    that.deviceLookup[accessory.UUID] = accessory;
                    that.asyncCallWait--;
                    done = true;
                }
                     
            } else {
                this.log.warn("Invalid Device Indentifier Type (" + deviceIdentifier[0] + ") stored in cache, remove device", accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.Name).value);
                this.deviceLookup[accessory.UUID] = accessory;
                that.asyncCallWait--;
                done = true;
            }
        }
        else {
            this.log.warn("Invalid Device Indentifier stored in cache, remove device" + accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.Name).value);
            this.deviceLookup[accessory.UUID] = accessory;
            done = true;
        }
        //require('deasync').loopWhile(function(){return !done;});
    },
    accessories: function(callback) {
        var that = this;
        callback([]);
    },
    isAttributeUsed: function(attribute, deviceid) {
        if (!this.attributeLookup[attribute])
            return false;
        if (!this.attributeLookup[attribute][deviceid])
            return false;
        return true;
    },
    addAttributeUsage: function(attribute, deviceid, mycharacteristic) {
        if (!this.attributeLookup[attribute]) {
            this.attributeLookup[attribute] = {};
        }
        if (!this.attributeLookup[attribute][deviceid]) {
            this.attributeLookup[attribute][deviceid] = [];
        }
        this.attributeLookup[attribute][deviceid].push(mycharacteristic);
    },
    removeDeviceAttributeUsage: function(deviceid) {
        var that = this;
        Object.entries(that.attributeLookup).forEach((entry) => {
            const [key, value] = entry;
            if (that.attributeLookup[key].hasOwnProperty(deviceid))
                delete that.attributeLookup[key][deviceid];
        });
    },
    getAttributeValue: function(attribute, deviceid, that) {
        if (!(that.attributeLookup[attribute] && that.attributeLookup[attribute][deviceid])) {
            return null;
        }
        var myUsage = that.attributeLookup[attribute][deviceid];
        if (myUsage instanceof Array) {
            for (var j = 0; j < myUsage.length; j++) {
                var accessory = that.deviceLookup[uuidGen(deviceid)];
                if (accessory) {
                    return accessory.device.attributes[attribute];
                }
            }
        }
    },
    processFieldUpdate: function(attributeSet, that) {
        if (!(that.attributeLookup[attributeSet.attribute] && that.attributeLookup[attributeSet.attribute][attributeSet.device])) {
            return;
        }
        var myUsage = that.attributeLookup[attributeSet.attribute][attributeSet.device];
        if (myUsage instanceof Array) {
            for (var j = 0; j < myUsage.length; j++) {
                var accessory = that.deviceLookup[uuidGen(attributeSet.device)];
	            if (accessory) {
	                accessory.device.attributes[attributeSet.attribute] = attributeSet.value;
	                myUsage[j].getValue();
	            }
            }
        }
    }
};

function getIPAddress() {
    var interfaces = os.networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '0.0.0.0';
}
