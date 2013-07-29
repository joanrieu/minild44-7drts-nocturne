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
        tries: 0,
        position: {
          x: 0,
          y: 0
        },
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
        position: {}
      };
      this.players.push(player);
      this.sendRPC(player, 'id', player.id);

      while (_.size(this.board) < 10 * _.size(this.players)) {
        this.growBoard();
      }

      var spawn = undefined;
      do {
        spawn = this.board[Math.floor(Math.random() * this.board.length)];
      } while (spawn.type === 'end' || this.findPlayer(spawn.position) !== undefined);
      spawn.type = 'secured';
      spawn.team = player.id;
      _.extend(player.position, spawn.position);
      this.sendRPC(player, 'move', player.position);

      _.each(this.board, _.bind(function(block) {
        this.broadcastRPC('block', block);
      }, this));

      ws.on('message', _.bind(this.onMessage, this, player));
      ws.on('close', _.bind(this.onDisconnection, this, player));

    },

    onDisconnection: function(player) {

      ++player.moveId;

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
        console.error('Unknown RPC', rpc);
      }

    },

    onMoveMessage: function(player, move) {

      if (
        _.indexOf([-1, 0, 1], move.x) === -1
        || _.indexOf([-1, 0, 1], move.y) === -1
      ) {

        console.error('Cheater detected', player.ws.upgradeReq.connection.remoteAddress);

      } else {

        var position = {
          x: player.position.x + move.x,
          y: player.position.y + move.y,
        };

        if (this.findBlock(position) !== undefined) {

          var oldPlayer = this.findPlayer(position);
          if (oldPlayer !== undefined) {
            oldPlayer.position = player.position;
            this.sendRPC(oldPlayer, 'move', { x: -move.x, y: -move.y });
            this.startCapture(oldPlayer);
          }

          player.position = position;
          this.sendRPC(player, 'move', move);
          this.startCapture(player);

        }

      }

    },

    findBlock: function(position) {

      return _.find(
        this.board,
        function(block) {
          return _.isEqual(block.position, position);
        }
      );

    },

    findPlayer: function(position) {

      return _.find(
        this.players,
        function(player) {
          return _.isEqual(player.position, position);
        }
      );

    },

    startCapture: function(player) {

      var block = this.findBlock(player.position);

      if (block === undefined) {
        return;
      }

      var moveId = ++player.moveId;

      function register(self, type, delay, callback) {
        if (block.type === type) {
          _.delay(
            function() {
              if (block.type === type && player.moveId === moveId) {
                _.bind(callback, self)();
                self.broadcastRPC('block', block);
                self.startCapture(player);
              }
            },
            delay
          );
        }
      }

      register(this, 'empty', 3000, function() {
        block.type = 'captured';
        block.team = player.id;
      });

      register(this, 'captured', 7000, function() {
        block.type = 'secured';
        block.team = player.id;
      });

      register(this, 'end', 15000, function() {
        if (Math.random() < block.tries++ / 3) {
          var score = [];
          _.each(this.board, function(block) {
            if (score[block.team] === undefined) {
              score[block.team] = 0;
            }
            if (block.type === 'captured') {
              score[block.team] += 20;
            } else if (block.type === 'secured') {
              score[block.team] += 15;
            }
          });
          this.broadcastRPC('end', score);
        } else {
          var total = _.size(this.board);
          var destroyable = total / 3;
          while (destroyable --> 0) {
            var index = Math.floor(Math.random() * total);
            if (this.board[index].type !== 'end') {
              this.board[index] = {
                type: 'empty',
                position: this.board[index].position,
              };
              this.broadcastRPC('block', this.board[index]);
            }
          }
        }
      });

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

  function serve404() {
    response.writeHead(404, { 'Content-type': 'text/plain' });
    response.end('404 Not Found\n');
  }

  var path = url.parse(request.url).pathname.substr(1);

  if (path === '') {
    path = 'index.html';
  } else if (path.indexOf('..') !== -1) {
    serve404();
  }

  var ext = path.split('.');
  ext = ext[ext.length - 1];

  var mime = ({
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ogg: 'audio/ogg',
    mp3: 'audio/mpeg',
    wav: 'audio/x-wav',
  })[ext];

  fs.readFile(path, function(err, buf) {
    if (err) {
      serve404();
    } else {
      response.writeHead(200, {
        'Content-type': mime || 'application/octet-stream',
        'Content-length': buf.length,
      });
      response.end(buf);
    }
  });

});

var gameServer = new WebSocketServer({ server: webServer });
var game = new Game();
gameServer.on('connection', _.bind(game.onConnection, game));

webServer.listen(8080);

_.extend(require('repl').start({}).context, { game: game, underscore: _ });
