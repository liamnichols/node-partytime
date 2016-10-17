const path = require("path")
const fs = require("fs")

var settingsPath = path.join(__dirname, "../../", "public", "settings.json")
var settingsData = fs.readFileSync(settingsPath, 'utf8')
var settingsJSON = JSON.parse(settingsData)

// TOOD: validate the settings

module.exports = settingsJSON
