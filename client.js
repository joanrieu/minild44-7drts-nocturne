function Game() {

  _.extend(this, {

    smoothCamera: {
      target: { x: 0, y: 0 },
      delta: { x: 0, y: 0 },
      step: 0.1,
      precision: 0.001,
    },

    updatesPerSecond: 60,

    run: function() {

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

        block: {
          size: { x: 1, y: 1, z: .25 },
          margin: { x: .75, y: .75 },
        },

        blocks: [],

        renderer: WebGL ? new THREE.WebGLRenderer() : new THREE.CanvasRenderer(),
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000),

        geometry: new THREE.CubeGeometry(1, 1, .2),
        materials: {
          empty: new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }),
          good: new THREE.MeshBasicMaterial({ color: 0x55ff33, wireframe: true }),
          bad: new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
          current: new THREE.MeshBasicMaterial({ color: 0x33ccff, wireframe: true }),
        },

        ws: new WebSocket('ws://' + document.location.host),

      });

      this.renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(this.renderer.domElement);
      this.camera.position.z = 10;

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
      this.ws.send(JSON.stringify(rpc));
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
      this.camera.position.y = this.smoothCamera.target.y * scale.y;

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

      if (rx * rx + ry * ry < 0.16) {

        this.onButtonClick();

      } else {

        var a = Math.atan2(ry, rx);

        var dx = 0;
        var dy = 0;

        if (Math.abs(a) < Math.PI / 4) {
          dx = 1;
        } else if (Math.abs(a) > 3 * Math.PI / 4) {
          dx = -1;
        }

        if (Math.abs(a - Math.PI / 2) < Math.PI / 4) {
          dy = 1;
        } else if (Math.abs(a + Math.PI / 2) < Math.PI / 4) {
          dy = -1;
        }

        this.onDirectionClick(dx, dy);

      }

    },

    registerClick: function() {

      document.addEventListener(
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

    onButtonClick: function() {

      this.sendRPC('capture');

    },

    onDirectionClick: function(dx, dy) {

      console.debug('direction button', dx, dy);

    },

    onMessage: function(message) {

      var rpc = JSON.parse(message.data);
      var call = rpc.procedure;
      var data = rpc.data;

      if (call === 'id') {
        this.onIdMessage(data);
      } else if (call === 'position') {
        this.onPositionMessage(data);
      } else if (call === 'block') {
        this.onBlockMessage(data);
      } else {
        console.error('unknown RPC', rpc);
      }

    },

    registerMessage: function() {

      this.ws.onmessage = _.bind(this.onMessage, this);
      this.ws.onclose = this.ws.onerror = function() {
        alert('Cannot connect to the game server!');
      }

    },

    onIdMessage: function(id) {

      this.playerId = id;

    },

    onPositionMessage: function(position) {

      this.setCamera(position.x, position.y);

    },

    onBlockMessage: function(block) {


      var team = block.team === undefined ? 'empty' : block.team === this.playerId ? 'good' : 'bad';

      var mesh = new THREE.Mesh(this.geometry, this.materials[team]);
      var scale = this.getGridToScreenScale();
      mesh.position.x = scale.x * block.position.x;
      mesh.position.y = scale.y * block.position.y;
      this.scene.add(mesh);

      var oldBlock = _.find(this.blocks, function(block2) { return _.isEqual(block2.position, block.position); });

      if (oldBlock) {
        this.scene.remove(oldBlock.mesh);
        this.blocks = _.without(this.blocks, oldBlock);
      }

      this.blocks.push(_.extend(block, { mesh: mesh }));

    },

  });

};

var game = new Game();
game.run();
