#! /usr/bin/env node
'use strict'

const util = require("util")
const parser = require("../app/partytime/sequence-parser")
const events = require("../app/partytime/events")
const settings = require("../app/partytime/settings")
const Controller = require("../app/partytime/controller").Controller
const readline = require('readline')

console.log("[event-repl] Loading App Controller...")
let controller = new Controller(settings)
controller.on('ready', runREPLInterface)
controller.init()

function rtnError(err) {

  if (process.argv.indexOf("--stacktrace") == -1) {
    return err.message
  } else {
    return err
  }
}

function runREPLInterface() {

  // make sure the player controller is in quiet mode
  controller.playerController.quiet = true

  console.log("")
  console.log("Welcome to the event repl.\nType the event command to execute or 'quit' to exit.")
  console.log("")

  // create the rl interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on('line', lineHandler).on('close', function() {
    console.log('Thanks for using the event repl.')
    process.exit()
  })

  // perform the initial prompt
  rl.prompt()

  function waitForEvent() {
    console.log()
    rl.prompt()
  }

  function lineHandler(line) {

    console.log()

    // work out the eventString and check it for content
    let eventString = line.trim()
    if (typeof eventString !== 'string' || eventString.length == 0) {
      console.log(rtnError(new Error("You must type a valid input event")))
      waitForEvent()
      return
    }

    // close if we want to
    if (eventString === 'quit') {
      rl.close()
      return
    }

    // get the event data
    var eventData
    try {
      eventData = parser.parse(eventString)
    } catch (err) {
      console.log("failed to parse input:", rtnError(err))
      waitForEvent()
      return
    }

    // get the event type and make sure it's there
    let eventType = eventData.commands[0]
    if (!eventType) {
      console.log(rtnError(new Error("An event must haven initial command representing it's type")))
      waitForEvent()
      return
    }

    // load the event module
    var Event
    try {
      Event = events[eventType]
    } catch (err) {
      console.log("Unable to load event module:", rtnError(err))
      waitForEvent()
      return
    }

    // parse the event
    var event
    try {
      var event = new Event(settings)
      event.parse(eventData, 0)
    } catch (err) {
      console.log("Unable to load parse the event:", rtnError(err))
      waitForEvent()
      return
    }

    // execute the event
    let startTime = (new Date).getTime()
    try {
      event.execute(controller, eventHandler)
    } catch (err) {
      console.log("Failed to execute event:", rtnError(err))
      waitForEvent()
      return
    }

    function eventHandler(err, res) {
      let executeTime = (new Date).getTime() - startTime

      if (err) {
        console.log("Event failed after", executeTime + "ms:", rtnError(err))
      } else {
        console.log("Event executed after", executeTime + "ms")
      }
      waitForEvent()
    }
  }


  // process.stdin.resume()
  // process.stdin.setEncoding('utf8')
  // process.stdin.on('data', function (input) {
  //
  //   // if we're not waiting, then don't process stdin
  //   if (!waiting) {
  //     return
  //   }
  //   waiting = false

  // })
}
