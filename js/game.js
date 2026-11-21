/* ============================================================
 *  game.js — 主循环、状态机、输入与 HUD
 * ============================================================ */
(function () {
  'use strict';
  var G = window.G;

  function $(id) { return document.getElementById(id); }

  function fmtTime(sec) {
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ================= HUD ================= */
  function Hud(game) {
    this.game = game;
    this.root = $('hud');
    this.hpFill = $('hp-fill');
    this.hpNum = $('hp-num');
    this.hpStatus = $('hp-status');
    this.enemyCount = $('enemy-count');
    this.missionLevel = $('mission-level');
    this.missionName = $('mission-name');
    this.viewMode = $('view-mode');
    this.crosshairEl = $('crosshair');
    this.hitEl = $('hitmarker');
    this.slots = [$('slot-0'), $('slot-1')];
    this.flashEl = $('damage-flash');
    this.bannerEl = $('banner');
    this.toastEl = $('toast');
    this.lastHealth = -1;
    this.lastEnemies = -1;
    this.toastTimer = null;
  }

  Hud.prototype.show = function () { this.root.classList.remove('hidden'); };
  Hud.prototype.hide = function () { this.root.classList.add('hidden'); };

  Hud.prototype.setHealth = function (hp) {
    hp = Math.ceil(hp);
    if (hp === this.lastHealth) return;
    this.lastHealth = hp;
    var pct = G.clamp(hp / 100, 0, 1) * 100;
    this.hpFill.style.width = pct.toFixed(1) + '%';
    this.hpNum.textContent = hp;
    this.hpFill.classList.toggle('low', hp <= 30);
    this.hpFill.classList.toggle('mid', hp > 30 && hp <= 65);
    this.hpStatus.textContent = hp > 90 ? '稳定' : hp > 60 ? '轻伤' : hp > 30 ? '重伤' : '危险';
  };

  Hud.prototype.setEnemies = function (n) {
    if (n === this.lastEnemies) return;
    this.lastEnemies = n;
    this.enemyCount.textContent = n;
  };

  Hud.prototype.setLevel = function (level, index) {
    this.missionLevel.textContent = '第 ' + (index + 1) + ' 关 / 5';
    this.missionName.textContent = level.name;
  };

  Hud.prototype.setWeapon = function (idx) {
    for (var i = 0; i < this.slots.length; i++) {
      this.slots[i].classList.toggle('active', i === idx);
    }
  };

  Hud.prototype.setViewMode = function (mode) {
    this.viewMode.textContent = mode === 'fps' ? '第一人称' : '第三人称';
  };

  Hud.prototype.hit = function (head) {
    this.hitEl.classList.remove('show');
    this.hitEl.classList.toggle('head', !!head);
    void this.hitEl.offsetWidth;
    this.hitEl.classList.add('show');
  };

  Hud.prototype.flash = function (strong) {
    this.flashEl.classList.add('show');
    var el = this.flashEl;
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(function () {
      el.classList.remove('show');
    }, strong ? 110 : 70);
  };

  Hud.prototype.banner = function (kicker, title, sub) {
    var el = this.bannerEl;
    el.querySelector('.banner-kicker').textContent = kicker;
    el.querySelector('.banner-title').textContent = title;
    el.querySelector('.banner-sub').textContent = sub;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  };

  Hud.prototype.toast = function (msg) {
    var el = this.toastEl;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1700);
  };

  Hud.prototype.crosshair = function (gap, visible) {
    this.crosshairEl.style.setProperty('--gap', gap.toFixed(1) + 'px');
    this.crosshairEl.classList.toggle('hide', !visible);
  };

  /* ================= GAME ================= */
  var Game = {
    state: 'menu',
    levelIndex: 0,
    statsTotals: { kills: 0, heads: 0, shots: 0, hits: 0, time: 0 },
    stats: { kills: 0, heads: 0, shots: 0, hits: 0, time: 0 },
    levelTime: 0,
    shake: 0,
    locked: false,
    menuT: 0,
    errors: [],
    clearDelay: -1,
    hitCandidates: [],

    init: function () {
      var canvas = $('scene');
      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvas, antialias: true, powerPreference: 'high-performance'
        });
      } catch (err) {
        this.fatal('无法初始化 WebGL：' + err.message);
        return;
      }
      this.canvas = canvas;
      this.renderer = renderer;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.55;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.1, 6000);
      this.camera.rotation.order = 'YXZ';
      this.camera.layers.enable(1);
      this.scene.add(this.camera);

      this.clock = new THREE.Clock();
      this.input = {
        forward: false, back: false, left: false, right: false,
        jump: false, sprint: false, fire: false
      };

      this.hud = new Hud(this);
      this.player = new G.Player(this);
      G.FX.init(this);
      G.Enemies.init(this);
      G.Weapons.init(this);

      this.bindEvents();
      this.loadLevel(0, true);

      var self = this;
      function loop() {
        requestAnimationFrame(loop);
        var dt = Math.min(self.clock.getDelta(), 0.05);
        self.update(dt);
        self.renderer.render(self.scene, self.camera);
      }
      loop();
    },

    fatal: function (msg) {
      var el = $('errors');
      el.textContent = msg;
      this.errors.push(msg);
    },

    /* ---------------- 关卡 ---------------- */
    loadLevel: function (index, menu) {
      if (this.world) this.world.dispose();
      G.FX.clear();
      G.Enemies.clear();

      this.levelIndex = index;
      this.level = G.LEVELS[index];
      this.stats = { kills: 0, heads: 0, shots: 0, hits: 0, time: 0 };
      this.levelTime = 0;
      this.clearDelay = -1;
      this.shake = 0;
      this.hitCandidates = [];
      this.world = G.World.build(this.level, this);
      this.player.reset(this.world);
      this.player.model.visible = false;

      this.hud.setLevel(this.level, index);
      this.hud.setWeapon(G.Weapons.index);
      this.hud.setViewMode(this.player.mode);
      this.hud.setHealth(100);
      this.hud.setEnemies(0);

      if (menu) {
        this.player.model.visible = false;
        for (var i = 0; i < G.Weapons.viewmodels.length; i++) {
          G.Weapons.viewmodels[i].visible = false;
          G.Weapons.charGuns[i].visible = false;
        }
        this.camera.fov = 58;
        this.camera.updateProjectionMatrix();
        this.menuT = 0;
        this.hud.hide();
      }
    },

    startLevel: function () {
      this.loadLevel(this.levelIndex, false);
      this.state = 'playing';
      this.hud.show();
      G.Enemies.spawnAll(this.world, this);
      this.hud.banner(
        'STAGE 0' + (this.levelIndex + 1) + ' · ' + this.level.en,
        this.level.name,
        this.level.desc
      );
      this.toast('目标：肃清 ' + this.totalEnemies() + ' 个敌对单位');
      G.Weapons.refreshVisibility();
      G.Weapons.equip(G.Weapons.index, true);
      this.player.model.visible = this.player.mode === 'tps';
      this.player.model.rotation.z = 0;
      G.Audio.startAmbience(this.levelIndex);
      this.hud.crosshair(10, true);
      this.updateHUD();
    },

    totalEnemies: function () {
      var n = 0;
      var p = this.world.enemyPlan || [];
      for (var i = 0; i < p.length; i++) n += p[i].count;
      return n;
    },

    startRun: function () {
      this.statsTotals = { kills: 0, heads: 0, shots: 0, hits: 0, time: 0 };
      this.levelIndex = 0;
      this.startLevel();
    },

    /* ---------------- 输入 ---------------- */
    requestLock: function () {
      if (document.pointerLockElement === this.canvas) return;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      try {
        var p = this.canvas.requestPointerLock();
        if (p && p.catch) p.catch(function () { /* 忽略 */ });
      } catch (e) { /* 忽略 */ }
    },

    exitLock: function () {
      if (document.pointerLockElement) document.exitPointerLock();
    },

    bindEvents: function () {
      var self = this;

      document.addEventListener('pointerlockchange', function () {
        self.locked = (document.pointerLockElement === self.canvas);
        if (!self.locked && self.state === 'playing') self.pause();
      });

      document.addEventListener('pointerlockerror', function () {
        self.toast('鼠标锁定失败，请点击画面重试');
      });

      window.addEventListener('mousemove', function (e) {
        if (!self.locked || self.state !== 'playing') return;
        self.player.applyLook(e.movementX || 0, e.movementY || 0);
      });

      window.addEventListener('mousedown', function (e) {
        if (self.state !== 'playing') return;
        if (!self.locked) { self.requestLock(); return; }
        if (e.button === 0) {
          self.input.fire = true;
          G.Weapons.onTrigger(true);
        } else if (e.button === 2) {
          self.player.ads = true;
        }
      });

      window.addEventListener('mouseup', function (e) {
        if (e.button === 0) {
          self.input.fire = false;
          G.Weapons.onTrigger(false);
        } else if (e.button === 2) {
          self.player.ads = false;
        }
      });

      window.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      window.addEventListener('wheel', function (e) {
        if (self.state !== 'playing') return;
        e.preventDefault();
        if (e.deltaY > 0) G.Weapons.next();
        else if (e.deltaY < 0) G.Weapons.prev();
      }, { passive: false });

      window.addEventListener('keydown', function (e) {
        switch (e.code) {
          case 'KeyW': self.input.forward = true; break;
          case 'KeyS': self.input.back = true; break;
          case 'KeyA': self.input.left = true; break;
          case 'KeyD': self.input.right = true; break;
          case 'Space': self.input.jump = true; e.preventDefault(); break;
          case 'ShiftLeft': case 'ShiftRight': self.input.sprint = true; break;
          case 'KeyV':
            if (self.state === 'playing') self.player.toggleMode();
            break;
          case 'Digit1':
            if (self.state === 'playing') G.Weapons.equip(0);
            break;
          case 'Digit2':
            if (self.state === 'playing') G.Weapons.equip(1);
            break;
          case 'Escape':
            if (self.state === 'playing') { self.exitLock(); self.pause(); }
            break;
        }
      });

      window.addEventListener('keyup', function (e) {
        switch (e.code) {
          case 'KeyW': self.input.forward = false; break;
          case 'KeyS': self.input.back = false; break;
          case 'KeyA': self.input.left = false; break;
          case 'KeyD': self.input.right = false; break;
          case 'Space': self.input.jump = false; break;
          case 'ShiftLeft': case 'ShiftRight': self.input.sprint = false; break;
        }
      });

      window.addEventListener('resize', function () {
        self.camera.aspect = window.innerWidth / window.innerHeight;
        self.camera.updateProjectionMatrix();
        self.renderer.setSize(window.innerWidth, window.innerHeight);
      });

      this.canvas.addEventListener('click', function () {
        if (self.state === 'playing' && !self.locked) self.requestLock();
      });

      /* -------- 按钮 -------- */
      $('btn-start').addEventListener('click', function () {
        G.Audio.init();
        G.Audio.resume();
        $('overlay-start').classList.add('hidden');
        self.hud.show();
        self.requestLock();
        self.startRun();
      });

      $('btn-resume').addEventListener('click', function () {
        $('overlay-pause').classList.add('hidden');
        self.state = 'playing';
        self.requestLock();
        G.Audio.resume();
      });

      $('btn-restart').addEventListener('click', function () {
        $('overlay-pause').classList.add('hidden');
        self.requestLock();
        self.startLevel();
      });

      $('btn-next').addEventListener('click', function () {
        if (self.levelIndex >= G.LEVELS.length - 1) return;
        $('overlay-clear').classList.add('hidden');
        self.requestLock();
        self.fade(function () {
          self.levelIndex++;
          self.startLevel();
        });
      });

      $('btn-retry').addEventListener('click', function () {
        $('overlay-fail').classList.add('hidden');
        self.requestLock();
        self.startLevel();
      });

      $('btn-menu').addEventListener('click', function () {
        $('overlay-fail').classList.add('hidden');
        $('overlay-start').classList.remove('hidden');
        G.Audio.stopAmbience();
        self.exitLock();
        self.state = 'menu';
        self.loadLevel(0, true);
      });

      $('btn-again').addEventListener('click', function () {
        $('overlay-win').classList.add('hidden');
        self.requestLock();
        self.startRun();
      });

      window.addEventListener('error', function (e) {
        var name = (e.filename || '').split('/').pop();
        self.fatal('[JS] ' + e.message + ' @ ' + name + ':' + e.lineno);
      });
      window.addEventListener('unhandledrejection', function (e) {
        self.fatal('[Promise] ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
      });
    },

    fade: function (fn) {
      var fadeEl = $('fade');
      var self = this;
      this.state = 'loading';
      fadeEl.classList.add('show');
      setTimeout(function () {
        fn();
        setTimeout(function () { fadeEl.classList.remove('show'); }, 90);
      }, 340);
    },

    /* ---------------- 状态 ---------------- */
    pause: function () {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      this.input.fire = false;
      this.player.ads = false;
      G.Weapons.onTrigger(false);
      $('overlay-pause').classList.remove('hidden');
      this.hud.crosshair(10, false);
    },

    addShake: function (v) {
      this.shake = Math.min(2.2, this.shake + v);
    },

    damagePlayer: function (n) {
      this.player.takeDamage(n);
    },

    onPlayerDamaged: function (amount) {
      this.addShake(0.75);
      this.hud.flash(this.player.health < 35 || amount > 13);
      this.hud.setHealth(this.player.health);
    },

    onPlayerDeath: function () {
      this.state = 'dead';
      this.input.fire = false;
      this.player.ads = false;
      G.Weapons.onTrigger(false);
      this.exitLock();
      G.Enemies.clearProjectiles();
      G.Audio.stopAmbience();
      G.Audio.defeat();
      $('overlay-fail').classList.remove('hidden');
      this.hud.crosshair(10, false);
      this.player.model.visible = true;
      this.player.model.rotation.z = 1.35;
      this.player.model.position.y = this.player.pos.y + 0.1;
    },

    registerKill: function (enemy, headshot) {
      this.stats.kills++;
      if (headshot) this.stats.heads++;
      this.hud.setEnemies(G.Enemies.aliveCount());
      var enemyName = (enemy.def && enemy.def.name) ? enemy.def.name : '目标';
      this.toast((headshot ? '爆头击杀 · ' : '已摧毁 · ') + enemyName);
    },

    finishLevel: function () {
      this.state = 'clear';
      this.exitLock();
      this.player.ads = false;
      G.Enemies.clearProjectiles();
      G.Audio.stopAmbience();
      G.Audio.levelClear();
      this.hud.crosshair(10, false);

      this.stats.time = this.levelTime;
      this.statsTotals.kills += this.stats.kills;
      this.statsTotals.heads += this.stats.heads;
      this.statsTotals.shots += this.stats.shots;
      this.statsTotals.hits += this.stats.hits;
      this.statsTotals.time += this.stats.time;

      var acc = this.stats.shots > 0 ? Math.round(this.stats.hits / this.stats.shots * 100) : 100;

      if (this.levelIndex >= G.LEVELS.length - 1) {
        var tacc = this.statsTotals.shots > 0 ? Math.round(this.statsTotals.hits / this.statsTotals.shots * 100) : 100;
        $('win-kills').textContent = this.statsTotals.kills;
        $('win-heads').textContent = this.statsTotals.heads;
        $('win-acc').textContent = tacc + '%';
        $('win-time').textContent = fmtTime(this.statsTotals.time);
        $('overlay-win').classList.remove('hidden');
        return;
      }

      $('clear-kicker').textContent = 'STAGE 0' + (this.levelIndex + 1) + ' CLEAR';
      $('clear-title').textContent = this.level.name + ' · 已肃清';
      $('clear-sub').textContent = this.levelIndex < G.LEVELS.length - 2
        ? '区域安全，下一片战场已解锁。'
        : '只剩最后一座要塞，做好准备。';
      $('stat-kills').textContent = this.stats.kills;
      $('stat-heads').textContent = this.stats.heads;
      $('stat-acc').textContent = acc + '%';
      $('stat-time').textContent = fmtTime(this.stats.time);
      $('overlay-clear').classList.remove('hidden');
    },

    /* ---------------- 更新 ---------------- */
    update: function (dt) {
      var i;

      if (this.state === 'menu') {
        this.menuT += dt * 0.055;
        var t = this.menuT;
        this.camera.position.set(Math.cos(t) * 74, 27 + Math.sin(t * 0.7) * 7, Math.sin(t) * 74);
        this.camera.lookAt(0, 6, 0);
        this.camera.rotation.order = 'YXZ';
        this.world.update(dt, this.camera);
        G.FX.update(dt);
        return;
      }

      if (this.state === 'loading') return;

      if (this.state === 'playing') {
        this.player.update(dt, this.input);
        G.Weapons.update(dt);
        G.Enemies.update(dt, this);
        this.levelTime += dt;
        this.stats.time = this.levelTime;

        // 命中候选缓存
        this.hitCandidates = [];
        for (i = 0; i < G.Enemies.list.length; i++) {
          if (G.Enemies.list[i].alive) this.hitCandidates.push(G.Enemies.list[i].group);
        }
        for (i = 0; i < this.world.propMeshes.length; i++) this.hitCandidates.push(this.world.propMeshes[i]);

        // 关卡肃清判定
        if (G.Enemies.aliveCount() === 0) {
          if (this.clearDelay < 0) this.clearDelay = 1.6;
          this.clearDelay -= dt;
          if (this.clearDelay <= 0) this.finishLevel();
        }

        this.hud.setHealth(this.player.health);
        this.hud.setEnemies(G.Enemies.aliveCount());
        var w = G.WEAPONS[G.Weapons.index];
        var spread = (this.player.ads ? w.adsSpread : w.spread)
          + Math.hypot(this.player.vel.x, this.player.vel.z) * 0.0011
          + G.Weapons.kick * 0.016;
        this.hud.crosshair(9 + spread * 430, true);
      } else {
        // 暂停 / 结算 / 死亡：保持环境动态
        G.Weapons.update(dt);
      }

      this.shake = Math.max(0, this.shake - dt * 5.5);
      this.world.update(dt, this.camera);
      G.FX.update(dt);
    },

    getHitCandidates: function () {
      return this.hitCandidates;
    },

    showHitmarker: function (head) {
      this.hud.hit(head);
    },

    toast: function (msg) {
      if (this.hud) this.hud.toast(msg);
    },

    updateCrosshair: function () {
      var w = G.WEAPONS[G.Weapons.index];
      var spread = (this.player.ads ? w.adsSpread : w.spread) + G.Weapons.kick * 0.016;
      this.hud.crosshair(9 + spread * 430, this.state === 'playing');
    },

    updateHUD: function () {
      this.hud.setHealth(this.player.health);
      this.hud.setEnemies(G.Enemies.aliveCount());
    }
  };

  window.G.Game = Game;

  function boot() {
    try {
      Game.init();
    } catch (err) {
      var el = document.getElementById('errors');
      if (el) el.textContent = '启动失败：' + err.message + '\n' + (err.stack || '');
      Game.errors.push(err.message);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
  else document.addEventListener('DOMContentLoaded', boot);

  window.__game = Game;
})();
