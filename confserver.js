/* Configuration server for M4 IoT
 *
 * This server provides different endpoints for the configuration and
 * monitoring of the IoT devices in an IoT installation.
 *
 *  - Provide a status and health overview for all devices
 *  - Serve device configuration to the devices
 *  - Proxy MicroPython WebREPL access to the different devices
 *
 */

var fs = require('fs');
var url = require('url');
var http = require('http');
var mqtt = require('mqtt');
var path = require('path');
var moment = require('moment');


var port = process.env.NODE_PORT || 1111;
var confdir = path.join(__dirname, 'device_config');
var device_map_fname = path.join(confdir, "device_map.json");

/*
 * All devices are identified via their hwaddr. update_device_map()
 * reads a map from hwaddr to device name from a file and populates
 * the dictionary `devices` accordingly. As the file may change during
 * operation, it is monitored and re-read if necessary.
 */

function update_device_map() {
    devices = JSON.parse(fs.readFileSync(device_map_fname));

    device_status = {};
    Object.keys(devices).forEach(function(key) {
	status = {"ip": "unknown", "lastseen": moment("1932", "YYYY")}
        device_status[devices[key]] = status;
    });
}

fs.watchFile(device_map_fname, function(curr, prev){
    update_device_map();
});

update_device_map();


/*
 * Devices send out a regular heartbeat packet via MQTT. The current
 * status of each device is taken from these packets and the data is
 * stored in the dictionary `device_status`.
 */

var mqtt_client = mqtt.connect('mqtt://localhost');

mqtt_client.on('connect', function () {
    mqtt_client.subscribe('heartbeat', function (err) {
        if (!err) console.log("Connected to MQTT broker");
        else console.log("Error connecting to MQTT broker");
  })
});

mqtt_client.on('message', function (topic, message) {
    var status = JSON.parse(message.toString());
    status["lastseen"] = new moment();
    device_status[status['hostname']] = status;
    //console.log('Updating status of device "' + status['hostname'] + "'");
});


/*
 */

web_server = http.createServer(function(request, response) {

    console.log(request.method + " " + request.url);

    if (request.url == "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
    }

    var request_url = url.parse(request.url, true);
    switch(request_url.pathname) {
    case "/put_config":
        break
    case "/devices":
        response.writeHead(200, {'Content-Type': 'text/json'});
        response.write(JSON.stringify(devices, null, 4));
        response.end();
        break
    default:
        if ("hwaddr" in request_url.query) {
            var hwaddr = request_url.query["hwaddr"];
            var fname = path.join(confdir, devices[hwaddr] + '.json');
    
            if (!fs.existsSync(fname)) {
                response.writeHead(404);
                response.end('No device config found for hwaddr=' + hwaddr);
            }
            else
            {
                response.writeHead(200, {'Content-Type': 'text/json'});
                fs.readFile(fname, function(err, content){
                    console.log("Loading device config '"+fname+"'");
                    response.write(content);
                    response.end();
                });
            }
	}
	else {
            response.writeHead(200, {'Content-Type': 'text/html'})
	    response.write('<ul>');
	    
            for (var hwaddr in devices) {
		var device_name = devices[hwaddr]
                var device = device_status[device_name]

                var status_txt = ' is offline';
		var status_cls = 'offline';
                if (device["ip"] != "unknown") {
		    var ago = moment.duration(device["lastseen"].diff(new moment())).humanize();
                    status_txt = ' was seen ' + ago + ' ago';
		    status_cls = 'online';
                }

		var link_attrs = 'href="get?hwaddr=' + hwaddr + '" class="' + status_cls + '"';
		var li = '<li><a ' + link_attrs + '>' + device_name + '</a>' + status_txt;
		if (device["ip"] != "unknown")
		    li += '<br/><pre>ssh -L 8266:' + device['ip'] + ':8266 sysadmin@homehub</pre>'

		response.write(li + '</li>');
            }
            response.write("</ul>");
            response.end();
	}
    }
});

console.log("Listening on port " + port);
web_server.listen(port);
