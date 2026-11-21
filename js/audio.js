/* ============================================================
 *  audio.js — WebAudio 程序化音效（无需外部音频文件）
 * ============================================================ */
(function () {
  'use strict';
  var G = window.G;

  G.Audio = {
    ctx: null,
    master: null,
    noiseBuf: null,
    amb: null,
    enabled: true,

    init: function () {
      if (this.ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this._makeNoise();
    },

    resume: function () {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    _makeNoise: function () {
      var ctx = this.ctx, len = Math.floor(ctx.sampleRate * 2);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        last = (last + 0.022 * w) / 1.022;
        d[i] = G.clamp(last * 3.2, -1, 1);
      }
      return buf;
    },

    _noise: function (loop) {
      var s = this.ctx.createBufferSource();
      s.buffer = this.noiseBuf;
      s.loop = !!loop;
      return s;
    },

    _t: function () { return this.ctx.currentTime; },

    _env: function (peak, attack, decay, t0) {
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
      return g;
    },

    shot: function (kind) {
      if (!this.ctx) return;
      var t = this._t();
      var shotgun = kind === 'shotgun';

      var n = this._noise(true);
      var lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(shotgun ? 2100 : 3600, t);
      lp.frequency.exponentialRampToValueAtTime(shotgun ? 260 : 700, t + (shotgun ? 0.25 : 0.1));
      lp.Q.value = 0.9;
      var ng = this._env(shotgun ? 0.85 : 0.5, 0.004, shotgun ? 0.3 : 0.12, t);
      n.connect(lp); lp.connect(ng); ng.connect(this.master);
      n.start(t); n.stop(t + 0.6);

      var osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(shotgun ? 105 : 165, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      var og = this._env(shotgun ? 0.55 : 0.34, 0.004, 0.2, t);
      osc.connect(og); og.connect(this.master);
      osc.start(t); osc.stop(t + 0.3);

      var click = this.ctx.createOscillator();
      click.type = 'square';
      click.frequency.value = shotgun ? 240 : 520;
      var cg = this._env(0.06, 0.002, 0.03, t);
      click.connect(cg); cg.connect(this.master);
      click.start(t); click.stop(t + 0.05);
    },

    hit: function (head) {
      if (!this.ctx) return;
      var t = this._t();
      var o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(head ? 1900 : 1250, t);
      o.frequency.exponentialRampToValueAtTime(head ? 1500 : 900, t + 0.07);
      var g = this._env(head ? 0.17 : 0.1, 0.003, 0.09, t);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.14);
    },

    kill: function () {
      if (!this.ctx) return;
      var t = this._t();
      var n = this._noise(true);
      var bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
      var ng = this._env(0.22, 0.01, 0.35, t);
      n.connect(bp); bp.connect(ng); ng.connect(this.master);
      n.start(t); n.stop(t + 0.5);

      var o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.3);
      var og = this._env(0.09, 0.01, 0.3, t);
      o.connect(og); og.connect(this.master);
      o.start(t); o.stop(t + 0.4);
    },

    hurt: function () {
      if (!this.ctx) return;
      var t = this._t();
      var o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
      var g = this._env(0.35, 0.005, 0.25, t);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.32);

      var n = this._noise(true);
      var lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 800;
      var ng = this._env(0.2, 0.005, 0.18, t);
      n.connect(lp); lp.connect(ng); ng.connect(this.master);
      n.start(t); n.stop(t + 0.3);
    },

    laser: function () {
      if (!this.ctx) return;
      var t = this._t();
      var o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1250, t);
      o.frequency.exponentialRampToValueAtTime(340, t + 0.16);
      var g = this._env(0.045, 0.005, 0.15, t);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.2);
    },

    switchGun: function () {
      if (!this.ctx) return;
      var t = this._t();
      [0, 0.09].forEach(function (d, i) {
        var o = G.Audio.ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = i ? 680 : 420;
        var g = G.Audio._env(0.05, 0.002, 0.05, t + d);
        o.connect(g); g.connect(G.Audio.master);
        o.start(t + d); o.stop(t + d + 0.07);
      });
    },

    levelClear: function () {
      if (!this.ctx) return;
      var t = this._t();
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        var o = G.Audio.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        var g = G.Audio._env(0.09, 0.01, 0.5, t + i * 0.13);
        o.connect(g); g.connect(G.Audio.master);
        o.start(t + i * 0.13); o.stop(t + i * 0.13 + 0.7);
      });
    },

    defeat: function () {
      if (!this.ctx) return;
      var t = this._t();
      [392, 311, 233, 155].forEach(function (f, i) {
        var o = G.Audio.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        var g = G.Audio._env(0.07, 0.02, 0.6, t + i * 0.2);
        var lp = G.Audio.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 900;
        o.connect(lp); lp.connect(g); g.connect(G.Audio.master);
        o.start(t + i * 0.2); o.stop(t + i * 0.2 + 0.85);
      });
    },

    startAmbience: function (level) {
      if (!this.ctx) return;
      this.stopAmbience();
      var ctx = this.ctx;
      var src = this._noise(true);
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = level >= 4 ? 380 : 620;
      var g = ctx.createGain();
      g.gain.value = 0.0;
      g.gain.linearRampToValueAtTime(level >= 4 ? 0.075 : 0.055, ctx.currentTime + 2.2);
      var lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 0.09;
      var lfoGain = ctx.createGain(); lfoGain.gain.value = 220;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
      lfo.start();
      src.connect(lp); lp.connect(g); g.connect(this.master);
      src.start();
      this.amb = { src: src, gain: g, lfo: lfo };
    },

    stopAmbience: function () {
      if (!this.amb) return;
      var a = this.amb, ctx = this.ctx;
      try {
        a.gain.gain.cancelScheduledValues(ctx.currentTime);
        a.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
        a.src.stop(ctx.currentTime + 0.8);
        a.lfo.stop(ctx.currentTime + 0.8);
      } catch (e) { /* ignore */ }
      this.amb = null;
    }
  };
})();
