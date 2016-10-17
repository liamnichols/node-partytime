#! /usr/bin/env node

// get the app
console.log("[PartyTime] Starting...")
var app = require("./partytime")
const Controller = app.Controller

// create a controller with the settings
var controller = new Controller(app.settings)

// add listen events for the state changes
controller.on('ready', readyToParty)
controller.on('error', failedToParty)

// start the initalisation
controller.init()

// handle the controller events
function readyToParty() {


  console.log("\nPartytime is now ready.")
  console.log("  Type 's' to toggle start/stop.")
  console.log("  Type 'q' to quit.\n")

  // wait for user command
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (input) {

    console.log("")

    // process input
    if (input === 's\n') {
      if (controller.hasStarted) {
        stopPartyController()
      } else {
        startPartyController()
      }
    } else if (input === 'q\n') {
      quitProgram()
    }
  })
}

function failedToParty(err) {
  console.log("An error occurred while partying:", error)
  process.exit()
}

function startPartyController() {

  console.log("[partytime] Starting...")
  controller.start()
}

function stopPartyController() {

  console.log("[partytime] Stopping...")
  controller.stop()
}

function quitProgram() {
  console.log("[partytime] Goodbye.")
  process.exit()
}
