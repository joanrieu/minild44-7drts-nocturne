var http = require('http'),
  url = require('url'),
  path = require('path'),
  fs = require('fs'),
  WebSocketServer = require('ws').Server;

var webServer = http.createServer(function(request, response) {

  var path = url.parse(request.url).pathname.substr(1);

  function serveFile(mime) {
    fs.readFile(path, function(err, buf) {
      if (err) {
        serve404();
      } else {
        response.writeHead(200, { 'Content-type': mime });
        response.end(buf);
      }
    });
  }

  function serve404() {
    response.writeHead(404, { "Content-type": "text/plain" });
    response.end("404 Not Found\n");
  }

  if (path === '') {
    path = 'index.html';
    serveFile('text/html');
  } else if (path === 'reset.css') {
    serveFile('text/css');
  } else if (path === 'underscore-min.js' || path === 'three.min.js' || path === 'client.js') {
    serveFile('application/javascript');
  } else {
    serve404();
  }

});

var gameServer = new WebSocketServer({ server: webServer });

gameServer.on('connection', function(ws) {

  ws.on('message', function(message) {

    ws.send('message received: ' + message);

  });

  // First message

  ws.send('welcome');

});

webServer.listen(8080);
