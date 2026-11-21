/* ============================================================
 *  weapons.js — 枪械建模、开火、弹道与命中特效
 * ============================================================ */
(function () {
  'use strict';
  var G = window.G;

  /* ================= 武器参数 ================= */
  var WEAPONS = G.WEAPONS = [
    {
      id: 'rifle', name: 'AR-7 突击步枪', tag: '全自动',
      damage: 24, rpm: 560, pellets: 1, spread: 0.011, adsSpread: 0.0022,
      recoil: 0.011, range: 300, adsFov: 52, auto: true, shotSound: 'rifle'
    },
    {
      id: 'shotgun', name: 'SG-12 战术霰弹枪', tag: '泵动',
      damage: 14, rpm: 96, pellets: 9, spread: 0.075, adsSpread: 0.052,
      recoil: 0.042, range: 95, adsFov: 60, auto: false, shotSound: 'shotgun'
    }
  ];

  /* ================= 命中 / 爆炸特效 ================= */
  var FX = G.FX = {
    game: null,
    items: [],
    boomLight: null,

    init: function (game) {
      this.game = game;
      this.items.length = 0;
      this.boomLight = new THREE.PointLight(0xffa060, 0, 26, 2);
      this.boomLight.position.set(0, -999, 0);
      game.scene.add(this.boomLight);
    },

    clear: function () {
      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i];
        if (it.obj && it.obj.parent) it.obj.parent.remove(it.obj);
        this._dispose(it.obj);
      }
      this.items.length = 0;
      if (this.boomLight) this.boomLight.intensity = 0;
    },

    _dispose: function (obj) {
      if (!obj) return;
      obj.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) { /* 共享贴图，不销毁 */ }
          o.material.dispose();
        }
      });
    },

    _add: function (obj, life, tick) {
      this.game.scene.add(obj);
      this.items.push({ obj: obj, life: life, max: life, tick: tick || null });
    },

    tracer: function (from, to, color) {
      var geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
      var mat = new THREE.LineBasicMaterial({
        color: color || 0xffe6b0, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var line = new THREE.Line(geo, mat);
      this._add(line, 0.075);
    },

    spark: function (pos, color, count, speed, size) {
      count = count || 9;
      speed = speed || 5;
      var positions = new Float32Array(count * 3);
      var vel = [];
      for (var i = 0; i < count; i++) {
        positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y; positions[i * 3 + 2] = pos.z;
        var v = new THREE.Vector3(G.rand(-1, 1), G.rand(-0.3, 1), G.rand(-1, 1)).normalize().multiplyScalar(G.rand(0.35, 1) * speed);
        vel.push(v);
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      var mat = new THREE.PointsMaterial({
        color: color || 0xffcf8a, size: size || 0.16, map: G.Tex.spark(),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      var pts = new THREE.Points(geo, mat);
      this._add(pts, 0.42, function (obj, dt, lifeRatio) {
        var p = obj.geometry.attributes.position;
        for (var j = 0; j < count; j++) {
          vel[j].y -= 12 * dt;
          p.array[j * 3] += vel[j].x * dt;
          p.array[j * 3 + 1] += vel[j].y * dt;
          p.array[j * 3 + 2] += vel[j].z * dt;
        }
        p.needsUpdate = true;
        obj.material.opacity = lifeRatio;
      });
    },

    explosion: function (pos, color, scale) {
      scale = scale || 1;
      var spriteMat = new THREE.SpriteMaterial({
        map: G.Tex.glow(), color: color || 0xffb066, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.setScalar(1.4 * scale);
      this._add(sprite, 0.5, function (obj, dt, ratio) {
        var s = (1.4 + (1 - ratio) * 4.2) * scale;
        obj.scale.setScalar(s);
        obj.material.opacity = ratio * 0.9;
      });
      this.spark(pos, 0xffc07a, Math.floor(22 * scale), 9 * scale, 0.2);
      this.spark(pos, 0x9ff4ff, Math.floor(10 * scale), 5 * scale, 0.14);
      if (this.boomLight) {
        this.boomLight.position.copy(pos);
        this.boomLight.intensity = 8 * scale;
      }
    },

    flashSprite: function (pos, color) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: G.Tex.glow(), color: color || 0x9ff4ff, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      s.position.copy(pos);
      s.scale.setScalar(1);
      this._add(s, 0.22, function (obj, dt, ratio) {
        obj.scale.setScalar(0.6 + (1 - ratio) * 1.8);
        obj.material.opacity = ratio * 0.7;
      });
    },

    update: function (dt) {
      for (var i = this.items.length - 1; i >= 0; i--) {
        var it = this.items[i];
        it.life -= dt;
        var ratio = Math.max(0, it.life / it.max);
        if (it.tick) it.tick(it.obj, dt, ratio);
        else if (it.obj.material) it.obj.material.opacity = ratio;
        if (it.life <= 0) {
          if (it.obj.parent) it.obj.parent.remove(it.obj);
          this._dispose(it.obj);
          this.items.splice(i, 1);
        }
      }
      if (this.boomLight && this.boomLight.intensity > 0) {
        this.boomLight.intensity = Math.max(0, this.boomLight.intensity - dt * 55);
      }
    }
  };

  /* ================= 枪械建模工具 ================= */
  function metalMat(color, roughness) {
    return new THREE.MeshStandardMaterial({
      color: color, metalness: 0.3, roughness: roughness === undefined ? 0.4 : roughness,
      emissive: 0x0d1319, emissiveIntensity: 1,
      map: G.Tex.metal(), fog: false
    });
  }
  function polyMat(color, roughness) {
    return new THREE.MeshStandardMaterial({
      color: color, metalness: 0.35, roughness: roughness === undefined ? 0.7 : roughness, fog: false
    });
  }
  function glowMat(color, intensity) {
    return new THREE.MeshStandardMaterial({
      color: 0x0a1114, emissive: color, emissiveIntensity: intensity || 2.2,
      metalness: 0.4, roughness: 0.3, fog: false
    });
  }
  function box(w, h, d, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }
  function cylZ(rt, rb, h, mat, x, y, z, seg) {
    var geo = new THREE.CylinderGeometry(rt, rb, h, seg || 10);
    geo.rotateX(Math.PI / 2);
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  }
  function ring(r, tube, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 16), mat);
    m.position.set(x, y, z);
    return m;
  }

  function makeRifle() {
    var g = new THREE.Group();
    var body = metalMat(0x46525d, 0.36);
    var dark = polyMat(0x22282f, 0.72);
    var accent = glowMat(0x49e6ff, 2.4);

    g.add(box(0.10, 0.145, 0.54, body, 0, 0, 0.02));
    g.add(box(0.115, 0.045, 0.34, dark, 0, 0.082, 0.02));
    g.add(box(0.085, 0.095, 0.30, dark, 0, 0.012, -0.38));
    g.add(cylZ(0.021, 0.021, 0.40, body, 0, 0.026, -0.66, 12));
    g.add(cylZ(0.036, 0.032, 0.075, dark, 0, 0.026, -0.86, 12));
    // 枪托
    g.add(box(0.075, 0.12, 0.28, body, 0, -0.008, 0.38));
    g.add(box(0.09, 0.155, 0.055, dark, 0, -0.008, 0.53));
    // 握把与弹匣
    var grip = box(0.068, 0.19, 0.10, dark, 0, -0.17, 0.13);
    grip.rotation.x = -0.28; g.add(grip);
    var mag = box(0.055, 0.22, 0.11, dark, 0, -0.17, -0.10);
    mag.rotation.x = 0.20; g.add(mag);
    // 瞄具
    g.add(box(0.048, 0.045, 0.075, dark, 0, 0.118, 0.04));
    g.add(ring(0.028, 0.008, dark, 0, 0.12, 0.02));
    g.add(box(0.012, 0.05, 0.012, dark, 0, 0.115, -0.56));
    // 发光条
    g.add(box(0.101, 0.014, 0.15, accent, 0, -0.03, -0.19));
    g.add(box(0.02, 0.02, 0.02, accent, 0.058, 0.02, 0.14));
    g.add(box(0.02, 0.02, 0.02, accent, -0.058, 0.02, 0.14));

    var flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: G.Tex.flash(), color: 0xffd9a0, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    flash.position.set(0, 0.026, -0.93);
    flash.scale.setScalar(0.36);
    flash.visible = false;
    g.add(flash);

    g.userData.flash = flash;
    g.userData.muzzle = new THREE.Vector3(0, 0.026, -0.93);
    g.userData.kind = 'rifle';
    return g;
  }

  function makeShotgun() {
    var g = new THREE.Group();
    var body = metalMat(0x4d5259, 0.42);
    var dark = polyMat(0x2a2620, 0.75);
    var wood = polyMat(0x5a3a24, 0.65);
    var accent = glowMat(0xffa45a, 2.2);

    g.add(box(0.115, 0.16, 0.46, body, 0, 0, 0.06));
    g.add(cylZ(0.032, 0.032, 0.62, body, 0, 0.045, -0.58, 12));
    g.add(cylZ(0.026, 0.026, 0.52, dark, 0, -0.02, -0.55, 10));
    g.add(cylZ(0.04, 0.038, 0.07, dark, 0, 0.045, -0.91, 12));
    // 泵动护木
    var pump = box(0.10, 0.10, 0.24, wood, 0, -0.035, -0.46);
    g.add(pump);
    // 枪托
    g.add(box(0.085, 0.13, 0.30, wood, 0, -0.02, 0.41));
    g.add(box(0.10, 0.17, 0.05, dark, 0, -0.02, 0.57));
    var grip = box(0.07, 0.17, 0.09, wood, 0, -0.16, 0.17);
    grip.rotation.x = -0.3; g.add(grip);
    // 瞄具
    g.add(box(0.02, 0.035, 0.02, accent, 0, 0.09, -0.8));
    g.add(box(0.05, 0.02, 0.06, dark, 0, 0.095, 0.16));
    // 发光弹仓指示
    g.add(box(0.06, 0.018, 0.05, accent, 0, 0.082, 0.02));

    var flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: G.Tex.flash(), color: 0xffc070, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    flash.position.set(0, 0.045, -0.98);
    flash.scale.setScalar(0.62);
    flash.visible = false;
    g.add(flash);

    g.userData.flash = flash;
    g.userData.muzzle = new THREE.Vector3(0, 0.045, -0.98);
    g.userData.kind = 'shotgun';
    return g;
  }

  /* ================= 武器系统 ================= */
  G.Weapons = {
    game: null,
    index: 0,
    cooldown: 0,
    trigger: false,
    firedThisPress: false,
    kick: 0,
    switchT: 1,
    adsT: 0,
    swayX: 0,
    swayY: 0,
    bobT: 0,
    flashTimer: 0,
    viewmodels: [],
    charGuns: [],
    raycaster: new THREE.Raycaster(),
    _tmpDir: new THREE.Vector3(),
    _tmpOrigin: new THREE.Vector3(),

    init: function (game) {
      this.game = game;
      this.index = 0;
      this.viewmodels = [makeRifle(), makeShotgun()];
      this.charGuns = [makeRifle(), makeShotgun()];

      for (var i = 0; i < this.viewmodels.length; i++) {
        var vm = this.viewmodels[i];
        vm.position.set(0.30, -0.30, -0.92);
        vm.rotation.y = 0.055;
        vm.scale.setScalar(0.66);
        vm.visible = false;
        vm.traverse(function (o) { o.frustumCulled = false; o.layers.set(1); });
        game.camera.add(vm);

        var cg = this.charGuns[i];
        cg.scale.setScalar(0.66);
        cg.visible = false;
        cg.traverse(function (o) { o.frustumCulled = false; });
        if (game.player && game.player.gunMount) {
          game.player.gunMount.add(cg);
        }
      }
      // 近距离补光，让枪械金属有细节
      var gunLight = new THREE.PointLight(0xcfeaff, 1.5, 5.5, 2);
      gunLight.position.set(0.5, 0.2, 0.25);
      game.camera.add(gunLight);
      this.equip(0, true);
    },

    get config() { return WEAPONS[this.index]; },

    equip: function (idx, silent) {
      idx = ((idx % WEAPONS.length) + WEAPONS.length) % WEAPONS.length;
      if (idx === this.index && !silent) return;
      this.index = idx;
      this.switchT = 0;
      this.cooldown = Math.max(this.cooldown, 0.22);
      for (var i = 0; i < this.viewmodels.length; i++) {
        this.viewmodels[i].visible = false;
        this.charGuns[i].visible = false;
      }
      var fps = this.game.player.mode === 'fps';
      this.viewmodels[idx].visible = fps;
      this.charGuns[idx].visible = !fps;
      if (this.game.hud) this.game.hud.setWeapon(idx);
      if (!silent) {
        G.Audio.switchGun();
        this.game.toast('已切换 · ' + WEAPONS[idx].name);
      }
    },

    next: function () { this.equip(this.index + 1); },
    prev: function () { this.equip(this.index - 1); },

    refreshVisibility: function () {
      var fps = this.game.player.mode === 'fps';
      for (var i = 0; i < this.viewmodels.length; i++) {
        this.viewmodels[i].visible = fps && i === this.index;
        this.charGuns[i].visible = !fps && i === this.index;
      }
    },

    onTrigger: function (down) {
      this.trigger = down;
      if (down) this.firedThisPress = false;
    },

    update: function (dt) {
      var game = this.game;
      var w = WEAPONS[this.index];
      if (this.cooldown > 0) this.cooldown -= dt;
      if (this.flashTimer > 0) {
        this.flashTimer -= dt;
        if (this.flashTimer <= 0) {
          this.viewmodels[this.index].userData.flash.visible = false;
          this.charGuns[this.index].userData.flash.visible = false;
        }
      }
      if (this.switchT < 1) this.switchT = Math.min(1, this.switchT + dt * 5);

      if (game.state === 'playing' && this.trigger && (w.auto || !this.firedThisPress)) {
        this.fire();
        this.firedThisPress = true;
      }

      // 瞄准状态
      var ads = game.player.ads && game.state === 'playing';
      this.adsT = G.damp(this.adsT, ads ? 1 : 0, 14, dt);

      // 视角晃动
      var vm = this.viewmodels[this.index];
      var hip = new THREE.Vector3(0.30, -0.30, -0.92);
      var aim = new THREE.Vector3(0, -0.18, -0.70);
      var base = hip.clone().lerp(aim, this.adsT);

      var speed = Math.hypot(game.player.vel.x, game.player.vel.z);
      this.bobT += dt * (2.2 + speed * 0.55);
      var bobAmt = (1 - this.adsT) * Math.min(speed / 8, 1.4);
      base.x += Math.sin(this.bobT) * 0.014 * bobAmt;
      base.y += Math.abs(Math.cos(this.bobT)) * 0.012 * bobAmt;

      this.kick = G.damp(this.kick, 0, 12, dt);
      base.z += this.kick * 0.075;
      base.y -= (1 - Math.cos(this.switchT * Math.PI)) * 0.0;

      var switchDip = Math.sin(this.switchT * Math.PI) * 0.34;
      base.y -= switchDip;

      this.swayX = G.damp(this.swayX, 0, 8, dt);
      this.swayY = G.damp(this.swayY, 0, 8, dt);
      base.x += this.swayX;
      base.y += this.swayY;

      vm.position.copy(base);
      vm.rotation.x = -this.kick * 0.22 + this.adsT * 0.005;
      vm.rotation.z = Math.sin(this.swayX * 22) * 0.35 + this.kick * 0.05;
      vm.rotation.y = 0.055 * (1 - this.adsT);

      // 第三人称角色枪械位置
      var cg = this.charGuns[this.index];
      if (game.player.mode === 'tps') {
        cg.position.set(0, 0, 0);
      }
    },

    addLookSway: function (dx, dy) {
      this.swayX = G.clamp(this.swayX - dx * 0.000045, -0.02, 0.02);
      this.swayY = G.clamp(this.swayY + dy * 0.00004, -0.02, 0.02);
    },

    fire: function () {
      var game = this.game;
      var w = WEAPONS[this.index];
      if (this.cooldown > 0 || game.state !== 'playing') return;
      this.cooldown = 60 / w.rpm;

      var player = game.player;
      var spread = (player.ads ? w.adsSpread : w.spread) * (1 + Math.min(Math.hypot(player.vel.x, player.vel.z) / 10, 1) * 0.8);

      game.camera.getWorldPosition(this._tmpOrigin);
      this._tmpDir.set(0, 0, -1).applyQuaternion(game.camera.quaternion);

      var muzzle = new THREE.Vector3();
      var flashObj = player.mode === 'fps' ? this.viewmodels[this.index].userData.flash
        : this.charGuns[this.index].userData.flash;
      flashObj.getWorldPosition(muzzle);

      var anyHit = false, anyHead = false;
      var candidates = game.getHitCandidates();

      for (var p = 0; p < w.pellets; p++) {
        var dir = this._spread(this._tmpDir, spread);
        this.raycaster.set(this._tmpOrigin, dir);
        this.raycaster.far = w.range;

        var hits = this.raycaster.intersectObjects(candidates, true);
        var enemyHit = null, propHit = null;
        for (var i = 0; i < hits.length; i++) {
          var h = hits[i];
          if (h.object.userData.noHit) continue;
          if (h.object.userData.enemy) {
            if (h.object.userData.enemy.alive) { enemyHit = h; break; }
          } else {
            propHit = h;
            break;
          }
        }

        var groundDist = game.world ? game.world.groundHit(this._tmpOrigin, dir, w.range) : Infinity;
        var bestType = 'none', bestDist = w.range, bestPoint = this._tmpOrigin.clone().addScaledVector(dir, w.range);
        var bestHit = null;

        if (groundDist < bestDist) { bestType = 'ground'; bestDist = groundDist; }
        if (propHit && propHit.distance < bestDist) {
          bestType = 'prop'; bestDist = propHit.distance; bestHit = propHit;
        }
        if (enemyHit && enemyHit.distance < bestDist) {
          bestType = 'enemy'; bestDist = enemyHit.distance; bestHit = enemyHit;
        }
        if (bestHit) bestPoint = bestHit.point;
        else bestPoint = this._tmpOrigin.clone().addScaledVector(dir, bestDist);

        game.stats.shots++;

        if (bestType === 'enemy') {
          var enemy = bestHit.object.userData.enemy;
          var head = bestHit.object.userData.part === 'head';
          var dmg = w.damage * (head ? 2.1 : 1);
          G.Enemies.damage(enemy, dmg, bestPoint, head);
          game.stats.hits++;
          anyHit = true;
          if (head) anyHead = true;
          FX.spark(bestPoint, head ? 0xffe08a : 0x9ceeff, head ? 12 : 7, 6, 0.13);
        } else if (bestType === 'prop') {
          FX.spark(bestPoint, 0xffd2a0, 6, 4.5, 0.12);
        } else if (bestType === 'ground') {
          FX.spark(bestPoint, 0xd8c39a, 6, 4, 0.13);
        }

        // 弹道线：近距离更亮
        if (bestDist < w.range * 0.98) {
          FX.tracer(muzzle, bestPoint, w.id === 'shotgun' ? 0xffcf99 : 0xfff0c0);
        }
      }

      // 枪口火光
      flashObj.visible = true;
      flashObj.material.rotation = G.rand(0, G.TAU);
      flashObj.scale.setScalar(w.id === 'shotgun' ? G.rand(0.5, 0.72) : G.rand(0.28, 0.42));
      this.flashTimer = 0.045;

      var mpos = new THREE.Vector3();
      flashObj.getWorldPosition(mpos);
      FX.flashSprite(mpos, w.id === 'shotgun' ? 0xffb066 : 0xffe0a0);

      G.Audio.shot(w.shotSound);
      this.kick = 1;
      player.pitch = G.clamp(player.pitch + w.recoil * (player.ads ? 0.6 : 1) * G.rand(0.85, 1.15), -1.4, 1.4);
      game.addShake(w.id === 'shotgun' ? 1.5 : 0.55);

      if (anyHit) game.showHitmarker(anyHead);
      game.updateCrosshair();
    },

    _spread: function (dir, spread) {
      var v = dir.clone();
      if (spread <= 0) return v;
      var right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
      if (right.lengthSq() < 0.000001) right.set(1, 0, 0);
      right.normalize();
      var up = new THREE.Vector3().crossVectors(right, dir).normalize();
      var a = Math.random() * Math.PI * 2;
      var r = Math.sqrt(Math.random()) * spread;
      v.addScaledVector(right, Math.cos(a) * r);
      v.addScaledVector(up, Math.sin(a) * r);
      return v.normalize();
    }
  };
})();
