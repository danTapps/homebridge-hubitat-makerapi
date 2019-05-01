var http = require('https');
const url = require('url');
var app_id, access_token, localHubIp, localHubPort;
var app_host, app_port, app_path, access_token, localHubIp;

const util = require('util');

var pluginName, currentVersion, versionNotifyFunction, log;
module.exports = function(inPluginName, inVersion, inLog, inVersionNotifyFunction) {
    pluginName = inPluginName;
    currentVersion = inVersion;
    versionNotifyFunction = inVersionNotifyFunction;
    log = inLog;
    return runVersionCheck;
};
module.exports.runVersionCheck = runVersionCheck;

function runVersionCheck() 
{
        return new Promise(function(resolve, reject) {
            GET({
                debug: false,
                path: '/'+pluginName
            }).then(function(resp){
                var response = {};
                response.versionCheckComplete = false;
                if (resp['dist-tags'])
                {
                    if (resp['dist-tags']['latest'])
                    {
                        response.versionCheckComplete = true;
                        response.npm_version = resp['dist-tags']['latest'];
                        response.versionIsCurrent = false;
                        log('latest version on npmjs is ' + resp['dist-tags']['latest']);
                        var compareVersions = require('compare-versions');
                        switch (compareVersions( resp['dist-tags']['latest'], currentVersion))
                        {
                            case -1:
                                log.warn('local version (' + currentVersion +') is newer than npmjs version ('+resp['dist-tags']['latest']+ ')');
                                response.versionIsCurrent = true;
                                break;
                            case 0:
                                log('your version of the plugin is up2date');
                                response.versionIsCurrent = true;
                                break;
                            case 1:
                                log.error('a newer version (' + resp['dist-tags']['latest'] + ') of the ' + pluginName + ' plugin is available on npmjs.');
                                break;
                        }
                    }
                }
                resolve(response);
            }).catch(function(error){log(error);reject(error);});
        });
}

function _http(data) {
    //console.log("Calling " + platformName);
    return new Promise(function(resolve, reject) {
        var options = {
            hostname: 'registry.npmjs.org',
            port: 443,
            path: data.path,
            method: data.method,
            json: true
        };
        if (data.debug) {
            console.log('_http options: ', JSON.stringify(options));
        }
        var str = '';
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
                    //if (data.debug) {
                    //    console.log(e.stack);
                    //    console.log("raw message", str);
                    //}
                    reject(str);
                    str = undefined;
                    //reject(e);
                }
                resolve(str);
                //if (callback) {
                //    callback(str);
                //    callback = undefined;
                //};
            });
        });

        if (data.data) {
            req.write(data.data);
        }

        req.end();

        req.on('error', function(e) {
            console.log("error at req: ", e.message);
            reject(e);
            //if (callback) {
            //    callback();
            //    callback = undefined;
            //};
        });
    });
}

function GET(data) {
    return new Promise(function(resolve, reject) {
        data.method = "GET";
        _http(data).then(function(resp){resolve(resp);}).catch(function(error){reject(error);});
    });
}

function POST(data) {
    return new Promise(function(resolve, reject) {
        data.method = "POST";
        _http(data).then(function(resp){resolve(resp);}).catch(function(error){reject(error);});
    });
}


