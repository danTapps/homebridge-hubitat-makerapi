
const URL = require('url');
var version = require('../package.json').version;
const ignoreTheseAttributes = require('./ignore-attributes.js').ignoreTheseAttributes;
const util = require('util');
var communciationBreakCommand = 'off';

var receiver_makerapi = {
    start: function(platform) {
        var that = this;
        const WebSocket = require('ws');
        function connect(platform) {
            let parsed = URL.parse(platform.app_url)
            let url = '';
            if (parsed.port!==null && parsed.port !== undefined)
                url = `ws://${parsed.hostname}:${parsed.port}/eventsocket`;
            else
                url = `ws://${parsed.hostname}/eventsocket`;
            let ws = new WebSocket(url, {perMessageDeflate: false});
            platform.log('attempt connection to ' + url);

            let wsPingTimeout = null;
            let wsWebSocketCheckTimeout = null;

            function pinger() {
                if (ws == undefined) return;
                if (ws.readyState != WebSocket.OPEN) return
                platform.log('HE websocket sending keepalive ping');
                ws.ping()
                setTimeout(pinger, 60 * 1000);
                wsPingTimeout = setTimeout(function() {
                    platform.log.error('HE websocket ping timeout, closing socket');
                    ws.close();
                }, 10 * 1000);
            }

            function webSocketCheck() {
                if (ws == undefined) return;
                if (ws.readyState != WebSocket.OPEN) return
                try {
                    ws.send('{}');
                } catch (exception) {
                    plarform.log.error('ws.send failed', exception);
                    communciationBreakCommand='on';
                    ws.close();
                    return;
                }
                if ((platform.communication_test_device == undefined) || (platform.communication_test_device == null)) return
                platform.log('Test websocket communication');
                platform.api.runCommand(platform.communication_test_device, communciationBreakCommand).then(function(resp) { }).catch(function(err) {  });
                setTimeout(webSocketCheck, 60 * 1000);
                if (wsWebSocketCheckTimeout) clearTimeout(wsWebSocketCheckTimeout);
                wsWebSocketCheckTimeout = setTimeout(function() {
                    platform.log.error('Did not receive Test response to websocket communication test, close socket');
                    //platform.log(util.inspect(ws, false, null, true));
                    communciationBreakCommand='on';
                    ws.close();
                }, 10 * 1000);
            }
            
            ws.addEventListener('pong', function(data) {
                platform.log('HE got pong '); //, util.inspect(ws, false, null, true));
                if (wsPingTimeout) clearTimeout(wsPingTimeout);
                wsPingTimeout = null;
            });

            ws.onopen = function() {
                platform.log('connection to ' + url + ' established');
                pinger();
                webSocketCheck();
            };
        
            ws.onmessage = function(e) {
                platform.setCommunicationBroken(false).then(function() {}).catch(function(){});
                try {
                   var jsonData = JSON.parse(e.data);
                } catch (e) {
                    platform.log.warn('Invalid JSON data received from websocket', e.data);
                    return;
                }
                var newChange = [];
                if (jsonData['source'] === 'DEVICE') {
                    if ((platform.communication_test_device != undefined) || (platform.communication_test_device != null)) {
                        if (jsonData['deviceId'] == platform.communication_test_device) {
                            platform.log('Received communication Test response');
                            if (wsWebSocketCheckTimeout) clearTimeout(wsWebSocketCheckTimeout);
                            wsWebSocketCheckTimeout = null;
                        }
                    }
                    if (platform.isAttributeUsed(jsonData['name'], jsonData['deviceId']))
                        newChange.push( { 
                            device: jsonData['deviceId'], 
                            attribute: jsonData['name'], 
                            value: jsonData['value'], 
                            date: new Date() , 
                            displayName: jsonData['displayName'] 
                        });
                }
                else if (jsonData['source'] === 'LOCATION') {
                    switch (jsonData['name']) {
                        case 'hsmStatus':
                            newChange.push( {
                                device: 'hsm' + platform.config['name'],
                                displayName: 'Alarm System ' + platform.config['name'],
                                attribute:  'alarmSystemStatus',
                                value: jsonData['value'],
                                date:  new Date()
                            });
                            newChange.push( {
                                device: 'hsm' + platform.config['name'],
                                displayName: 'Alarm System ' + platform.config['name'],
                                attribute:  'alarmSystemCurrent',
                                value: jsonData['value'],
                                date:  new Date()
                            });
                            break;
                        case 'hsmAlert':
                            if (jsonData['value'] === 'cancel') {
                                platform.log('Received HSM Cancel');
                                newChange.push( {
                                    device: 'hsm' + platform.config['name'],
                                    displayName: 'Alarm System ' + platform.config['name'],
                                    device:  'hsm' + platform.config['name'],
                                    attribute:  'alarmSystemCurrent',
                                    value: platform.getAttributeValue('alarmSystemStatus', 'hsm' + platform.config['name'], platform),
                                    date:  new Date()
                                });
                            }
                            else {
                                platform.log('Received HSM Alert');
                                newChange.push( {
                                    device: 'hsm' + platform.config['name'],
                                    displayName: 'Alarm System ' + platform.config['name'],
                                    device:  'hsm' + platform.config['name'],
                                    attribute:  'alarmSystemCurrent',
                                    value: 'alarm_active',
                                    date:  new Date()
                                });
                            }
                            break;
                        case 'mode':
                            for (var key in platform.deviceLookup) {
                                var accessory = platform.deviceLookup[key];
                                if (accessory.deviceGroup === "mode") {
                                    if (accessory.name === "Mode - " + jsonData['value'])
                                        newChange.push( { 
                                            device: accessory.deviceid, 
                                            attribute: 'switch', 
                                            value: 'on', 
                                            date: new Date(), 
                                            displayName: accessory.name 
                                        });
                                    else
                                        newChange.push( { 
                                            device: accessory.deviceid, 
                                            attribute: 'switch', 
                                            value: 'off', 
                                            date: new Date(), 
                                            displayName: accessory.name });
                                }
                            }
                            break;
                    }
                }
                newChange.forEach(function(element) {
                    platform.log('Change Event (Socket):', '(' + element['displayName'] + ':' + element['device'] + ') [' + (element['attribute'] ? element['attribute'].toUpperCase() : 'unknown') + '] is ' + element['value']);
                    platform.processFieldUpdate(element, platform);
                });
            };

            ws.onclose = function(e) {
              platform.log.warn('HE Eventsocket is closed. Reconnect will be attempted in 5 second. ', e.reason);
              if (wsPingTimeout) clearTimeout(wsPingTimeout);
                wsPingTimeout = null;
              if (wsWebSocketCheckTimeout) clearTimeout(wsWebSocketCheckTimeout);
                wsWebSocketCheckTimeout = null;
              setTimeout(function() {
                connect(platform);
              }, 5000);
                ws = undefined;
              platform.setCommunicationBroken();
            };

            ws.onerror = function(err) {
              platform.log.error('HE Eventsocket encountered error: ', err.message, 'Closing socket');
              ws.close();
            };

        }
        connect(platform); 
    }
}


module.exports = {
        receiver: receiver_makerapi
    }


