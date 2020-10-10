var url = require('url');

var app_id, access_token, localHubIp, localHubPort;
var app_host, app_port, app_path, access_token, localHubIp;
const util = require('util');
const util_http = require('./util_http.js');
const ignoreTheseAttributes = require('./ignore-attributes.js').ignoreTheseAttributes;
var platform = null;
var urlencode = require('urlencode');

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
    // setHue, setSaturation, and setValue commands can all be sent as a setColor command, we delay sending
    // any of these commands for a short period to see if there is a complementary command, if there is, we
    // group it and send a setColor command with all commands at once
    deviceCommandMap: {

    },

    // Keep track of when a comamnd an on command is recieved, if we recieve a command in the list of squash on commands
    // we wont send the 'on' command to the device, just let the set level control it.
    squashOnCommandMap:  {

    },

    init: function(...args) {
        platform = args[4];
        util_http.init(args);
    },
    connect: function(uri) {
        return new Promise(function(resolve, reject) {
            var encodedUrl = urlencode(uri);
            util_http.GET({
                path: '/postURL/' + encodedUrl,
                }).then(function(resp){
                    resolve(resp);
                }).catch(function(error){reject(error);});
        });
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


        const convertCommandToKey = {
            setHue: 'hue',
            setSaturation: 'saturation'
        };

        // Some commands will always send an 'On' before sending the actual command.
        const squashOnCommands = platform.config.squash_on_commands;

        const me = this;
        return new Promise(function(resolve, reject) {
            function sendSingleCommand(id, cmd, val, resolveList, rejectList) {
                if (!Array.isArray(resolveList)) {
                    resolveList = [resolveList];
                }
                if (!Array.isArray(rejectList)) {
                    rejectList = [rejectList];
                }
                // This is a simple command, execute immediatly
                const path = '/devices/' + id + '/' + cmd + (val ? '/' + val : '');
                util_http.GET({
                    //debug: false,
                    path: path
                }).then(function(resp) {
                    for (const resolver of resolveList) {
                        resolver(resp);
                    }
                }).catch(function(err) {
                    platform.log.error(err);
                    for (const rejector of rejectList) {
                        platform.log.error('Error with hubitat runCommand ' + err.message || err);
                        rejector(err);
                    }
                });
            }

            const dedupeCommandDelay = platform.config.dedupe_command_delay_ms || 50;

            if (platform.config.use_set_color && convertCommandToKey[command]) {
                platform.log('Delaying ' + command + ' because it is a setColor property');
                    // This is a combined command, register it
                    if (!me.deviceCommandMap[deviceid]) {
                        me.deviceCommandMap[deviceid] = {
                            resolveList: [],
                            rejectList: []
                        };
                    }

                    if (!me.deviceCommandMap[deviceid].command) {
                        me.deviceCommandMap[deviceid].command = {};
                    }

                    me.deviceCommandMap[deviceid].command[convertCommandToKey[command]] =
                        secondaryValue ? secondaryValue.value1 : undefined;

                    me.deviceCommandMap[deviceid].resolveList.push(resolve);
                    me.deviceCommandMap[deviceid].rejectList.push(reject);
                    if (me.deviceCommandMap[deviceid].timerId) {
                        clearTimeout(me.deviceCommandMap[deviceid].timerId);
                        me.deviceCommandMap[deviceid].timerId = undefined;
                    }

                    me.deviceCommandMap[deviceid].timerId = setTimeout(function () {
                        // Switch back to a single command if we don't have mulitple properties as using setColor will not
                        // work
                        if (!me.deviceCommandMap[deviceid].command['hue']) {
                            platform.log('Sending setSaturation(' + deviceid + ', ' +
                                me.deviceCommandMap[deviceid].command['saturation'] +
                                ') since we did not get a hue command in time');
                            sendSingleCommand(deviceid, 'setSaturation', me.deviceCommandMap[deviceid].command['saturation'],
                                me.deviceCommandMap[deviceid].resolveList, me.deviceCommandMap[deviceid].rejectList);
                        } else if (!me.deviceCommandMap[deviceid].command['saturation']) {
                            platform.log('Sending setHue(' + deviceid + ', ' +
                                me.deviceCommandMap[deviceid].command['hue'] +
                                ') since we did not get a saturation command in time');
                            sendSingleCommand(deviceid, 'setHue', me.deviceCommandMap[deviceid].command['hue'],
                                me.deviceCommandMap[deviceid].resolveList, me.deviceCommandMap[deviceid].rejectList);
                        } else {
                            let commandValueString = '';

                            for (const prop in me.deviceCommandMap[deviceid].command) {
                                const value = me.deviceCommandMap[deviceid].command[prop];
                                if (commandValueString.length > 0) {
                                    commandValueString += ',';
                                }
                                commandValueString += '"' + prop + '":' + value;
                            }
                            const path = '/devices/' + deviceid + '/setColor/{' + commandValueString + '}';
                            platform.log('Sending multicommand ' + path);

                            // Timeout expired, send everythign as a query string
                            // This is a simple command, execute immediatly
                            const resolveList = me.deviceCommandMap[deviceid].resolveList;
                            const rejectList = me.deviceCommandMap[deviceid].rejectList;
                            util_http.GET({
                                //debug: false,
                                path: path
                            }).then(function (resp) {
                                platform.log('Resolve (' + resolveList.length + ') runCommand');
                                for (const resolver of resolveList) {
                                    resolver(resp);
                                }
                            }).catch(function (err) {
                                for (const rejector of rejectList) {
                                    platform.log('reject (' + resolveList.length + ') runCommand');
                                    rejector(err);
                                }
                            });
                        }

                        me.deviceCommandMap[deviceid] = undefined;
                    }, dedupeCommandDelay);







            } else if (squashOnCommands && squashOnCommands.length > 0 && (squashOnCommands.indexOf(command) >= 0 ||
                command === 'on')) {
                if (command === 'on') {
                    platform.log('Recieved on command, squashinng for now');
                    // This is a combined command, register it
                    if (!me.squashOnCommandMap[deviceid]) {
                        me.squashOnCommandMap[deviceid] = {
                            resolveList: [],
                            rejectList: []
                        };
                    }

                    me.squashOnCommandMap[deviceid].resolveList.push(resolve);
                    me.squashOnCommandMap[deviceid].rejectList.push(reject);

                    if (me.squashOnCommandMap[deviceid].timerId) {
                        clearTimeout(me.squashOnCommandMap[deviceid].timerId);
                        me.squashOnCommandMap[deviceid].timerId = undefined;
                    }

                    me.squashOnCommandMap[deviceid].timerId = setTimeout(function () {
                        platform.log('Sending on command as timeout has elapsed');
                        sendSingleCommand(deviceid, command, undefined, me.squashOnCommandMap[deviceid].resolveList,
                            me.squashOnCommandMap[deviceid].rejectList);

                        me.deviceCommandMap[deviceid] = undefined;
                    }, dedupeCommandDelay);
                } else {
                    // Squash the on command
                    if (me.squashOnCommandMap[deviceid] && me.squashOnCommandMap[deviceid].timerId) {
                        platform.log('Squashing on command');
                        clearTimeout(me.squashOnCommandMap[deviceid].timerId);
                        me.squashOnCommandMap[deviceid].timerId = undefined;
                    }

                    me.squashOnCommandMap[deviceid].resolveList.push(resolve);
                    me.squashOnCommandMap[deviceid].rejectList.push(reject);

                    // Send the command
                    platform.log('Sending squashed on command ' + command + ' to ' + deviceid);
                    sendSingleCommand(deviceid, command, secondaryValue ? secondaryValue.value1 : undefined,
                        me.squashOnCommandMap[deviceid].resolveList, me.squashOnCommandMap[deviceid].rejectList);

                    me.squashOnCommandMap[deviceid] = undefined;
                }
            } else {
                platform.log('Sending single command ' + command + ' to ' + deviceid);
                // This is a simple command, execute immediatly
                sendSingleCommand(deviceid, command, secondaryValue ? secondaryValue.value1 : undefined, resolve, reject);

            }



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
