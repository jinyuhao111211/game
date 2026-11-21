/* ============================================================
 *  enemies.js — 敌方单位建模、AI 与弹药
 * ============================================================ */
(function () {
  'use strict';
  var G = window.G;

  var TYPES = {
    trooper: {
      name: '突击单元', hp: 110, speed: 4.6, range: 17, fireRate: 2.4, dmg: 5, color: 0x4fe3ff,
      scale: 1, barY: 2.06, radius: 0.5, fly: 0, projSpeed: 24
    },
    heavy: {
      name: '重装单元', hp: 300, speed: 3.0, range: 15, fireRate: 3.2, dmg: 8, color: 0xff9a4d,
      scale: 1.32, barY: 2.72, radius: 0.72, fly: 0, projSpeed: 21
    },
    drone: {
      name: '侦察无人机', hp: 70, speed: 6.6, range: 13, fireRate: 2.1, dmg: 4, color: 0xff5fa8,
      scale: 1, barY: 1.05, radius: 0.5, fly: 3.1, projSpeed: 21
    },
    boss: {
      name: '要塞守卫', hp: 1400, speed: 2.6, range: 22, fireRate: 1.6, dmg: 7, color: 0xffd166,
      scale: 1.85, barY: 3.75, radius: 1.5, fly: 0, projSpeed: 26, burst: 3
    }
  };

  function m(color, rough, metal) {
    return new THREE.MeshStandardMaterial({
      color: color, roughness: rough === undefined ? 0.45 : rough,
      metalness: metal === undefined ? 0.55 : metal
    });
  }
  function ebox(w, h, d, mat, x, y, z) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  }

  function buildTrooper(def, isBoss) {
    var g = new THREE.Group();
    var body = m(0x2a3540, 0.42, 0.6);
    var armor = m(0x3d4b5a, 0.32, 0.75);
    var dark = m(0x151a20, 0.65, 0.3);
    var glow = new THREE.MeshStandardMaterial({
      color: 0x0a1114, emissive: def.color, emissiveIntensity: 2.2,
      metalness: 0.3, roughness: 0.35
    });

    g.add(ebox(0.62, 0.66, 0.36, armor, 0, 1.22, 0));
    g.add(ebox(0.5, 0.2, 0.3, body, 0, 0.92, 0));
    var chest = ebox(0.3, 0.075, 0.03, glow, 0, 1.3, -0.185);
    chest.castShadow = false; g.add(chest);

    var head = ebox(0.3, 0.28, 0.3, armor, 0, 1.72, 0);
    head.name = 'head';
    g.add(head);
    var visor = ebox(0.24, 0.055, 0.02, glow, 0, 1.75, -0.155);
    visor.castShadow = false; visor.name = 'head'; g.add(visor);
    g.add(ebox(0.1, 0.16, 0.1, dark, 0.16, 1.5, 0));

    g.add(ebox(0.2, 0.19, 0.28, body, 0.4, 1.43, 0));
    g.add(ebox(0.2, 0.19, 0.28, body, -0.4, 1.43, 0));
    g.add(ebox(0.15, 0.52, 0.18, dark, 0.4, 1.12, 0));
    g.add(ebox(0.15, 0.52, 0.18, dark, -0.4, 1.12, 0));

    var legL = new THREE.Group();
    legL.position.set(0.17, 0.92, 0);
    legL.add(ebox(0.19, 0.78, 0.22, body, 0, -0.39, 0));
    legL.add(ebox(0.21, 0.12, 0.28, dark, 0, -0.82, -0.03));
    g.add(legL);
    var legR = legL.clone();
    legR.position.x = -0.17;
    g.add(legR);

    // 武器
    var gun = ebox(0.09, 0.11, 0.52, dark, 0.28, 1.16, -0.3);
    g.add(gun);
    var tip = ebox(0.06, 0.06, 0.06, glow, 0.28, 1.16, -0.57);
    tip.castShadow = false; g.add(tip);

    if (isBoss) {
      // 首领：肩甲尖刺与额外核心
      for (var i = 0; i < 3; i++) {
        var spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 5), armor);
        spike.position.set(0, 1.7 + i * 0.14, 0.18);
        spike.rotation.x = -0.5;
        spike.castShadow = true;
        g.add(spike);
      }
      var core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), glow);
      core.position.set(-0.34, 1.62, -0.2);
      g.add(core);
    }

    g.scale.setScalar(def.scale);
    return { group: g, legL: legL, legR: legR, glowMats: [glow] };
  }

  function buildDrone(def) {
    var g = new THREE.Group();
    var shell = m(0x2b3440, 0.35, 0.7);
    var dark = m(0x141a20, 0.6, 0.4);
    var glow = new THREE.MeshStandardMaterial({
      color: 0x0a1114, emissive: def.color, emissiveIntensity: 2.6,
      metalness: 0.3, roughness: 0.3
    });

    var core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), shell);
    core.castShadow = true;
    g.add(core);
    var eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), glow);
    eye.position.set(0, 0, -0.27);
    eye.scale.set(1.5, 0.8, 0.6);
    g.add(eye);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 6, 24), dark);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    g.add(ring);
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 20), glow);
    ring2.rotation.x = Math.PI / 2;
    g.add(ring2);
    g.add(ebox(0.18, 0.1, 0.34, shell, 0.5, 0.05, 0));
    g.add(ebox(0.18, 0.1, 0.34, shell, -0.5, 0.05, 0));
    var fin = ebox(0.06, 0.3, 0.22, dark, 0, 0.3, 0.1);
    g.add(fin);

    return { group: g, legL: null, legR: null, glowMats: [glow] };
  }

  function makeBar(color) {
    var bar = new THREE.Group();
    var bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x04090d, transparent: true, opacity: 0.72, depthWrite: false })
    );
    var fg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.065),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.95, depthWrite: false })
    );
    fg.position.z = 0.002;
    bar.add(bg); bar.add(fg);
    bar.userData.bg = bg;
    bar.userData.fg = fg;
    bg.userData.noHit = true; fg.userData.noHit = true;
    bar.userData.noHit = true;
    return bar;
  }

  G.Enemies = {
    game: null,
    list: [],
    projectiles: [],
    boltGeo: null,
    boltMat: null,
    glowTex: null,
    _q: new THREE.Quaternion(),

    init: function (game) {
      this.game = game;
      this.list.length = 0;
      this.projectiles.length = 0;
      this.glowTex = G.Tex.bolt();
      this.boltGeo = new THREE.SphereGeometry(0.11, 8, 6);
      this.boltMat = new THREE.MeshBasicMaterial({ color: 0xffb066 });
    },

    spawnAll: function (world, game) {
      this.clear();
      var list = world.enemyPlan || [];
      var points = world.enemySpawns || [];
      var idx = 0;
      for (var i = 0; i < list.length; i++) {
        for (var c = 0; c < list[i].count; c++) {
          var pt = points[idx % points.length];
          idx++;
          this.spawn(list[i].type, pt, world, game);
        }
      }
    },

    spawn: function (type, pt, world, game) {
      var def = TYPES[type] || TYPES.trooper;
      var built = type === 'drone' ? buildDrone(def) : buildTrooper(def, type === 'boss');
      var group = built.group;
      group.position.set(pt.x, 0, pt.z);
      if (type === 'drone') {
        group.position.y = world.heightAt(pt.x, pt.z) + def.fly;
      } else {
        group.position.y = world.heightAt(pt.x, pt.z);
      }

      var bar = makeBar(def.color);
      bar.position.y = def.barY / def.scale;
      bar.scale.setScalar(1 / def.scale);
      bar.traverse(function (o) { o.layers.set(1); });
      group.add(bar);

      var glowMats = built.glowMats;
      var baseGlow = glowMats.map(function (gm) { return gm.emissiveIntensity; });

      var e = {
        type: type, def: def, group: group, bar: bar,
        hp: def.hp, maxHp: def.hp, alive: true,
        fireTimer: G.rand(2.8, 5.2), phase: G.rand(0, 20),
        strafe: Math.random() < 0.5 ? 1 : -1,
        radius: def.radius, legL: built.legL, legR: built.legR,
        glowMats: glowMats, baseGlow: baseGlow, flash: 0,
        spawnT: 0, walk: 0
      };

      group.rotation.y = G.rand(0, Math.PI * 2);
      group.traverse(function (o) {
        if (o.isMesh) {
          o.userData.enemy = e;
        }
      });
      group.userData.enemy = e;
      game.scene.add(group);
      this.list.push(e);
      return e;
    },

    aliveCount: function () {
      var n = 0;
      for (var i = 0; i < this.list.length; i++) if (this.list[i].alive) n++;
      return n;
    },

    damage: function (e, amount, point, headshot) {
      if (!e.alive) return;
      e.hp -= amount;
      e.flash = 1;
      var ratio = G.clamp(e.hp / e.maxHp, 0, 1);
      var fg = e.bar.userData.fg;
      fg.scale.x = Math.max(0.001, ratio);
      fg.position.x = -(1 - ratio) * 0.46;
      fg.material.color.setHex(ratio < 0.35 ? 0xff4d5e : e.def.color);

      if (e.hp <= 0) this.kill(e, headshot);
      else if (headshot) G.Audio.hit(true);
      else G.Audio.hit(false);
    },

    kill: function (e, headshot) {
      e.alive = false;
      var pos = e.group.position.clone();
      pos.y += e.def.barY * 0.55;
      G.FX.explosion(pos, e.def.color, e.type === 'boss' ? 2.2 : (e.type === 'heavy' ? 1.3 : 0.95));
      G.Audio.kill();

      if (e.group.parent) e.group.parent.remove(e.group);
      e.group.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });

      this.game.registerKill(e, headshot);
    },

    clear: function () {
      for (var i = 0; i < this.list.length; i++) {
        var e = this.list[i];
        if (e.group && e.group.parent) e.group.parent.remove(e.group);
      }
      this.list.length = 0;
      this.clearProjectiles();
    },

    clearProjectiles: function () {
      for (var j = 0; j < this.projectiles.length; j++) {
        var p = this.projectiles[j];
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        if (p.glow) {
          if (p.glow.parent) p.glow.parent.remove(p.glow);
          p.glow.material.dispose();
        }
      }
      this.projectiles.length = 0;
    },

    shoot: function (e, game) {
      var player = game.player;
      var from = e.group.position.clone();
      from.y += (e.type === 'drone' ? 0.02 : 1.3 * e.def.scale);
      var target = player.pos.clone();
      target.y += 1.15;

      var count = e.def.burst || 1;
      for (var i = 0; i < count; i++) {
        var dir = target.clone().sub(from).normalize();
        if (count > 1) {
          dir.x += (i - (count - 1) / 2) * 0.06;
          dir.normalize();
        }
        dir.x += G.rand(-0.045, 0.045);
        dir.y += G.rand(-0.032, 0.032);
        dir.z += G.rand(-0.045, 0.045);
        dir.normalize();

        var mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
        mesh.position.copy(from);
        mesh.scale.setScalar(e.type === 'boss' ? 1.0 : 0.62);
        game.scene.add(mesh);

        var glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.glowTex, color: 0xff8a4d, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75
        }));
        glow.scale.setScalar(e.type === 'boss' ? 0.9 : 0.5);
        glow.position.copy(from);
        game.scene.add(glow);

        this.projectiles.push({
          mesh: mesh, glow: glow, vel: dir.multiplyScalar(e.def.projSpeed),
          life: 5, dmg: e.def.dmg, radius: 0.13
        });
      }
      G.Audio.laser();
    },

    update: function (dt, game) {
      var player = game.player;
      var cam = game.camera;
      var i, e;

      for (i = 0; i < this.list.length; i++) {
        e = this.list[i];
        if (!e.alive) continue;

        if (e.spawnT < 1) {
          e.spawnT = Math.min(1, e.spawnT + dt * 4);
          var s = (e.type === 'boss' ? 0.4 : 0.2) + e.spawnT * (1 - (e.type === 'boss' ? 0.4 : 0.2));
          e.group.scale.setScalar(e.def.scale * s);
        }

        var dx = player.pos.x - e.group.position.x;
        var dz = player.pos.z - e.group.position.z;
        var dist = Math.hypot(dx, dz);
        var world = game.world;

        e.group.rotation.y = Math.atan2(-dx, -dz);

        if (dist > 0.6) {
          var nx = dx / dist, nz = dz / dist;
          var desired = e.def.range * 0.82;
          var mvx = 0, mvz = 0;

          if (dist > desired) {
            mvx = nx * e.def.speed;
            mvz = nz * e.def.speed;
          } else if (dist < desired * 0.55) {
            mvx = -nx * e.def.speed * 0.7;
            mvz = -nz * e.def.speed * 0.7;
          } else {
            // 侧向游走
            var t = game.levelTime * 0.7 + e.phase;
            mvx = -nz * e.def.speed * 0.55 * e.strafe * Math.sin(t);
            mvz = nx * e.def.speed * 0.55 * e.strafe * Math.sin(t);
          }

          var stepX = mvx * dt, stepZ = mvz * dt;
          var canMove = true;

          if (e.type !== 'drone') {
            var targetH = world.heightAt(e.group.position.x + stepX, e.group.position.z + stepZ);
            if (targetH < 0.7) canMove = false;
          }
          if (Math.hypot(e.group.position.x + stepX, e.group.position.z + stepZ) > 144) canMove = false;
          if (canMove && e.type !== 'drone') {
            for (var s = 0; s < world.solids.length; s++) {
              var so = world.solids[s];
              var d2 = Math.hypot(e.group.position.x + stepX - so.x, e.group.position.z + stepZ - so.z);
              if (d2 < so.r + e.radius * 0.8) { canMove = false; break; }
            }
          }
          if (canMove) {
            e.group.position.x += stepX;
            e.group.position.z += stepZ;
            e.walk += dt * e.def.speed * 1.6;
          } else if (e.type !== 'drone') {
            e.strafe *= -1;
          }
        }

        // 贴地 / 悬浮
        var gh = world.heightAt(e.group.position.x, e.group.position.z);
        if (e.type === 'drone') {
          e.group.position.y = gh + e.def.fly + Math.sin(game.levelTime * 2.2 + e.phase) * 0.3;
          e.group.rotation.z = Math.sin(game.levelTime * 1.7 + e.phase) * 0.12;
        } else {
          e.group.position.y = G.damp(e.group.position.y, gh, 24, dt);
          if (e.legL && e.legR && dist > 1.5) {
            var swing = Math.sin(e.walk) * 0.5;
            e.legL.rotation.x = swing;
            e.legR.rotation.x = -swing;
          }
        }

        // 受击闪光
        if (e.flash > 0) {
          e.flash = Math.max(0, e.flash - dt * 5);
          for (var gm = 0; gm < e.glowMats.length; gm++) {
            e.glowMats[gm].emissiveIntensity = e.baseGlow[gm] + e.flash * 5;
          }
        }

        // 血条朝向（抵消父级旋转）
        if (dist < 110) {
          e.bar.visible = true;
          e.group.getWorldQuaternion(this._q).invert();
          e.bar.quaternion.copy(cam.quaternion).premultiply(this._q);
        } else {
          e.bar.visible = false;
        }

        // 开火
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < e.def.range * 1.55) {
          e.fireTimer = e.def.fireRate * G.rand(0.8, 1.25);
          this.shoot(e, game);
        }
      }

      // 弹药更新
      for (i = this.projectiles.length - 1; i >= 0; i--) {
        var p = this.projectiles[i];
        p.life -= dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.glow.position.copy(p.mesh.position);

        var remove = p.life <= 0;
        // 击中玩家
        var px = player.pos.x - p.mesh.position.x;
        var pz = player.pos.z - p.mesh.position.z;
        var py = p.mesh.position.y;
        if (!remove && Math.hypot(px, pz) < 0.72 && py > player.pos.y + 0.1 && py < player.pos.y + 1.95) {
          game.damagePlayer(p.dmg);
          G.FX.spark(p.mesh.position.clone(), 0xff8a5a, 8, 4, 0.12);
          remove = true;
        }
        if (!remove && game.world) {
          var h = game.world.heightAt(p.mesh.position.x, p.mesh.position.z);
          if (py < h + 0.05) {
            G.FX.spark(p.mesh.position.clone(), 0xffb066, 5, 3, 0.1);
            remove = true;
          }
        }
        if (remove) {
          if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
          if (p.glow.parent) p.glow.parent.remove(p.glow);
          p.glow.material.dispose();
          this.projectiles.splice(i, 1);
        }
      }
    }
  };
})();
