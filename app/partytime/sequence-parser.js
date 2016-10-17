exports.parse = function(line) {

  // parse the parameters out of the line
  var params = { }
  var parameterRegex = /([A-Za-z])+(\:)+("[^"\\]*(?:\\.[^"\\]*)*"|([^\ \s]+))/g
  while ((match = parameterRegex.exec(line)) != null) {

    // parse the parameter
    var raw = match[0].split(":")
    var key = raw[0]
    var value = raw[1]

    // parse the value
    if (value.startsWith("\"") && value.endsWith("\"")) {
      value = value.substring(1, value.length-1)
    }

    // strip escapes on the value
    value = value.split('\\"').join('"')
    params[key] = value
  }

  var commands = line.replace(parameterRegex, "").split(" ").filter(function(cmd) {
    return cmd.length > 0
  })

  return {
    raw: line,
    commands: commands,
    params: params
  }
}
