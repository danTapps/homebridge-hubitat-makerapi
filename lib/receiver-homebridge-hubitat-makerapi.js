
let WSServer = require('ws').Server;
let server = require('http').createServer();
let express = require('express');
let freePort = require('./freePort.js');
const URL = require('url');
let app = express();
let bodyParser = require('body-parser');
var version = require('../package.json').version;
const ignoreTheseAttributes = require('./ignore-attributes.js').ignoreTheseAttributes;
var clients = [];
const util = require('util');
var communciationBreakCommand = 'off';
const logger = require('./Logger.js');
var AU = require('ansi_up');
var ansi_up = new AU.default;
var fs = require('fs');

app.use(bodyParser.json());

var receiver_makerapi = {
    start: function(platform) {
        return new Promise(function(resolve, reject) {
        platform.log('Starting receiver');
        app.get('/downloadLog', function(req, res){
            //var file = fs.readFileSync(platform.logFileSettings.path + "/" + platform.logFileSettings.file, 'binary');
            //res.setHeader('Content-Length', file.length);
            res.setHeader('Content-disposition', 'attachment; filename=' + platform.logFileSettings.file);
            var filestream = fs.createReadStream(platform.logFileSettings.path + "/" + platform.logFileSettings.file);
            filestream.pipe(res);

            //res.write(file, 'binary');
            //res.end();
        });
        app.get('/debugOn', function(req, res){
            platform.log('Debug logging enabled');
            platform.log.setDebug(true);
            res.sendStatus(200);
        });

        app.get('/debugOff', function(req, res){
            platform.log('Debug logging disabled');
            platform.log.setDebug(false);
            res.sendStatus(200);
        });


        app.get('*', function(req, res) {
            var htmlCode = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Homebridge Hubitat MakerAPI Plugin</title>
    <style>
    * { font-family:tahoma; font-size:12px; padding:0px;margin:0px;}
    p { line-height:18px; }
    div { width:95%; margin-left:auto; margin-right:auto;}
    #content { padding:5px; background:#ddd; border-radius:5px;
        overflow-y: scroll; border:1px solid #CCC;
        margin-top:10px; height: 500px;
    }
    #status { width:95%;display:block;float:left;margin-top:15px; }
  </style>
  </head>
  <body>
    <div id="content"></div>
    <div>
      <span id="status">Connecting...</span>
    </div>
    <div>
      <input type="button" value="Download Log File" id="download">
      <input type="button" value="Enable Debug Mode" id="debugOn">
      <input type="button" value="Disable Debug Mode" id="debugOff">
    <div>
    <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
<script>
$(function () {
  "use strict";
  // for better performance - to avoid searching in DOM
  var content = $('#content');
  var status = $('#status');

  // my color assigned by the server
  var myColor = false;
  // my name sent to the server
  var myName = false;
  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  // if browser doesn't support WebSocket, just show
  // some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>',
      { text:'Sorry, but your browser does not support WebSocket.'}
    ));
    $('span').hide();
    return;
  }
  // open connection
  var connection = new WebSocket('ws://` + platform.local_ip + ':' + platform.local_port + `');
  connection.onopen = function () {
    // first we want users to enter their names
    status.text('Connected to logging');
  };
  connection.onerror = function (error) {
    // just in there were some problems with connection...
    content.html($('<p>', {
      text: 'Sorry, but there is some problem with your '
         + 'connection or the server is down.'
    }));
  };
  connection.onclose = function (error) {
    // just in there were some problems with connection...
    content.html($('<p>', {
      text: 'Sorry, but there is some problem with your '
         + 'connection or the server is down.'
    }));
  };
  // most important part - incoming messages
  connection.onmessage = function (message) {
    content.append('<p>' + message.data + '</p>');
    var elem = document.getElementById('content');
    elem.scrollTop = elem.scrollHeight;
       console.log('elem.scrollHeight', elem.scrollHeight);
      return;
  };
  $("#download").click(function(){
    var href = 'http://` + platform.local_ip + ':' + platform.local_port + `/downloadLog';
    window.location.href = href;
  });
  $("#debugOn").click(function(){
    $.ajax({url: "http://` + platform.local_ip + ':' + platform.local_port + `/debugOn", success: function(result){
    }});
  });
  $("#debugOff").click(function(){
    $.ajax({url: "http://` + platform.local_ip + ':' + platform.local_port + `/debugOff", success: function(result){
    }});
  });
 

  /**
   * This method is optional. If the server wasn't able to
   * respond to the in 3 seconds then show some error message 
   * to notify the user that something is wrong.
   */
  setInterval(function() {
    if (connection.readyState !== 1) {
      status.text('Error');
    }
  }, 3000);
});
</script>
  </body>
</html>`;

            res.send(htmlCode);
        });
        
        app.post('/event', function(req, res) {
            res.sendStatus(200);
            platform.log.debug('Event Received: ', req.body.content);
            res.sendStatus(200); 
            var newChange = [];
            if (req.body.content.deviceId == null) {
                switch (req.body.content.name)
                {
                    case 'hsmStatus':
                        newChange.push( {
                            device: 'hsm' + platform.config['name'],
                            displayName: 'Alarm System ' + platform.config['name'],
                            attribute:  'alarmSystemStatus',
                            value: req.body.content.value,
                            date:  new Date()
                        });
                        newChange.push( {
                            device: 'hsm' + platform.config['name'],
                            displayName: 'Alarm System ' + platform.config['name'],
                            attribute:  'alarmSystemCurrent',
                            value: req.body.content.value,
                            date:  new Date()
                        });
                        break;
                    case 'hsmAlert':
                        if (req.body.content.value === 'cancel')
                        {
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
                        else
                        {
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
                            if (accessory.deviceGroup === "mode")
                            {
                                if (accessory.name === "Mode - " + req.body.content.value)
                                    newChange.push( { device: accessory.deviceid, attribute: 'switch', value: 'on', date: new Date(), displayName: accessory.name });
                                else
                                    newChange.push( { device: accessory.deviceid, attribute: 'switch', value: 'off', date: new Date(), displayName: accessory.name });
                            }
                        }
                        break;
                }
            } else {
                if (platform.isAttributeUsed(req.body.content.name, req.body.content.deviceId))
                    newChange.push( {
                        device: req.body.content.deviceId,
                        attribute: req.body.content.name,
                        value: req.body.content.value,
                        date: new Date() ,
                        displayName: req.body.content.displayName
                    });
                else {
                    platform.log.debug("Attribute " + req.body.content.name + " not used for deviceId " + req.body.content.deviceId);
                    platform.dumpAttributeDevices(req.body.content.name);
                }
            }
            newChange.forEach(function(element) {
                platform.log('Change Event (http):', '(' + 
                    element['displayName'] + ':' + 
                    element['device'] + ') [' + 
                    (element['attribute'] ? element['attribute'].toUpperCase() : 'unknown') + 
                    '] is ' + element['value']);
                platform.processFieldUpdate(element, platform);
            });
//            return res.json({status: "success"});
        });

        app.post('*', function(req, res) {
            platform.log('Unknown POST request: ' + req.path);
            res.sendStatus(400);
        });
        // Create web socket server on top of a regular http server
        let wss = new WSServer({
            server: server
        });
        
        function sendLogMessage(message) {
            for (var i=0; i < clients.length; i++) {
                clients[i].send(ansi_up.ansi_to_html(message));
            }
        }
        logger.setWebsocketLog(sendLogMessage);

        server.on('request', app);
        wss.on('connection', function connection(ws) {
            var index = clients.push(ws) - 1;
            platform.log('New logging client connected');

            ws.on('close', function (ws) {
                clients.splice(index, 1);
                platform.log('Logging client disconnected');
            });
            ws.on('message', function incoming(message) {
                platform.log(`received: ${message}`);
                //    ws.send(JSON.stringify({    }));
            });
        });
        
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

        freePort.getAvailablePort(platform.local_port).then( port => {
            platform.local_port = port;
            server.listen(port, function() {
                platform.log('homebridge-hubitat-makerapi server listening on ' + port);
            });
            
            platform.log("Setting MakerAPI post URL to http://" + platform.local_ip + ":" + port + "/event at " +platform.config.app_url);

            platform.api.connect("http://" + platform.local_ip + ":" + port + "/event").then(function (data) {
                platform.log("MakerAPI postURL successfully activated");
                platform.setCommunicationBroken(false).then(function() {}).catch(function(){});
                resolve('');
            }).catch(function(error) {
                platform.log.error('Cant activate MakerAPI event stream, check the MakerAPI logs and your config file. Using websocket for now', error);
                connect(platform);
                resolve('');
            });
        });

        });
    }
}


module.exports = {
        receiver: receiver_makerapi
    }


