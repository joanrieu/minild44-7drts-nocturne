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

function Game() {

  _.extend(this, {

    size: {
      x: 5,
      y: 3,
    },

    players: [],
    nextPlayerId: 0,

    sendRPC: function(player, procedure, data) {
      var rpc = {
        procedure: procedure,
        data: data
      };
      player.ws.send(JSON.stringify(rpc));
    },

    broadcastRPC: function(procedure, data) {
      _.each(this.players, _.bind(function(player) {
        this.sendRPC(player, procedure, data);
      }, this));
    },

    onCapture: function(player) {

      var surroundings = _.filter(this.board, function(block) {
        return block.position.x >= player.position.x - 1
          && block.position.x <= player.position.x + 1
          && block.position.y >= player.position.y - 1
          && block.position.y <= player.position.y + 1;
      });

      _.each(surroundings, _.bind(function(block) {
        block.team = player.id;
        this.broadcastRPC('block', block);
      }, this));

    },

  });

};

var game = new Game();

gameServer.on('connection', function(ws) {

  var player = {
    id: game.nextPlayerId++,
    ws: ws,
    position: { // TODO safe spawn point
      x: Math.floor(Math.random() * game.size.x),
      y: Math.floor(Math.random() * game.size.y),
    }
  };

  game.players.push(player);

  game.sendRPC(player, 'id', player.id);
  game.sendRPC(player, 'position', player.position);

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
    game.sendRPC(player, 'block', block);
  });

  ws.on('message', function(rpc) {

    var rpc = JSON.parse(rpc);
    var call = rpc.procedure;

    if (call == 'capture') {
      game.onCapture(player);
    } else {
      console.error('unknown RPC', rpc);
    }

  });

  ws.on('close', function() {

    game.players = _.without(game.players, player);

  });

});

webServer.listen(8080);
