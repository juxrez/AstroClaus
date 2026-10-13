// Astro's snowy night: the pixel-art diorama behind every page (design/DESIGN.md §2).
//
// Drawing only: createScene() builds a 320x180 scene whose render(ctx, t) paints loop time t.
// When it plays, how it is framed and when the page content shows are decided in diorama.js.
//
// Source: assets/astro-diorama-delivery.html. The drawing code below is that file's scene, unchanged
// apart from its interface: it uses its own fixed night palette instead of reading the page's
// colours (rule 3), and it reports where Astro stands and when the delivery run happens.
//
// env: { astroImage: a loaded 32x32 Image of Astro, variant: "deliver" | undefined }

/* The scene's own night colours. Never read from the site's design system (rule 3). */
const PALETTE = Object.freeze({
  "surface": "#181f2b", "surface-raised": "#222b3a", "surface-sunken": "#11161f",
  "ink": "#f3ebdd", "ink-muted": "#ab9f8c",
  "holly": "#ff5964", "pine": "#7fd08a", "pine-soft": "#17301d",
  "gold": "#ecc069", "frost": "#8ec5ee", "frost-soft": "#132738"
});

function createCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/* Astro's Christmas diorama — a 320x180 pixel-art scene.
   Everything is a pure function of loop time t (0..T), and every motion has an
   integer number of cycles per loop, so the loop is perfectly seamless. */
export function createScene(env) {
  "use strict";
  var W = 320, H = 180, T = 24, TAU = Math.PI * 2;
  var TK = PALETTE, mk = createCanvas;

  /* ------------------------------------------------------------------ helpers */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function h2r(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function r2h(c) { var s = "#"; for (var i = 0; i < 3; i++) { var v = Math.round(clamp(c[i], 0, 255)).toString(16); s += (v.length < 2 ? "0" : "") + v; } return s; }
  function mix(a, b, t) { var A = h2r(a), B = h2r(b); return r2h([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(i, s) { var h = Math.imul((i | 0) + 1, 374761393) ^ Math.imul((s | 0) + 1, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  var B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function bay(x, y) { return (B4[y & 3][x & 3] + 0.5) / 16; }
  function fract(v) { return v - Math.floor(v); }

  function layer() { var cv = mk(W, H); var c = cv.getContext("2d"); c.imageSmoothingEnabled = false; return { cv: cv, c: c }; }
  function R(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function P(c, col, x, y) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
  function spr(c, rows, x, y, pal) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var col = pal[rows[j].charAt(i)]; if (col) { c.fillStyle = col; c.fillRect(x + i, y + j, 1, 1); }
    }
  }
  /* ordered-dither a disc / ellipse of a flat colour: keeps the look pure pixel art */
  function ditherEllipse(c, cx, cy, rx, ry, col, alpha) {
    c.fillStyle = col;
    for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) {
      var d = (x * x) / (rx * rx + 0.01) + (y * y) / (ry * ry + 0.01);
      if (d <= 1.0 && bay(cx + x, cy + y) < alpha) c.fillRect(cx + x, cy + y, 1, 1);
    }
  }
  function solidEllipse(c, cx, cy, rx, ry, col) {
    c.fillStyle = col;
    for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx + 0.01) + (y * y) / (ry * ry + 0.01) <= 1.0) c.fillRect(cx + x, cy + y, 1, 1);
    }
  }
  /* pre-rendered, dithered light halo: alpha steps instead of a smooth gradient */
  function makeGlow(rx, ry, col, levels, power) {
    var cv = mk(rx * 2 + 1, ry * 2 + 1), c = cv.getContext("2d"), K = levels.length;
    c.fillStyle = col;
    for (var y = 0; y < cv.height; y++) for (var x = 0; x < cv.width; x++) {
      var dx = (x - rx) / (rx + 0.5), dy = (y - ry) / (ry + 0.5), d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      var lvl = Math.floor(Math.pow(1 - d, power) * K + bay(x, y));
      if (lvl <= 0) continue; if (lvl > K) lvl = K;
      c.globalAlpha = levels[lvl - 1]; c.fillRect(x, y, 1, 1);
    }
    c.globalAlpha = 1; return { cv: cv, rx: rx, ry: ry };
  }
  function putGlow(c, g, cx, cy, a) { c.globalAlpha = a === undefined ? 1 : a; c.drawImage(g.cv, Math.round(cx) - g.rx, Math.round(cy) - g.ry); c.globalAlpha = 1; }

  /* ------------------------------------------------------------------ palette (the scene's own night colours) */
  var INK = TK["ink"], MUTED = TK["ink-muted"], SURF = TK["surface"], RAISED = TK["surface-raised"], SUNK = TK["surface-sunken"];
  var HOLLY = TK["holly"], PINE = TK["pine"], PINES = TK["pine-soft"], GOLD = TK["gold"], FROST = TK["frost"], FROSTS = TK["frost-soft"];
  var COCOA0 = "#33100d", COCOA1 = "#57301d", COCOA2 = "#7e5631", COCOA3 = "#bb9246"; /* Astro's own browns */
  var SKYC = [mix(SUNK, "#000000", 0.28), SUNK, SURF, mix(SURF, RAISED, 0.55), RAISED, mix(RAISED, FROST, 0.14), mix(RAISED, FROST, 0.27)];
  var SNOW_LO = mix(FROST, SURF, 0.72), SNOW_HI = mix(INK, FROST, 0.25);
  var SNOWHI = mix(INK, FROST, 0.14);           /* lit snow on roofs and branches */
  var SNOWSH = mix(FROST, SURF, 0.30);          /* snow in shade */
  var DARK = mix(SUNK, "#000000", 0.35);

  /* ------------------------------------------------------------------ sky + moon (static) */
  var MOON = { x: 236, y: 37, r: 12 };
  var sky = layer();
  (function () {
    var id = sky.c.createImageData(W, H), d = id.data, cols = [], i;
    for (i = 0; i < SKYC.length; i++) cols.push(h2r(SKYC[i]));
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var v = Math.pow(Math.min(y, 124) / 124, 0.85) * (cols.length - 1);
      var idx = Math.min(Math.floor(v + bay(x, y)), cols.length - 1), c = cols[idx], o = (y * W + x) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    sky.c.putImageData(id, 0, 0);
    var c = sky.c;
    putGlow(c, makeGlow(46, 46, FROST, [0.05, 0.09, 0.14, 0.2], 1.7), MOON.x, MOON.y);
    var MC = mix(INK, FROST, 0.10), MS = mix(MC, FROST, 0.22), MM = mix(MC, RAISED, 0.30);
    var x, y;
    for (y = -MOON.r; y <= MOON.r; y++) for (x = -MOON.r; x <= MOON.r; x++) {
      var dd = x * x + y * y; if (dd > MOON.r * MOON.r + 4) continue;
      var col = MC, rr = Math.sqrt(dd);
      if (rr > MOON.r - 3 && x < 0 && bay(x + 50, y + 50) < 0.6) col = MS;       /* limb shading, light from the right */
      P(c, col, MOON.x + x, MOON.y + y);
    }
    var maria = [[-4, -3, 3], [2, -6, 2], [3, 3, 3], [-6, 4, 2], [0, 0, 2], [6, -2, 2]];
    for (i = 0; i < maria.length; i++) for (y = -maria[i][2]; y <= maria[i][2]; y++) for (x = -maria[i][2]; x <= maria[i][2]; x++) {
      if (x * x + y * y <= maria[i][2] * maria[i][2] && bay(x + 9, y + 9) < 0.85) {
        var px = MOON.x + maria[i][0] + x, py = MOON.y + maria[i][1] + y;
        if ((px - MOON.x) * (px - MOON.x) + (py - MOON.y) * (py - MOON.y) < (MOON.r - 1) * (MOON.r - 1)) P(c, MM, px, py);
      }
    }
  })();

  /* ------------------------------------------------------------------ stars (dynamic twinkle) */
  var stars = [];
  (function () {
    var r = rng(7), pers = [3, 4, 6, 8, 12, 24];
    while (stars.length < 125) {
      var x = Math.floor(r() * W), y = Math.floor(Math.pow(r(), 1.2) * 108);
      var dx = x - MOON.x, dy = y - MOON.y; if (dx * dx + dy * dy < 20 * 20) continue;
      var k = r(); stars.push({ x: x, y: y, kind: k < 0.66 ? 0 : (k < 0.92 ? 1 : 2), per: pers[Math.floor(r() * 6)], ph: r(), col: r() < 0.5 ? GOLD : FROST });
    }
  })();
  function drawStars(c, t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], b = 0.5 + 0.5 * Math.sin(TAU * (t / s.per + s.ph));
      if (s.kind === 0) { c.globalAlpha = b > 0.72 ? 0.9 : (b > 0.36 ? 0.55 : 0.3); P(c, MUTED, s.x, s.y); }
      else if (s.kind === 1) { c.globalAlpha = b > 0.72 ? 1 : (b > 0.36 ? 0.7 : 0.4); P(c, INK, s.x, s.y); }
      else {
        c.globalAlpha = 1; P(c, b > 0.5 ? INK : s.col, s.x, s.y);
        if (b > 0.78) { c.globalAlpha = 0.65; P(c, s.col, s.x - 1, s.y); P(c, s.col, s.x + 1, s.y); P(c, s.col, s.x, s.y - 1); P(c, s.col, s.x, s.y + 1); }
        if (b > 0.94) { c.globalAlpha = 0.45; P(c, s.col, s.x - 2, s.y); P(c, s.col, s.x + 2, s.y); P(c, s.col, s.x, s.y - 2); P(c, s.col, s.x, s.y + 2); }
      }
    }
    c.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ aurora (dither-blended ribbons, 12 fps) */
  var AUR = { cv: mk(W, 84), id: null };
  AUR.c = AUR.cv.getContext("2d"); AUR.id = AUR.c.createImageData(W, 84);
  var PINE_RGB = h2r(PINE), FROST_RGB = h2r(FROST);
  var aurStep = -1;
  function drawAurora(c, t) {
    var step = Math.floor(t * 12);
    if (step === aurStep) { c.drawImage(AUR.cv, 0, 0); return; }
    aurStep = step;
    var ta = step / 12, u = ta / T, d = AUR.id.data, x, y, k, o;
    for (o = 0; o < d.length; o += 4) d[o + 3] = 0;
    var ribbons = [{ base: 30, a1: 9, a2: 5, th: 15, f1: 1, f2: 2, f3: 3, s: 0.0, amp: 0.2 }, { base: 44, a1: 7, a2: 4, th: 10, f1: 1, f2: 3, f3: 2, s: 0.37, amp: 0.13 }];
    for (k = 0; k < ribbons.length; k++) {
      var rb = ribbons[k];
      for (x = 0; x < W; x++) {
        var y0 = rb.base + rb.a1 * Math.sin(TAU * (x / 190 + rb.f1 * u + rb.s)) + rb.a2 * Math.sin(TAU * (x / 83 - rb.f2 * u + rb.s * 2));
        var th = rb.th + 5 * Math.sin(TAU * (x / 120 + rb.f3 * u + rb.s));
        var fade = 0.55 + 0.45 * Math.sin(TAU * (x / 260 + 2 * u + rb.s));
        for (y = Math.floor(y0 - th); y <= Math.ceil(y0 + 3); y++) {
          if (y < 0 || y >= 84) continue;
          var v = (y - y0) / th, inten;           /* v<0 above the bright lower edge */
          if (v > 0) inten = Math.max(0, 1 - v * 4); else inten = Math.max(0, 1 + v * 1.05);
          inten *= fade; if (inten <= 0) continue;
          var lvl = Math.floor(inten * 3 + bay(x, y)); if (lvl <= 0) continue; if (lvl > 3) lvl = 3;
          var m = clamp(-v * 0.9, 0, 1), o2 = (y * W + x) * 4;
          var al = lvl * rb.amp * 0.5;
          d[o2] = lerp(PINE_RGB[0], FROST_RGB[0], m); d[o2 + 1] = lerp(PINE_RGB[1], FROST_RGB[1], m); d[o2 + 2] = lerp(PINE_RGB[2], FROST_RGB[2], m);
          d[o2 + 3] = Math.round(al * 255);
        }
      }
    }
    AUR.c.putImageData(AUR.id, 0, 0);
    c.drawImage(AUR.cv, 0, 0);
  }

  /* ------------------------------------------------------------------ shooting star + Santa's sleigh */
  function drawShooting(c, t) {
    var a = 8.4, dur = 0.7; if (t < a || t > a + dur) return;
    var p = (t - a) / dur, hx = lerp(40, 124, p), hy = lerp(18, 52, p), i;
    for (i = 0; i < 18; i++) {
      var q = i / 18, x = Math.round(hx - (84 / dur) * 0 - i * 2.4), y = Math.round(hy - i * 1.0);
      c.globalAlpha = (1 - q) * (p < 0.85 ? 1 : (1 - p) / 0.15);
      P(c, i < 3 ? INK : (i < 9 ? mix(INK, FROST, 0.4) : FROST), x, y);
    }
    c.globalAlpha = 1;
  }
  function buildSleigh(frame) {
    var cv = mk(58, 20), c = cv.getContext("2d"), K = "#07090d", i;
    /* sleigh */
    R(c, K, 2, 10, 13, 4); R(c, K, 1, 9, 3, 2); R(c, K, 14, 11, 3, 2);
    R(c, K, 0, 15, 18, 1); R(c, K, 17, 14, 1, 1); R(c, K, 2, 14, 1, 1); R(c, K, 12, 14, 1, 1);
    R(c, K, 3, 7, 4, 3);                                           /* sack of presents */
    R(c, K, 8, 7, 3, 3); P(c, HOLLY, 8, 6); P(c, HOLLY, 9, 6); P(c, INK, 10, 6); /* Santa + hat */
    /* reindeer team */
    var oxs = [21, 32, 43];
    for (i = 0; i < 3; i++) {
      var ox = oxs[i];
      R(c, K, ox, 10, 7, 3); R(c, K, ox + 1, 9, 5, 1); R(c, K, ox + 6, 7, 2, 3); R(c, K, ox + 7, 6, 3, 2); P(c, K, ox + 10, 7);
      P(c, K, ox + 7, 5); P(c, K, ox + 7, 4); P(c, K, ox + 6, 3); P(c, K, ox + 8, 3); P(c, K, ox + 5, 2); P(c, K, ox + 9, 2); P(c, K, ox - 1, 10);
      if (frame === 0) { P(c, K, ox + 6, 13); P(c, K, ox + 7, 14); P(c, K, ox + 8, 14); P(c, K, ox + 5, 13); P(c, K, ox + 5, 14); P(c, K, ox + 1, 13); P(c, K, ox, 14); P(c, K, ox - 1, 14); P(c, K, ox + 2, 13); P(c, K, ox + 2, 14); }
      else { P(c, K, ox + 6, 13); P(c, K, ox + 6, 14); P(c, K, ox + 5, 13); P(c, K, ox + 4, 14); P(c, K, ox + 3, 14); P(c, K, ox + 1, 13); P(c, K, ox + 1, 14); P(c, K, ox + 2, 13); P(c, K, ox + 3, 13); P(c, K, ox + 4, 13); }
      R(c, K, i === 0 ? 17 : oxs[i - 1] + 8, 11, i === 0 ? ox - 17 : ox - oxs[i - 1] - 8, 1);
    }
    return cv;
  }
  var SLEIGH = [buildSleigh(0), buildSleigh(1)];
  var SL_START = 3, SL_DUR = 18, SL_W = W + 120;
  function sleighX(t) { var s = (t - SL_START) / SL_DUR; return -62 + s * SL_W; }
  function sleighY(x) { return Math.round(52 - 16 * Math.sin(Math.PI * clamp((x + 62) / SL_W, 0, 1))) - 10; }
  function drawSleigh(c, t) {
    if (t < SL_START - 0.1 || t > SL_START + SL_DUR + 0.1) return;
    var i, x = sleighX(t), bob = Math.round(1.1 * Math.sin(TAU * t / 1.5)), y = sleighY(x) + bob;
    /* sparkle trail */
    for (i = 0; i < 26; i++) {
      var age = i * 0.09, tt = t - age; if (tt < SL_START) continue;
      var xx = sleighX(tt) + 3, yy = sleighY(xx) + 11 + Math.round(1.1 * Math.sin(TAU * tt / 1.5)) + Math.round(2 * Math.sin(i * 1.9));
      var tw = hash(i + (Math.floor(t * 8) % (T * 8)) * 31, 5);
      c.globalAlpha = (1 - i / 26) * (tw > 0.35 ? 0.9 : 0.3);
      P(c, i % 3 === 0 ? INK : (i % 3 === 1 ? GOLD : mix(GOLD, INK, 0.5)), Math.round(xx), yy);
    }
    c.globalAlpha = 1;
    c.drawImage(SLEIGH[Math.floor(t * 6) % 2], Math.round(x), y);
    /* red nose + lantern glow */
    var nx = Math.round(x) + 43 + 11, ny = y + 7;
    putGlow(c, G_SLEIGH_NOSE, nx, ny, 0.9); P(c, HOLLY, nx, ny);
    P(c, GOLD, Math.round(x) + 1, y + 11);
  }
  var G_SLEIGH_NOSE = makeGlow(4, 4, HOLLY, [0.22, 0.4, 0.6], 1.0);

  /* ------------------------------------------------------------------ distant range + forest (static) */
  var back = layer();
  (function () {
    var c = back.c, haze = SKYC[6], x, y;
    function m(x, s, a, b, cc) { return 0.5 * (1 - Math.abs(Math.sin(x * a + s))) + 0.3 * (1 - Math.abs(Math.sin(x * b + s * 1.7))) + 0.2 * (1 - Math.abs(Math.sin(x * cc + s * 0.6))); }
    var far = [], near = [];
    for (x = -3; x < W + 3; x++) { far[x + 3] = Math.round(107 - 40 * Math.pow(m(x, 1.1, 0.021, 0.052, 0.117), 1.15)); near[x + 3] = Math.round(114 - 25 * Math.pow(m(x, 4.2, 0.034, 0.081, 0.19), 1.1)); }
    function F(x) { return far[x + 3]; } function N(x) { return near[x + 3]; }
    var FC = mix(SURF, FROST, 0.22), CAPL = mix(INK, FROST, 0.40), CAPS = mix(FC, FROST, 0.55), NC = mix(SUNK, FROST, 0.11), NCL = mix(NC, FROST, 0.30);
    for (x = 0; x < W; x++) {
      var fy = F(x), lit = F(x + 2) > F(x - 2);
      var capDepth = fy < 86 ? (86 - fy) * 0.55 + 3 + 2.5 * Math.abs(Math.sin(x * 0.9)) : 0;
      for (y = fy; y < 116; y++) {
        var t = (y - fy) / Math.max(1, 116 - fy), col;
        if (y < fy + capDepth) col = lit ? CAPL : CAPS;
        else col = lit ? mix(FC, FROST, 0.10) : FC;
        if (y >= fy + capDepth && bay(x, y) < t * t * 0.95) col = haze;
        if (y >= fy + capDepth - 1 && y < fy + capDepth + 1 && bay(x, y) < 0.5) col = lit ? CAPL : CAPS;
        P(c, col, x, y);
      }
    }
    for (x = 0; x < W; x++) {
      var ny = N(x), nl = N(x + 2) > N(x - 2);
      for (y = ny; y < 118; y++) {
        var tt = (y - ny) / Math.max(1, 118 - ny), col2 = NC;
        if (y < ny + 2 && nl) col2 = NCL; else if (nl && y < ny + 4 && bay(x, y) < 0.4) col2 = NCL;
        if (bay(x, y) < tt * tt * 0.55) col2 = mix(NC, haze, 0.35);
        P(c, col2, x, y);
      }
    }
    /* forest line */
    var r = rng(21), PD = mix(PINES, SUNK, 0.45), PM = mix(PINES, PINE, 0.14), PHI = mix(PINES, PINE, 0.32);
    function fyl(x) { return Math.round(116 + 1.6 * Math.sin(x / 23) + Math.sin(x / 9.5 + 1)); }
    for (x = 0; x < W; x++) R(c, PD, x, fyl(x), 1, 120 - fyl(x));
    for (x = -4; x < W + 4; x += 3 + Math.floor(r() * 3)) {
      var h = 7 + Math.floor(r() * 9), by = fyl(Math.max(0, Math.min(W - 1, x))) + 1, j, wdt;
      for (j = 0; j < h; j++) {
        wdt = Math.floor(j * 0.5) + 0;
        for (var xx = -wdt; xx <= wdt; xx++) {
          var col3 = (xx < 0 && j < h * 0.55) ? PM : PD; if (xx < 0 && j < h * 0.25) col3 = PHI;
          if (hash(x * 13 + xx, j) < 0.1 && xx <= 0) col3 = mix(FROST, SURF, 0.45);
          P(c, col3, x + xx, by - h + j);
        }
      }
      P(c, PD, x, by); P(c, PD, x, by + 1);
    }
    /* valley mist */
    for (y = 104; y < 121; y++) for (x = 0; x < W; x++) {
      var a = Math.max(0, 1 - Math.abs(y - 114) / 8) * 0.34;
      if (bay(x, y) < a) P(c, mix(haze, FROST, 0.18), x, y);
    }
  })();
  /* far village windows */
  var VILL = [[128, 117], [137, 118], [147, 116], [186, 117], [199, 118], [232, 116], [263, 117], [301, 116]];
  function drawVillage(c, t) {
    var f = Math.floor(t * 2) % 48;
    for (var i = 0; i < VILL.length; i++) {
      c.globalAlpha = hash(i * 7 + f, 3) > 0.12 ? 0.85 : 0.4; P(c, GOLD, VILL[i][0], VILL[i][1]);
      if (i % 2 === 0) P(c, GOLD, VILL[i][0] + 1, VILL[i][1]);
    }
    c.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ snow hills */
  var HILLS = [
    { b: 119, a: 2.4, p: 31, ph: 0.4, q: 12, ph2: 1.3, u: 0.00 },
    { b: 126, a: 2.8, p: 41, ph: 2.1, q: 15, ph2: 0.2, u: 0.07 },
    { b: 133, a: 3.0, p: 53, ph: 4.0, q: 17, ph2: 2.2, u: 0.15 },
    { b: 142, a: 3.2, p: 47, ph: 1.1, q: 13, ph2: 3.1, u: 0.27 },
    { b: 156, a: 3.0, p: 67, ph: 5.2, q: 19, ph2: 0.9, u: 0.40 },
    { b: 173, a: 3.0, p: 59, ph: 2.6, q: 14, ph2: 1.7, u: 0.20 }
  ];
  function hillY(h, x) { return Math.round(h.b + h.a * Math.sin(x / h.p * 3 + h.ph) + h.a * 0.55 * Math.sin(x / h.q + h.ph2)); }
  function drawHill(c, k) {
    var h = HILLS[k], col = mix(SNOW_LO, SNOW_HI, h.u), crest = mix(col, INK, 0.38), mid = mix(col, crest, 0.5), x, y, i;
    var prevCol = k > 0 ? mix(SNOW_LO, SNOW_HI, HILLS[k - 1].u) : null;
    for (x = 0; x < W; x++) {
      var y0 = hillY(h, x);
      R(c, col, x, y0, 1, H - y0);
      P(c, crest, x, y0);
      P(c, mid, x, y0 + 1);
      if (bay(x, y0 + 2) < 0.22) P(c, mid, x, y0 + 2);
      if (k > 0) {
        var pc = hillY(HILLS[k - 1], x), sh = mix(prevCol, SURF, 0.34);
        if (y0 - 1 > pc) P(c, sh, x, y0 - 1);
        if (y0 - 2 > pc && bay(x, y0 - 2) < 0.35) P(c, sh, x, y0 - 2);
      }
    }
    /* wind-swept ripples */
    var r = rng(100 + k * 17), n = k === 5 ? 14 : 20;
    for (i = 0; i < n; i++) {
      var rx = Math.floor(r() * W), len = 3 + Math.floor(r() * 5), ry = hillY(h, rx) + 5 + Math.floor(r() * (k === 5 ? 8 : 12));
      if (k < HILLS.length - 1 && ry >= hillY(HILLS[k + 1], rx) - 2) continue;
      for (x = 0; x < len; x++) { P(c, mix(col, crest, 0.5), rx + x, ry); if (x > 0 && x < len - 1) P(c, mix(col, SURF, 0.2), rx + x + 1, ry + 1); }
    }
  }
  function berm(c, cx, cy, rx, ry, k) {
    var h = HILLS[k], col = mix(SNOW_LO, SNOW_HI, h.u), crest = mix(col, INK, 0.38), x, y;
    for (y = -ry; y <= 0; y++) for (x = -rx; x <= rx; x++) {
      var d = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (d > 1) continue;
      P(c, (y === -ry || d > 0.82 && y > -ry + 1 && bay(x, y) < 0.35) ? crest : col, cx + x, cy + y);
    }
  }

  /* ------------------------------------------------------------------ the world layer: cabin, fence, lamp, tree, presents */
  var mid = layer();
  var CAB = { cx: 65, x0: 36, x1: 94, wy: 108, by: 137, peak: 84 };
  function roofTop(x) { return CAB.peak + Math.abs(x - CAB.cx) * 0.52; }
  var WIN = [{ x: 44, y: 114, w: 12, h: 14 }, { x: 74, y: 114, w: 12, h: 14 }];
  var DOOR = { x: 60, y: 119, w: 10, h: 18 };
  var LAMP = { x: 168, base: 150, top: 107 };
  var TREE = { cx: 286, top: 76, base: 152 };
  var TIERS = [[76, 92, 7], [86, 106, 12], [98, 121, 17], [111, 135, 22], [124, 149, 28]];
  var TREE_LIGHTS = [], TREE_BAUBLES = [];
  (function () {
    var c = mid.c, x, y, i, j;
    /* hills 1-3 */
    drawHill(c, 0); drawHill(c, 1); drawHill(c, 2);

    /* ---------------- cabin ---------------- */
    var WOOD = mix(COCOA2, SURF, 0.50), WOODHI = mix(COCOA2, GOLD, 0.10), WOODSH = mix(COCOA1, SUNK, 0.45), WOODEND = mix(COCOA3, SURF, 0.45);
    /* chimney (behind the roof) */
    var STONE = mix(SURF, MUTED, 0.38), STONEL = mix(STONE, INK, 0.16), STONED = mix(STONE, SUNK, 0.4);
    R(c, STONE, 82, 69, 8, 32);
    for (y = 69; y < 101; y++) { P(c, STONEL, 82, y); P(c, STONED, 89, y); if ((y - 69) % 4 === 3) R(c, STONED, 82, y, 8, 1); }
    for (y = 69; y < 101; y += 4) for (x = 83; x < 89; x += 3) P(c, STONED, x + ((y / 4) & 1), y + 1);
    R(c, DARK, 81, 67, 10, 2); R(c, SNOWHI, 81, 66, 10, 1); R(c, SNOWHI, 82, 65, 8, 1);
    /* gable wall planks */
    for (x = CAB.x0 + 1; x < CAB.x1; x++) {
      var gy = Math.ceil(roofTop(x) + 4);
      for (y = gy; y < CAB.wy; y++) P(c, ((x - CAB.x0) % 4 === 0) ? WOODSH : ((x & 1) ? WOOD : mix(WOOD, WOODHI, 0.3)), x, y);
    }
    /* log wall */
    for (y = CAB.wy; y <= CAB.by; y++) {
      var r = (y - CAB.wy) % 5, col = r === 0 ? WOODHI : (r === 4 ? WOODSH : WOOD);
      R(c, col, CAB.x0, y, CAB.x1 - CAB.x0 + 1, 1);
      if (r > 0 && r < 4) for (x = CAB.x0 + 3 + ((y * 7) % 9); x < CAB.x1; x += 13) P(c, WOODSH, x, y);
    }
    for (var lg = 0; lg < 6; lg++) {
      var ly = CAB.wy + lg * 5;
      R(c, WOODEND, CAB.x0 - 2, ly + 1, 2, 3); R(c, WOODEND, CAB.x1 + 1, ly + 1, 2, 3);
      P(c, WOODHI, CAB.x0 - 2, ly + 1); P(c, WOODHI, CAB.x1 + 2, ly + 1); P(c, WOODSH, CAB.x0 - 1, ly + 3); P(c, WOODSH, CAB.x1 + 1, ly + 3);
    }
    /* eave shadow */
    for (x = CAB.x0; x <= CAB.x1; x++) { P(c, WOODSH, x, CAB.wy); if (bay(x, 1) < 0.7 || x & 1) P(c, WOODSH, x, CAB.wy + 1); if (bay(x, 2) < 0.4) P(c, WOODSH, x, CAB.wy + 2); }
    /* windows (frames now, glass is dynamic) */
    for (i = 0; i < WIN.length; i++) {
      var w = WIN[i];
      R(c, DARK, w.x - 1, w.y - 1, w.w + 2, w.h + 2);
      R(c, mix(COCOA1, SUNK, 0.25), w.x - 1, w.y - 1, w.w + 2, 1);
      R(c, SNOWHI, w.x - 2, w.y + w.h + 1, w.w + 4, 2); R(c, SNOWSH, w.x - 1, w.y + w.h + 3, w.w + 2, 1);
      R(c, mix(COCOA3, SURF, 0.3), w.x - 2, w.y - 2, 1, 1);
    }
    /* door */
    R(c, DARK, DOOR.x - 1, DOOR.y - 1, DOOR.w + 2, DOOR.h + 1);
    for (y = DOOR.y; y < DOOR.y + DOOR.h; y++) for (x = DOOR.x; x < DOOR.x + DOOR.w; x++)
      P(c, ((x - DOOR.x) % 3 === 2) ? mix(COCOA1, SUNK, 0.2) : mix(COCOA2, SUNK, 0.35), x, y);
    R(c, mix(COCOA1, SUNK, 0.2), DOOR.x + 1, DOOR.y + 2, DOOR.w - 2, 1); R(c, mix(COCOA1, SUNK, 0.2), DOOR.x + 1, DOOR.y + 11, DOOR.w - 2, 1);
    P(c, GOLD, DOOR.x + DOOR.w - 2, DOOR.y + 9);
    /* wreath */
    var wc = DOOR.x + 5, wy2 = DOOR.y + 4, WG = mix(PINES, PINE, 0.45), WG2 = mix(PINES, PINE, 0.2);
    var ring = [[-1, -3], [0, -3], [1, -3], [-2, -2], [2, -2], [-3, -1], [3, -1], [-3, 0], [3, 0], [-3, 1], [3, 1], [-2, 2], [2, 2], [-1, 3], [0, 3], [1, 3]];
    for (i = 0; i < ring.length; i++) P(c, i % 2 ? WG : WG2, wc + ring[i][0], wy2 + ring[i][1]);
    P(c, HOLLY, wc - 3, wy2 + 1); P(c, HOLLY, wc + 2, wy2 - 2); P(c, HOLLY, wc + 1, wy2 + 3); R(c, HOLLY, wc - 1, wy2 + 3, 3, 1); P(c, HOLLY, wc - 2, wy2 + 4); P(c, HOLLY, wc + 2, wy2 + 4);
    /* roof band + snow */
    var TILE = mix(COCOA0, SUNK, 0.2), TILEH = mix(COCOA1, SURF, 0.35);
    for (x = 22; x <= 108; x++) {
      var ty = Math.round(roofTop(x)), lump = Math.floor(hash(x, 9) * 2.2);
      var lit = x >= CAB.cx;
      for (y = ty; y <= ty + 4; y++) P(c, (y === ty ? TILEH : ((x + y) % 3 === 0 ? mix(TILE, TILEH, 0.3) : TILE)), x, y);
      for (y = ty - 3 - lump; y < ty; y++) P(c, (y === ty - 3 - lump && !lit) ? mix(SNOWHI, SNOWSH, 0.35) : (lit ? SNOWHI : mix(SNOWHI, SNOWSH, 0.4)), x, y);
      P(c, SNOWSH, x, ty + 5);
      if (hash(x, 4) < 0.16 && x > 24 && x < 106) { var il = 2 + Math.floor(hash(x, 6) * 4); for (var q = 0; q < il; q++) P(c, q === il - 1 ? FROST : mix(FROST, INK, 0.5), x, ty + 5 + q); }
    }
    for (x = CAB.cx - 3; x <= CAB.cx + 3; x++) { P(c, SNOWHI, x, CAB.peak - 4); }
    P(c, SNOWHI, CAB.cx - 1, CAB.peak - 5); P(c, SNOWHI, CAB.cx, CAB.peak - 5); P(c, SNOWHI, CAB.cx + 1, CAB.peak - 5);
    /* attic window frame */
    R(c, DARK, CAB.cx - 3, 95, 7, 7); P(c, WOODSH, CAB.cx - 3, 95); P(c, WOODSH, CAB.cx + 3, 95); P(c, WOODSH, CAB.cx - 3, 101); P(c, WOODSH, CAB.cx + 3, 101);
    /* snow berm around the base */
    berm(c, 66, 140, 52, 7, 2);
    R(c, mix(SNOW_LO, SNOW_HI, HILLS[2].u), 20, 140, 90, 2);

    /* ---------------- fence ---------------- */
    var FENCE = mix(COCOA1, SUNK, 0.2);
    for (i = 0; i < 5; i++) {
      var fx = 114 + i * 9, fb = 143 + (i & 1);
      R(c, FENCE, fx, fb - 11, 3, 11); R(c, mix(COCOA2, SURF, 0.4), fx, fb - 11, 1, 11);
      R(c, SNOWHI, fx - 1, fb - 13, 5, 2); R(c, SNOWSH, fx, fb - 11, 3, 1);
    }
    R(c, FENCE, 114, 134, 39, 1); R(c, FENCE, 114, 139, 39, 1);
    for (x = 114; x < 153; x++) { if (hash(x, 14) < 0.55) P(c, SNOWHI, x, 133); if (hash(x, 15) < 0.4) P(c, SNOWHI, x, 138); }

    /* ---------------- hill 4, lamp post ---------------- */
    drawHill(c, 3);
    var LPOST = mix(SUNK, "#000000", 0.2);
    R(c, LPOST, LAMP.x, LAMP.top + 8, 2, LAMP.base - LAMP.top - 8);
    R(c, LPOST, LAMP.x - 2, LAMP.base - 3, 6, 3); R(c, LPOST, LAMP.x - 1, LAMP.base - 5, 4, 2);
    R(c, mix(LPOST, FROST, 0.12), LAMP.x, LAMP.top + 8, 1, LAMP.base - LAMP.top - 8);
    R(c, LPOST, LAMP.x - 4, LAMP.top - 1, 10, 1);               /* roof */
    R(c, LPOST, LAMP.x - 3, LAMP.top - 2, 8, 1); R(c, LPOST, LAMP.x - 2, LAMP.top - 3, 6, 1);
    R(c, SNOWHI, LAMP.x - 2, LAMP.top - 4, 6, 1); R(c, SNOWHI, LAMP.x - 3, LAMP.top - 3, 2, 1);
    R(c, LPOST, LAMP.x - 3, LAMP.top, 1, 8); R(c, LPOST, LAMP.x + 4, LAMP.top, 1, 8); R(c, LPOST, LAMP.x - 3, LAMP.top + 8, 8, 1);
    berm(c, LAMP.x + 1, LAMP.base + 1, 8, 3, 3);

    /* ---------------- tree ---------------- */
    var G0 = mix(PINES, SUNK, 0.55), G1 = mix(PINES, SUNK, 0.05), G2 = mix(PINES, PINE, 0.26), G3 = mix(PINES, PINE, 0.50);
    var TRUNK = mix(COCOA1, SURF, 0.2);
    R(c, TRUNK, TREE.cx - 3, 148, 6, 6); R(c, mix(COCOA2, SURF, 0.3), TREE.cx - 3, 148, 1, 6);
    for (i = 0; i < TIERS.length; i++) {
      var tt = TIERS[i], top = tt[0], bot = tt[1], wmax = tt[2];
      for (y = top; y <= bot; y++) {
        var fr = (y - top) / (bot - top), hw = 1 + fr * (wmax - 1);
        for (x = Math.ceil(TREE.cx - hw); x <= Math.floor(TREE.cx + hw); x++) {
          var e = hw - Math.abs(x - TREE.cx), jag = (((x * 7 + i * 3) % 4 + 4) % 4 === 0) ? 2 : (x % 3 === 0 ? 1 : 0);
          if (y > bot - jag) continue;
          var left = x < TREE.cx, col;
          if (left) col = e < 2.2 ? G3 : (e < 5.5 ? (bay(x, y) < 0.55 ? G2 : G1) : G1);
          else col = e < 2 ? G1 : (e < 6 && bay(x, y) < 0.3 ? G1 : G0);
          if (y >= bot - 2) col = (left && bay(x, y) < 0.3) ? G1 : G0;
          if (e < 1.6 && hash(x * 3 + i, y) < 0.34 && y < bot - 3) col = left ? SNOWHI : mix(SNOWHI, SNOWSH, 0.5);
          P(c, col, x, y);
        }
      }
    }
    /* baubles + garland lights (positions only; lights are dynamic) */
    var tr = rng(33), cols = [HOLLY, GOLD, FROST];
    for (i = 1; i < TIERS.length; i++) {
      var t2 = TIERS[i], n = i + 1;
      for (j = 0; j < n; j++) {
        var by2 = Math.round(lerp(t2[0] + (t2[1] - t2[0]) * 0.42, t2[0] + (t2[1] - t2[0]) * 0.86, tr()));
        var hw2 = 1 + (by2 - t2[0]) / (t2[1] - t2[0]) * (t2[2] - 1);
        var bx = Math.round(TREE.cx + (tr() * 2 - 1) * (hw2 - 4));
        TREE_BAUBLES.push({ x: bx, y: by2, col: cols[(i + j) % 3] });
      }
      var rowsF = [0.5, 0.82];
      for (j = 0; j < rowsF.length; j++) {
        var ly2 = Math.round(t2[0] + (t2[1] - t2[0]) * rowsF[j]), hw3 = 1 + (ly2 - t2[0]) / (t2[1] - t2[0]) * (t2[2] - 1);
        var cnt = Math.max(2, Math.round(hw3 / 3.2));
        for (var kq = 0; kq < cnt; kq++) {
          var u2 = cnt === 1 ? 0 : (kq / (cnt - 1) * 2 - 1);
          TREE_LIGHTS.push({ x: Math.round(TREE.cx + u2 * (hw3 - 3)), y: ly2 + Math.round(2 * (1 - u2 * u2)) * (j ? 1 : 1) - (j ? 0 : 0) });
        }
      }
    }
    for (i = 0; i < TREE_BAUBLES.length; i++) {
      var bb = TREE_BAUBLES[i];
      R(c, bb.col, bb.x, bb.y, 2, 2); P(c, mix(bb.col, INK, 0.6), bb.x, bb.y); P(c, mix(bb.col, SUNK, 0.4), bb.x + 1, bb.y + 1);
    }
    berm(c, TREE.cx, 153, 30, 4, 3);

    /* ---------------- hill 5, presents, candy cane, footprints ---------------- */
    drawHill(c, 4);
    function present(px, py, w, h, body, rib) {
      R(c, mix(SNOW_LO, SURF, 0.35), px - 1, py + h, w + 3, 2);
      R(c, body, px, py, w, h); R(c, mix(body, INK, 0.25), px, py, w, 1); R(c, mix(body, SUNK, 0.35), px + w - 1, py + 1, 1, h - 1);
      R(c, rib, px + Math.floor(w / 2), py, 2, h); R(c, rib, px, py + Math.floor(h / 2), w, 1);
      P(c, rib, px + Math.floor(w / 2) - 1, py - 1); P(c, rib, px + Math.floor(w / 2) + 2, py - 1); P(c, rib, px + Math.floor(w / 2), py - 2); P(c, rib, px + Math.floor(w / 2) + 1, py - 2);
    }
    present(262, 150, 10, 8, mix(HOLLY, SURF, 0.12), GOLD);
    present(275, 153, 8, 6, mix(FROST, SURF, 0.22), INK);
    present(299, 149, 12, 10, mix(PINE, SURF, 0.35), GOLD);
    present(313, 154, 7, 6, mix(GOLD, SURF, 0.12), HOLLY);
    /* candy cane */
    for (y = 0; y < 14; y++) { P(c, (y >> 1) & 1 ? HOLLY : INK, 187, 152 + y); P(c, (y >> 1) & 1 ? mix(HOLLY, SURF, 0.3) : mix(INK, SURF, 0.3), 188, 152 + y); }
    P(c, HOLLY, 188, 151); P(c, INK, 189, 151); P(c, INK, 190, 151); P(c, HOLLY, 191, 152); P(c, INK, 191, 153);
    P(c, HOLLY, 188, 152); R(c, mix(SNOW_LO, SNOW_HI, HILLS[4].u), 184, 165, 8, 1); R(c, mix(SNOW_LO, SNOW_HI, HILLS[4].u), 185, 166, 6, 1);
    /* paw prints from the cabin door to Astro */
    var PRINT = mix(SNOW_LO, SURF, 0.78), PRINTH = mix(SNOW_HI, INK, 0.35);
    for (i = 0; i < 20; i++) {
      var s = i / 19, px2 = Math.round(lerp(70, 193, s) + 0.5 * Math.sin(s * 9)), py2 = Math.round(144 + 21 * Math.pow(s, 1.5) + 2.2 * Math.sin(s * 7)), side = (i & 1) ? 2 : -2;
      P(c, PRINT, px2, py2 + side); P(c, PRINT, px2 + 2, py2 + side); P(c, PRINT, px2 + 1, py2 + side + 1);
      P(c, PRINTH, px2, py2 + side + 1); P(c, PRINTH, px2 + 2, py2 + side + 1); P(c, PRINTH, px2 + 1, py2 + side + 2);
    }
  })();

  /* ------------------------------------------------------------------ foreground dune + holly sprig */
  var front = layer();
  (function () {
    var c = front.c, x, y;
    drawHill(c, 5);
    /* deep-blue shade under the dune crest */
    for (x = 0; x < W; x++) { var y0 = hillY(HILLS[5], x); for (y = y0 + 3; y < H; y++) if (bay(x, y) < 0.2 + (y - y0) / 40) P(c, mix(SNOW_LO, SURF, 0.4), x, y); }
    var HL = mix(PINES, PINE, 0.38), HD = mix(PINES, SUNK, 0.2);
    var leaf = [[12, 168], [15, 166], [18, 169], [10, 171], [20, 172], [14, 172], [24, 169]];
    for (var i = 0; i < leaf.length; i++) { var lx = leaf[i][0], ly = leaf[i][1]; R(c, HD, lx, ly, 5, 2); R(c, HL, lx + 1, ly - 1, 3, 1); P(c, HL, lx, ly); P(c, HD, lx + 4, ly - 1); P(c, HD, lx - 1, ly + 1); }
    P(c, HOLLY, 16, 167); P(c, HOLLY, 17, 167); P(c, HOLLY, 16, 168); P(c, mix(HOLLY, INK, 0.4), 16, 167); P(c, HOLLY, 21, 170); P(c, HOLLY, 22, 170); P(c, HOLLY, 21, 171); P(c, mix(HOLLY, INK, 0.4), 21, 170); P(c, HOLLY, 13, 170); P(c, HOLLY, 14, 170);
  })();

  /* ------------------------------------------------------------------ vignette (dithered) */
  var vig = layer();
  (function () {
    var c = vig.c, x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2), d = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.0);
      var lvl = Math.floor(clamp((d - 0.72) / 0.55, 0, 1) * 3 + bay(x, y)); if (lvl <= 0) continue; if (lvl > 3) lvl = 3;
      c.globalAlpha = [0, 0.14, 0.24, 0.36][lvl]; P(c, SUNK, x, y);
    }
    c.globalAlpha = 1;
  })();

  /* ------------------------------------------------------------------ dynamic lights on the buildings */
  var G_WIN = makeGlow(15, 6, GOLD, [0.10, 0.18, 0.28], 1.1);
  var G_WINHALO = makeGlow(13, 13, GOLD, [0.06, 0.11, 0.17], 1.4);
  var G_LAMP_HALO = makeGlow(21, 21, GOLD, [0.07, 0.13, 0.22], 1.3);
  var G_LAMP_POOL = makeGlow(30, 6, GOLD, [0.09, 0.17, 0.27], 1.0);
  var G_STAR = [makeGlow(11, 11, GOLD, [0.10, 0.2, 0.34], 1.2), makeGlow(15, 15, GOLD, [0.08, 0.16, 0.3], 1.2)];
  var G_TREE_POOL = [makeGlow(14, 4, HOLLY, [0.07, 0.14, 0.22], 1.0), makeGlow(14, 4, GOLD, [0.07, 0.14, 0.22], 1.0), makeGlow(14, 4, FROST, [0.07, 0.14, 0.22], 1.0)];
  var G_BULB = {}; G_BULB[HOLLY] = makeGlow(3, 3, HOLLY, [0.25, 0.4], 1.0); G_BULB[GOLD] = makeGlow(3, 3, GOLD, [0.25, 0.4], 1.0); G_BULB[FROST] = makeGlow(3, 3, FROST, [0.25, 0.4], 1.0); G_BULB[PINE] = makeGlow(3, 3, PINE, [0.25, 0.4], 1.0); G_BULB[INK] = makeGlow(3, 3, INK, [0.25, 0.4], 1.0);
  var BULBCOLS = [HOLLY, GOLD, FROST, PINE];
  var STAR_ROWS = ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", ".#...#."];

  function flick(t, seed, rate) { return hash(Math.floor(t * rate) % (T * rate), seed); }

  function drawCabinLights(c, t) {
    var i, x, f = flick(t, 1, 8), f2 = flick(t, 2, 8);
    var gl = [mix(GOLD, INK, 0.10 + 0.22 * (f > 0.78 ? 1 : 0)), mix(GOLD, HOLLY, 0.12 + (f2 > 0.7 ? 0.12 : 0))];
    for (i = 0; i < WIN.length; i++) {
      var w = WIN[i], col = gl[i], cx = w.x + w.w / 2;
      putGlow(c, G_WINHALO, cx, w.y + 7, 0.8 + 0.2 * (i ? f2 : f));
      putGlow(c, G_WIN, cx, 131 + 1);
      R(c, col, w.x, w.y, w.w, w.h);
      R(c, mix(col, SURF, 0.3), w.x, w.y + w.h - 3, w.w, 3);                 /* warm gradient toward the sill */
      R(c, mix(col, INK, 0.35), w.x + 1, w.y + 1, 3, 2);
      R(c, SUNK, w.x + Math.floor(w.w / 2) - 1, w.y, 1, w.h); R(c, SUNK, w.x, w.y + 6, w.w, 1);   /* mullions */
      if (i === 0) { P(c, mix(HOLLY, SUNK, 0.5), w.x + 3, w.y + 10); R(c, mix(HOLLY, SUNK, 0.5), w.x + 2, w.y + 11, 3, 3); }  /* a stocking silhouette */
    }
    var ac = mix(GOLD, INK, 0.12 + (f > 0.8 ? 0.2 : 0));
    R(c, ac, CAB.cx - 2, 96, 5, 5); R(c, ac, CAB.cx - 1, 95 + 0, 3, 1); R(c, ac, CAB.cx - 1, 101, 3, 1); R(c, SUNK, CAB.cx, 96, 1, 6); R(c, SUNK, CAB.cx - 2, 98, 5, 1);
    putGlow(c, G_WINHALO, CAB.cx, 98, 0.55);
    /* eave string lights chase around the roof */
    var step = Math.floor(t * 3);
    for (i = 0, x = 24; x <= 106; x += 6, i++) {
      var bx = x, by = Math.round(roofTop(x)) + 6, col2 = BULBCOLS[i % 4], on = ((step + i) % 4) === 0;
      P(c, mix(SUNK, SURF, 0.5), bx, by - 1);
      if (on) { putGlow(c, G_BULB[col2], bx, by + 1, 1); P(c, mix(col2, INK, 0.35), bx, by + 1); P(c, col2, bx, by + 2); }
      else { P(c, mix(col2, SURF, 0.5), bx, by + 1); P(c, mix(col2, SURF, 0.62), bx, by + 2); }
    }
  }
  function drawLamp(c, t) {
    var f = flick(t, 3, 10), a = 0.9 + 0.1 * (f > 0.85 ? 0 : 1);
    putGlow(c, G_LAMP_HALO, LAMP.x + 1, LAMP.top + 4, a);
    putGlow(c, G_LAMP_POOL, LAMP.x + 1, LAMP.base + 1, a);
    var col = mix(GOLD, INK, f > 0.85 ? 0.05 : 0.28);
    R(c, mix(GOLD, HOLLY, 0.1), LAMP.x - 2, LAMP.top, 6, 8); R(c, col, LAMP.x - 1, LAMP.top + 1, 4, 5); R(c, mix(col, INK, 0.5), LAMP.x, LAMP.top + 2, 2, 2);
  }

  function drawTree(c, t) {
    var i, step2 = t * 0.5;                                         /* 2 s cycles */
    /* ground pools of coloured light */
    for (i = 0; i < 3; i++) {
      var ph = fract(step2 + i / 3), a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * ph));
      putGlow(c, G_TREE_POOL[i], TREE.cx - 14 + i * 14, 157, a);
    }
    /* garland lights chase */
    for (i = 0; i < TREE_LIGHTS.length; i++) {
      var L = TREE_LIGHTS[i], col = [HOLLY, GOLD, FROST, INK][i % 4], ph2 = fract(t / 2 + i * 0.137);
      var bright = ph2 < 0.22;
      if (bright) { putGlow(c, G_BULB[col], L.x, L.y, 1); P(c, mix(col, INK, 0.4), L.x, L.y); }
      else P(c, ph2 < 0.5 ? col : mix(col, SURF, 0.5), L.x, L.y);
    }
    /* a few baubles glint */
    for (i = 0; i < TREE_BAUBLES.length; i++) {
      var bb = TREE_BAUBLES[i], g = fract(t / 4 + i * 0.113);
      if (g < 0.05) { P(c, INK, bb.x, bb.y); P(c, mix(INK, bb.col, 0.4), bb.x - 1, bb.y - 1); P(c, mix(INK, bb.col, 0.4), bb.x + 2, bb.y + 2); }
    }
    /* star */
    var pulse = 0.5 + 0.5 * Math.sin(TAU * t / 3);
    putGlow(c, G_STAR[pulse > 0.5 ? 1 : 0], TREE.cx, 71, 0.55 + 0.45 * pulse);
    spr(c, STAR_ROWS, TREE.cx - 3, 68, { "#": mix(GOLD, INK, 0.12) });
    P(c, INK, TREE.cx, 71); P(c, INK, TREE.cx, 70);
    if (pulse > 0.82) { c.globalAlpha = 0.8; P(c, INK, TREE.cx, 64); P(c, INK, TREE.cx, 65); P(c, INK, TREE.cx - 6, 71); P(c, INK, TREE.cx + 6, 71); P(c, INK, TREE.cx - 5, 71); P(c, INK, TREE.cx + 5, 71); c.globalAlpha = 1; }
  }

  /* ------------------------------------------------------------------ chimney smoke + embers */
  function drawSmoke(c, t) {
    var N = 14, i, SM = mix(INK, SURF, 0.38), SM2 = mix(INK, FROST, 0.15);
    for (i = 0; i < N; i++) {
      var p = fract(t / 6 + i / N);
      var x = 86 + p * 22 + 3 * Math.sin(TAU * (p * 1.3 + i * 0.21)), y = 64 - p * 44, r = 1 + Math.floor(p * 4.4);
      var a = Math.sin(Math.PI * Math.pow(p, 0.75));
      c.globalAlpha = a > 0.8 ? 0.5 : (a > 0.55 ? 0.38 : (a > 0.3 ? 0.24 : 0.12));
      solidEllipse(c, Math.round(x), Math.round(y), r, r, p < 0.35 ? SM2 : SM);
    }
    c.globalAlpha = 1;
    for (i = 0; i < 7; i++) {
      var q = fract(t / 3 + i / 7 + hash(i, 8) * 0.1), ex = 86 + q * 16 + 3 * Math.sin(TAU * (q * 2 + i * 0.37)), ey = 64 - q * 36;
      c.globalAlpha = (1 - q) * (hash(i + Math.floor(t * 12) % (T * 12), 2) > 0.3 ? 1 : 0.35);
      P(c, q < 0.5 ? mix(GOLD, INK, 0.3) : GOLD, Math.round(ex), Math.round(ey));
    }
    c.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ ground glitter */
  var GLIT = [];
  (function () { var r = rng(55); while (GLIT.length < 46) { var x = Math.floor(r() * W), y = 121 + Math.floor(r() * 56); GLIT.push({ x: x, y: y, k: [3, 4, 6, 8, 12][Math.floor(r() * 5)], ph: r() }); } })();
  function drawGlitter(c, t) {
    for (var i = 0; i < GLIT.length; i++) {
      var g = GLIT[i], v = Math.pow(Math.max(0, Math.sin(TAU * (g.k * t / T + g.ph))), 14);
      if (v > 0.55) { P(c, INK, g.x, g.y); if (v > 0.9) { c.globalAlpha = 0.6; P(c, INK, g.x - 1, g.y); P(c, INK, g.x + 1, g.y); P(c, INK, g.x, g.y - 1); P(c, INK, g.x, g.y + 1); c.globalAlpha = 1; } }
    }
  }

  /* ------------------------------------------------------------------ falling snow (4 depth layers) */
  var FL = [
    { n: 90, wr: 2, amp: 3, gust: 3, size: 1, col: mix(INK, SURF, 0.45), alpha: 0.75, seed: 11 },
    { n: 66, wr: 4, amp: 4, gust: 6, size: 1, col: INK, alpha: 0.95, seed: 12 },
    { n: 30, wr: 7, amp: 5, gust: 10, size: 2, col: INK, alpha: 1, seed: 13 },
    { n: 7, wr: 10, amp: 8, gust: 17, size: 3, col: INK, alpha: 0.6, seed: 14 }
  ];
  var HM = H + 16, WM = W + 16;
  (function () {
    for (var l = 0; l < FL.length; l++) {
      var L = FL[l], r = rng(L.seed); L.f = [];
      for (var i = 0; i < L.n; i++) L.f.push({ x0: r() * WM, y0: r() * HM, k: [6, 8, 12][Math.floor(r() * 3)], ph: r(), wr: L.wr + (r() < 0.3 ? 1 : 0), a: L.amp * (0.5 + r()) });
    }
  })();
  function drawFlakes(c, t, l) {
    var L = FL[l], u = t / T, gust = L.gust * (Math.sin(TAU * 2 * u) + 0.45 * Math.sin(TAU * 5 * u + 1)), i;
    c.fillStyle = L.col; c.globalAlpha = L.alpha;
    for (i = 0; i < L.f.length; i++) {
      var f = L.f[i];
      var y = ((f.y0 + f.wr * HM * u) % HM) - 8;
      var x = ((((f.x0 + gust + f.a * Math.sin(TAU * (f.k * u + f.ph))) % WM) + WM) % WM) - 8;
      var xi = Math.round(x), yi = Math.round(y);
      if (L.size === 1) c.fillRect(xi, yi, 1, 1);
      else if (L.size === 2) { c.fillRect(xi, yi, 2, 2); if (i % 5 === 0) { c.fillRect(xi - 1, yi, 1, 2); c.fillRect(xi + 2, yi, 1, 2); c.fillRect(xi, yi - 1, 2, 1); c.fillRect(xi, yi + 2, 2, 1); } }
      else { c.fillRect(xi, yi, 3, 1); c.fillRect(xi + 1, yi - 1, 1, 3); c.fillRect(xi + 1, yi, 1, 1); }
    }
    c.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ Astro */
  var DELIVER = env.variant === "deliver";     /* 'deliver': Astro carries a letter and runs off past the tree */
  var AX = 200, AY = 135;                      /* sprite origin; his paws touch y = AY + 30 */
  var A = { sprite: null, noTail: null, noLegs: null, tail: null, legs: [], furA: INK, furB: INK };
  var LEG = [{ x: 2, y: 24, w: 6, h: 6 }, { x: 8, y: 24, w: 5, h: 5 }, { x: 13, y: 26, w: 8, h: 5 }, { x: 21, y: 26, w: 5, h: 4 }];  /* hind-near, hind-far, front-near, front-far */
  (function () {
    A.sprite = mk(32, 32); var sc = A.sprite.getContext("2d"); sc.imageSmoothingEnabled = false; sc.drawImage(env.astroImage, 0, 0);
    A.noTail = mk(32, 32); var nc = A.noTail.getContext("2d"); nc.drawImage(A.sprite, 0, 0); nc.clearRect(2, 8, 10, 7);
    A.tail = mk(10, 7); A.tail.getContext("2d").drawImage(A.sprite, 2, 8, 10, 7, 0, 0, 10, 7);
    A.noLegs = mk(32, 32); var lc = A.noLegs.getContext("2d"); lc.drawImage(A.noTail, 0, 0);
    for (var i = 0; i < LEG.length; i++) {
      var L = LEG[i], st = mk(L.w, L.h); st.getContext("2d").drawImage(A.sprite, L.x, L.y, L.w, L.h, 0, 0, L.w, L.h);
      A.legs.push(st); lc.clearRect(L.x, L.y, L.w, L.h);
    }
    var a = sc.getImageData(19, 11, 1, 1).data, b = sc.getImageData(27, 11, 1, 1).data;
    A.furA = r2h([a[0], a[1], a[2]]); A.furB = r2h([b[0], b[1], b[2]]);
  })();
  var TMP = (function () { var cv = mk(72, 64), c = cv.getContext("2d"); c.imageSmoothingEnabled = false; return { cv: cv, c: c }; })();
  var G_NOSE = [makeGlow(5, 5, HOLLY, [0.24, 0.42, 0.65], 1.0), makeGlow(6, 6, HOLLY, [0.24, 0.42, 0.65], 1.0), makeGlow(7, 7, HOLLY, [0.22, 0.4, 0.62], 1.0)];
  var TAIL_WAG = [[0, 0], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0]];
  var BELL = [[19, 19, 0], [26, 19, 0], [23, 20, 1]];

  /* the letter: cream envelope, folded flap, holly wax seal */
  var ENV = ["##########", "#mppppppm#", "#pmppppmp#", "#ppmhSmpp#", "#pppSSppp#", "#qqqqqqqq#", "##########"];
  var ENVP = { "#": "#2a1510", p: INK, q: mix(INK, MUTED, 0.38), m: mix(MUTED, INK, 0.25), S: HOLLY, h: mix(HOLLY, INK, 0.55) };
  function drawEnvelope(c, x, y, tilt, rev) {
    for (var i = 0; i < 10; i++) {
      var dy = tilt ? -Math.floor(i * tilt / 9.5) : 0;
      for (var j = 0; j < 7; j++) {
        var col = ENVP[ENV[j].charAt(i)]; if (!col) continue;
        if (rev < 1 && bay(i * 3 + 5, j * 3 + 2) > rev) continue;
        c.fillStyle = col; c.fillRect(x + i, y + j + dy, 1, 1);
      }
    }
  }

  /* idle Astro (breathing, wag, blink, bells, cold breath, antler sparkles). o: {x, hop, breath, letter, reveal, revealL} */
  function drawAstro(c, t, o) {
    o = o || {};
    var ax = o.x === undefined ? AX : o.x, hop = o.hop || 0, rev = o.reveal === undefined ? 1 : o.reveal, revL = o.revealL === undefined ? 1 : o.revealL;
    var ct = t % 3, breath = o.breath !== undefined ? o.breath : ((ct >= 1.0 && ct < 2.0) ? 1 : 0);
    if (rev <= 0) return;
    /* contact shadow */
    var sa = 0.55 * rev * (hop ? 0.6 : 1);
    ditherEllipse(c, ax + 16, AY + 30, 15, 2, SUNK, sa);
    ditherEllipse(c, ax + 16, AY + 30, 11, 1, SUNK, sa);
    /* red nose light */
    var np = (Math.sin(TAU * t / 3 - 1.2) + 1) / 2, nlvl = np > 0.66 ? 2 : (np > 0.33 ? 1 : 0);
    putGlow(c, G_NOSE[nlvl], ax + 25, AY + 13 - breath - hop, rev);
    var tg = rev < 1 ? TMP.c : c, bx = rev < 1 ? 16 : ax, by = (rev < 1 ? 16 : AY) - hop;
    if (rev < 1) tg.clearRect(0, 0, TMP.cv.width, TMP.cv.height);
    /* body: legs/lower half planted, upper half rises one pixel to breathe */
    tg.drawImage(A.noTail, 0, 20, 32, 12, bx, by + 20, 32, 12);
    if (breath > 0) tg.drawImage(A.noTail, 0, 19, 32, 1, bx, by + 19, 32, 1);
    tg.drawImage(A.noTail, 0, 0, 32, 20, bx, by - breath, 32, 20);
    var w = TAIL_WAG[Math.floor(t / 0.25) % 6];
    tg.drawImage(A.tail, bx + 2 + w[0], by + 8 + w[1] - breath);
    /* blink */
    var bt = (t - 4.0 >= 0 && t - 4.0 < 0.14) || (t - 13.5 >= 0 && t - 13.5 < 0.14) || (t - 19.3 >= 0 && t - 19.3 < 0.14);
    if (bt) { P(tg, A.furA, bx + 20, by + 11 - breath); P(tg, A.furB, bx + 26, by + 11 - breath); }
    /* collar bells glint */
    var i;
    for (i = 0; i < BELL.length; i++) {
      var b = BELL[i], ph = (t + i * 0.9) % 3, fi = Math.floor(ph / 0.1);
      if (fi > 3) continue;
      var sx = bx + b[0], sy = by + b[1] - (b[1] === 19 ? breath : 0), SP = mix(INK, GOLD, 0.2);
      if (fi === 0 || fi === 3) P(tg, SP, sx, sy);
      else { P(tg, SP, sx, sy); tg.globalAlpha = 0.8; P(tg, SP, sx - 1, sy); P(tg, SP, sx + 1, sy); P(tg, SP, sx, sy - 1); P(tg, SP, sx, sy + 1); tg.globalAlpha = 1; if (fi === 2) { tg.globalAlpha = 0.5; P(tg, SP, sx - 2, sy); P(tg, SP, sx + 2, sy); P(tg, SP, sx, sy - 2); P(tg, SP, sx, sy + 2); tg.globalAlpha = 1; } }
    }
    if (o.letter) drawEnvelope(tg, bx + 27, by + 14 - breath, 0, revL);
    if (tg !== c) {
      var W2 = TMP.cv.width, H2 = TMP.cv.height, id = tg.getImageData(0, 0, W2, H2), d = id.data;
      for (var yy = 0; yy < H2; yy++) for (var xx = 0; xx < W2; xx++) if (bay(xx, yy) > rev) d[(yy * W2 + xx) * 4 + 3] = 0;
      tg.putImageData(id, 0, 0); c.drawImage(TMP.cv, ax - 16, AY - 16);
      return;
    }
    /* cold-air breath puffs on every exhale (not while the letter blocks the muzzle) */
    var BR = mix(INK, FROST, 0.12), k;
    for (k = 0; k < 3; k++) {
      var pt = (ct - 2.0 - k * 0.2) / 1.0; if (pt < 0 || pt > 1) continue;
      var rr = 1 + Math.floor(pt * (3.2 - k * 0.5));
      c.globalAlpha = pt < 0.55 ? 0.62 : (pt < 0.8 ? 0.38 : 0.18);
      solidEllipse(c, Math.round(ax + 31 + pt * (10 + k * 3)), Math.round(AY + 16 - hop - pt * (6 + k)), rr, rr, BR);
    }
    c.globalAlpha = 1;
    /* drifting gold sparkles around the antlers */
    for (k = 0; k < 6; k++) {
      var q = fract(t / 4 + k / 6), mx = ax + 12 + hash(k, 41) * 16 + 2 * Math.sin(TAU * (q * 2 + k * 0.3)), my = AY - 1 - hop - q * 16 - breath;
      var fa = Math.sin(Math.PI * q), tw = hash(k + Math.floor(t * 6) % (T * 6), 43) > 0.25;
      c.globalAlpha = fa * (tw ? 1 : 0.4); P(c, q > 0.3 && q < 0.7 ? mix(GOLD, INK, 0.3) : GOLD, Math.round(mx), Math.round(my));
      if (fa > 0.85 && tw) { c.globalAlpha = 0.55; P(c, GOLD, Math.round(mx) - 1, Math.round(my)); P(c, GOLD, Math.round(mx) + 1, Math.round(my)); P(c, GOLD, Math.round(mx), Math.round(my) - 1); P(c, GOLD, Math.round(mx), Math.round(my) + 1); }
    }
    c.globalAlpha = 1;
  }

  /* ---------------- the delivery run (variant 'deliver') ---------------- */
  var D = { hop0: 6.9, crouch0: 7.65, ret0: 21.6 };
  var RUN = { t0: 7.95, acc: 0.5, a: 140, v: 70 };
  RUN.tauEnd = RUN.acc + (W - AX + 3 - 0.5 * RUN.a * RUN.acc * RUN.acc) / RUN.v;       /* until he has fully left the screen */
  function runX(tau) { if (tau <= 0) return 0; if (tau <= RUN.acc) return 0.5 * RUN.a * tau * tau; return 0.5 * RUN.a * RUN.acc * RUN.acc + RUN.v * (tau - RUN.acc); }
  function runPhase(tau) { return tau <= RUN.acc ? 6 * tau + 5 * tau * tau : 4.25 + 11 * (tau - RUN.acc); }
  /* four-pose bound: stretched in the air, landing, legs gathered, push-off. k = leg lean at the paw (px, + forward) */
  var RUNF = [
    { dy: -2, lean: 1, tail: [-2, 0], k: [-4, -3, 4, 3] },
    { dy: -1, lean: 0, tail: [-1, 1], k: [-2, -1, 2, 1] },
    { dy: 0, lean: 0, tail: [-2, 0], k: [2, 1, -1, -2] },
    { dy: -1, lean: 0, tail: [-1, -1], k: [-3, -2, 2, 1] }
  ];
  function drawLeg(c, i, k, x, y) {
    var L = LEG[i], st = A.legs[i];
    for (var r = 0; r < L.h; r++) c.drawImage(st, 0, r, L.w, 1, x + L.x + Math.round(k * r / (L.h - 1)), y + L.y + r, L.w, 1);
  }
  function runPose(tau) { return RUNF[Math.floor(runPhase(tau)) % 4]; }
  function drawAstroRun(c, t) {
    var tau = t - RUN.t0, xi = AX + Math.round(runX(tau)), f = runPose(tau), by = AY + f.dy;
    var up = f.dy < -1;
    ditherEllipse(c, xi + 16, AY + 30, up ? 12 : 15, up ? 1 : 2, SUNK, up ? 0.32 : 0.55);
    putGlow(c, G_NOSE[2], xi + 25 + f.lean, by + 13, 1);
    var order = [1, 3, 0, 2];
    for (var i = 0; i < 4; i++) drawLeg(c, order[i], f.k[order[i]], xi, by);
    c.drawImage(A.noLegs, 0, 12, 32, 20, xi, by + 12, 32, 20);
    c.drawImage(A.noLegs, 0, 0, 32, 12, xi + f.lean, by, 32, 12);
    c.drawImage(A.tail, xi + 2 + f.tail[0], by + 8 + f.tail[1]);
    drawEnvelope(c, xi + 27 + f.lean, by + 14, up ? 2 : 1, 1);
  }
  /* kicked-up snow and the glowing nose streak */
  function drawPuffs(c, t) {
    var PC = mix(INK, FROST, 0.1), k;
    for (k = 0; k < 24; k++) {
      var ts = RUN.t0 + (k === 0 ? 0 : 0.1 + k * 0.17); if (ts > RUN.t0 + RUN.tauEnd - 0.1) break;
      var age = t - ts; if (age < 0 || age > 0.62) continue;
      var p = age / 0.62, px = AX + runX(ts - RUN.t0) + 3 - p * 7, py = AY + 29 - p * 5;
      c.globalAlpha = p < 0.35 ? 0.66 : (p < 0.7 ? 0.4 : 0.2);
      solidEllipse(c, Math.round(px), Math.round(py), 1 + Math.floor(p * 2.6), 1 + Math.floor(p * 2), PC);
      solidEllipse(c, Math.round(px + 6 + p * 2), Math.round(py + 1), 1 + Math.floor(p * 1.6), 1 + Math.floor(p * 1.2), PC);
    }
    c.globalAlpha = 1;
  }
  function drawTrail(c, t) {
    for (var i = 0; i < 16; i++) {
      var tau = t - i * 0.032 - RUN.t0; if (tau < 0 || tau > RUN.tauEnd) continue;
      var f = runPose(tau), nx = AX + Math.round(runX(tau)) + 25 + f.lean, ny = AY + f.dy + 13;
      if (i % 4 === 0) putGlow(c, G_NOSE[0], nx, ny, (1 - i / 16) * 0.8);
      c.globalAlpha = (1 - i / 16) * 0.95; P(c, i < 4 ? mix(HOLLY, INK, 0.3) : (i % 3 === 2 ? GOLD : HOLLY), nx, ny + (i & 1));
    }
    c.globalAlpha = 1;
  }
  /* magic return: gold motes gather, Astro and then his letter fade in (dithered) so the loop closes seamlessly */
  function drawReturn(c, t) {
    var s = t - D.ret0; if (s < 0) return;
    var cx = AX + 16, cy = AY + 16, k;
    if (s < 1.0) {
      var p = clamp(s / 0.9, 0, 1);
      for (k = 0; k < 16; k++) {
        var ang = TAU * (k / 16) + p * 5, rad = (1 - p) * 20 + 1 + (k % 3);
        c.globalAlpha = Math.min(1, p * 2.2) * (hash(k + Math.floor(t * 10) % (T * 10), 61) > 0.2 ? 1 : 0.4);
        P(c, k % 3 === 0 ? INK : GOLD, Math.round(cx + Math.cos(ang) * rad), Math.round(cy + Math.sin(ang) * rad * 0.9));
      }
    }
    var s2 = s - 1.75;
    if (s2 >= 0 && s2 < 0.6) {
      var q = s2 / 0.6;
      for (k = 0; k < 8; k++) { var a2 = TAU * k / 8, r2 = 2 + q * 9; c.globalAlpha = (1 - q); P(c, k & 1 ? INK : GOLD, Math.round(AX + 32 + Math.cos(a2) * r2), Math.round(AY + 17 + Math.sin(a2) * r2 * 0.8)); }
    }
    c.globalAlpha = 1;
  }
  function hopH(t) {
    var h = 0, s = (t - D.hop0) / 0.3; if (s >= 0 && s < 1) h = Math.round(3 * Math.sin(Math.PI * s));
    s = (t - D.hop0 - 0.35) / 0.3; if (s >= 0 && s < 1) h = Math.max(h, Math.round(3 * Math.sin(Math.PI * s)));
    return h;
  }
  function drawActor(c, t) {
    if (!DELIVER) { drawAstro(c, t); return; }
    if (t >= RUN.t0 && t < RUN.t0 + RUN.tauEnd) { drawAstroRun(c, t); return; }
    if (t >= RUN.t0 + RUN.tauEnd && t < D.ret0) return;
    var o = { letter: true };
    if (t >= D.hop0 && t < D.crouch0) o.hop = hopH(t);
    else if (t >= D.crouch0 && t < RUN.t0) o.breath = -1;
    if (t >= D.ret0) { o.reveal = clamp((t - (D.ret0 + 0.8)) / 0.9, 0, 1); o.revealL = clamp((t - (D.ret0 + 1.75)) / 0.55, 0, 1); }
    drawAstro(c, t, o);
  }

  /* ------------------------------------------------------------------ frame */
  function render(c, t) {
    t = ((t % T) + T) % T;
    c.imageSmoothingEnabled = false; c.globalAlpha = 1;
    c.drawImage(sky.cv, 0, 0);
    drawStars(c, t);
    drawAurora(c, t);
    drawShooting(c, t);
    drawSleigh(c, t);
    c.drawImage(back.cv, 0, 0);
    drawVillage(c, t);
    drawFlakes(c, t, 0);
    c.drawImage(mid.cv, 0, 0);
    drawCabinLights(c, t);
    drawLamp(c, t);
    drawTree(c, t);
    drawSmoke(c, t);
    drawGlitter(c, t);
    drawFlakes(c, t, 1);
    if (DELIVER) { drawPuffs(c, t); drawTrail(c, t); }
    drawActor(c, t);
    if (DELIVER) drawReturn(c, t);
    c.drawImage(front.cv, 0, 0);
    drawFlakes(c, t, 2);
    drawFlakes(c, t, 3);
    c.drawImage(vig.cv, 0, 0);
  }

  return {
    W: W, H: H, T: T, render: render, focusX: AX + 16,
    astro: { x0: AX, x1: AX + 32 },                                        /* Astro's sprite box, in scene pixels */
    delivery: DELIVER ? { dash: RUN.t0, gone: RUN.t0 + RUN.tauEnd } : null  /* when he dashes off, and when he has left the screen */
  };
}
