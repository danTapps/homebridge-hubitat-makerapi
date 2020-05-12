# Change Log

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/).

#### Homebridge Hubitat Plugin:

## v0.4.11 (2020-01-25)
Fixed exception on button events
## v0.4.10 (2019-12-17)
Fixed thermostat setpoint in auto mode for Thermostats
## 0.4.9 (2019-11-27)
Fixed Alarm Tile reset when custom rule alert was canceled
## 0.4.8 (2019-11-21)
Fixed setting Thermostat temperatures in auto mode, fixed Alarm Tile in Home App when HSM is disarmed with 'Disarm All' by RM, better detection of local_ip based on app_url host
## v0.4.7 (2019-11-19)
Fixed null attribute on battery for thermostats
## v0.4.6 (2019-11-15)
Fixed thermostat low battery warnings, fixed iOS13 duplicate calling of setThermostatOperationgMode, some UI changes in diagnostic website
## v0.4.5 (2019-11-08)
Added diagnostic website hosted by plugin to see/download log files and enable debug logging
## v0.4.2
Added automatic detection of free port to listen on for event stream
## v0.4.1
Fixed an issue during start and concurrent requests to MakerAPI
## v0.4.0 (2019-10-31)
Adapted to new MakerAPI event-stream released with Hubitat release 2.1.6, websocket connection is used as fallback if MakerAPI stream is not supported, new configuration options for "local_ip" and "local_port" added, clean reload after lost communication with hub
## v0.3.3 (2019-10-09)
Fixed programmed buttons implementation, further testing on websocket connection, reloading of attribute states via HTTP if websocket connection is "broken", some refactoring
## v0.3.2
Another try to deal with websocket issues
## v0.3.1
Fixed double usage of switch if a button also has the switch attribute
##v0.3.0
Added Button support, limited to "push" for 1 button, see ***"programmable_buttons"*** for advanced programmable button support (thanks to @swiss6th for the code base)
## v0.2.19 
Added some additional testing on websocket status to track down an issue...
## v0.2.18 (2019-09-23)
Added thermostat fan switch support (thanks @swiss6th), added ping/pong for websockets (thanks @asj)
## v0.2.17 (2019-08-07)
Added support for colorTemperature bulbs
## v0.2.16 (2019-07-22)
Fixed rounding issue for thermostats in auto mode
## v0.2.15 (2019-07-22)
Added ability to write logging to file
## v0.2.14 (2019-07-05)
Added "debug" mode to see calls to MakerAPI in output. See description below on how to enable it.
## v0.2.13 (2019-06-17)
Fixed garage door implementation and set obstruction when status is unknown/stopped
## v0.2.11 (2019-06-17)
Added some debug for fans....
## v0.2.10 (2019-05-28)
Hampton Bay Fan Controllers say they have speed level even though they are off, let's fix that
## v0.2.9 (2019-05-28)
Fixed on/off for hampton bay controller, fixed water valve
## v0.2.7 - v.0.2.8 
Problems with deasync module, removed it
## v0.2.6 (2019-05-26)
Fixed issue with multi sensors not updating temperature and humidity, fixed issue that temperature can't go negative
## v0.2.5 (2019-05-14)
Allows correct usage of DNS host names instead of IP address to connect to hubitat, fans that support setLevel use setLevel instead of setSpeed to allow finer granularity, code baselined with homebridge-hubitat-hubconnect plugin to allow faster cross-sharing of improvements
## v0.2.1 - v0.2.4 
Fixed attribute filtering for cached devices
## v0.2.0 (2019-05-01)
Migrated to dynamic homebridge platform that removes the need of restarting homebridge after a device selection was changed in MakerAPI, configure homebridge to use Celsius, fixed fan tile on/off functionallity, ability to create switch tiles for modes and switching of modes, HSM integration, reduced load on Hubitat at plugin start by removing dependency on full detail API call, plugin startup speed improved, perform daily version check against NPMJS and print logging statement on newer versions available
## v0.1.11 - v0.1.17
Several attempts to mess with messy fans...
## v0.1.10 (2019-04-25)
Fixed Hampton Bay Fan Component
## v0.1.9 (2019-04-24)
Added ability to filter out attributes and capabilities
## v0.1.8
Fixed issue with setting Thermostat temperature, make a device a Fan if it has the attributes switch and level and the device type contains the words "fan control"
## v0.1.7 (2019-04-23)
Fixed issuse with Siri, Show version number in logging output
## v0.1.2 (2019-04-19)
Fixed bug of not updating tiles in HomeKit after an hour expired
## v0.1.0
Ported app over from my tonesto7 version and added Websocket channel. Reworked Device Classification, HSM and modes currently not supported!!!