#!/usr/bin/env node
var http = require('http');

var server = http
               .createServer(requestListener)
               .listen(8000);

function requestListener(req, res) {
	res.writeHeader(200, {'Content-Type': 'text/plain'});
	res.write('Hello World!\n');
	res.end();
}
