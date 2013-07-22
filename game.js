var Game = {

  cameraHeight: 5,
  cameraMove: { x: 0, y: 0 },
  cameraPosition: { x: 0, y: 0 },
  cameraMoveStep: 0.1,
  levelSize: { x: 10, y: 5 },
  levelBlockSize: { x: 1, y: 1, z: .25 },
  levelBlockSpacing: { x: .75, y: .75 },
  updatesPerSecond: 60,

  button: function() {

    // TODO

  },

  click: function(x, y) {

    var rx = x / window.innerWidth * 2 - 1;
    var ry = y / window.innerHeight * -2 + 1;

    if (rx * rx + ry * ry < 0.16) {

      this.button();

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

      this.direction(dx, dy);

    }

  },

  direction: function(dx, dy) {

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

    }

  },

  render: function() {

    var mesh = this.meshes[this.cameraPosition.y * this.levelSize.x + this.cameraPosition.x];
    var material = mesh.material;
    mesh.material = this.materials.current;
    this.renderer.render(this.scene, this.camera);
    mesh.material = material;

  },

  resize: function() {

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

  },

  run: function() {

    this.setUpScene();
    this.setUpLevel();
    this.setUpCamera();
    this.setUpListeners();

  },

  setUpCamera: function() {

    this.cameraPosition.x = Math.random() * this.levelSize.x | 0;
    this.cameraPosition.y = Math.random() * this.levelSize.y | 0;

    this.camera.position.x = this.cameraPosition.x * (this.levelBlockSize.x + this.levelBlockSpacing.x);
    this.camera.position.y = this.cameraPosition.y * (this.levelBlockSize.x + this.levelBlockSpacing.x);

  },

  setUpLevel: function() {

    this.meshes = new Array();

    for (var y = 0; y < this.levelSize.y; ++y) {
      for (var x = 0; x < this.levelSize.x; ++x) {
        var mesh = new THREE.Mesh(
          new THREE.CubeGeometry(
            this.levelBlockSize.x,
            this.levelBlockSize.y,
            this.levelBlockSize.z
          ), this.materials.empty);
        mesh.position.x = x * (this.levelBlockSize.x + this.levelBlockSpacing.x);
        mesh.position.y = y * (this.levelBlockSize.y + this.levelBlockSpacing.y);
        this.meshes.push(mesh);
        this.scene.add(mesh);
      }
    }

  },

  setUpListeners: function() {

    var self = this;

    this.updateCb = function() { self.update(); };
    window.setInterval(this.updateCb, 1000 / this.updatesPerSecond);

    this.renderCb = function() { requestAnimationFrame(self.renderCb); self.render(); };
    this.renderCb();

    window.addEventListener('resize', function() { self.resize(); });

    document.addEventListener('click', function(e) { self.click(e.clientX, e.clientY); return false; });

  },

  setUpScene: function() {

    this.scene = new THREE.Scene();

    var WebGL = ( function () { try { return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' ); } catch( e ) { return false; } } )();
    this.renderer = WebGL ? new THREE.WebGLRenderer(): new THREE.CanvasRenderer();
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

  },

  update: function() {

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

  },

};

Game.run();
