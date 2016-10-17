const SonosSystem = require('sonos-discovery')
const EventEmitter = require('events').EventEmitter
const util = require('util')
const path = require("path")
const fs = require("fs")
const Sequence = require("./sequence")

function PlayerController(settings) {
  this.sonosSytem = null
  this.settings = settings
  this.player = null
  this.zone = null
  this.ready = false
}

util.inherits(PlayerController, EventEmitter)

PlayerController.prototype.init = function() {
  let _this = this

  // create the sonos system and listen for it's updates
  console.log("[PlayerController] Looking for player...")
  _this.sonosSystem = new SonosSystem()
  _this.sonosSystem.on('topology-change', function() {

    // find the associated player and zone
    for (player of _this.sonosSystem.players) {
      if (player.uuid == _this.settings.sonos.uuid) {

        // store the label on the light and keep track of it.
        _this.player = player
        console.log("[PlayerController] Found", util.inspect(player.roomName))
        break
      }
    }

    // find the zone this player is a member of
    for (zone of _this.sonosSystem.zones) {
      var results = zone.members.filter(function(member) { return member.uuid == _this.settings.sonos.uuid } )
      if (results.length > 0) {
        _this.zone = zone
        break
      }
    }

    // if we found the player, mark as ready
    if (!_this.ready && _this.player !== null && _this.zone !== null) {

      // start listening for transport-state changes on the player
      _this.player.on('transport-state', transportStateChanged)

      // emit the ready event
      _this.ready = true
      _this.emit('ready')
    }
  })


  function transportStateChanged(player) {

    if (!_this.quiet) {
      console.log("[PlayerController] TS Changed:", player.playbackState, "title:", player.currentTrack.title, "artist:", player.currentTrack.artist)
    }

    // if we're transitioning then keep quiet as we don't want to interrupt whatever sequence was on?
    if (player.playbackState === "TRANSITIONING") {
      return
    }

    function trackStateFromPlayer(player) {

      // check if the state is playing or not
      if (player.playbackState === 'PLAYING') {

        // a track state object
        function TrackState(player) {

          this.title = player.currentTrack.title,
          this.artist = player.currentTrack.artist,
          this.album = player.currentTrack.album,
          this.elapsedTime = player.elapsedTime * 1000
          this.relativeTime = (new Date).getTime()
          this.elapsedTimeNow = function() {
            let timeNow = (new Date).getTime()
            let timePassed = timeNow - this.relativeTime
            return this.elapsedTime + timePassed
          }
        }

        // create a new state
        return new TrackState(player)

      } else {

        // there is no state if we're not playing
        return undefined
      }
    }

    function compare(s1, s2) {

      // if they are differnet types (i.e null and not null)
      if (typeof s1 !== typeof s2) { return false }

      // check the static properties
      if (s1.title !== s2.title) { return false }
      if (s1.artist !== s2.artist) { return false }
      if (s1.album !== s2.album) { return false }
      if (s1.elapsedTime !== s2.elapsedTime) { return false }
      if (s1.relativeTime !== s2.relativeTime) { return false }

      // good enough for us
      return true
    }

    // get the new state
    let oldState = _this.trackState
    let newState = trackStateFromPlayer(player)

    // if there is a difference between the states
    if (!compare(oldState, newState)) {

      // emit the change and update
      _this.trackState = newState
      _this.emit('track-state', _this)
    }
  }
}

exports.PlayerController = PlayerController
