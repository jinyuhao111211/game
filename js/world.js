/* ============================================================
 *  world.js — 五套关卡场景：天空、反射海面、地形与道具
 * ============================================================ */
(function () {
  'use strict';
  var G = window.G;

  function C(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  /* ================= 关卡配置 ================= */
  var LEVELS = G.LEVELS = [
    {
      id: 1, name: '海岛前哨', en: 'ISLAND OUTPOST',
      desc: '潜入热带群岛的前哨基地，肃清全部巡逻单位。',
      theme: {
        seed: 11, sunElevation: 40, sunAzimuth: 128, turbidity: 3.2, rayleigh: 1.35,
        mieCoefficient: 0.006, mieDirectionalG: 0.8, exposure: 0.52, hill: 1.0,
        fog: { color: 0x9fc9dc, density: 0.0016 },
        water: { deep: 0x073038, shallow: 0x2fb3a8, wave: 0.62, speed: 1.0, spec: 1.5 },
        palette: { sand: 0xd9c78f, mid: 0x5d8a49, high: 0x8a7f68, rock: 0x6a6152, foliage: 0x3f7a3a, mountain: 0x6f8894 },
        sunColor: 0xfff0d0, sunIntensity: 2.3, hemiSky: 0xbfe4ff, hemiGround: 0x54634a, hemiIntensity: 0.65,
        props: { palm: 17, rock: 24, crate: 12, container: 0, ice: 0, pillar: 0, pylon: 0, barrel: 4 }
      },
      enemies: [{ type: 'trooper', count: 5 }, { type: 'drone', count: 2 }]
    },
    {
      id: 2, name: '极地残响', en: 'POLAR ECHO',
      desc: '冰封群岛的旧科研站仍在发送信号，清除所有守卫。',
      theme: {
        seed: 37, sunElevation: 16, sunAzimuth: 58, turbidity: 4.5, rayleigh: 2.0,
        mieCoefficient: 0.004, mieDirectionalG: 0.85, exposure: 0.5, hill: 1.15,
        fog: { color: 0xc4dce8, density: 0.0021 },
        water: { deep: 0x08202e, shallow: 0x5aa8c0, wave: 0.42, speed: 0.8, spec: 1.7 },
        palette: { sand: 0xdce9ef, mid: 0xa9c3d1, high: 0xc9dde6, rock: 0x5b6c78, foliage: 0x8fb8c4, mountain: 0x8fa5b3 },
        sunColor: 0xe6f4ff, sunIntensity: 1.9, hemiSky: 0xd4ecff, hemiGround: 0x8aa3b0, hemiIntensity: 0.75,
        props: { palm: 0, rock: 20, crate: 4, container: 2, ice: 26, pillar: 7, pylon: 0, barrel: 2 }
      },
      enemies: [{ type: 'trooper', count: 6 }, { type: 'drone', count: 3 }]
    },
    {
      id: 3, name: '落日港湾', en: 'SUNSET HARBOR',
      desc: '黄昏的货运港被武装接管，清空码头并切断他们的火力。',
      theme: {
        seed: 73, sunElevation: 9, sunAzimuth: 198, turbidity: 8, rayleigh: 2.4,
        mieCoefficient: 0.014, mieDirectionalG: 0.82, exposure: 0.62, hill: 0.9,
        fog: { color: 0xe0a273, density: 0.0018 },
        water: { deep: 0x1b2636, shallow: 0x9a6a52, wave: 0.55, speed: 0.9, spec: 2.1 },
        palette: { sand: 0xbaa583, mid: 0x6f6550, high: 0x655c4f, rock: 0x4e4740, foliage: 0x6f7a44, mountain: 0x7a6355 },
        sunColor: 0xffc088, sunIntensity: 2.1, hemiSky: 0xffc9a0, hemiGround: 0x4c4238, hemiIntensity: 0.55,
        props: { palm: 3, rock: 12, crate: 16, container: 9, ice: 0, pillar: 5, pylon: 0, barrel: 10 }
      },
      enemies: [{ type: 'trooper', count: 7 }, { type: 'drone', count: 3 }, { type: 'heavy', count: 2 }]
    },
    {
      id: 4, name: '荒漠绿洲', en: 'DESERT OASIS',
      desc: '峡谷深处的绿洲藏着一座地下军火库，消灭全部护卫。',
      theme: {
        seed: 137, sunElevation: 66, sunAzimuth: 214, turbidity: 3.4, rayleigh: 0.95,
        mieCoefficient: 0.005, mieDirectionalG: 0.78, exposure: 0.56, hill: 1.25,
        fog: { color: 0xe6cda0, density: 0.0014 },
        water: { deep: 0x0a3434, shallow: 0x42b6a2, wave: 0.5, speed: 1.1, spec: 1.3 },
        palette: { sand: 0xd8b276, mid: 0xb08c58, high: 0xa8754c, rock: 0x8a5f3f, foliage: 0x54803f, mountain: 0xa07a55 },
        sunColor: 0xfff4d8, sunIntensity: 2.9, hemiSky: 0xffe8c0, hemiGround: 0x8a6a44, hemiIntensity: 0.6,
        props: { palm: 18, rock: 26, crate: 5, container: 0, ice: 0, pillar: 9, pylon: 0, barrel: 3 }
      },
      enemies: [{ type: 'trooper', count: 8 }, { type: 'drone', count: 3 }, { type: 'heavy', count: 2 }]
    },
    {
      id: 5, name: '深渊要塞', en: 'ABYSS FORTRESS',
      desc: '血色的风暴笼罩着最终要塞，击败守卫它的巨型作战单元。',
      theme: {
        seed: 211, sunElevation: 3.5, sunAzimuth: 296, turbidity: 11, rayleigh: 3.2,
        mieCoefficient: 0.028, mieDirectionalG: 0.86, exposure: 0.85, hill: 1.05, storm: true,
        fog: { color: 0x3d1a22, density: 0.002 },
        water: { deep: 0x0d0710, shallow: 0x4c1d2c, wave: 0.85, speed: 1.35, spec: 2.4 },
        palette: { sand: 0x4a3a38, mid: 0x37302e, high: 0x2c2625, rock: 0x221d1d, foliage: 0x3f4a36, mountain: 0x241a1e },
        sunColor: 0xff6a4a, sunIntensity: 2.2, hemiSky: 0xb45a6a, hemiGround: 0x3a2a2c, hemiIntensity: 0.78,
        props: { palm: 0, rock: 14, crate: 14, container: 7, ice: 0, pillar: 14, pylon: 9, barrel: 6 }
      },
      enemies: [{ type: 'trooper', count: 9 }, { type: 'drone', count: 4 }, { type: 'heavy', count: 2 }, { type: 'boss', count: 1 }]
    }
  ];

  /* ================= 水面着色器 ================= */
  var WaterShader = {
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3) },
      uSunColor: { value: C(0xffffff) },
      uDeep: { value: C(0x073038) },
      uShallow: { value: C(0x2fb3a8) },
      uWave: { value: 0.6 },
      uSpec: { value: 1.5 },
      uFogColor: { value: C(0x9fc9dc) },
      uFogDensity: { value: 0.0016 },
      uCamPos: { value: new THREE.Vector3() }
    },
    vertexShader: [
      'uniform mat4 textureMatrix;',
      'varying vec4 vUv;',
      'varying vec3 vWorld;',
      'varying vec2 vXZ;',
      'void main() {',
      '  vUv = textureMatrix * vec4(position, 1.0);',
      '  vec4 wp = modelMatrix * vec4(position, 1.0);',
      '  vWorld = wp.xyz;',
      '  vXZ = wp.xz;',
      '  gl_Position = projectionMatrix * viewMatrix * wp;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform float uTime;',
      'uniform float uWave;',
      'uniform float uSpec;',
      'uniform float uFogDensity;',
      'uniform vec3 uSunDir;',
      'uniform vec3 uSunColor;',
      'uniform vec3 uDeep;',
      'uniform vec3 uShallow;',
      'uniform vec3 uFogColor;',
      'uniform vec3 uCamPos;',
      'varying vec4 vUv;',
      'varying vec3 vWorld;',
      'varying vec2 vXZ;',
      'float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
      'float vnoise(vec2 p) {',
      '  vec2 i = floor(p), f = fract(p);',
      '  f = f * f * (3.0 - 2.0 * f);',
      '  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));',
      '  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));',
      '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
      '}',
      'float waves(vec2 p) {',
      '  float t = uTime;',
      '  float h = sin(p.x * 0.11 + t * 1.1) * 0.55;',
      '  h += sin(p.y * 0.15 - t * 0.85) * 0.45;',
      '  h += sin((p.x + p.y) * 0.06 + t * 0.7) * 0.6;',
      '  h += sin((p.x * 0.7 - p.y) * 0.19 - t * 1.4) * 0.22;',
      '  h += vnoise(p * 0.55 + vec2(t * 0.12, -t * 0.09)) * 0.5;',
      '  h += vnoise(p * 1.7 - vec2(t * 0.2, t * 0.14)) * 0.22;',
      '  return h;',
      '}',
      'void main() {',
      '  vec2 p = vXZ;',
      '  float e = 0.75;',
      '  float hL = waves(p - vec2(e, 0.0));',
      '  float hR = waves(p + vec2(e, 0.0));',
      '  float hD = waves(p - vec2(0.0, e));',
      '  float hU = waves(p + vec2(0.0, e));',
      '  vec3 n = normalize(vec3((hL - hR) * uWave, 2.0 * e, (hD - hU) * uWave));',
      '  vec3 viewDir = normalize(uCamPos - vWorld);',
      '  vec4 uv4 = vUv;',
      '  uv4.xy += n.xz * 0.04 * uv4.w;',
      '  vec3 refl = texture2DProj(tDiffuse, uv4).rgb;',
      '  float ndv = clamp(dot(n, viewDir), 0.0, 1.0);',
      '  float fres = pow(1.0 - ndv, 3.0);',
      '  fres = mix(0.05, 0.95, fres);',
      '  float ripple = clamp(0.5 + (hL + hR + hU + hD) * 0.28, 0.0, 1.0);',
      '  vec3 water = mix(uDeep, uShallow, ripple * 0.42 + 0.1);',
      '  vec3 col = mix(water, refl, fres * 0.9);',
      '  vec3 hv = normalize(uSunDir + viewDir);',
      '  float spec = pow(max(dot(n, hv), 0.0), 260.0) * uSpec;',
      '  col += uSunColor * spec * 1.2;',
      '  float glit = pow(max(dot(n, hv), 0.0), 48.0) * 0.07;',
      '  col += uSunColor * glit;',
      '  float dist = length(uCamPos - vWorld);',
      '  float fogF = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);',
      '  col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));',
      '  gl_FragColor = vec4(col, 1.0);',
      '  #include <tonemapping_fragment>',
      '  #include <encodings_fragment>',
      '}'
    ].join('\n')
  };

  /* ================= 构建世界 ================= */
  G.World = {
    build: function (level, game) {
      var theme = level.theme;
      var scene = game.scene;
      var group = new THREE.Group();
      scene.add(group);

      var sunDir = new THREE.Vector3();
      var phi = THREE.MathUtils.degToRad(90 - theme.sunElevation);
      var theta = THREE.MathUtils.degToRad(theme.sunAzimuth);
      sunDir.setFromSphericalCoords(1, phi, theta);

      /* ---------- 天空 ---------- */
      var sky = new THREE.Sky();
      sky.scale.setScalar(5000);
      sky.material.uniforms.turbidity.value = theme.turbidity;
      sky.material.uniforms.rayleigh.value = theme.rayleigh;
      sky.material.uniforms.mieCoefficient.value = theme.mieCoefficient;
      sky.material.uniforms.mieDirectionalG.value = theme.mieDirectionalG;
      sky.material.uniforms.sunPosition.value.copy(sunDir);
      sky.frustumCulled = false;
      group.add(sky);

      /* ---------- 云层 ---------- */
      var cloudTex = G.Tex.clouds().clone();
      cloudTex.needsUpdate = true;
      cloudTex.wrapS = THREE.RepeatWrapping;
      var cloudMat = new THREE.MeshBasicMaterial({
        map: cloudTex, transparent: true, opacity: theme.storm ? 0.62 : 0.42,
        color: C(theme.storm ? 0xd08a90 : 0xffffff), side: THREE.BackSide,
        depthWrite: false, fog: false
      });
      var clouds = new THREE.Mesh(new THREE.SphereGeometry(2300, 42, 22, 0, Math.PI * 2, 0, Math.PI * 0.53), cloudMat);
      clouds.position.y = -60;
      clouds.frustumCulled = false;
      group.add(clouds);

      /* ---------- 光照 ---------- */
      var sunLight = new THREE.DirectionalLight(C(theme.sunColor), theme.sunIntensity);
      sunLight.position.copy(sunDir).multiplyScalar(260);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.left = -150;
      sunLight.shadow.camera.right = 150;
      sunLight.shadow.camera.top = 150;
      sunLight.shadow.camera.bottom = -150;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 620;
      sunLight.shadow.bias = -0.0006;
      sunLight.shadow.normalBias = 0.025;
      sunLight.target.position.set(0, 0, 0);
      group.add(sunLight);
      group.add(sunLight.target);

      var hemi = new THREE.HemisphereLight(C(theme.hemiSky), C(theme.hemiGround), theme.hemiIntensity);
      group.add(hemi);
      var fill = new THREE.AmbientLight(C(0xffffff), 0.12);
      group.add(fill);

      /* ---------- 地形高度 ---------- */
      var noise = G.Noise(theme.seed);
      var hill = theme.hill || 1;
      function heightAt(x, z) {
        var d = Math.hypot(x, z);
        var fall = 1 - G.smoothstep(102, 160, d);
        var f = noise.fbm(x * 0.014 + 11.3, z * 0.014 - 4.7, 4);
        var ridge = 1 - Math.abs(noise.fbm(x * 0.027 - 3.1, z * 0.027 + 8.2, 3) * 2 - 1);
        var h = -6 + fall * (9.5 * hill + (f * 0.72 + ridge * 0.28) * 16 * hill);
        var flat = 1 - G.smoothstep(18, 40, d);
        h = G.lerp(h, 4.2, flat * 0.9);
        return h;
      }

      /* ---------- 地形网格 ---------- */
      var geo = new THREE.PlaneGeometry(370, 370, 148, 148);
      geo.rotateX(-Math.PI / 2);
      var pos = geo.attributes.position;
      var colors = new Float32Array(pos.count * 3);
      var cSand = C(theme.palette.sand), cMid = C(theme.palette.mid);
      var cHigh = C(theme.palette.high), cRock = C(theme.palette.rock);
      var tmpC = new THREE.Color();

      for (var i = 0; i < pos.count; i++) {
        var x = pos.getX(i), z = pos.getZ(i);
        var h = heightAt(x, z);
        pos.setY(i, h);

        var tint = noise.fbm(x * 0.09, z * 0.09, 3);
        if (h < 0.9) tmpC.copy(cSand).multiplyScalar(0.72);
        else if (h < 2.4) tmpC.copy(cSand).lerp(cMid, G.smoothstep(0.9, 2.4, h) * 0.45);
        else if (h < 8.5) tmpC.copy(cSand).lerp(cMid, G.smoothstep(1.4, 5.0, h));
        else tmpC.copy(cMid).lerp(cHigh, G.smoothstep(8.5, 16, h));
        tmpC.lerp(cRock, G.smoothstep(0.35, 0.9, tint) * 0.55);
        tmpC.multiplyScalar(0.86 + tint * 0.28);
        colors[i * 3] = tmpC.r; colors[i * 3 + 1] = tmpC.g; colors[i * 3 + 2] = tmpC.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      var detail = G.Tex.groundDetail().clone();
      detail.needsUpdate = true;
      detail.repeat.set(95, 95);
      detail.wrapS = detail.wrapT = THREE.RepeatWrapping;

      var terrainMat = new THREE.MeshStandardMaterial({
        vertexColors: true, map: detail, roughness: 0.94, metalness: 0.02
      });
      var terrain = new THREE.Mesh(geo, terrainMat);
      terrain.receiveShadow = true;
      terrain.name = 'terrain';
      group.add(terrain);

      /* ---------- 水面（实时平面反射） ---------- */
      var water = null;
      var waterUniforms = null;
      try {
        var wgeo = new THREE.PlaneGeometry(4200, 4200, 1, 1);
        water = new THREE.Reflector(wgeo, {
          clipBias: 0.03,
          textureWidth: 1024,
          textureHeight: 1024,
          color: 0x8899aa,
          multisample: 0,
          shader: WaterShader
        });
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.02;
        water.material.uniforms.uSunDir.value.copy(sunDir);
        water.material.uniforms.uSunColor.value.copy(C(theme.sunColor));
        water.material.uniforms.uDeep.value.copy(C(theme.water.deep));
        water.material.uniforms.uShallow.value.copy(C(theme.water.shallow));
        water.material.uniforms.uWave.value = theme.water.wave;
        water.material.uniforms.uSpec.value = theme.water.spec;
        water.material.uniforms.uFogColor.value.copy(C(theme.fog.color));
        water.material.uniforms.uFogDensity.value = theme.fog.density;
        water.frustumCulled = false;
        group.add(water);
        waterUniforms = water.material.uniforms;
      } catch (err) {
        // 极端情况下退回普通水面
        var fallback = new THREE.Mesh(
          new THREE.PlaneGeometry(4200, 4200),
          new THREE.MeshStandardMaterial({ color: C(theme.water.deep), roughness: 0.12, metalness: 0.85 })
        );
        fallback.rotation.x = -Math.PI / 2;
        fallback.position.y = 0.02;
        group.add(fallback);
      }

      /* ---------- 远景山脉 ---------- */
      var mtnMat = new THREE.MeshBasicMaterial({ color: C(theme.palette.mountain), fog: true });
      for (var mi = 0; mi < 16; mi++) {
        var ang = (mi / 16) * Math.PI * 2 + G.rand(-0.14, 0.14);
        var rad = G.rand(520, 1040);
        var height = G.rand(55, 165);
        var mtn = new THREE.Mesh(new THREE.ConeGeometry(G.rand(70, 150), height, 5, 1), mtnMat);
        mtn.position.set(Math.cos(ang) * rad, height * 0.42 - 8, Math.sin(ang) * rad);
        mtn.rotation.y = G.rand(0, Math.PI);
        group.add(mtn);
      }

      /* ---------- 道具 ---------- */
      var rng = G.seedRandom(theme.seed * 7919 + 13);
      var solids = [];
      var propMeshes = [];
      var placed = [];

      var rockTex = G.Tex.rock().clone();
      rockTex.needsUpdate = true;
      rockTex.repeat.set(3, 3);

      var matRock = new THREE.MeshStandardMaterial({ color: C(theme.palette.rock), map: rockTex, roughness: 0.95, metalness: 0.03 });
      var matTrunk = new THREE.MeshStandardMaterial({ color: C(0x6b5136), roughness: 0.9 });
      var matLeaf = new THREE.MeshStandardMaterial({ color: C(theme.palette.foliage), roughness: 0.82, side: THREE.DoubleSide });
      var matCrate = new THREE.MeshStandardMaterial({ color: C(0xb8c2c8), map: G.Tex.crate(), roughness: 0.66, metalness: 0.16 });
      var matContainerA = new THREE.MeshStandardMaterial({ color: C(0x8a4a3a), map: G.Tex.crate(), roughness: 0.62, metalness: 0.3 });
      var matContainerB = new THREE.MeshStandardMaterial({ color: C(0x2f6470), map: G.Tex.crate(), roughness: 0.62, metalness: 0.3 });
      var matBarrel = new THREE.MeshStandardMaterial({ color: C(0x9a6a2f), roughness: 0.5, metalness: 0.55 });
      var matStone = new THREE.MeshStandardMaterial({ color: C(theme.palette.rock), roughness: 0.92, metalness: 0.02 });
      var matIce = new THREE.MeshStandardMaterial({
        color: C(0xcbe7f2), roughness: 0.14, metalness: 0.1, transparent: true, opacity: 0.82,
        envMapIntensity: 1.2
      });
      var matGlow = new THREE.MeshStandardMaterial({
        color: 0x081216, emissive: C(0x54d8ff), emissiveIntensity: 2.6, roughness: 0.4, metalness: 0.5
      });

      function registerProp(obj, radius, solid) {
        obj.traverse(function (o) {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            propMeshes.push(o);
          }
        });
        if (solid) solids.push({ x: obj.position.x, z: obj.position.z, r: radius });
      }

      function addProp(obj, x, z, radius, solid) {
        obj.position.x = x;
        obj.position.z = z;
        obj.position.y = heightAt(x, z) - 0.15;
        obj.rotation.y = rng() * Math.PI * 2;
        group.add(obj);
        registerProp(obj, radius, solid);
        placed.push({ x: x, z: z, r: radius });
        return obj;
      }

      function buildPalm() {
        var g = new THREE.Group();
        var h = 4.0 + rng() * 2.6;
        var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, h, 7), matTrunk);
        trunk.position.y = h / 2;
        trunk.rotation.z = (rng() - 0.5) * 0.18;
        g.add(trunk);
        var leafGeo = new THREE.ConeGeometry(0.62, 3.4, 4, 1, true);
        for (var i = 0; i < 7; i++) {
          var pivot = new THREE.Object3D();
          pivot.position.set(0, h, 0);
          pivot.rotation.y = (i / 7) * Math.PI * 2 + rng() * 0.3;
          var leaf = new THREE.Mesh(leafGeo, matLeaf);
          leaf.rotation.x = 1.15 + rng() * 0.2;
          leaf.position.set(0, 0.1, 1.45);
          leaf.scale.set(0.55, 1, 1);
          pivot.add(leaf);
          g.add(pivot);
        }
        for (var c = 0; c < 3; c++) {
          var nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), matTrunk);
          nut.position.set((rng() - 0.5) * 0.3, h - 0.25, (rng() - 0.5) * 0.3);
          g.add(nut);
        }
        return g;
      }

      function buildRock() {
        var g = new THREE.Group();
        var s = 0.9 + rng() * 1.9;
        var rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), matRock);
        rock.scale.set(s * (0.8 + rng() * 0.5), s * (0.55 + rng() * 0.8), s * (0.8 + rng() * 0.5));
        rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
        rock.position.y = s * 0.32;
        g.add(rock);
        if (rng() > 0.5) {
          var r2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), matRock);
          var s2 = s * 0.55;
          r2.scale.set(s2, s2 * 0.7, s2);
          r2.position.set(s * 0.9, s2 * 0.3, s * 0.4);
          r2.rotation.set(rng() * 3, rng() * 3, rng() * 3);
          g.add(r2);
        }
        g.userData.radius = s * 1.05;
        return g;
      }

      function buildCrate() {
        var g = new THREE.Group();
        var s = 1.15 + rng() * 0.4;
        var crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), matCrate);
        crate.position.y = s / 2;
        crate.rotation.y = rng() * 0.6;
        g.add(crate);
        var crate2 = new THREE.Mesh(new THREE.BoxGeometry(s * 0.75, s * 0.75, s * 0.75), matCrate);
        crate2.position.set(s * 0.32, s * 1.05, -s * 0.1);
        crate2.rotation.y = rng() * 0.8;
        g.add(crate2);
        g.userData.radius = s * 0.85;
        return g;
      }

      function buildContainer() {
        var g = new THREE.Group();
        var mat = rng() > 0.5 ? matContainerA : matContainerB;
        var body = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.6, 2.5), mat);
        body.position.y = 1.3;
        g.add(body);
        for (var i = -2; i <= 2; i++) {
          var rib = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 2.56), mat);
          rib.position.set(i * 1.25, 1.3, 0);
          g.add(rib);
        }
        g.userData.radius = 3.4;
        return g;
      }

      function buildBarrel() {
        var g = new THREE.Group();
        var b = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.25, 12), matBarrel);
        b.position.y = 0.63;
        g.add(b);
        var r1 = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.05, 5, 14), matBarrel);
        r1.rotation.x = Math.PI / 2; r1.position.y = 0.35; g.add(r1);
        var r2 = r1.clone(); r2.position.y = 0.95; g.add(r2);
        g.userData.radius = 0.6;
        return g;
      }

      function buildIce() {
        var g = new THREE.Group();
        var h = 3.0 + rng() * 5.5;
        var spike = new THREE.Mesh(new THREE.ConeGeometry(0.75 + rng() * 0.7, h, 6, 1), matIce);
        spike.position.y = h / 2;
        spike.rotation.z = (rng() - 0.5) * 0.22;
        g.add(spike);
        if (rng() > 0.45) {
          var h2 = h * 0.6;
          var s2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, h2, 6), matIce);
          s2.position.set(0.8, h2 / 2, 0.2);
          s2.rotation.z = -0.18;
          g.add(s2);
        }
        g.userData.radius = 0.9;
        return g;
      }

      function buildPillar() {
        var g = new THREE.Group();
        var h = 5 + rng() * 5;
        var p = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, h, 9), matStone);
        p.position.y = h / 2;
        g.add(p);
        var cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.4, 1.9), matStone);
        cap.position.y = h + 0.2;
        cap.rotation.y = rng();
        g.add(cap);
        g.userData.radius = 1.15;
        return g;
      }

      function buildPylon() {
        var g = new THREE.Group();
        var h = 6.5 + rng() * 3;
        var tower = new THREE.Mesh(new THREE.BoxGeometry(1.15, h, 1.15), matStone);
        tower.position.y = h / 2;
        g.add(tower);
        for (var i = 0; i < 3; i++) {
          var ringM = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.4), matGlow);
          ringM.position.y = h * (0.35 + i * 0.22);
          g.add(ringM);
        }
        var top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matGlow);
        top.position.y = h + 0.35;
        g.add(top);
        g.userData.radius = 1.1;
        return g;
      }

      var builders = {
        palm: buildPalm, rock: buildRock, crate: buildCrate, container: buildContainer,
        barrel: buildBarrel, ice: buildIce, pillar: buildPillar, pylon: buildPylon
      };

      function tryPlace(radius) {
        for (var t = 0; t < 46; t++) {
          var a = rng() * Math.PI * 2;
          var d = 22 + rng() * 112;
          var x = Math.cos(a) * d, z = Math.sin(a) * d;
          var h = heightAt(x, z);
          if (h < 1.1 || h > 20) continue;
          var ok = true;
          for (var p = 0; p < placed.length; p++) {
            var q = placed[p];
            if (Math.hypot(x - q.x, z - q.z) < q.r + radius + 1.8) { ok = false; break; }
          }
          if (!ok) continue;
          return { x: x, z: z };
        }
        return null;
      }

      var propCfg = theme.props || {};
      for (var kind in propCfg) {
        var count = propCfg[kind];
        var builder = builders[kind];
        if (!builder) continue;
        for (var n = 0; n < count; n++) {
          var obj = builder();
          var r = obj.userData.radius || 1;
          var spot = tryPlace(r);
          if (!spot) continue;
          addProp(obj, spot.x, spot.z, r, r > 0.7);
        }
      }

      // 出生点附近的掩体箱
      for (var k = 0; k < 4; k++) {
        var crateObj = buildCrate();
        var ang2 = (k / 4) * Math.PI * 2 + 0.5;
        var cx = Math.cos(ang2) * 27, cz = Math.sin(ang2) * 27;
        addProp(crateObj, cx, cz, crateObj.userData.radius, true);
      }

      /* ---------- 敌人出生点 ---------- */
      var enemySpawns = [];
      for (var es = 0; es < 20; es++) {
        var found = null;
        for (var tries = 0; tries < 40; tries++) {
          var ea = rng() * Math.PI * 2;
          var ed = 30 + rng() * 85;
          var ex = Math.cos(ea) * ed, ez = Math.sin(ea) * ed;
          if (heightAt(ex, ez) < 1.2) continue;
          var blocked = false;
          for (var pp = 0; pp < placed.length; pp++) {
            var qq = placed[pp];
            if (Math.hypot(ex - qq.x, ez - qq.z) < qq.r + 1.6) { blocked = true; break; }
          }
          if (blocked) continue;
          var tooClose = false;
          for (var q2 = 0; q2 < enemySpawns.length; q2++) {
            if (Math.hypot(ex - enemySpawns[q2].x, ez - enemySpawns[q2].z) < 5) { tooClose = true; break; }
          }
          if (tooClose) continue;
          found = { x: ex, z: ez };
          break;
        }
        if (found) enemySpawns.push(found);
      }

      // 兜底：确保有足够的出生点（环状扫描）
      if (enemySpawns.length < 12) {
        for (var rr = 34; rr <= 110 && enemySpawns.length < 20; rr += 8) {
          for (var ai = 0; ai < 12 && enemySpawns.length < 20; ai++) {
            var aa = (ai / 12) * Math.PI * 2 + rr * 0.13;
            var ax = Math.cos(aa) * rr, az = Math.sin(aa) * rr;
            if (heightAt(ax, az) < 1.2) continue;
            enemySpawns.push({ x: ax, z: az });
          }
        }
      }

      /* ---------- 环境参数 ---------- */
      game.scene.fog = new THREE.FogExp2(C(theme.fog.color), theme.fog.density);
      game.renderer.toneMappingExposure = theme.exposure;

      var world = {
        group: group,
        scene: scene,
        sky: sky,
        water: water,
        sunLight: sunLight,
        hemi: hemi,
        sunDir: sunDir,
        heightAt: heightAt,
        solids: solids,
        propMeshes: propMeshes,
        playerSpawn: { x: 0, z: 16, y: heightAt(0, 16) },
        enemySpawns: enemySpawns,
        enemyPlan: level.enemies,
        storm: !!theme.storm,
        stormTimer: 4,
        waterTime: 0,

        groundHit: function (origin, dir, maxDist) {
          var t = 1.0, step = 2.4;
          while (t < maxDist) {
            var x = origin.x + dir.x * t;
            var y = origin.y + dir.y * t;
            var z = origin.z + dir.z * t;
            if (y <= heightAt(x, z)) return t;
            t += step;
          }
          return Infinity;
        },

        update: function (dt, camera) {
          if (waterUniforms) {
            world.waterTime += dt;
            waterUniforms.uTime.value = world.waterTime * theme.water.speed;
            waterUniforms.uCamPos.value.copy(camera.position);
          }
          clouds.rotation.y += dt * 0.004;
          if (world.storm) {
            world.stormTimer -= dt;
            if (world.stormTimer <= 0) {
              world.stormTimer = G.rand(5, 11);
              hemi.intensity = theme.hemiIntensity + 2.2;
              setTimeout(function () { hemi.intensity = theme.hemiIntensity; }, 90);
              setTimeout(function () { hemi.intensity = theme.hemiIntensity + 1.2; }, 170);
              setTimeout(function () { hemi.intensity = theme.hemiIntensity; }, 300);
            }
          }
        },

        dispose: function () {
          scene.remove(group);
          group.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
              if (Array.isArray(o.material)) o.material.forEach(function (mm) { mm.dispose(); });
              else o.material.dispose();
            }
          });
          if (water && water.dispose) water.dispose();
        }
      };

      return world;
    }
  };
})();
