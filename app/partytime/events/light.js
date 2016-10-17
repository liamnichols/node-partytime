function LightEvent(settings) {

  // validate colors defiend in settings
  for (key of Object.keys(settings.light.colors)) {
    let color = settings.light.colors[key]

    // make sure we have hue
    if (typeof color.hue !== 'number' || color.hue < 0 || color.hue > 360) {
      throw new Error("Settings for color '"+key+"' must define `hue` value (int 0 - 360)")
    }

    if (typeof color.saturation !== 'number' || color.saturation < 0 || color.saturation > 100) {
      throw new Error("Settings for color '"+key+"' must define `saturation` value (int 0 - 100)")
    }

    if (typeof color.kelvin !== 'number' || color.kelvin < 2500 || color.kelvin > 9000) {
      throw new Error("Settings for color '"+key+"' must define `kelvin` value (int 2500 - 9000)")
    }
  }

  this.raw = null
  this.settings = settings
  this.id = null
}

let supportedActions = {
  on: {
    name: "on",
    params: [ "duration" ]
  },
  off: {
    name: "off",
    params: [ "duration" ]
  },
  state: {
    name: "state",
    params: [ "color", "brightness", "duration" ],
  },
  pulse: {
    name: "pulse",
    params: [ "color", "brightness", "period", "cycles", "persist" ]
  },
  breathe: {
    name: "breathe",
    params: [ "color", "brightness", "period", "cycles", "persist" ]
  }
}

LightEvent.prototype.parse = function(data, lineNumber) {
  // keep a reference to the raw command
  this.raw = data.raw

  // work out the bulb we want to use (parameter 2)
  this.id = (this.settings.light.bulbs.filter(function(l) { return l.label === data.commands[1] })[0] || {}).id

  // get the action
  var action = supportedActions[data.commands[2]] || {}
  this.action = action.name

  // validate some basics
  if (typeof this.id !== 'string' || this.id.length === 0) {
    throw new Error("Sequence: error evaluating line " + lineNumber + ". '" + data.commands[1] + "' does not map to a light in the settings.")
  }

  if (!this.action) {
    throw new Error("Sequence: error evaluating line " + lineNumber + ". '" + data.commands[2] + "' is not a supported action.")
  }

  // optional duration
  if (action.params.includes("duration")) {
    this.duration = parseFloat(data.params.duration) || 0.0
  }
  if (action.params.includes("brightness")) {
    if (typeof data.params.brightness !== 'undefined') {
      this.brightness = Math.max(0, Math.min(100, (parseInt(data.params.brightness) || 0)))
    } else {
      throw new Error("Sequence: error evaluating line " + lineNumber + ". Parameter 'brightness' is required for this action.")
    }
  }
  if (action.params.includes("color")) {
    if (typeof data.params.color !== 'undefined') {
      if (this.settings.light.colors[data.params.color]) {
        this.hue = this.settings.light.colors[data.params.color].hue
        this.saturation = this.settings.light.colors[data.params.color].saturation
        this.kelvin = this.settings.light.colors[data.params.color].kelvin
      } else {
        throw new Error("Sequence: error evaluating line " + lineNumber + ". Settings do not define color map matching '"+ data.params.color +"'")
      }
    } else {
      throw new Error("Sequence: error evaluating line " + lineNumber + ". Parameter 'color' is required for this action.")
    }
  }
  if (action.params.includes("period")) {
    if (typeof data.params.period !== 'undefined') {
      let period = parseFloat(data.params.period)
      if (period > 0 && !isNaN(period)) {
        this.period = period
      } else {
        throw new Error("Sequence: error evaluating line " + lineNumber + ". Parameter 'period' must be a float greater than zero.")
      }
    } else {
      throw new Error("Sequence: error evaluating line " + lineNumber + ". Parameter 'period' is required for this action.")
    }
  }
  if (action.params.includes("cycles")) {
    if (typeof data.params.cycles !== 'undefined') {
      let cycles = parseFloat(data.params.cycles)
      if (cycles > 0 && !isNaN(cycles)) {
        this.cycles = cycles
      } else {
        throw new Error("Sequence: error evaluating line " + lineNumber + ". Parameter 'cycles' must be a number greater than zero.")
      }
    } else {
      throw new Error("Sequence: error evaluating line " + lineNumber + ". Parameter 'cycles' is required for this action.")
    }
  }
  if (action.params.includes("persist")) {
    this.persist = data.params.persist === 'true'
  }

  // cleanup object
  this.settings = undefined
}

LightEvent.prototype.execute = function(controller, cb) {
  let _this = this
  let light = controller.lightController.lifxClient.light(_this.id)

  // the calback used by the executed lifx command
  function callback(err) {
    cb(err, _this)
  }

  // execute a lifx command based on the event
  if (_this.action === 'on') {
    light.on(_this.duration * 1000, callback)
  } else if (_this.action === 'off') {
    light.off(_this.duration * 1000, callback)
  } else if (_this.action === 'state') {
    light.color(_this.hue, _this.saturation, _this.brightness, _this.kelvin, _this.duration * 1000, callback)
  } else if (_this.action === 'pulse') {
    light.pulse(_this.hue, _this.saturation, _this.brightness, _this.kelvin, _this.period * 1000, _this.cycles, _this.persist, callback)
  } else if (_this.action === 'breathe') {
    light.breathe(_this.hue, _this.saturation, _this.brightness, _this.kelvin, _this.period * 1000, _this.cycles, _this.persist, callback)
  }
}

module.exports = LightEvent
