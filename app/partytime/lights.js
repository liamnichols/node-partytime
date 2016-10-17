const LifxClient = require('node-lifx').Client;
const EventEmitter = require('events').EventEmitter
const util = require('util')

// apply the prototype extensions to `Light`
require("./extensions/node-lifx-light")

function LightController(settings) {
  this.lifxClient = new LifxClient()
  this.settings = settings
  this.lights = { }
  this.ready = false
}

util.inherits(LightController, EventEmitter)

LightController.prototype.init = function() {
  let _this = this

  // listen for light discoveries
  this.lifxClient.on('light-new', function(light) {

    // check if this is a light we need in the controller
    for (item of _this.settings.light.bulbs) {
      if (item.id === light.id) {

        // store the label on the light and keep track of it.
        light.label = item.label
        _this.lights[item.label] = light
        console.log("[LightController] Found", util.inspect(light.label))
        break
      }
    }

    // if we have the right number if lights, fire the ready event, also kill discovery as we no longer care
    if (!_this.ready && Object.keys(_this.lights).length === _this.settings.light.bulbs.length) {
      _this.lifxClient.stopDiscovery()
      _this.ready = true
      _this.emit('ready')
    }
  })

  // get a fixed list of ips to speed things up
  var staticIPs = _this.settings.light.bulbs.map(function(l) {
    return l.staticIp
  })

  // init the lifx client
  console.log("[LightController] Looking for", _this.settings.light.bulbs.length, "lights...")
  this.lifxClient.init({
    lights: staticIPs
  })
}

exports.LightController = LightController
