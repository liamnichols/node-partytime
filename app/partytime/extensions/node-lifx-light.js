'use strict'

const Light = require('node-lifx').Light
const constants = require('node-lifx').constants
const packet = require('node-lifx').packet

Light.prototype.pulse = function(hue, saturation, brightness, kelvin, period, cycles, persist, callback) {
  let color = {
    hue: hue,
    saturation: saturation,
    brightness: brightness,
    kelvin: kelvin
  }
  this.wave(4, color, period, cycles, persist, callback)
}

Light.prototype.breathe = function(hue, saturation, brightness, kelvin, period, cycles, persist, callback) {
  let color = {
    hue: hue,
    saturation: saturation,
    brightness: brightness,
    kelvin: kelvin
  }
  this.wave(1, color, period, cycles, persist, callback)
}

Light.prototype.wave = function(form, color, period, cycles, persist, callback) {
  let hue = sanitizeHue(color.hue)
  let saturation = sanitizeSaturation(color.saturation)
  let brightness = sanitizeBrightness(color.brightness)
  let kelvin = sanitizeKelvin(color.kelvin)
  period = sanitizePeriod(period)
  cycles = sanitizeCycles(cycles)
  persist = sanitizePersist(persist)
  callback = sanitizeCallback(callback)

  var packetObj = packet.create('setWaveform', {
    isTransient: !persist,
    color: { hue: hue, saturation: saturation, brightness: brightness, kelvin: kelvin },
    period: period,
    cycles: cycles,
    skewRatio: 0,
    waveform: form,
  }, this.client.source)
  packetObj.target = this.id
  this.client.send(packetObj, callback)
}


/*
 *  Input Sanitization
 */

function sanitizeHue(hue) {
  if (typeof hue !== 'number' || hue < constants.HSBK_MINIMUM_HUE || hue > constants.HSBK_MAXIMUM_HUE) {
    throw new RangeError('LIFX light color method expects hue to be a number between ' +
      constants.HSBK_MINIMUM_HUE + ' and ' + constants.HSBK_MAXIMUM_HUE
    );
  }
  return Math.floor(hue / constants.HSBK_MAXIMUM_HUE * 65535);
}

function sanitizeSaturation(saturation) {
  if (typeof saturation !== 'number' || saturation < constants.HSBK_MINIMUM_SATURATION || saturation > constants.HSBK_MAXIMUM_SATURATION) {
    throw new RangeError('LIFX light color method expects saturation to be a number between ' +
      constants.HSBK_MINIMUM_SATURATION + ' and ' + constants.HSBK_MAXIMUM_SATURATION
    );
  }
  return Math.floor(saturation / constants.HSBK_MAXIMUM_SATURATION * 65535);
}

function sanitizeBrightness(brightness) {
  if (typeof brightness !== 'number' || brightness < constants.HSBK_MINIMUM_BRIGHTNESS || brightness > constants.HSBK_MAXIMUM_BRIGHTNESS) {
    throw new RangeError('LIFX light color method expects brightness to be a number between ' +
      constants.HSBK_MINIMUM_BRIGHTNESS + ' and ' + constants.HSBK_MAXIMUM_BRIGHTNESS
    );
  }
  return Math.floor(brightness / constants.HSBK_MAXIMUM_BRIGHTNESS * 65535);
}

function sanitizeKelvin(kelvin) {
  if (typeof kelvin !== 'number' || kelvin < constants.HSBK_MINIMUM_KELVIN || kelvin > constants.HSBK_MAXIMUM_KELVIN) {
    throw new RangeError('LIFX light color method expects kelvin to be a number between ' +
      constants.HSBK_MINIMUM_KELVIN + ' and ' + constants.HSBK_MAXIMUM_KELVIN
    )
  }
  return kelvin
}

function sanitizePeriod(period) {
  if (typeof period !== 'number' || period <= 0 || isNaN(period)) {
    throw new TypeError('LIFX light method expects period to be a number greater than zero')
  }
  return period
}

function sanitizeCycles(cycles) {
  if (typeof cycles !== 'number' || cycles <= 0 || isNaN(cycles)) {
    throw new TypeError('LIFX light method expects cycles to be an integer greater than zero')
  }
  return cycles
}

function sanitizePersist(persist) {
  if (typeof persist !== 'boolean') {
    throw new TypeError('LIFX light method expects persist to be a boolean')
  }
  return persist
}

function sanitizeCallback(callback) {
  if (callback !== undefined && typeof callback !== 'function') {
    throw new TypeError('LIFX light color method expects callback to be a function');
  }
  return callback
}
