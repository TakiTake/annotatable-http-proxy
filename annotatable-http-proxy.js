#!/usr/bin/env node

var fs   = require('fs');
var http = require('http');
var url  = require('url');
var util = require('util');
var jsdom     = require('jsdom');
var domToHtml = require('jsdom/lib/jsdom/browser/domtohtml').domToHtml;

const CONF_FILE_PATH = './etc/conf.json';
var conf = null;
var server = http.createServer()

function log(opt) {}
log.debug = function() {
	console.log.apply(this, arguments);
}
log.info = function() {
	console.info.apply(this, arguments);
}
log.error = function() {
	console.error.apply(this, arguments);
}

function reload(filepath, sync) {
	if (sync) {
		conf = JSON.parse(fs.readFileSync(filepath, 'utf8'));
	} else {
		fs.readFile(filepath, 'utf8', function(err, data) {
			if (err) {
				throw err;
			}

			conf = JSON.parse(data);
		})
	}
}

// TODO: close request if blowser closed
function requestListener(req, res) {
	log.debug(req.url);
	var requestUrl = url.parse(req.url);
	var port = getPort(requestUrl.port, requestUrl.protocol);
	var client = http.createClient(port, requestUrl.host);
	var callbackSent = false;
	var contents = [];
	var clientRequest = client.request(req.url, req.headers);

	clientRequest.on('response', onResponse);
	clientRequest.on('error', onError);
	clientRequest.on('close', onClose);
	clientRequest.end();

	function onResponse(clientResponse) {
		var statusCode = clientResponse.statusCode;
		var contentType = clientResponse.headers['content-type'];
		var enc = /text/.test(contentType) ? 'utf8' : 'binary';

		// access log
		// log('[' + new Date() + '] ' + '"' + req.method + ' ' + req.url + '" '
		// 		+ statusCode + ' "' + req.headers['user-agent'] + '"');

		res.writeHead(statusCode, clientResponse.headers);
		clientResponse.setEncoding(enc);

		if (statusCode === 304 || clientResponse.method === 'HEAD') {
			res.end('');
			callbackSent = true;
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
				var html = contents.join(''); 

				// TODO:cache
				// TODO:tidy
				// TODO:iconv
				if (/text\/html/.test(contentType)) {
					jsdom.env(html, [
						//'http://code.jquery.com/jquery-1.5.min.js'
					], function(errors, window) {
						if (errors) {
							throw errors;
						} else {
							html = window.document.doctype || '';
							html += domToHtml(window.document, true);
						}
					});
				}
				res.end(html, enc);
				callbackSent = true;
			}
		}
	}

	function onError(e) {
		log.debug('error');
		if (!callbackSent) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end(e.message, 'utf8');
			callbackSent = true;
		}
	}

	function onClose() {
		log.debug('closed');
		if (!callbackSent) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Connection closed unexpectedly', 'utf8');
			callbackSent = true;
		}
	}
}

function getPort(port, protocol) {
	if (!port) {
		switch (protocol) {
			case 'https':
				port = 443;
				break;

			case 'http':
			default:
				port = 80;
		}
	}

	return port;
}

function init() {
	reload(CONF_FILE_PATH, true);
	
	fs.watchFile(CONF_FILE_PATH, function(curr, prev) {
		if (curr.mtime > prev.mtime) {
			reload(CONF_FILE_PATH);
		}
	});
	
	server.on('request', requestListener)
		    .listen(conf.port);
	
	log.info("Listening " + conf.port);
}

init();
