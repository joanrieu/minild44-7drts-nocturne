var Engine = {

  cameraHeight: 5,
  cameraMove: { x: 0, y: 0 },
  cameraPosition: { x: 0, y: 0 },
  cameraMoveStep: 0.1,
  levelSize: { x: 0, y: 0 },
  levelBlockSize: { x: 1, y: 1, z: .25 },
  levelBlockSpacing: { x: .75, y: .75 },
  updatesPerSecond: 60,

  // Overridable event handlers

  onButtonClick: function() {},
  onDirectionClick: function(dx, dy) {},

  // Public interface

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

    this.renderer = WebGL ? new THREE.WebGLRenderer() : new THREE.CanvasRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    this.camera.position.z = this.cameraHeight;

    this.materials = {
      empty: new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }),
      good: new THREE.MeshBasicMaterial({ color: 0x55ff33, wireframe: true }),
      bad: new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
      current: new THREE.MeshBasicMaterial({ color: 0x33ccff, wireframe: true }),
    };

    this.scene = new THREE.Scene();
    this.meshes = new Array();

    this.registerClick();
    this.registerRender();
    this.registerWindowResize();

  },

  registerUpdate: function(f) { _.delay(_.bind(f, this), 1000 / this.updatesPerSecond); },

  setCamera: function(x, y) {

    this.cameraPosition = { x: x, y: y };
    this.cameraMove = { x: 0, y: 0 };

  },

  moveCamera: function(dx, dy) {

    if (
      this.cameraPosition.x + dx >= 0
      && this.cameraPosition.x + dx < this.levelSize.x
      && this.cameraPosition.y + dy >= 0
      && this.cameraPosition.y + dy < this.levelSize.y
    ) {

      this.cameraPosition.x += dx;
      this.cameraPosition.y += dy;

      this.cameraMove.x += dx * (this.levelBlockSize.x + this.levelBlockSpacing.x);
      this.cameraMove.y += dy * (this.levelBlockSize.y + this.levelBlockSpacing.y);

      this.registerCameraMoveUpdate();

    }

  },

  moveCameraTo: function(x, y) { return this.moveCamera(x - this.cameraPosition.x, y - this.cameraPosition.y); },

  // Internal event handlers

  onRender: function() {

    var mesh = this.meshes[this.cameraPosition.y * this.levelSize.x + this.cameraPosition.x];
    var material = mesh.material;
    mesh.material = this.materials.current;
    this.renderer.render(this.scene, this.camera);
    mesh.material = material;

  },

  registerRender: function() { requestAnimationFrame(_.bind(this.onRender, this)); },

  onWindowResize: function() {

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

  },

  registerWindowResize: function() { window.addEventListener('resize', _.bind(this.onWindowResize, this)); },

  onCameraMoveUpdate: function() {

    if (this.cameraMove.x > this.cameraMoveStep) {
      this.camera.position.x += this.cameraMoveStep;
      this.cameraMove.x -= this.cameraMoveStep;
    } else if (this.cameraMove.x < -this.cameraMoveStep) {
      this.camera.position.x -= this.cameraMoveStep;
      this.cameraMove.x += this.cameraMoveStep;
    } else {
      this.camera.position.x += this.cameraMove.x;
      this.cameraMove.x = 0;
    }

    if (this.cameraMove.y > this.cameraMoveStep) {
      this.camera.position.y += this.cameraMoveStep;
      this.cameraMove.y -= this.cameraMoveStep;
    } else if (this.cameraMove.y < -this.cameraMoveStep) {
      this.camera.position.y -= this.cameraMoveStep;
      this.cameraMove.y += this.cameraMoveStep;
    } else {
      this.camera.position.y += this.cameraMove.y;
      this.cameraMove.y = 0;
    }

    if (this.cameraMove.x !== 0 || this.cameraMove.y !== 0) {
      this.registerCameraMoveUpdate();
    }

  },

  registerCameraMoveUpdate: function() { registerUpdate(this, this.onCameraMoveUpdate); },

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

};

Engine.run();
