const EventEmitter = require('events').EventEmitter
const util = require('util')
const request = require('request')

function FogController(settings) {
  this.settings = settings
  this.ready = false
}

util.inherits(FogController, EventEmitter)

FogController.prototype.setActive = function(active, cb) {
  let _this = this

  // get the options
  let url = _this.baseUrl + "/" + (active === true ? "1" : "0")
  let options = {
    url: url,
    auth: _this.auth
  }

  // start the request
  request.post(options, (err, res, body) => {

    if (typeof body === 'string' && (body === "1" || body === '0')) {
      let active = parseInt(body) == 1 ? true : false
      // console.log("[FogController] Updated fog state. Active:", active)
      cb(null, active)
    } else if (err) {
      cb(err, null)
    } else {
      cb(new Error("Unknown parse error"), null)
    }
  })
}

FogController.prototype.init = function() {
  let _this = this

  // ensure we have a machine in the settings
  if (typeof _this.settings.fog.ip !== 'string') {
    throw new Error("Settings must define an ip address for the fog machine")
  }

  console.log("[FogController] Looking for fog machine...")

  // set the url address
  _this.baseUrl = "http://" + _this.settings.fog.ip + ":8000/fog/active"
  _this.auth = {
    user: "webiopi",
    pass: "raspberry"
  }

  var options = {
    url: _this.baseUrl,
    auth: _this.auth
  }

  // execute the request
  request.get(options, (err, res, body) => {

    // make sure we can parse the result
    if (typeof body === 'string' && (body === "1" || body === '0')) {
      let active = parseInt(body) == 1 ? true : false

      // it worked
      console.log("[FogController] Found fog machine. Active:", active)

      // mark as ready
      if (!_this.ready) {
        _this.ready = true
        _this.emit('ready')
      }

    } else {
      throw new Error("Unable to check state of fog machine:", err)
    }
  })
}

exports.FogController = FogController
