# homebridge-hubitat-makerapi

This is based off of @tonesto7 homebridge-hubitat-tonesto7

[![npm version](https://badge.fury.io/js/homebridge-hubitat-makerapi.svg)](https://badge.fury.io/js/homebridge-hubitat-makerapi)

**```Current App version: 0.4.11```**

##### Table of Contents  
**[Change Log](https://github.com/danTapps/homebridge-hubitat-makerapi/blob/master/CHANGELOG.md)**<br>
**[Installation](#installation)**<br>
**[Configuration File Parameters](#configuration-file-parameters)**<br>
**[Capability Filtering](#capability-filtering)**<br>
**[Attribute Filtering](#attribute-filtering)**<br>
**[Troubleshooting](#troubleshooting)**<br>


# Explanation:

### Direct Updates
This method is nearly instant.

When properly setup, you should see something like this in your Homebridge startup immediately after the PIN:
```
[2019-4-12 14:22:51] [Hubitat] homebridge-hubitat-makerapi server listening on 20009
[2019-4-12 14:22:51] Homebridge is running on port 51826.
```
<br>

# Installation

## 1. Hubitat MakerAPI App Configuration

* Under the Hubitat Web Interface, Click on <u><b>```Apps```</b></u> in the left side menu.
* Click on the button <u><b>```+Add Built-In App```</b></u>
* Select <u><b>```Maker API```</b></u> from the list of apps
* Enable <u><b>```Allow Access via Local IP Address```</b></u>
* Tap <u><b>```Done```</b></u> and you are finished with the App configuration.
* Go into the newly added Maker API app
* Select the devices you would like to have available via HomeKit
* Enable <u><b>```Include Location Events```</b></u> to support HSM and chaning of modes

## 2. Homebridge Plugin Installation:

 1. Install homebridge using: ```sudo npm i -g homebridge``` (For Homebridge Install: [Homebridge Instructions](https://github.com/nfarina/homebridge/blob/master/README.md))
 2. Install Hubitat plugin using: ```sudo npm i -g homebridge-hubitat-makerapi```
 3. Create your config.json configuration file. The config.json file has to be stored in the folder ~/.homebridge
 4. To help creating your inital configuration file, **<a href="https://dantapps.github.io" target="_blank">click here</a>** for some assistance.
 5. Start homebridge using the command: ```homebridge```


 # Configuration File Parameters

  <h4 style="padding: 0em .6em; margin-bottom: 5px;"><u>Example of all settings. Not all settings are required. Read the breakdown below. There is also a tool to help you creating a config.json file located <a href="https://dantapps.github.io" target="_blank">here</a></u></h4>

   <div style=" overflow:auto;width:auto;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #f8f8f2">{</span>
   <span style="color: #f92672">&quot;platform&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;Hubitat-MakerAPI&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;name&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;Hubitat&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;app_url&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;http://192.168.10.169/apps/api/YOUR_APPS_ID/&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;access_token&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;THIS-SHOULD-BE-YOUR-TOKEN&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;local_ip&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;10.0.0.70&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;local_port&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #ae81ff">20010</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;polling_seconds&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">300</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;temperature_unit&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">"F"</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;mode_switches&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">true</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;hsm&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">true</span><span style="color: #f8f8f2">,</span>   
   <span style="color: #f92672">&quot;debug&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">false</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;programmable_buttons&quot;</span><span style="color: #f8f8f2">: [</span>
   <span style="color: orange">     &quot;97&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: orange">     &quot;98&quot;</span><span style="color: #f8f8f2"></span>
   <span style="color: #f8f8f2">],</span>
   <span style="color: #f92672">&quot;excluded_capabilities&quot;</span><span style="color: #f8f8f2">: {</span>
   <span style="color: lightblue">    &quot;HUBITAT-DEVICE-ID-1&quot;</span><span style="color: #f8f8f2">: [</span>
   <span style="color: orange">       &quot;Switch&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: orange">       &quot;TemperatureMeasurement&quot;</span>
   <span style="color: #f8f8f2">    ]</span>
   <span style="color: #f8f8f2">},</span>
   <span style="color: #f92672">&quot;excluded_attributes&quot;</span><span style="color: #f8f8f2">: {</span>
   <span style="color: lightblue">    &quot;HUBITAT-DEVICE-ID-1&quot;</span><span style="color: #f8f8f2">: [</span>
   <span style="color: orange">       &quot;power&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: orange">       &quot;humidity&quot;</span>
   <span style="color: #f8f8f2">    ]</span>
   <span style="color: #f8f8f2">},</span>
   <span style="color: #f92672">&quot;logFile&quot;</span><span style="color: #f8f8f2">: {</span>
   <span style="color: #f92672">      &quot;enabled&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">true</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">      &quot;path&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">      &quot;file&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">      &quot;compress&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">true</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">      &quot;keep&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">5</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">      &quot;size&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;10m&quot;</span><span style="color: #f8f8f2"></span>
   <span style="color: #f8f8f2">}<br>}</span>
</pre></div>


 * <p><u>platform</u> & <u>name</u>  <small style="color: orange; font-weight: 600;"><i>Required</i></small><br>
    This information is used by homebridge to identify the plugin and should be the settings above.</p>

 * <p><u>app_url</u> & <u>access_token</u>  <small style="color: orange; font-weight: 600;"><i>Required</i></small><br>
    This is the base URL and access token for MakerAPI, check step 1 of the installation instructions on how to obtain the value<b> Notice:</b> The app_url in the example above may be different for you.</small></p>

 * <p><u>local_ip</u>  <small style="color: #f92672; font-weight: 600;"><i>Optional</i></small><br>
    Defaults to first available IP on your computer<br><small style="color: gray;">Most installations won't need this, but if for any reason it can't identify your ip address correctly, use this setting to force the IP presented to Hubitat for the hub to send to.</small></p>

 * <p><u>local_port</u>  <small style="color: #f92672; font-weight: 600;"><i>Optional</i></small><br>
   Defaults to 20010<br><small style="color: gray;">This is the port that homebridge-hubitat-makerapi plugin will listen on for events from your hub. Make sure your firewall allows incoming traffic on this port from your hub's IP address.</small></p>

 * <p><u>polling_seconds</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
    Configures the how often (in seconds) the plugin should check if devices were removed or added from/to the selection in MakerAPI. Default is every 300 seconds. Almost no need to restart homebridge anymore! Name changes and changing a device driver still requires a restart.</small></p>

 * <p><u>excluded_capabilities</u>  <small style="color: #f92672; font-weight: 600;"><i>Optional</i></small><br>
   Defaults to None<br><small style="color: gray;">Specify the Hubitat device by ID and the associated capabilities you want the plugin to ignore<br>This prevents a Hubitat device from creating unwanted or redundant HomeKit accessories</small></p>

 * <p><u>excluded_attributes</u>  <small style="color: #f92672; font-weight: 600;"><i>Optional</i></small><br>
   Defaults to None<br>Specify the Hubitat device by ID and the associated attributes you want homebridge-hubitat-makerapi to ignore. This prevents a Hubitat device from creating unwanted or redundant HomeKit accessories</small></p>

* <p><u>programmable_buttons</u>  <small style="color: #f92672; font-weight: 600;"><i>Optional</i></small><br>
   Defaults to None<br>By default, pressing Buttons in Homekit trigger a "pushed" event for button number 1 in Hubitat. The setting "programmable_buttons" allows Hubitat to trigger HomeKit specific scenes. You can assign scenes to three types of events: Pushed, Held and DoubleTapped. This can be helpful to interact with Homekit only devices. E.g. a button press in HE can trigger a HomeKit only lock to lock. Note: there is no feedback if the Homekit scene was executed successfully or not. Specify the Hubitat device by ID in this setting to create a programmable button.</small></p>

 * <p><u>temperature_unit</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
    Default to F<br>Ability to configure between Celsius and Fahrenheit. Possible values: "F" or "C"</small></p>

 * <p><u>mode_switches</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
    Default to false<br>Create switches for modes and ability to switch modes by enabling such switches Possible values: true or false<br>Requires HE fimrware 2.0.9 or newer</p>

 * <p><u>hsm</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
    Default to false<br>Integrates HSM into Home app and allow to arm/disarm the hsm and receive notifications on intrusions<br>Requires HE firmware 2.0.9 or newer</p>

 * <p><u>debug</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
    Default to false<br>Enables debugging of HTTP calls to MakerAPI to troubleshoot issues</p>
 
 * <p><u>logFile</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
    Settings to enable logging to file. Uses winston logging facility 

   * <p><u>enabled</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
      Enable logging to file. Default is true. Set to true to enable file logging

   * <p><u>path</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
      Path to store log files. Defaults to path where config.json is stored - Only applicable if logFile -> enable is set to true

   * <p><u>file</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
      Filename of log file. Default is homebridge-hubitat.log - Only applicable if logFile -> enable is set to true

   * <p><u>compress</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
      Compress log files when they rotate. Default is true - Only applicable if logFile -> enable is set to true

   * <p><u>keep</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
      Number of log files to keep before deleting old log files. Default is 5 - Only applicable if logFile -> enable is set to true

   * <p><u>size</u>  <small style="color: orange; font-weight: 600;"><i>Optional</i></small><br>
      Maximum size of log file. Default is 10m - Only applicable if logFile -> enable is set to true

## Capability Filtering
The **homebridge-hubitat-makerapi** creates Homekit devices based on the attributes of devices. See ***Attribute Filtering*** below.
To allow backwards compatibilty to tonesto7's plugin, the homebridge-hubitat-makerapi plugin still allows filtering by capability. Capabilities are going to be matched to Hubitat's listed capabilities at [Driver Capability List](https://docs.hubitat.com/index.php?title=Driver_Capability_List) and the associated attributes are going to be removed.

## Attribute Filtering
The **homebridge-hubitat-makerapi** creates Homekit devices based on the attributes of devices. 
The following attributes are currently being handled: 

| **Attribute** | **HomeKit Devices** |
| ------------ | ------------ |
| thermostatOperatingState | Thermostat |
| switch and (level or hue or saturation) | Light Bulb |
| switch | Switch |
| motion | Motion Sensor |
| presence | Occupancy Sensor |
| lock | Lock Mechanism |
| temperature (and not a thermostat) | Temperature Sensor|
| contact | Contact Sensor |
| door | Garage Door Opener |
| smoke | Smoke Sensor |
| carbonMonoxide | Carbon Monoxide Sensor |
| carbonDioxideMeasurement | Carbon Dioxide Sensor |
| water | Leak Sensor |
| humidity | Humidity Sensor |
| illuminance | Light Sensor |
| battery | Battery Service |
| position | Window Covering |
| speed | Fan Controller |
| valve | Valve |

The **homebridge-hubitat-makerapi** plugin does not discriminate! The plugin will create multiple devices in Homekit if a device has multiple of these attributes.
Let's take a window shade as an example. A window shade might have the attributes "switch" and "position" and would create two Homekit devices, one as a switch and one as window covering. 
This might not be the desired behavior and you might want to only have one Homekit devices that sets the position of the shade. The plugin allows you to filter out the "switch" attribute and won't create a Homekit device for that attribute.
To do so, you would add the following configuration to your config.json:

<div style=" overflow:auto;width:auto;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #f8f8f2"></span>
   <span style="color: #f92672">&quot;excluded_attributes&quot;</span><span style="color: #f8f8f2">: {</span>
   <span style="color: lightblue">    &quot;HUBITAT-DEVICE-ID&quot;</span><span style="color: #f8f8f2">: [</span>
   <span style="color: orange">       &quot;switch&quot;</span><span style="color: #f8f8f2"></span>
   <span style="color: #f8f8f2">    ]</span>
   <span style="color: #f8f8f2">}</span>
</pre></div>

# Troubleshooting
With version ***v0.4.5*** a plugin dashboard is available to help troubeshooting.
The dashboard is a website that can be reached while homebridge and the plugin are running.
To reach the dashboard, you can follow these steps:
1. In Hubitat, go open your MakerAPI Instance
2. Scroll down to find your "URL to send device events to by POST"
![alt text](https://raw.githubusercontent.com/danTapps/homebridge-hubitat-makerapi/dev/images/posturl.png "POST Url")
3. Copy the URL and enter the URL in a new browser window
4. You will see a view like this, showing you the logging output of the plugin, the ability to download the log-file to your computer, enablign, disabling debug mode and see your current configuration
![alt text](https://raw.githubusercontent.com/danTapps/homebridge-hubitat-makerapi/dev/images/dashboard.png "Dashboard")

