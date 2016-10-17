#! /usr/bin/env node
const SonosDiscovery = require('sonos-discovery');

// setup the Lifx client
console.log("Scanning for system...")
console.log("Use ctrl+c to cancel.")
var discovery = new SonosDiscovery()

discovery.on('topology-change', function(topology) {

  console.log("\nSystem Endpoint:", discovery.localEndpoint)

  for (player of discovery.players) {

    console.log("\nFound Player:")
    console.log(" uuid:", player.uuid)
    console.log(" room name:", player.roomName)
    console.log(" base url:", player.baseUrl)
  }

  for (zone of discovery.zones) {
    console.log("\nFound Zone:")
    console.log(" id:", zone.id)
    console.log(" uuid:", zone.uuid)
    console.log(" members:")
    if (zone.members.length == 0) {
      console.log("   <no members>")
    } else {
      var i = 0
      for (members of zone.members) {
        console.log("   [" + i + "]:", members.roomName)
        i++
      }
    }
  }

  process.exit()
})
