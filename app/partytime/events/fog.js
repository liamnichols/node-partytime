function FogEvent(settings) {

  this.raw = null
}

FogEvent.prototype.execute = function(controller, cb) {
  let _this = this

  function callback(err, active) {
    cb(err, _this)
  }

  if (_this.mode === 'off') {
    controller.fogController.setActive(false, callback)

  } else if (_this.mode === 'on') {

    // turn the machine on
    controller.fogController.setActive(true, function(err, res) {

      // return error if it failed
      if (err) { return callback(err, res) }

      // set a timer for duration
      setTimeout(function() {

        // turn the machine back off
        controller.fogController.setActive(false, callback)

      }, _this.duration * 1000)
    })
  }
}

FogEvent.prototype.parse = function(data, lineNumber) {

  this.raw = data.raw

  // set the data
  if (data.commands[1] === 'on') {
    this.mode = 'on'
    this.duration = parseFloat(data.params.duration)

  } else if (data.commands[1] === 'off') {
    this.mode = 'off'
  }

  // validate the parsed data
  if (this.mode === 'on' && (!this.duration || isNaN(this.duration))) {
    throw new Error("Sequence: error evaluating line " + lineNumber + ". Command 'fog on' must specify 'duration' parameter as a float (in seconds).")
  }
}

module.exports = FogEvent
