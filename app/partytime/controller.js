const EventEmitter = require('events').EventEmitter
const util = require('util')
const LightController = require('./lights.js').LightController
const PlayerController = require('./player.js').PlayerController
const FogController = require('./fog.js').FogController
const path = require("path")
const fs = require("fs")
const Sequence = require("./sequence")

function Controller(settings) {
  this.ready = false
  this.settings = settings
  this.lightController = new LightController(settings)
  this.playerController = new PlayerController(settings)
  this.fogController = new FogController(settings)
  this.currentSequence = null
  this.hasStarted = false
}

// This needs to be before all prototype methods!
util.inherits(Controller, EventEmitter)

// initalizes the controller
Controller.prototype.init = function() {
  let _this = this

  // state checking
  function checkReadyState() {

    // check if everything is ready
    if (_this.lightController.ready && _this.playerController.ready && _this.fogController.ready) {

      // start listening for track change events
      _this.playerController.on('track-state', handleTrackStateChange)

      // fire the ready event
      _this.read = true
      _this.emit('ready')
    }
  }

  // load the sequences
  _this.sequences = readSequences(_this.settings)

  // need to find the required lifx bulbs
  _this.lightController.on('ready', checkReadyState)
  _this.lightController.init()

  // need to connect to the fog machine
  _this.fogController.on('ready', checkReadyState)
  _this.fogController.init()

  // need to look for the right sonos player
  _this.playerController.on('ready', checkReadyState)
  _this.playerController.init()

  function handleTrackStateChange(playerController) {
    let state = playerController.trackState

    // don't listen fo the change if we haven't started yet
    if (!_this.hasStarted) {
      return
    }

    // get the relvant sequence and load it
    let data = _this.getSequenceData(state)
    _this.loadSequence(data.sequence, data.time)
  }
}

Controller.prototype.getSequenceData = function(trackState) {
  let _this = this

  // return the default sequence if we don't have the track state
  if (typeof trackState !== 'object') {
    return { time: 0.0, sequence: _this.sequences.default }
  }

  // find it
  let sequence = _this.sequences.tracks.filter(function(t) {
    return t.trackInfo.title === trackState.title && t.trackInfo.artist === trackState.artist
  })[0]

  // return the track sequence if we have it, otherwise use the generic one
  if (sequence) {
    return { time: trackState.elapsedTimeNow(), sequence: sequence }
  } else {
    return { time: 0.0, sequence: _this.sequences.generics.random() }
  }
}

// starts the party
Controller.prototype.start = function() {
  let _this = this

  // start the correct sequence
  let data = _this.getSequenceData(_this.playerController.trackState)
  _this.loadSequence(data.sequence, data.time)
  _this.hasStarted = true
}

// stops the party
Controller.prototype.stop = function() {
  let _this = this

  // just go back to the default sequence
  _this.loadSequence(_this.sequences.default)
  _this.hasStarted = false
}

Controller.prototype.loadSequence = function(sequence, _startTime) {
  let _this = this
  var startTime = _startTime || 0.0

  // check if the sequence hashes are the same. Don't load it as it's already loaded
  if (_this.currentSequence && _this.currentSequence.hash === sequence.hash && sequence.type !== 'track') {
    return
  }

  console.log("[Controller] Loading Sequence (" + sequence.type + " @ " + startTime + "ms)")

  // stop the current sequence
  if (_this.currentSequence) {
    _this.currentSequence.stop()
  }

  // start the next one
  _this.currentSequence = sequence
  _this.currentSequence.start(_this, startTime)
}

exports.Controller = Controller

// reads all the sequences from the system
function readSequences(settings, inDir) {

  var sequences = {
    default: null,
    generics: Array(),
    tracks: Array()
  }

  var dir = inDir || path.join(__dirname, "../", "../", "public", "sequences")
  console.log("[Controller] Loading sequences in", util.inspect(dir))
  for (file of fs.readdirSync(dir).filter(function(f) { return f.endsWith(".sequence") && !f.startsWith(".") })) {
    console.log("[Controller] Loading", util.inspect(file))
    let filePath = path.join(dir, file)
    let data = fs.readFileSync(filePath, 'utf8')
    let sequence = new Sequence(data, settings)

    // keep hold of this sequence
    if (sequence.type === 'default') {
      sequences.default = sequence
    } else if (sequence.type === 'generic') {
      sequences.generics.push(sequence)
    } else if (sequence.type === 'track') {
      sequences.tracks.push(sequence)
    }
  }

  return sequences
}

Array.prototype.random = function() {
  if (this.length === 0) {
    return undefined
  } else if (this.length === 1) {
    return this[0]
  } else {
    return this[Math.floor(Math.random() * this.length)]
  }
}
