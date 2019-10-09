var url = require('url');

var app_id, access_token, localHubIp, localHubPort;
var app_host, app_port, app_path, access_token, localHubIp;
const util = require('util');
const util_http = require('./util_http.js');
const ignoreTheseAttributes = require('./ignore-attributes.js').ignoreTheseAttributes;
var platform = null;

function transformAllDeviceData(inData, detailQuery = false, debug=false)
{
    var returnData = [];
    inData.forEach(function(device) {
        if (debug) console.log('device:', device);
        var newDevice = [];
        newDevice.name = device.label;
        newDevice.basename = device.name;
        newDevice.deviceid = device.id;
        newDevice.manufacturerName = device.manufacturer ? device.manufacturer : '';
        newDevice.modelName = device.model ? device.model : '';
        newDevice.type = device.type;
        newDevice.capabilities = {};
        device.capabilities.forEach(function(capability) {
            newDevice.capabilities[capability.toString().toLowerCase()] = 1;
        });
        if (detailQuery === false)
        {
            newDevice.commands = {};
            device.commands.forEach(function(command) {
                newDevice.commands[command.command] = null;
            });

            newDevice.attributes = {};
            for (var key in device.attributes) {
                if (device.attributes.hasOwnProperty(key)) {
                    if (!(ignoreTheseAttributes().indexOf(key) > -1)) {
                        newDevice.attributes[key] = device.attributes[key];
                    }
                }
            }
        }
        else
        {
            newDevice.commands = {};
            device.commands.forEach(function(command) {
                newDevice.commands[command] = null;
            });

            newDevice.attributes = {};
            for (var i = 0; i < device.attributes.length; i++)
            {
                newDevice.attributes[device.attributes[i].name] = device.attributes[i].currentValue;
            }
        }
        returnData.push(newDevice);
    });
    if (detailQuery && returnData.length === 1)
        return returnData[0];
    return returnData;
}

var he_maker_api = {
    init: function(...args) {
        platform = args[4];
        util_http.init(args);
    },
    rebootHub: function() {
        return new Promise(function(resolve, reject) {
            util_http.POST({
                //debug: false,
                path: '/hub/reboot',
                port: 8080,
                hubAction: true
                }).then(function(resp){
                    resolve(resp);
                }).catch(function(error){reject(error);});
        });
    },
    getDevices: function() {
        return new Promise(function(resolve, reject) {
            util_http.GET({
                //debug: false,
                path: '/devices/all'
                }).then(function(resp){
                    var newData = [];
                    newData.deviceList = transformAllDeviceData(resp);
                    resolve(newData);
                }).catch(function(error){reject(error);});
        }); 
    },
    runCommand: function(deviceid, command, secondaryValue = null) {
        return new Promise(function(resolve, reject) {
            util_http.GET({
                //debug: false,
                path: '/devices/' + deviceid + '/' + command + (secondaryValue ? '/' + secondaryValue.value1 : '')
            }).then(function(resp) {
                resolve(resp);
            }).catch(function(err) {
                reject(err);
            });
        });
    },
    getDevicesSummary: function () {
        return new Promise(function(resolve, reject) {
            util_http.GET({
                //debug: false,
                path: '/devices'
                }).then(function(resp){
                    resolve(resp);
                }).catch(function(error){reject(error);});
        });
    },
    getDeviceInfo: function(deviceid) {
        return new Promise(function(resolve, reject) {
            util_http.GET({
                //debug: false,
                path: '/devices/' + deviceid
                }).then(function(body) {
                    resolve(transformAllDeviceData([body], true));
                })
                .catch(function(error) {
                    reject(error);
                });
        });
    },
    getModes: function () {
        return new Promise(function(resolve, reject) {
            util_http.GET({
                //debug: false,
                path: '/modes'
            }).then(function(resp) {
                resolve(resp);
            }).catch(function(err) {
                reject(err);
            });
        });
    },
    getAlarmState: function() {
        return new Promise(function(resolve, reject) {
            util_http.GET({
                //debug: false,
                path: '/hsm'
            }).then(function(resp) {
                resolve(resp);
            }).catch(function(err) {
                reject(err);
            });
        });
    },
    setAlarmState: function(newState) {
        return new Promise(function(resolve, reject) {
            util_http.GET({
                //debug: false,
                path: '/hsm/' + newState
            }).then(function(resp) {
                resolve(resp);
            }).catch(function(err) {
                reject(err);
            });
        });
    },
    setMode: function (newMode) {
        return new Promise(function(resolve, reject) {
            util_http.GET({
                //debug: false,
                path: '/modes/' + newMode
            }).then(function(resp) {
                resolve(resp);
            }).catch(function(err) {
                reject(err);
            });
        });
    },
    getAppHost: function() {
        return util_http.getAppHost();
    }

}
module.exports = {
        api: he_maker_api,
        ignoreTheseAttributes: ignoreTheseAttributes
    }
