var _ = require('underscore'),
  http = require('http'),
  url = require('url'),
  path = require('path'),
  fs = require('fs'),
  WebSocketServer = require('ws').Server;

function Game() {

  _.extend(this, {

    board: [
      {
        type: 'end',
        position: {
          x: 0,
          y: 0
        }
      }
    ],

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

    onConnection: function(ws) {

      var player = {
        id: this.nextPlayerId++,
        ws: ws,
        moveId: 0,
      };
      this.players.push(player);
      this.sendRPC(player, 'id', player.id);

      while (_.size(this.board) < 10 * _.size(this.players)) {
        this.growBoard();
      }

      _.extend(player, {
        position: { // TODO random spawn position
          x: 0,
          y: 0,
        }
      });
      this.sendRPC(player, 'position', player.position);

      var spawn = this.findBlock(player.position);
      if (spawn !== undefined) {
        spawn.type = 'secured';
        spawn.team = player.id;
      }

      _.each(this.board, _.bind(function(block) {
        this.broadcastRPC('block', block);
      }, this));

      ws.on('message', _.bind(this.onMessage, this, player));
      ws.on('close', _.bind(this.onDisconnection, this, player));

    },

    onDisconnection: function(player) {

      this.players = _.without(this.players, player);

      if (_.size(this.players) === 0) {
        _.extend(this, new Game());
      }

    },

    onMessage: function(player, rpc) {

      var rpc = JSON.parse(rpc);
      var call = rpc.procedure;
      var data = rpc.data;

      if (call === 'move') {
        this.onMoveMessage(player, data);
      } else {
        console.error('unknown RPC', rpc);
      }

    },

    onMoveMessage: function(player, move) {

      if (
        _.indexOf([-1, 0, 1], move.x) === -1
        || _.indexOf([-1, 0, 1], move.y) === -1
      ) {

        console.error('Cheater detected:', player.ws.upgradeReq.connection.remoteAddress);

      } else {

        if (this.findBlock({
          x: player.position.x + move.x,
          y: player.position.y + move.y,
        }) !== undefined) {

          player.position.x += move.x;
          player.position.y += move.y;

          this.sendRPC(player, 'move', move);
          this.onPlayerMove(player);

        }

      }

    },

    onPlayerMove: function(player) {

      ++player.moveId;
      this.startCapture(player);

    },

    findBlock: function(position) {

      return _.find(
        this.board,
        function(block) {
          return block.position.x === position.x
            && block.position.y === position.y;
        }
      );

    },

    startCapture: function(player) {

      var block = this.findBlock(player.position);

      if (block === undefined) {
        return;
      }

      var moveId = player.moveId;

      if (block.type === 'empty') {

        _.delay(
          _.bind(
            function() {
              if (player.moveId === moveId) {
                block.type = 'captured';
                block.team = player.id;
                this.broadcastRPC('block', block);
                this.startCapture(player);
              }
            },
            this
          ),
          10000
        );

      } else if (block.type === 'captured') {

        _.delay(
          _.bind(
            function() {
              if (player.moveId === moveId) {
                block.type = 'secured';
                block.team = player.id;
                this.broadcastRPC('block', block);
                this.startCapture(player);
              }
            },
            this
          ),
          20000
        );

      } else if (block.type === 'end') {

        // TODO

      }

    },

    growBoard: function() {
      var max = (Math.sqrt(_.size(this.board)) + 1) / 2;
      for (var x = -max; x <= max; ++x) {
        this.board.push({
          type: 'empty',
          position: {
            x: x,
            y: max,
          }
        });
        this.board.push({
          type: 'empty',
          position: {
            x: x,
            y: -max,
          }
        });
      }
      for (var y = -max + 1; y < max; ++y) {
        this.board.push({
          type: 'empty',
          position: {
            x: max,
            y: y,
          }
        });
        this.board.push({
          type: 'empty',
          position: {
            x: -max,
            y: y,
          }
        });
      }
    },

  });

};

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
    response.writeHead(404, { 'Content-type': 'text/plain' });
    response.end('404 Not Found\n');
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
var game = new Game();
gameServer.on('connection', function(ws) { game.onConnection(ws); });

webServer.listen(8080);

require('repl').start({}).context.game = game;
