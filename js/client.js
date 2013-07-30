function Game() {

  _.extend(this, {

    smoothCamera: {
      target: { x: 0, y: 0 },
      delta: { x: 0, y: 0 },
      step: 0.1,
      precision: 0.001,
    },

    block: {
      size: { x: 1, y: 1, z: .25 },
      margin: { x: .75, y: .75 },
    },

    music: new Howl({
      urls: [
        'snd/music.ogg',
        'snd/music.mp3',
        'snd/music.wav',
      ],
      autoplay: true,
      loop: true,
      volume: 0.3,
    }),

    sound: new Howl({
      urls: [
        'snd/effects.ogg',
        'snd/effects.mp3',
        'snd/effects.wav',
      ],
      sprite: {
        blockCaptured: [0, 3000],
        blockSecured: [4000, 3000],
      },
    }),

    updatesPerSecond: 60,

    run: function(name) {

      var WebGL = (function () {
        try {
          return
            !!window.WebGLRenderingContext
            && !!document.createElement('canvas').getContext('experimental-webgl');
        } catch(e) {
          return false;
        }
      })();

      _.extend(this, {

        playerName: name,
        players: [],

        board: [],

        renderer: WebGL ? new THREE.WebGLRenderer() : new THREE.CanvasRenderer(),
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(
          75,
          window.innerWidth / window.innerHeight,
          1,
          10000
        ),

        geometry: new THREE.CubeGeometry(1, 1, .2),

        colorgen: new Color.Gen(),

        ws: new WebSocket('ws://' + document.location.host),

      });

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);
      this.camera.position.z = 10;
      this.camera.rotation.x = Math.PI / 6;
      this.setCamera(0, 0);

      this.registerWindowResize();
      this.registerRender();
      this.registerClick();
      this.registerMessage();

    },

    registerUpdate: function(f) {

      _.delay(_.bind(f, this), 1000 / this.updatesPerSecond);

    },

    sendRPC: function(procedure, data) {
      var rpc = { procedure: procedure };
      _.extend(rpc, data);
      this.ws.send(JSON.stringify({
        procedure: procedure,
        data: data,
      }));
    },

    getGridToScreenScale: function() {

      return {
        x: this.block.size.x + this.block.margin.x,
        y: this.block.size.y + this.block.margin.y,
      };

    },

    setCamera: function(x, y) {

      this.smoothCamera.target = { x: x, y: y };
      this.smoothCamera.delta = { x: 0, y: 0 };

      var scale = this.getGridToScreenScale();
      this.camera.position.x = this.smoothCamera.target.x * scale.x;
      this.camera.position.y =
        this.smoothCamera.target.y * scale.y
        - Math.cos(Math.PI / 2 - this.camera.rotation.x) * this.camera.position.z;

    },

    moveCamera: function(dx, dy) {

      this.smoothCamera.target.x += dx;
      this.smoothCamera.target.y += dy;

      this.smoothCamera.delta.x += dx;
      this.smoothCamera.delta.y += dy;

      this.registerCameraDeltaUpdate();

    },

    moveCameraTo: function(x, y) {

      this.moveCamera(x - this.smoothCamera.target.x, y - this.smoothCamera.target.y);

    },

    newBlockMesh: function(block) {

      var scale = this.getGridToScreenScale();
      var mesh = new THREE.Mesh(this.geometry, this.newBlockMaterial(block));
      mesh.position.x = scale.x * block.position.x;
      mesh.position.y = scale.y * block.position.y;
      return mesh;

    },

    newBlockMaterial: function(block) {

      var options = {
        color: 0xffffff,
        wireframe: true,
      };

      if (block.team !== undefined) {

        var rgb = this.colorgen.getColor(block.team);
        rgb = [
          rgb[0] * 255 & 0xff,
          rgb[1] * 255 & 0xff,
          rgb[2] * 255 & 0xff,
        ];
        options.color = rgb[0] << 16 | rgb[1] << 8 | rgb[2];

        options.wireframe = block.type === 'captured';

      } else if (block.type === 'end') {

        options.wireframe = false;

      }

      return new THREE.MeshBasicMaterial(options);

    },

    onRender: function() {

      this.renderer.render(this.scene, this.camera);

    },

    registerRender: function() {

      requestAnimationFrame(
        _.bind(
          function() {
            this.onRender();
            this.registerRender();
          },
          this
        )
      );

    },

    onWindowResize: function() {

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();

    },

    registerWindowResize: function() {

      window.addEventListener('resize', _.bind(this.onWindowResize, this));

    },

    onCameraDeltaUpdate: function() {

      var gridStep = {
        x: this.smoothCamera.step * this.smoothCamera.delta.x,
        y: this.smoothCamera.step * this.smoothCamera.delta.y,
      };

      this.smoothCamera.delta.x -= gridStep.x;
      this.smoothCamera.delta.y -= gridStep.y;

      var scale = this.getGridToScreenScale();

      var realStep = {
        x: gridStep.x * scale.x,
        y: gridStep.y * scale.y,
      };

      this.camera.position.x += realStep.x;
      this.camera.position.y += realStep.y;

      if (
        Math.abs(this.smoothCamera.delta.x) > this.smoothCamera.precision
        || Math.abs(this.smoothCamera.delta.y) > this.smoothCamera.precision
      ) {
        this.registerCameraDeltaUpdate();
      } else {
        this.setCamera(this.smoothCamera.target.x, this.smoothCamera.target.y);
      }

    },

    registerCameraDeltaUpdate: function() {

      this.registerUpdate(this.onCameraDeltaUpdate);

    },

    onClick: function(x, y) {

      var rx = x / window.innerWidth * 2 - 1;
      var ry = y / window.innerHeight * -2 + 1;

      if (rx * rx + ry * ry > 0.01) {

        var angle = Math.atan2(ry, rx);
        var part = Math.round(angle / (Math.PI / 4));

        var dx = 0;
        var dy = 0;

        if (_.indexOf([-1, 0, 1], part) !== -1) {
          dx = 1;
        } else if (_.indexOf([-4, -3, 3, 4], part) !== -1) {
          dx = -1;
        }

        if (_.indexOf([1, 2, 3], part) !== -1) {
          dy = 1;
        } else if (_.indexOf([-1, -2, -3], part) !== -1) {
          dy = -1;
        }

        this.sendRPC('move', { x: dx, y: dy });

      }

    },

    registerClick: function() {

      this.renderer.domElement.addEventListener(
        'click',
        _.bind(
          function(e) {
            this.onClick(e.clientX, e.clientY);
            return false;
          },
          this
        )
      );

    },

    onMessage: function(message) {

      var rpc = JSON.parse(message.data);
      var call = rpc.procedure;
      var data = rpc.data;

      if (call === 'id') {
        this.onIdMessage(data);
      } else if (call === 'name') {
        this.onNameMessage(data);
      } else if (call === 'move') {
        this.onMoveMessage(data);
      } else if (call === 'block') {
        this.onBlockMessage(data);
      } else {
        console.error('Unknown RPC', rpc);
      }

    },

    registerMessage: function() {

      this.ws.onmessage = _.bind(this.onMessage, this);
      this.ws.onclose = this.ws.onerror = function() {
        console.error('Cannot connect to the game server!');
        _.delay(function() { document.location.reload(); }, 1000);
      }

    },

    onIdMessage: function(id) {

      this.playerId = id;
      this.sendRPC('name', this.playerName);

    },

    onNameMessage: function(player) {

      this.players[player.id] = _.escape(player.name);

    },

    onMoveMessage: function(delta) {

      this.moveCamera(delta.x, delta.y);

      var block = _.find(this.board, _.bind(function(block) {
        return _.isEqual(block.position, this.smoothCamera.target);
      }, this));

      if (block !== undefined) {
        var t = 0;
        var effect = _.bind(function() {
          if (t < 1) {
            t += 1 / this.updatesPerSecond;
            block.mesh.scale.x = block.mesh.scale.y = 1 + Math.sin(t * Math.PI) / 5;
            this.registerUpdate(effect);
          } else {
            block.mesh.scale.x = block.mesh.scale.y = 1;
          }
        }, this);
        effect();
      }

    },

    onBlockMessage: function(block) {

      var oldBlock = _.find(
        this.board,
        function(block2) {
          return _.isEqual(block2.position, block.position);
        }
      );

      var mesh = this.newBlockMesh(block);
      this.scene.add(mesh);
      this.board.push(_.extend(block, { mesh: mesh }));

      if (oldBlock) {

        this.scene.remove(oldBlock.mesh);
        this.board = _.without(this.board, oldBlock);

        if (oldBlock.type === 'empty' && block.type === 'captured') {
          game.onBlockCaptured(oldBlock, block);
        } else if (oldBlock.type === 'captured' && block.type === 'secured') {
          game.onBlockSecured(oldBlock, block);
        }

      }

    },

    onBlockCaptured: function(oldBlock, block) {
      this.sound.play('blockCaptured');
    },

    onBlockSecured: function(oldBlock, block) {
      this.sound.play('blockSecured');
    }

  });

};
