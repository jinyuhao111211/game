/* ============================================================
 *  util.js — 数学工具、程序化噪声与贴图
 * ============================================================ */
(function () {
  'use strict';
  var G = window.G = window.G || {};

  G.TAU = Math.PI * 2;

  G.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  G.lerp = function (a, b, t) { return a + (b - a) * t; };
  G.damp = function (a, b, lambda, dt) { return G.lerp(a, b, 1 - Math.exp(-lambda * dt)); };
  G.smoothstep = function (e0, e1, x) {
    var t = G.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  G.rand = function (a, b) {
    if (b === undefined) { b = a; a = 0; }
    return a + Math.random() * (b - a);
  };
  G.randInt = function (a, b) { return Math.floor(G.rand(a, b + 1)); };
  G.choice = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  G.seedRandom = function (seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };

  /* ---------- 噪声 ---------- */
  G.Noise = function (seed) {
    var s = (seed || 1) * 127.1 + 7.31;
    function h2(x, y) {
      var v = Math.sin(x * 127.1 + y * 311.7 + s) * 43758.5453123;
      return v - Math.floor(v);
    }
    function noise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
      return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    }
    function fbm(x, y, oct) {
      oct = oct || 4;
      var amp = 0.5, sum = 0, norm = 0;
      for (var i = 0; i < oct; i++) {
        sum += amp * noise(x, y);
        norm += amp;
        x = x * 2.03 + 1.7;
        y = y * 1.97 + 3.1;
        amp *= 0.5;
      }
      return sum / norm;
    }
    return { noise: noise, fbm: fbm };
  };

  /* ---------- Canvas 工具 ---------- */
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h || w;
    return c;
  }
  G.makeCanvas = makeCanvas;

  /* ---------- 程序化贴图 ---------- */
  G.Tex = {
    _cache: {},
    _get: function (key, fn) {
      if (!this._cache[key]) this._cache[key] = fn();
      return this._cache[key];
    },

    /* 地表细节（灰度，乘以顶点色） */
    groundDetail: function () {
      return this._get('groundDetail', function () {
        var size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
        var img = ctx.createImageData(size, size), n = G.Noise(7);
        for (var y = 0; y < size; y++) {
          for (var x = 0; x < size; x++) {
            var i = (y * size + x) * 4;
            var v = 0.70 + 0.30 * n.fbm(x * 0.05, y * 0.05, 4);
            v = G.clamp(v, 0, 1);
            var g = Math.floor(255 * v);
            img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g; img.data[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        for (var k = 0; k < 2400; k++) {
          ctx.fillStyle = 'rgba(0,0,0,' + G.rand(0.04, 0.2).toFixed(3) + ')';
          var s = G.rand(0.6, 2.4);
          ctx.fillRect(Math.random() * size, Math.random() * size, s, s);
        }
        for (var j = 0; j < 700; j++) {
          ctx.fillStyle = 'rgba(255,255,255,' + G.rand(0.03, 0.1).toFixed(3) + ')';
          ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
        }
        var t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
      });
    },

    /* 岩石 / 混凝土细节 */
    rock: function () {
      return this._get('rock', function () {
        var size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
        var n = G.Noise(23);
        var img = ctx.createImageData(size, size);
        for (var y = 0; y < size; y++) {
          for (var x = 0; x < size; x++) {
            var i = (y * size + x) * 4;
            var v = 0.55 + 0.45 * n.fbm(x * 0.028, y * 0.028, 5);
            var crack = Math.abs(n.fbm(x * 0.012, y * 0.012, 3) - 0.5);
            if (crack < 0.012) v *= 0.55;
            var g = Math.floor(255 * G.clamp(v, 0, 1));
            img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g; img.data[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        var t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
      });
    },

    /* 集装箱 / 木箱面板 */
    crate: function () {
      return this._get('crate', function () {
        var size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
        ctx.fillStyle = '#8d99a3'; ctx.fillRect(0, 0, size, size);
        var n = G.Noise(41);
        for (var y = 0; y < size; y += 2) {
          var shade = 0.82 + 0.18 * n.noise(y * 0.25, 3.4);
          ctx.fillStyle = 'rgba(0,0,0,' + (0.10 * (1 - shade)).toFixed(3) + ')';
          ctx.fillRect(0, y, size, 1);
        }
        ctx.strokeStyle = 'rgba(30,38,44,0.85)'; ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, size - 10, size - 10);
        ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, size - 32, size - 32);
        ctx.fillStyle = 'rgba(20,26,31,0.8)';
        for (var cx = 0; cx < 4; cx++) {
          for (var cy = 0; cy < 4; cy++) {
            ctx.beginPath();
            ctx.arc(22 + cx * 70, 22 + cy * 70, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(0, size * 0.5 - 3, size, 6);
        var t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.encoding = THREE.sRGBEncoding;
        return t;
      });
    },

    /* 金属拉丝（枪械） */
    metal: function () {
      return this._get('metal', function () {
        var size = 128, c = makeCanvas(size), ctx = c.getContext('2d');
        var grd = ctx.createLinearGradient(0, 0, size, size);
        grd.addColorStop(0, '#a8b4c0'); grd.addColorStop(0.5, '#77828e'); grd.addColorStop(1, '#aab6c2');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, size, size);
        for (var i = 0; i < 900; i++) {
          ctx.fillStyle = 'rgba(255,255,255,' + G.rand(0.02, 0.12).toFixed(3) + ')';
          ctx.fillRect(Math.random() * size, Math.random() * size, G.rand(4, 26), 1);
        }
        for (var j = 0; j < 300; j++) {
          ctx.fillStyle = 'rgba(0,0,0,' + G.rand(0.03, 0.16).toFixed(3) + ')';
          ctx.fillRect(Math.random() * size, Math.random() * size, G.rand(3, 18), 1);
        }
        var t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.encoding = THREE.sRGBEncoding;
        return t;
      });
    },

    /* 云层 alpha 贴图 */
    clouds: function () {
      return this._get('clouds', function () {
        var w = 1024, h = 512, c = makeCanvas(w, h), ctx = c.getContext('2d');
        var n = G.Noise(88);
        var img = ctx.createImageData(w, h);
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var i = (y * w + x) * 4;
            var u = x / w, v = y / h;
            var band = 1 - Math.abs(v - 0.56) / 0.5;
            band = G.clamp(band, 0, 1);
            var base = n.fbm(x * 0.0052, y * 0.009, 5) * 0.65 + n.fbm(x * 0.02, y * 0.035, 4) * 0.35;
            var a = G.smoothstep(0.50, 0.74, base * (0.55 + band * 0.65));
            img.data[i] = 245; img.data[i + 1] = 249; img.data[i + 2] = 255;
            img.data[i + 3] = Math.floor(a * 190);
          }
        }
        ctx.putImageData(img, 0, 0);
        var t = new THREE.CanvasTexture(c);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.ClampToEdgeWrapping;
        return t;
      });
    },

    /* 枪口火焰 */
    flash: function () {
      return this._get('flash', function () {
        var size = 256, c = makeCanvas(size), ctx = c.getContext('2d');
        var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.18, 'rgba(255,236,190,1)');
        g.addColorStop(0.4, 'rgba(255,170,60,0.72)');
        g.addColorStop(0.7, 'rgba(255,110,20,0.22)');
        g.addColorStop(1, 'rgba(255,70,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
        ctx.translate(size / 2, size / 2);
        for (var i = 0; i < 6; i++) {
          ctx.rotate(Math.PI / 3);
          var lg = ctx.createLinearGradient(0, 0, size * 0.5, 0);
          lg.addColorStop(0, 'rgba(255,245,215,0.95)');
          lg.addColorStop(1, 'rgba(255,140,20,0)');
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(0, -11); ctx.lineTo(size * 0.48, 0); ctx.lineTo(0, 11);
          ctx.closePath(); ctx.fill();
        }
        var t = new THREE.CanvasTexture(c);
        return t;
      });
    },

    /* 火花粒子 */
    spark: function () {
      return this._get('spark', function () {
        var size = 64, c = makeCanvas(size), ctx = c.getContext('2d');
        var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.35, 'rgba(255,230,170,0.9)');
        g.addColorStop(1, 'rgba(255,140,50,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
        var t = new THREE.CanvasTexture(c);
        return t;
      });
    },

    /* 敌方弹药光晕 */
    bolt: function () {
      return this._get('bolt', function () {
        var size = 64, c = makeCanvas(size), ctx = c.getContext('2d');
        var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.3, 'rgba(255,150,90,0.9)');
        g.addColorStop(1, 'rgba(255,60,30,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(c);
      });
    },

    /* 软光晕（爆炸 / 传送） */
    glow: function () {
      return this._get('glow', function () {
        var size = 128, c = makeCanvas(size), ctx = c.getContext('2d');
        var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.25, 'rgba(160,245,255,0.8)');
        g.addColorStop(0.6, 'rgba(60,180,255,0.25)');
        g.addColorStop(1, 'rgba(0,80,160,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
        return new THREE.CanvasTexture(c);
      });
    }
  };
})();
