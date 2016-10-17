const events = require("./events")
const crypto = require("crypto")
const parser = require("./sequence-parser")

function Sequence(data, settings) {

  this.hash = crypto.createHash('sha1').update(data).digest('hex')
  this.type = null
  this.trackInfo = null
  this.eventGroups = null

  // make sure we have the data
  if (typeof data !== 'string') {
    throw new TypeError("You must pass the sequence data when initalising a sequence")
  }

  var metadata = undefined
  var eventGroups = [ ]
  var relativeTime = 0.0
  var currentEvents = []
  var loop = false

  function groupCurrentEvents() {

    // group the current events array and reset
    if (currentEvents.length > 0) {
      eventGroups.push({
        time: relativeTime,
        events: currentEvents
      })
      currentEvents = []
    }
  }

  // evaluate the string.
  var lineNo = 0
  for (line of data.split("\n")) {

    // increment the line number for logging
    lineNo++

    // trim all whitespace
    line = line.trim()

    // if the line is blank or a comment, ignore it.
    if (line.length == 0 || line.startsWith("//") || line.startsWith("#")) {
      continue
    }

    // parse the line
    line = parser.parse(line)

    // if we don't have a sequence type, this line has to be the sequence type as the first line must represent it.
    if (!metadata) {
      metadata = evaluateSequenceMetadata(line, lineNo)
      continue
    }

    // any other lines are to be parsed into regular events
    var eventType = line.commands[0]


    // this is a timing split, we handle this a little different
    if (eventType === 'wait' || eventType === 'at' || eventType === 'loop') {

      // loops aren't supported on the default sequence
      if (metadata.type === 'default' && eventType === 'loop') {
        throw new Error("Sequence: error evaluating line " + lineNo + ". A timing specifier (" + eventType + ") has been specified in a sequence type where timings aren't supported")
      }

      // second parameter must be a time
      var seconds = parseFloat(line.commands[1])
      if (!seconds || isNaN(seconds)) {
        throw new Error("Sequence: error evaluating line " + lineNo + ". A timing specifier (" + eventType + ") has been specified without a valid duration (seconds)")
      }

      // loop events shouldn't change any of the below, just capture the time
      if (eventType === 'loop') {
        loop = seconds
        continue
      }

      groupCurrentEvents()

      // update the current relative time
      if (eventType == 'wait') {
        relativeTime = relativeTime += seconds
      } else {
        relativeTime = seconds
      }

      continue
    }

    // get the event and persist it
    var event = evaluateEvent(eventType, line, lineNo, settings)
    currentEvents.push(event)
  }

  // group the last lot of events
  groupCurrentEvents()

  // set the sequence info
  this.type = metadata.type
  if (this.type === 'track') {
    this.trackInfo = metadata.params
  }
  this.loop = loop

  // set the event groups
  this.eventGroups = eventGroups.sort(function(a, b) { return a.time - b.time })
}

function evaluateEvent(type, line, number, settings) {

  // ensure this is a supported type
  if (typeof events[type] === 'undefined') {
    throw new Error("Sequence: error evaluating line " + number + ". Event type '" + type + "' is not supported")
  }

  // create the event
  var Event = events[type]
  var event = new Event(settings)

  // parse the data into the event
  event.parse(line, number)

  // return the event
  return event
}

function evaluateSequenceMetadata(line, number) {

  // check if the correct sequence type was specified
  if (line.commands[0] === 'generic' || line.commands[0] === 'default' || line.commands[0] === 'track') {

    // make sure there is only one command
    if (line.commands.length > 1) {
      throw new Error("Sequence: error evaluating line " + number + ". Expected single command but multiple values have been supplied.")
    }

    // if this is a track, make sure we have the title and artist
    if (line.commands[0] === 'track' && typeof line.params.title !== 'string') {
      throw new Error("Sequence: error evaluating line " + number + ". Expected 'title' parameter to be defined for track sequence")
    }
    if (line.commands[0] === 'track' && typeof line.params.artist !== 'string') {
      throw new Error("Sequence: error evaluating line " + number + ". Expected 'artist' parameter to be defined for track sequence")
    }

    // return the the type
    return {
      type: line.commands[0],
      params: line.params
    }
  }

  throw new Error("Sequence: error evaluating line " + number + ". Expected valid sequence type specifier (generic, default or track). Got " + line.commands[0])
}

Sequence.prototype.stop = function() {
  let _this = this

  // doesn't matter if we have already stopped
  if (_this.running === false) {
    return
  }

  // mark as not running
  _this.running = false

  // invalidate any timers
  for (t of _this.timers) { clearTimeout(t) }

  // cancel any incomplete events
  for (key of Object.keys(_this.ongoingEvents)) {
    let event = _this.ongoingEvents[key]
    if (event && typeof event.cancel === 'function') {
      event.cancel()
    }
  }

  // cleanup
  _this.startTime = undefined
  _this.lastGroupTime = undefined
  _this.ongoingEvents = { }
  _this.running = false
  _this.timers = Array()
}

// start offset
Sequence.prototype.start = function(controller, _startTime) {

  // don't continue if we are already running
  if (this.running === true) {
    return
  }

  let _this = this
  let startTime = _startTime || 0.0
  _this.startTime = (new Date).getTime() - startTime
  _this.lastGroupTime = null
  _this.ongoingEvents = { }
  _this.running = true
  _this.timers = Array()

  function runNextGroup() {

    // find the next batch of events in the sequence
    let currentTime = (new Date).getTime() - _this.startTime
    let eventGroup = _this.eventGroups.filter(function(g) {
      return g.time * 1000 >= currentTime && g.time !== _this.lastGroupTime
    })[0]

    // we might have to loop back round if we've run out of event groups
    if (!eventGroup) {

      // if we support looping, start again, otherwise stop
      if (_this.loop) {
        let t = setTimeout(function() {
          _this.startTime = (new Date).getTime()
          runNextGroup()
        }, _this.loop * 1000)
        _this.timers.push(t)
      } else {
        _this.stop()
      }
      return
    }

    function eventCallback(err, event) {

      // log an error if there was one.
      if (err) {
        console.log("[Sequence] Event '" + event.raw + "' failed with error:", err)
      }

      // remove the event as it's done.
      _this.ongoingEvents[event._id] = undefined
    }

    // a function to run the events
    function executeEvents() {
      console.log("[Sequence] Executing", eventGroup.events.length, "event(s) (" + eventGroup.time * 1000 + "ms):")

      for (event of eventGroup.events) {
        console.log("[Sequence]  ", event.raw)
        event._id = crypto.randomBytes(20).toString('hex')
        _this.ongoingEvents[event._id] = event.execute(controller, eventCallback)
      }

      _this.lastGroupTime = eventGroup.time
      runNextGroup()
    }

    // work out how long we need to wait
    let waitDuration = (eventGroup.time * 1000) - currentTime

    // either start a timer or immediatly execute the tasks
    if (waitDuration > 0.0) {
      let t = setTimeout(executeEvents, waitDuration)
      _this.timers.push(t)
    } else {
      executeEvents()
    }
  }

  // kick things off
  runNextGroup()
}

module.exports = Sequence
