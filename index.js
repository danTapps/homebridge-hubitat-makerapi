const pluginName = 'homebridge-hubitat-makerapi';
const platformName = 'Hubitat-MakerAPI';
var he_st_api = require('./lib/he_maker_api').api;
var ignoreTheseAttributes = require('./lib/he_maker_api.js').ignoreTheseAttributes;
var Service,
    Characteristic,
    Accessory,
    uuid,
    HE_ST_Accessory,
    PlatformAccessory;
const util = require('util');
const npm_version = require('./package.json').version;
var Logger = require('./lib/Logger.js').Logger;

module.exports = function(homebridge) {
    console.log("Homebridge Version: " + homebridge.version);
    console.log("Plugin Version: hhm:" + npm_version);
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;
    PlatformAccessory = homebridge.platformAccessory;
    HE_ST_Accessory = require('./accessories/he_st_accessories')(Accessory, Service, Characteristic, PlatformAccessory, uuid, platformName);
    homebridge.registerPlatform(pluginName, platformName, HE_ST_Platform);
};

function HE_ST_Platform(log, config, api) {
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
        this.polling_seconds = 3600;
    }
    this.mode_switches =  config['mode_switches'] || false;

    // This is how often it polls for subscription data.
    this.config = config;
    this.api = he_st_api;
    this.log = Logger.withPrefix( this.config['name']+ ' hhm:' + npm_version);

    this.deviceLookup = {};
    this.firstpoll = true;
    this.attributeLookup = {};
    this.hb_api = api;
    this.deviceIds = [];
}

HE_ST_Platform.prototype = {
    reloadData: function(callback) {
        var that = this;
        // that.log('config: ', JSON.stringify(this.config));
        var foundAccessories = [];
        var foundDeviceIds = [];
        that.log('Refreshing All Device Data');
        he_st_api.getDevices(function(myList) {
            that.log('Received All Device Data ');
            // success
            if (myList && myList.deviceList && myList.deviceList instanceof Array) {
                var populateDevices = function(devices) {
                    for (var i = 0; i < devices.length; i++) {
                        var device = devices[i];
                        device.excludedAttributes = that.excludedAttributes[device.deviceid] || ["None"];
                        device.excludedCapabilities = that.excludedCapabilities[device.deviceid] || ["None"];
                        var accessory;
                        if (that.deviceLookup[device.deviceid] !== undefined) {
                            accessory = that.deviceLookup[device.deviceid];
                            accessory.loadData(devices[i]);
                            foundDeviceIds.push(device.deviceid);
                        } else {
                            accessory = new HE_ST_Accessory(that, "device", device);
                            // that.log(accessory);
                            if (accessory !== undefined) {
                                if (accessory.services.length <= 1 || accessory.deviceGroup === 'unknown') {
                                    if (that.firstpoll) {
                                        that.log('Device Skipped - Group ' + accessory.deviceGroup + ', Name ' + accessory.name + ', ID ' + accessory.deviceid + ', JSON: ' + JSON.stringify(device));
                                    }
                                } else {
                                    that.log("Device Added - Group " + accessory.deviceGroup + ", Name " + accessory.name + ", ID " + accessory.deviceid); //+", JSON: "+ JSON.stringify(device));
                                    if (!that.firstpoll)
                                        that.hb_api.registerPlatformAccessories(pluginName, platformName, [accessory]);
                                    that.deviceLookup[accessory.deviceid] = accessory;
                                    foundAccessories.push(accessory);
                                    foundDeviceIds.push(device.deviceid);
                                }
                            }
                        }
                    }
/*                    if (!that.firstpoll)
                    {
                        for (var i = 0; i < that.deviceIds.length; i++)
                        {
                            if ((foundDeviceIds.indexOf(that.deviceIds[i]) == -1) && (that.deviceLookup[that.deviceIds[i]]))
                            {
                                that.log("Device Removed: " + that.deviceLookup[that.deviceIds[i]].name);
                                that.api.unregisterPlatformAccessories(pluginName, platformName,[that.deviceLookup[that.deviceIds[i]]]);
                                // delete attributeLookup
                                that.deleteAttributesForDevice(that.deviceIds[i]);
                                that.deviceLookup[that.deviceIds[i]] = undefined;
                            }
                        }
                    }*/
                    that.deviceIds = foundDeviceIds;
                };
                if (myList && myList.location) {
                    that.temperature_unit = myList.location.temperature_scale;
                    if (myList.location.hubIP) {
                        that.local_hub_ip = myList.location.hubIP;
                        he_st_api.updateGlobals(that.local_hub_ip, that.local_commands);
                    }
                }
                populateDevices(myList.deviceList);
            } else if (!myList || !myList.error) {
                that.log('Invalid Response from API call');
            } else if (myList.error) {
                that.log('Error received type ' + myList.type + ' - ' + myList.message);
            } else {
                that.log('Invalid Response from API call');
            }
            if (callback) callback(foundAccessories);
            that.firstpoll = false;
        });
    },
    accessories: function(callback) {
        this.log('Fetching ' + platformName + ' devices. This can take a while depending on the number of devices configured in MakerAPI!');

        var that = this;
        // var foundAccessories = [];
        this.deviceLookup = [];
        this.unknownCapabilities = [];
        this.knownCapabilities = [
            'Switch',
            'Light',
            'LightBulb',
            'Bulb',
            'Color Control',
            'Door',
            'Window',
            'Battery',
            'Polling',
            'Lock',
            'Refresh',
            'Lock Codes',
            'Sensor',
            'Actuator',
            'Configuration',
            'Switch Level',
            'Temperature Measurement',
            'Motion Sensor',
            'Color Temperature',
            'Illuminance Measurement',
            'Contact Sensor',
            'Acceleration Sensor',
            'Door Control',
            'Garage Door Control',
            'Relative Humidity Measurement',
            'Presence Sensor',
            'Carbon Dioxide Measurement',
            'Carbon Monoxide Detector',
            'Water Sensor',
            'Window Shade',
            'Valve',
            'Energy Meter',
            'Power Meter',
            'Thermostat',
            'Thermostat Cooling Setpoint',
            'Thermostat Mode',
            'Thermostat Fan Mode',
            'Thermostat Operating State',
            'Thermostat Heating Setpoint',
            'Thermostat Setpoint',
            'Fan Speed',
            'Fan Control',
            'Fan Light',
            'Fan',
            'Speaker',
            'Tamper Alert',
            'Alarm',
            'Alarm System Status',
            'AlarmSystemStatus',
            'Mode',
            'Routine',
            'Button'
        ];
        if (platformName === 'Hubitat' || platformName === 'hubitat') {
            let newList = [];
            for (const item in this.knownCapabilities) {
                newList.push(this.knownCapabilities[item].replace(/ /g, ''));
            }
            this.knownCapabilities = newList;
        }

        he_st_api.init(this.app_url, this.app_id, this.access_token, this.local_hub_ip, this.local_commands);
        this.reloadData(function(foundAccessories) {
            that.log('Unknown Capabilities: ' + JSON.stringify(that.unknownCapabilities));
            callback(foundAccessories);
            //setInterval(that.reloadData.bind(that), that.polling_seconds * 1000);
            that.hb_api.updatePlatformAccessories(foundAccessories);
            he_eventsocket_SetupWebSocket(that);
        });
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

    doIncrementalUpdate: function() {
        var that = this;
        he_st_api.getUpdates(function(data) {
            that.processIncrementalUpdate(data, that);
        });
    },

    processIncrementalUpdate: function(data, that) {
        that.log('new data: ' + data);
        if (data && data.attributes && data.attributes instanceof Array) {
            for (var i = 0; i < data.attributes.length; i++) {
                that.processFieldUpdate(data.attributes[i], that);
            }
        }
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
                var accessory = that.deviceLookup[attributeSet.device];
                if (accessory) {
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
        myHe_st_api.log('connect to ' + url);
        ws.onopen = function() {
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

