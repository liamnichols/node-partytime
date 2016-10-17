#! /usr/bin/env node
const Sequence = require("../app/partytime/sequence")
const path = require("path")
const fs = require("fs")
const util = require("util")

// read the sequence data
var settings = require("../app/partytime/settings")
var sequencePath = path.join(__dirname, "../" ,"public", "sequences", "generic.sequence")
var sequenceData = fs.readFileSync(sequencePath, 'utf8')
console.log("Reading Sequenence:", util.inspect(sequencePath))

// parse the sequence
var sequence = new Sequence(sequenceData, settings)

// log it
console.log("Sequence:", JSON.stringify(sequence, null, 2))
