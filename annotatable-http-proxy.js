#!/usr/bin/env node

var http = require('http');
var url = require('url');
var server = http.createServer();

server.on('request', requestListener);
server.listen(8000);

function requestListener(req, res) {
	var requestUrl = url.parse(req.url);
	var client = http.createClient(requestUrl.port || 80, requestUrl.host);
	var clientRequest = client.request(req.url, req.headers);
	var callbackSent = false;
	var contents = [];

	if (requestUrl.protocol === 'https') {
		client.https = true;
	}

	clientRequest.on('response', onResponse);
	clientRequest.on('error', onError);
	clientRequest.on('close', onClose);

	function onResponse(clientResponse) {
		var statusCode = clientResponse.statusCode;
		if (statusCode < 200 || 300 <= statusCode) {
			if (!callbackSent) {
				res.writeHead(statusCode, {'Content-Type': 'text/plain'});
				res.end(statusCode);
				callbackSent = true;
			}
			client.end();

			return;
		}

		clientResponse.setEncoding('utf8');
		clientResponse.on('data', onData);
		clientResponse.on('end', onEnd);

		function onData(chunk) {
			contents.push(chunk);
		}

		function onEnd() {
			console.log('[response]', contents.join(''));
			if (!callbackSent) {
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end(contents.join(''));
				callbackSent = true;
			}
		}
	}

	function onError(e) {
		if (!callbackSent) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end(e.message);
			callbackSent = true;
		}
	}

	function onClose() {
		if (!callbackSent) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Connection closed unexpectedly');
			callbackSent = true;
		}
	}

	clientRequest.end();
}
