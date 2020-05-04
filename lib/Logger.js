var chalk = require('chalk');
var util = require('util');
var winston = require('winston');
require('winston-daily-rotate-file');

'use strict';

const myCustomLevels = {
  levels: {
    error: 0,
    warn: 2,
    info: 3,
    good: 4,
    debug: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    good: 'green',
    debug: 'grey'
  }
};

  if (this.prefix)
    msg = chalk.cyan("[" + this.prefix +  "]") + " " + msg;

  // prepend timestamp
  if (TIMESTAMP_ENABLED) {
    var date = new Date();
    msg =  chalk.white("[" + date.toLocaleString() + "]") + " " + msg;
  }


module.exports = {
  Logger: Logger,
  setDebugEnabled: setDebugEnabled,
  setTimestampEnabled: setTimestampEnabled,
  setWebsocketLog: setWebsocketLog,
  forceColor: forceColor,
  _system: new Logger() // system logger, for internal use only
}

var DEBUG_ENABLED = false;
var TIMESTAMP_ENABLED = true;
var websocketLogFunction = null;

// Turns on debug level logging
function setDebugEnabled(enabled) {
  DEBUG_ENABLED = enabled;
}

// Turns off timestamps in log messages
function setTimestampEnabled(timestamp) {
  TIMESTAMP_ENABLED = timestamp;
}

function setWebsocketLog(inWebsocketLogFunction) {
    websocketLogFunction = inWebsocketLogFunction;
}

// Force color in log messages, even when output is redirected
function forceColor() {
  chalk.enabled = true;
  chalk.level = 1;
}

// global cache of logger instances by plugin name
var loggerCache = {};
var loggerBuffer = [];
var winstonLogger = null;
/**
 * Logger class
 */

function Logger(prefix, debug = false, config = null) {
  var level = 'good';
  if (debug == true) {
    level = 'debug';
    DEBUG_ENABLED = true;
  }
  this.prefix = prefix;
  var transportConsole = {
    level: level,
    handleExceptions: true,
    json: false,
    colorize: true,
    formatter: function(params) {
        return params.message;
    }
  };
  this.logger = new (winston.transports.DailyRotateFile)({
    transports: [
        new winston.transports.Console(transportConsole)
    ],
    levels: myCustomLevels.levels,
    exitOnError: false
  });
  winstonLogger = this.logger;
  if (config) {
    var transportFile = new (winston.transports.DailyRotateFile)({
        file: "%DATE%" + config.file,
        dirname: config.path,
        maxSize: config.size,
        maxFile: config.keep,
        zippedArchive: config.compress,
        frequency: "24h",
        formatter: function(params) {
            return params.message;
        },
        level: level
    });
    this.logger.add(winston.transports.DailyRotateFile);
  }
}

Logger.prototype.debug = function(msg) {
  //this.logger.log('debug', msg, {prefix: this.prefix});
  this.log.apply(this, ['debug'].concat(Array.prototype.slice.call(arguments)));
}

Logger.prototype.good = function(msg) {
  //this.logger.log('good', msg, {prefix: this.prefix});
  this.log.apply(this, ['good'].concat(Array.prototype.slice.call(arguments)));
}

Logger.prototype.info = function(msg) {
  //this.logger.log('info', msg, {prefix: this.prefix});
  this.log.apply(this, ['info'].concat(Array.prototype.slice.call(arguments)));
}

Logger.prototype.warn = function(msg) {
  //this.logger.log('warn', msg, {prefix: this.prefix});
  this.log.apply(this, ['warn'].concat(Array.prototype.slice.call(arguments)));
}

Logger.prototype.error = function(msg) {
  //this.logger.log('error', msg, {prefix: this.prefix});
  this.log.apply(this, ['error'].concat(Array.prototype.slice.call(arguments)));
}
Logger.prototype.setDebug = function(enabled) {
  if(winstonLogger) {
     for (it in winstonLogger.transports) { 
        if (enabled) {
            winstonLogger.transports[it].level = 'debug';
            DEBUG_ENABLED = true;
        }
        else {
            winstonLogger.transports[it].level = 'good';
            DEBUG_ENABLED = false;
        }
     }
  }
}

Logger.prototype.log = function(level, msg) {
 
  msg = util.format.apply(util, Array.prototype.slice.call(arguments, 1));
  if (level == 'debug') {
    if (DEBUG_ENABLED == false) return;
    msg = chalk.gray(msg);
  }
  else if (level == 'warn') {
    msg = chalk.yellow(msg);
    func = console.error;
  }
  else if (level == 'error') {
    msg = chalk.bold.red(msg);
    func = console.error;
  }
  else if (level == 'good') {
    msg = chalk.green(msg);
  }

  // prepend prefix if applicable
  if (this.prefix)
    msg = chalk.cyan("[" + this.prefix +  "]") + " " + msg;

  // prepend timestamp
  if (TIMESTAMP_ENABLED) {
    var date = new Date();
    msg =  chalk.white("[" + date.toLocaleString() + "]") + " " + msg;
  }

  if (this.logger) {
    for (line in loggerBuffer) {
        this.logger.log(loggerBuffer[line].level, loggerBuffer[line].message,  {prefix: this.prefix});
        if (websocketLogFunction) websocketLogFunction(loggerBuffer[line].message);
    }
    loggerBuffer = [];
    this.logger.log(level, msg,  {prefix: this.prefix});
     if (websocketLogFunction) websocketLogFunction(msg);
  }
  else { 
    loggerBuffer.push({level: level, message: msg});
  }
  
}

Logger.withPrefix = function(prefix, debug = false, config = null) {

  if (!loggerCache[prefix]) {
    // create a class-like logger thing that acts as a function as well
    // as an instance of Logger.
    var logger = new Logger(prefix, debug, config);
    var log = logger.info.bind(logger);
    log.debug = logger.debug;
    log.info = logger.info;
    log.warn = logger.warn;
    log.error = logger.error;
    log.log = logger.log;
    log.prefix = logger.prefix;
    log.good = logger.good;
    log.setDebug = logger.setDebug;
    loggerCache[prefix] = log;
  }

  return loggerCache[prefix];
}
