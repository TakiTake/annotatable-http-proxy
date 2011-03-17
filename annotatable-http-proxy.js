#!/usr/bin/env node

var http = require('http');
var url  = require('url');
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
		var enc = /text/.test(clientResponse.headers['contents-type']) ? 'utf8' : 'binary';

		// access log
		// console.log('[' + new Date() + '] ' + '"' + req.method + ' ' + req.url + '" '
		// 		+ statusCode + ' "' + req.headers['user-agent'] + '"');

		clientResponse.setEncoding(enc);
		if (statusCode < 200 || 300 <= statusCode) {
			if (!callbackSent) {
				res.writeHead(statusCode, clientResponse.headers);

				if (clientResponse.method === 'HEAD' || statusCode === 304) {
					res.end('');
				}
				else {
					res.end(statusCode, enc);
				}

				callbackSent = true;
			}
			client.end();

			return;
		}

		clientResponse.on('data', onData);
		clientResponse.on('end', onEnd);

		function onData(chunk) {
			contents.push(chunk);
		}

		function onEnd() {
			if (!callbackSent) {
				res.writeHead(statusCode, clientResponse.headers);

				if (clientResponse.method === 'HEAD') {
					res.end('');
				}
				else {
					res.end(contents.join(''), enc);
				}

				callbackSent = true;
			}
		}
	}

	function onError(e) {
		if (!callbackSent) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end(e.message, 'utf8');
			callbackSent = true;
		}
	}

	function onClose() {
		if (!callbackSent) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Connection closed unexpectedly', 'utf8');
			callbackSent = true;
		}
	}

	clientRequest.end();
}
