/* ============================================================
 *  player.js — 玩家控制、双视角、角色模型与生命值
 * ============================================================ */
(function () {
  'use strict';
  var G = window.G;

  function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  G.Player = function (game) {
    this.game = game;
    this.pos = new THREE.Vector3(0, 6, 16);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.04;
    this.health = 100;
    this.maxHealth = 100;
    this.eye = 1.66;
    this.radius = 0.42;
    this.mode = 'fps';
    this.onGround = true;
    this.dead = false;
    this.ads = false;
    this.walkPhase = 0;
    this.bobT = 0;
    this.lastHit = 10;
    this.speed = 7.4;
    this.sprintSpeed = 13.2;
    this.aimFov = 55;
    this.gunMount = null;
    this.model = null;
    this.tmp = new THREE.Vector3();
    this.buildModel();
  };

  G.Player.prototype.C = C;

  G.Player.prototype.buildModel = function () {
    var g = new THREE.Group();
    var suit = new THREE.MeshStandardMaterial({ color: C(0x24313b), metalness: 0.45, roughness: 0.55 });
    var armor = new THREE.MeshStandardMaterial({ color: C(0x36454f), metalness: 0.62, roughness: 0.4 });
    var dark = new THREE.MeshStandardMaterial({ color: C(0x12171c), metalness: 0.3, roughness: 0.7 });
    var glow = new THREE.MeshStandardMaterial({
      color: 0x061014, emissive: C(0x4fe6ff), emissiveIntensity: 2.2, metalness: 0.3, roughness: 0.3
    });

    function box(w, h, d, mat, x, y, z) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      return mesh;
    }

    // 躯干
    g.add(box(0.56, 0.6, 0.32, armor, 0, 1.32, 0));
    g.add(box(0.47, 0.24, 0.3, suit, 0, 0.98, 0));
    var chest = box(0.26, 0.07, 0.03, glow, 0, 1.38, -0.168);
    chest.castShadow = false;
    g.add(chest);
    g.add(box(0.36, 0.5, 0.18, dark, 0, 1.34, 0.24));

    // 头
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), armor);
    head.position.set(0, 1.78, 0);
    head.scale.set(1, 1.08, 1);
    head.castShadow = true;
    g.add(head);
    var visor = box(0.24, 0.06, 0.02, glow, 0, 1.79, -0.152);
    visor.castShadow = false;
    g.add(visor);
    var antenna = box(0.025, 0.2, 0.025, dark, 0.11, 1.9, 0.03);
    g.add(antenna);

    // 肩与手臂
    g.add(box(0.2, 0.2, 0.26, armor, 0.37, 1.46, 0));
    g.add(box(0.2, 0.2, 0.26, armor, -0.37, 1.46, 0));
    var armR = new THREE.Group();
    armR.position.set(0.37, 1.4, 0);
    armR.add(box(0.14, 0.5, 0.17, suit, 0, -0.24, 0));
    armR.rotation.x = -0.9;
    armR.rotation.z = -0.18;
    g.add(armR);
    var armL = new THREE.Group();
    armL.position.set(-0.37, 1.4, 0);
    armL.add(box(0.14, 0.5, 0.17, suit, 0, -0.24, 0));
    armL.rotation.x = -1.1;
    armL.rotation.z = 0.32;
    g.add(armL);

    // 腿
    function makeLeg(x) {
      var leg = new THREE.Group();
      leg.position.set(x, 0.94, 0);
      leg.add(box(0.18, 0.78, 0.21, suit, 0, -0.39, 0));
      leg.add(box(0.2, 0.1, 0.27, dark, 0, -0.8, -0.03));
      return leg;
    }
    var legL = makeLeg(0.16);
    var legR = makeLeg(-0.16);
    g.add(legL); g.add(legR);

    // 枪械挂点
    var mount = new THREE.Object3D();
    mount.position.set(0.06, 1.34, -0.34);
    mount.rotation.y = -0.03;
    g.add(mount);

    g.visible = false;
    this.game.scene.add(g);
    this.model = g;
    this.legL = legL;
    this.legR = legR;
    this.gunMount = mount;
    this.armR = armR;
    this.armL = armL;
  };

  G.Player.prototype.reset = function (world) {
    var sp = world.playerSpawn;
    this.pos.set(sp.x, sp.y + 0.05, sp.z);
    this.vel.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = -0.05;
    this.health = this.maxHealth;
    this.dead = false;
    this.ads = false;
    this.lastHit = 10;
    this.onGround = true;
    this.walkPhase = 0;
    this.model.rotation.z = 0;
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    this.model.visible = this.mode === 'tps';
  };

  G.Player.prototype.toggleMode = function () {
    this.mode = this.mode === 'fps' ? 'tps' : 'fps';
    this.model.visible = this.mode === 'tps' && !this.dead;
    G.Weapons.refreshVisibility();
    this.game.hud.setViewMode(this.mode);
    this.game.toast(this.mode === 'fps' ? '第一人称视角' : '第三人称视角');
    G.Audio.switchGun();
  };

  G.Player.prototype.applyLook = function (dx, dy) {
    this.yaw -= dx * 0.00215;
    this.pitch -= dy * 0.00215;
    this.pitch = G.clamp(this.pitch, -1.42, 1.42);
    G.Weapons.addLookSway(dx, dy);
  };

  G.Player.prototype.getForward = function (out) {
    out = out || new THREE.Vector3();
    out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    return out.normalize();
  };

  G.Player.prototype.takeDamage = function (amount) {
    if (this.dead || this.game.state !== 'playing') return;
    this.health = Math.max(0, this.health - amount);
    this.lastHit = 0;
    this.game.onPlayerDamaged(amount);
    G.Audio.hurt();
    if (this.health <= 0) {
      this.dead = true;
      this.game.onPlayerDeath();
    }
  };

  G.Player.prototype.update = function (dt, input) {
    var game = this.game;
    var world = game.world;
    if (!world) return;

    if (!this.dead) {
      if (this.health < this.maxHealth) {
        this.lastHit += dt;
        if (this.lastHit > 5.5) this.health = Math.min(this.maxHealth, this.health + dt * 7);
      }

      var forward = this.tmp.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      var right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      var wish = new THREE.Vector3();
      if (input.forward) wish.add(forward);
      if (input.back) wish.sub(forward);
      if (input.right) wish.add(right);
      if (input.left) wish.sub(right);

      var moving = wish.lengthSq() > 0.001;
      if (moving) wish.normalize();
      var sprinting = input.sprint && input.forward && !this.ads;
      var maxSpeed = sprinting ? this.sprintSpeed : this.speed;
      if (this.ads) maxSpeed *= 0.55;

      var accel = this.onGround ? 14 : 5;
      this.vel.x = G.damp(this.vel.x, wish.x * maxSpeed, accel, dt);
      this.vel.z = G.damp(this.vel.z, wish.z * maxSpeed, accel, dt);
      if (!moving && this.onGround) {
        this.vel.x = G.damp(this.vel.x, 0, 16, dt);
        this.vel.z = G.damp(this.vel.z, 0, 16, dt);
      }

      if (input.jump && this.onGround) {
        this.vel.y = 7.3;
        this.onGround = false;
      }
      this.vel.y -= 22 * dt;

      // 水平移动与碰撞
      var nx = this.pos.x + this.vel.x * dt;
      var nz = this.pos.z + this.vel.z * dt;

      if (Math.hypot(nx, nz) > 145) {
        var ang = Math.atan2(nz, nx);
        nx = Math.cos(ang) * 145;
        nz = Math.sin(ang) * 145;
      }

      var nh = world.heightAt(nx, nz);
      if (nh < 0.55) {
        // 浅水阻挡：沿着岸边滑动
        var tryX = world.heightAt(nx, this.pos.z);
        var tryZ = world.heightAt(this.pos.x, nz);
        if (tryX >= 0.55) { nz = this.pos.z; }
        else if (tryZ >= 0.55) { nx = this.pos.x; }
        else { nx = this.pos.x; nz = this.pos.z; }
        this.vel.x *= 0.3;
        this.vel.z *= 0.3;
      }

      this.pos.x = nx;
      this.pos.z = nz;

      // 道具碰撞（圆柱推挤）
      for (var i = 0; i < world.solids.length; i++) {
        var s = world.solids[i];
        var dx = this.pos.x - s.x;
        var dz = this.pos.z - s.z;
        var d = Math.hypot(dx, dz);
        var minD = s.r + this.radius;
        if (d < minD && d > 0.0001) {
          var push = (minD - d);
          this.pos.x += (dx / d) * push;
          this.pos.z += (dz / d) * push;
        }
      }
      if (world.heightAt(this.pos.x, this.pos.z) < 0.55) {
        this.pos.x = nx * 0.985;
        this.pos.z = nz * 0.985;
      }

      // 垂直
      this.pos.y += this.vel.y * dt;
      var gh = world.heightAt(this.pos.x, this.pos.z);
      if (this.pos.y <= gh) {
        this.pos.y = gh;
        this.vel.y = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }

      // 行走动画
      var hSpeed = Math.hypot(this.vel.x, this.vel.z);
      if (this.onGround) this.walkPhase += dt * hSpeed * 1.15;
      this.bobT += dt * (hSpeed * 0.9 + 1.0);
      this.model.position.copy(this.pos);
      this.model.rotation.y = this.yaw;
      if (this.legL) {
        var amp = Math.min(hSpeed / 8, 1.2);
        var sw = Math.sin(this.walkPhase) * 0.62 * amp;
        this.legL.rotation.x = sw;
        this.legR.rotation.x = -sw;
        this.armL.rotation.x = -1.1 + sw * 0.25;
        this.armR.rotation.x = -0.9 - sw * 0.2;
        this.model.position.y += Math.abs(Math.sin(this.walkPhase)) * 0.03 * amp;
      }
      this.model.visible = this.mode === 'tps';
    }

    this.updateCamera(dt);
  };

  G.Player.prototype.updateCamera = function (dt) {
    var cam = this.game.camera;
    var world = this.game.world;
    if (!world) return;

    var hSpeed = Math.hypot(this.vel.x, this.vel.z);
    var bob = 0;

    if (this.mode === 'fps') {
      bob = Math.sin(this.bobT * 2) * 0.018 * Math.min(hSpeed / 8, 1) * (1 - (G.Weapons ? G.Weapons.adsT : 0));
      cam.position.set(this.pos.x, this.pos.y + this.eye + bob, this.pos.z);
    } else {
      var fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      var rightV = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      var dist = 4.3 - G.Weapons.adsT * 1.5;
      var side = 0.82 - G.Weapons.adsT * 0.5;
      var camY = this.pos.y + 1.95 + Math.sin(this.pitch) * 0.8;
      cam.position.copy(this.pos)
        .addScaledVector(fwd, -dist)
        .addScaledVector(rightV, side);
      cam.position.y = camY;

      var terrainY = world.heightAt(cam.position.x, cam.position.z) + 0.7;
      if (cam.position.y < terrainY) cam.position.y = terrainY;
    }

    cam.rotation.order = 'YXZ';
    cam.rotation.set(this.pitch, this.yaw, 0);

    var shake = this.game.shake || 0;
    if (shake > 0.001) {
      cam.rotation.x += (Math.random() - 0.5) * 0.012 * shake;
      cam.rotation.y += (Math.random() - 0.5) * 0.012 * shake;
      if (this.mode === 'fps') cam.position.y += (Math.random() - 0.5) * 0.012 * shake;
    }

    var targetFov = this.ads ? G.WEAPONS[G.Weapons.index].adsFov : (this.mode === 'fps' ? 74 : 68);
    cam.fov = G.damp(cam.fov, targetFov, 12, dt);
    cam.updateProjectionMatrix();
  };

  G.Player.prototype.attach = function () {
    if (this.model.parent !== this.game.scene) this.game.scene.add(this.model);
    this.model.visible = this.mode === 'tps';
  };
})();
