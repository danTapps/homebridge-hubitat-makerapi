# homebridge-hubitat-makerapi

This is based off of @tonesto7 homebridge-hubitat-tonesto7

[![npm version](https://badge.fury.io/js/homebridge-hubitat-makerapi.svg)](https://badge.fury.io/js/homebridge-hubitat-makerapi)

**```Current App version: 0.0.1```**

<br>

# Change Log:

#### Hubitat App:

***v0.0.1*** - Ported app over from my tonesto7 version and added Websocket channel. Reworked Device Classification

<br>

# Explanation:

### Direct Updates
This method is nearly instant.

When properly setup, you should see something like this in your Homebridge startup immediately after the PIN:
```
[2019-4-12 14:22:51] [Hubitat] connect to ws://192.168.10.169/eventsocket
[2019-4-12 14:22:51] Homebridge is running on port 51826.
```

<br>

# Installation:

## 1. Hubitat MakerAPI App Configuration

* Under the Hubitat Web Interface, Click on <u><b>```Apps```</b></u> in the left side menu.
* Click on the button <u><b>```+Add Built-In App```</b></u>
* Select <u><b>```Maker API```</b></u> from the list of apps
* Enable <u><b>```Allow Access via Local IP Address```</b></u>
* Tap <u><b>```Done```</b></u> and you are finished with the App configuration.
* Go into the newly added Maker API app
* Select the devices you would like to have available via HomeKit
* At the bottom you see a few examples of access URLs. You will need two parts of this (App URL and Access Token)
 * example: http://192.168.10.169/apps/api/132/devices/[Device ID]?access_token=148fc06d-7627-40b0-8435-8d0cc31617ab
  * The App URL is http://192.168.10.169/apps/api/132
  * The Access Token is 148fc06d-7627-40b0-8435-8d0cc31617ab
  * Remember these two values for later
* Tap <u><b>```Done```</b></u> and you are finished with the App configuration.


## 2. Homebridge Plugin Installation:

 1. Install homebridge using: ```npm i -g homebridge``` (For Homebridge Install: [Homebridge Instructions](https://github.com/nfarina/homebridge/blob/master/README.md))
 2. Install Hubitat plugin using: ```npm i -g homebridge-hubitat-makerapi```
 3. Update your configuration file. See sample config.json snippet below.

  <h3 style="padding: 0em .6em;">Config.json Settings Example</h3>

  <h4 style="padding: 0em .6em; margin-bottom: 5px;"><u>Example of all settings. Not all settings are required. Read the breakdown below</u></h4>

   <div style=" overflow:auto;width:auto;border-width:.1em .1em .1em .8em;padding:.2em .6em;"><pre style="margin: 0; line-height: 125%"><span style="color: #f8f8f2">{</span>
   <span style="color: #f92672">&quot;platform&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;Hubitat&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;name&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;Hubitat&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;app_url&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;http://192.168.10.169/api/app/YOUR_APPS_ID/&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;access_token&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #e6db74">&quot;THIS-SHOULD-BE-YOUR-TOKEN&quot;</span><span style="color: #f8f8f2">,</span>
   <span style="color: #f92672">&quot;mode_switches&quot;</span><span style="color: #f8f8f2">:</span> <span style="color: #ae81ff">true</span><span style="color: #f8f8f2"></span>
   <span style="color: #f8f8f2">}</span>
</pre></div>


 * <p><u>platform</u> & <u>name</u>  <small style="color: orange; font-weight: 600;"><i>Required</i></small><br>
    This information is used by homebridge to identify the plugin and should be the settings above.</p>

 * <p><u>app_url</u> & <u>access_token</u>  <small style="color: orange; font-weight: 600;"><i>Required</i></small><br>
    This is the base URL and access token for MakerAPI, check step 1 of the installation instructions on how to obtain the value<b> Notice:</b> The app_url in the example above may be different for you.</small></p>

 * <p><u>mode_switches</u>  <small style="color: #f92672; font-weight: 600;"><i>Optional</i></small><br>
    Creates virtual switches to contol Hubitat Modes. Possible values true|false. Default is false<b> Notice:</b> This feature is not supported yet.</small></p>


