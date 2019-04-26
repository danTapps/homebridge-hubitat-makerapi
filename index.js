const pluginName = 'homebridge-hubitat-makerapi';
const platformName = 'Hubitat-MakerAPI';
var he_st_api = require('./lib/he_maker_api').api;
var InternalError = require('./lib/InternalError').InternalError;
var ignoreTheseAttributes = require('./lib/he_maker_api.js').ignoreTheseAttributes;
var Service,
    Characteristic,
    Accessory,
    uuid,
    HE_ST_Accessory,
    User,
    PlatformAccessory;
const util = require('util');
const uuidGen = require('./accessories/he_st_accessories').uuidGen;
const uuidDecrypt = require('./accessories/he_st_accessories').uuidDecrypt;
var Logger = require('./lib/Logger.js').Logger;

module.exports = function(homebridge) {
    console.log("Homebridge Version: " + homebridge.version);
    console.log("Plugin Version: hhm:" + npm_version);
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
    

    this.temperature_unit = config['temperature_unit'];
    if (this.temperature_unit === null || this.temperature_unit === undefined || (this.temperature_unit !== 'F' && this.temperature_unit !== 'C'))
        this.temperature_unit = 'F'; 
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
    this.mode_switches =  config['mode_switches'] || false;
    this.add_reboot_switch = config['add_reboot_switch'] || false;

    // This is how often it polls for subscription data.
    this.config = config;
    this.api = he_st_api;
    this.log = Logger.withPrefix( this.config['name']+ ' hhm:' + npm_version);
    this.deviceLookup = {};
    this.firstpoll = true;
    this.attributeLookup = {};
    this.hb_api = api;
    this.version_speak_device = this.config['version_speak_device'];
    this.versionCheck = require('./lib/npm_version_check')(pluginName,npm_version,this.log,null);
    this.doVersionCheck();
    he_st_api.init(this.app_url, this.app_id, this.access_token, this.local_hub_ip, this.local_commands);
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
                    if (that.version_speak_device != undefined && that.version_speak_device != null)
                        that.log('send pushover');
                        that.api.runCommand(that.version_speak_device, 'speak', {
                                value1: ('a_newer_version_(' + resp.npm_version + ')_of_the_' + pluginName + '_plugin_is_available_on_NPMJS.')
                            }).then(function(resp) { }).catch(function(err) { });
                }
            }).catch(function(resp){
            });
        }
    },
    addUpdateAccessory: function(deviceid, group, inAccessory = null, inDevice = null)
    {
        var that = this;
        return new Promise(function(resolve, reject) {
            var accessory;
            if (that.deviceLookup && that.deviceLookup[uuidGen(deviceid)]) {
                if (that.deviceLookup[uuidGen(deviceid)] instanceof HE_ST_Accessory)
                {
                    accessory = that.deviceLookup[uuidGen(deviceid)];
                    that.deviceLookup[uuidGen(deviceid)].accessory.updateReachability(true);
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
                                        that.log('Device Skipped - Name ' + accessory.name + ', ID ' + accessory.deviceid + ', JSON: ' + JSON.stringify(device));
                                    }
                                } else {
                                    that.log("Device Added" + (fromCache ? ' (Cache)' : '') + " - Name " + accessory.name + ", ID " + accessory.deviceid); //+", JSON: "+ JSON.stringify(device));
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
                            if (internalError === undefined)
                                internalError = new InternalError(InternalError.Codes.RANDOM, '', error);
                            reject(internalError);
                        });
                }
                else {
                    var fromCache = ((inAccessory !== undefined) && (inAccessory !== null))
                    accessory = new HE_ST_Accessory(that, group, inDevice, inAccessory);   
                    if (accessory !== undefined) {
                        if (accessory.accessory.services.length <= 1 || accessory.deviceGroup === 'unknown') {
                            if (that.firstpoll) {
                                that.log('Device Skipped - Name ' + accessory.name + ', ID ' + accessory.deviceid + ', JSON: ' + JSON.stringify(inDevice));
                            }
                        } else {
                            that.log("Device Added" + (fromCache ? ' (Cache)' : '') + " - Name " + accessory.name + ", ID " + accessory.deviceid); //+", JSON: "+ JSON.stringify(device));
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
    didFinishLaunching: function() {
        var that = this;
        if (that.asyncCallWait !== 0) {
            that.log("Configuration of cached accessories not done, wait for a bit...");
            setTimeout(that.didFinishLaunching.bind(that), 1000);
            return;
        }
        this.log('Fetching ' + platformName + ' devices. This can take a while depending on the number of devices configured in MakerAPI!');
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
            he_eventsocket_SetupWebSocket(that);
        });
    },
    removeAccessory: function(accessory) {
        var that = this;
        return new Promise(function(resolve, reject) {
            if (accessory instanceof HE_ST_Accessory)
            {
                that.hb_api.unregisterPlatformAccessories(pluginName, platformName, [accessory.accessory]);
                if (that.deviceLookup[accessory.accessory.UUID]) {
                    that.log("Device Removed - Name " + that.deviceLookup[accessory.accessory.UUID].name + ', ID ' + that.deviceLookup[accessory.accessory.UUID].deviceid);
                    that.removeDeviceAttributeUsage(that.deviceLookup[accessory.accessory.UUID].deviceid);
                    if (that.deviceLookup.hasOwnProperty(accessory.accessory.UUID))
                        delete that.deviceLookup[accessory.accessory.UUID];
                }
            }
            else
            {   
                that.log("Remove stale cache device " + that.deviceLookup[accessory.UUID].displayName);
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
                that.addUpdateAccessory(device.id, "device")
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
            that.log('Received All Device Data ');//, myList);
            // success
            if (myList) {
                if (myList && myList.location) {
                    that.temperature_unit = myList.location.temperature_scale;
                    if (myList.location.hubIP) {
                        that.local_hub_ip = myList.location.hubIP;
                        he_st_api.updateGlobals(that.local_hub_ip, that.local_commands);
                    }
                }
                that.removeOldDevices(myList).then(function(data) {
                    that.populateDevices(data);
                }).then(function(data) {
                    that.updateDevices();
                }).catch(function(data) {
                    that.log('A weird error occurred....', new InternalError(4, ''));
                });
                if (that.add_reboot_switch === true)
                {
                    var rebootDevice = {};
                    rebootDevice.excludedAttributes = ["None"];
                    rebootDevice.excludedCapabilities = ["None"];
                    rebootDevice.deviceid = 'reboot';
                    rebootDevice.name = 'Reboot Hub';
                    rebootDevice.attributes = {};
                    rebootDevice.attributes['reboot'] = 'true';
                    rebootDevice.capabilities = {};
                    rebootDevice.commands = {};
                    that.addUpdateAccessory(rebootDevice.deviceid, 'reboot', null, rebootDevice).catch(function(error) {
                        that.log(error);
                    });
                }
                if (that.mode_switches)
                {
                    
                }
            } else {
                that.log('Invalid Response from API call');
            }
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
            for (var key in that.deviceLookup)
            {
                if (that.deviceLookup[key] instanceof HE_ST_Accessory)
                    that.deviceLookup[key].accessory.updateReachability(false);
            }
        });
    },
    configureAccessory: function (accessory) {
        if (this.disabled === true)
            return;
        var that = this;

        var deviceIdentifier = accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.SerialNumber).value.split(':');
        if (deviceIdentifier.length > 1) {
            that.asyncCallWait++;
            if (deviceIdentifier[0] === 'device') {
                that.addUpdateAccessory(deviceIdentifier[1], deviceIdentifier[0], accessory).then(function() {
                    that.asyncCallWait--;
                }).catch(function(error) {
                    if (error.errorCode === InternalError.Codes.API_NOT_AVAILABLE)
                    {
                        that.log('Device Skipped - Name ' + accessory.name + ', ID ' + deviceIdentifier[1] + ' - Received Code 404, mark for removal from cache');
                        that.deviceLookup[accessory.UUID] = accessory;
                    }
                    else
                    {
                        that.log(error);
                        that.log.error('Going to exit here to not destroy your room assignments.');
                        process.exit(1);
                    }
                    that.asyncCallWait--;
                });
            } else if (deviceIdentifier[0] === 'mode') {
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
                }).catch(function(error) {
                    if (error.errorCode === InternalError.Codes.API_NOT_AVAILABLE)
                    {
                        that.log('Device Skipped - Name ' + accessory.name + ', ID ' + deviceIdentifier[1] + ' - Received Code 404, mark for removal from cache');
                        that.deviceLookup[accessory.UUID] = accessory;
                    }
                    else
                    {
                        that.log(error);
                        that.log.error('Going to exit here to not destroy your room assignments.');
                        process.exit(1);
                    }
                    that.asyncCallWait--;
                });
                     
            } else {
                this.log("Invalid Device Indentifier Type (" + deviceIdentifier[0] + ") stored in cache, remove device", accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.Name).value);
                this.deviceLookup[accessory.UUID] = accessory;
            }
        }
        else {
            this.log("Invalid Device Indentifier stored in cache, remove device" + accessory.getService(Service.AccessoryInformation).getCharacteristic(Characteristic.Name).value);
            this.deviceLookup[accessory.UUID] = accessory;
        }
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
    processFieldUpdate: function(attributeSet, that) {
        // that.log("Processing Update");
        // that.log(attributeSet);
        if (!(that.attributeLookup[attributeSet.attribute] && that.attributeLookup[attributeSet.attribute][attributeSet.device])) {
            return;
        }
        var myUsage = that.attributeLookup[attributeSet.attribute][attributeSet.device];
        if (myUsage instanceof Array) {
            for (var j = 0; j < myUsage.length; j++) {
                var accessory = that.deviceLookup[uuidGen(attributeSet.device)];
                if (accessory) {
//                    console.log("setting " + accessory.device.attributes[attributeSet.attribute] + " to " + attributeSet.value + " for " + util.inspect(myUsage[j], false, 1, true));
                    accessory.device.attributes[attributeSet.attribute] = attributeSet.value;
                    myUsage[j].getValue();
                }
            }
        }
    }
};

function he_eventsocket_SetupWebSocket(myHe_st_api) {
    const WebSocket = require('ws');
    var that = this;
    function connect(myHe_st_api) {
        var r = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
        var url = 'ws://' + myHe_st_api.app_url.match(r) + '/eventsocket';
        var ws = new WebSocket(url);
        myHe_st_api.log('attempt connection to ' + url);
        ws.onopen = function() {
            myHe_st_api.log('connection to ' + url + ' established');
        };
    
        ws.onmessage = function(e) {
            var jsonData = JSON.parse(e.data);
            var newChange = [];
            if (jsonData['source'] === 'DEVICE')
            {
                if (myHe_st_api.isAttributeUsed(jsonData['name'], jsonData['deviceId']))
                    newChange.push( { device: jsonData['deviceId'], attribute: jsonData['name'], value: jsonData['value'], date: new Date() , displayName: jsonData['displayName'] }  );
                //else myHe_st_api.log('Ignore Attribute ' + jsonData['name'] + ' for device ' + jsonData['deviceId']);
                
            } 
            else if (jsonData['source'] === 'LOCATION')
            {
                switch (jsonData['name'])
                {
                    case 'hsmStatus':
                        newChange.push( { device: 'alarmSystemStatus_' + jsonData['locationId'], attribute: 'alarmSystemStatus', value: jsonData['value'], date: new Date(), displayName: jsonData['displayName'] });
                        break;
                    case 'hsmAlert':
                        if (jsonData['value'] === 'intrusion')
                        {
                            newChange.push( { device: 'alarmSystemStatus_' + jsonData['locationId'], attribute: 'alarmSystemStatus', value: 'alarm_active', date: new Date(), displayName: jsonData['displayName'] });
                        }
                        break;
                    case 'alarmSystemStatus':
                        newChange.push( { device: 'alarmSystemStatus_' + jsonData['locationId'], attribute: 'alarmSystemStatus', value: jsonData['value'], date: new Date(), displayName: jsonData['displayName'] });
                        break;
                    case 'mode':
                        myHe_st_api.deviceLookup.forEach(function (accessory)
                        {
                            if (accessory.deviceGroup === "mode")
                            {
                                if (accessory.name === "Mode - " + jsonData['value'])
                                    newChange.push( { device: accessory.deviceid, attribute: 'switch', value: 'on', date: new Date(), displayName: accessory.name });
                                else
                                    newChange.push( { device: accessory.deviceid, attribute: 'switch', value: 'off', date: new Date(), displayName: accessory.name });
                            }
                        });
                        break;
                }
            }
            newChange.forEach(function(element)
            {
                myHe_st_api.log('Change Event (Socket):', '(' + element['displayName'] + ':' + element['device'] + ') [' + (element['attribute'] ? element['attribute'].toUpperCase() : 'unknown') + '] is ' + element['value']);
                myHe_st_api.processFieldUpdate(element, myHe_st_api);
            });
        };

        ws.onclose = function(e) {
          myHe_st_api.log('HE Eventsocket is closed. Reconnect will be attempted in 1 second. ', e.reason);
          setTimeout(function() {
            connect(myHe_st_api);
          }, 1000);
        };

        ws.onerror = function(err) {
          myHe_st_api.log('HE Eventsocket encountered error: ', err.message, 'Closing socket');
          ws.close();
        };

    }
    connect(myHe_st_api); 

}


