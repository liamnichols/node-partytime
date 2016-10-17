#! /usr/bin/env node

const LifxClient = require('node-lifx').Client

var lights = []
if (process.argv[2]) {
  lights = process.argv[2].split(",")
}

console.log("Checking specifics:", lights)

// setup the Lifx client
console.log("Scanning for lights...")
console.log("Use ctrl+c to stop.")
var client = new LifxClient()

// listen for light discoveries
client.on('light-new', function(light) {

  // work out it's label
  light.getState(function(err, state) {

    console.log("\nFound Light:")
    console.log(" id:", light.id)
    console.log(" ip address:", light.address)
    console.log(" label:", state.label)
    console.log(" color:")
    console.log("   hue:", state.color.hue)
    console.log("   saturation:", state.color.saturation)
    console.log("   brightness:", state.color.brightness)
    console.log("   kelvin:", state.color.kelvin)
  })
})

// start the client
client.init({
  lights: lights
})
