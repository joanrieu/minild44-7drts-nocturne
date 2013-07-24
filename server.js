var http = require('http'),
  url = require('url'),
  path = require('path'),
  fs = require('fs'),
  WebSocketServer = require('ws').Server,
  _ = require('underscore');

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

var game = {
  size: {
    x: 5,
    y: 3,
  },
  players: [],
};

gameServer.on('connection', function(ws) {

  function sendRPC(procedure, data) {
    var rpc = { procedure: procedure };
    _.extend(rpc, data);
    ws.send(JSON.stringify(rpc));
  }

  function getPlayer() {
    return _.findWhere(game.players, { ws: ws });
  }

  // Register the new player

  game.players.push({
    id: _.size(game.players), // TODO globally unique id ?
    ws: ws,
    position: { // TODO safe spawn point
      x: Math.floor(Math.random() * game.size.x),
      y: Math.floor(Math.random() * game.size.y),
    }
  });

  sendRPC('position', getPlayer().position);

  // Create a new game board if needed

  if (_.size(game.players) === 1) {

    game.board = [];

    for (var y = 0; y < game.size.y; ++y) {
      for (var x = 0; x < game.size.x; ++x) {

        var block = {
          position: {
            x: x,
            y: y,
          },
        };

        game.board.push(block);

      }
    }

  }

  _.each(game.board, function(block) {
    sendRPC('block', block);
  });

  // Events

  ws.on('message', function(rpc) {

    var rpc = JSON.parse(rpc);
    var call = rpc.procedure;

    if (call == 'capture') {
      console.log('TODO: capture around player', getPlayer().id, 'who is at', getPlayer().position);
    } else {
      console.error('unknown RPC', rpc);
    }

  });

  ws.on('close', function() {

    game.players = _.reject(game.players, function(player) { return player.ws === ws; });

  });

});

webServer.listen(8080);
