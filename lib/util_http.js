var http = require('http');
var url = require('url');
var app_id, access_token, localHubIp, localHubPort;
var app_host, app_port, app_path, access_token, localHubIp, app_protocol;
var lastHttpRequest=null;
var util = require('util');

function getLastHttpRequest() {
    if (lastHttpRequest)
        if (lastHttpRequest.path)
            lastHttpRequest.path = lastHttpRequest.path.replace(/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/, 'xxxxxxxxxx');
    return lastHttpRequest;
}

function _http(data) {
    //console.log("Calling " + platformName);
    return new Promise(function(resolve, reject) {

        var options = {
            hostname: app_host,
            port: app_port,
            protocol: app_protocol,
            path: app_path + data.path + "?access_token=" + access_token,
            method: data.method,
            headers: {}
        };
        if (data.port)
            options.port = data.port;
        if (data.hubAction)
        {
            options.path = data.path;
        }
        options.path = options.path.replace(/((?!:).|^)\/{2,}/g, (_, p1) => {
            if (/^(?!\/)/g.test(p1)) {
                return `${p1}/`;
            }

            return '/';
        });
        if (data.data) {
            data.data = JSON.stringify(data.data);
            options.headers['Content-Length'] = Buffer.byteLength(data.data);
            options.headers['Content-Type'] = "application/json";
        }
        if (data.debug) {
            console.log('_http options: ', JSON.stringify(options));
        }
        var str = '';
        lastHttpRequest = options;
        var req = http.request(options, function(response) {
            response.on('data', function(chunk) {
                str += chunk;
            });

            response.on('end', function() {
                if (data.debug) {
                    console.log("response in http:", str, response.statusCode);
                }
                if (response.statusCode !== 200)
                {
                    reject(response);
                    return;
                }
                try {
                    str = JSON.parse(str);
                } catch (e) {
                    reject(str);
                    str = undefined;
                }
                resolve(str);
            });
            
        });
    
        if (data.data) {
            req.write(data.data);
        }

        req.end();

        req.on('error', function(e) {
            console.log("error at req: ", e.message);
            reject(e);
        });
    });
}

function POST(data) {
    return new Promise(function(resolve, reject) {
        data.method = "POST";
        _http(data).then(function(resp){resolve(resp);}).catch(function(error){reject(error);});
    });
}

var util_http = {
    init: function(args) {
        var appURL = url.parse(args[0]);
        app_host = appURL.hostname;
        app_port = appURL.port;
        app_path = appURL.path;
        app_protocol = appURL.protocol;
        if (!app_port) {
          if (app_protocol == 'https:') {
            app_port = 443
          } else {
            app_port = 80
          }
        }
        access_token = args[2];
        platform = args[4];
    },
    GET: function(data) {
        return new Promise(function(resolve, reject) {
            data.method = "GET";
            platform.log.debug("GET: ", util.inspect(data, null, null, false));
            _http(data).then(function(resp) {
                resolve(resp);
            }).catch(function(error) {
                platform.log.error("GET ERROR: ", util.inspect(data, null, null, false), util.inspect(error, null, null, false));
                reject(error);
            });
        });
    },
    POST: function(data) {
        return new Promise(function(resolve, reject) {
            data.method = "POST";
                platform.log.debug("POST: ", util.inspect(data, null, null, false), util.inspect(resp, null, null, false));
            _http(data).then(function(resp) {
                resolve(resp);
            }).catch(function(error) {
                platform.log.error("POST ERROR: ", util.inspect(data, null, null, false), util.inspect(error, null, null, false));
                reject(error);
            });
        });
    },
    getAppHost: function() {
        return app_host;
    }
}
module.exports = util_http;
module.exports.getLastHttpRequest = getLastHttpRequest;

