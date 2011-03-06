#!/usr/bin/env node
var http = require('http');
var server = http.createServer();
var handleReq = function(req, res) {
	res.writeHeader(200, {'Content-Type': 'text/plain'});
	res.write('Hello World!\n');
	res.end();
}
server.on('request', handleReq);
server.listen(8000);
