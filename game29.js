// Игра 29 декабря — «Замёрзшая Виски». Три этапа:
// 1) повернуть трубы и соединить котёл с батареей; 2) вентилями выставить ровно 23 °C; 3) найти и закрыть сквозняки.
// Виски отогревается вместе с комнатой.
(function () {
  "use strict";
  const W = 1600, H = 900, FLOOR = 830, CAT_X = 250;
  const N = 1, E = 2, S = 4, Wd = 8, DIRV = { 1: [0, -1], 2: [1, 0], 4: [0, 1], 8: [-1, 0] }, OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  const SHAPES = { straight: 10, corner: 9, tee: 11, cross: 15 };
  const rot1 = (m) => ((m << 1) | (m >> 3)) & 15;
  const rotN = (m, r) => { for (let i = 0; i < (r % 4 + 4) % 4; i++) m = rot1(m); return m; };
  let Sh, img, meta, wall = null, st = null, lastSay = {};
  const now = () => performance.now(), rnd = (a, b) => a + Math.random() * (b - a);
  const sayOnce = (k, gap = 5000) => { const t = now(); if (!lastSay[k] || t - lastSay[k] > gap) { lastSay[k] = t; Sh.say(k); } };

  // ---------- фон ----------
  function paintWall() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    // обои: тёплые полосы и мелкий узор
    g.fillStyle = "#d7c2a4"; g.fillRect(0, 0, W, FLOOR);
    for (let x = 0; x < W; x += 64) { g.fillStyle = "#cdb697"; g.fillRect(x, 0, 30, FLOOR); g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(x + 30, 0, 3, FLOOR); }
    g.fillStyle = "rgba(150,90,60,.22)";
    for (let y = 40; y < 620; y += 56) for (let x = 15 + ((y / 56) % 2) * 32; x < W; x += 64) { g.fillRect(x, y, 4, 4); g.fillRect(x - 4, y + 4, 4, 4); g.fillRect(x + 4, y + 4, 4, 4); g.fillRect(x, y + 8, 4, 4); }
    // деревянные панели внизу стены
    const wy = 640; g.fillStyle = "#6e4328"; g.fillRect(0, wy, W, FLOOR - wy);
    g.fillStyle = "#8a5634"; g.fillRect(0, wy, W, 10); g.fillStyle = "#4e2d18"; g.fillRect(0, wy + 10, W, 3);
    for (let x = 20; x < W; x += 150) { g.fillStyle = "#7a4b2d"; g.fillRect(x, wy + 28, 120, FLOOR - wy - 52); g.strokeStyle = "#4e2d18"; g.lineWidth = 3; g.strokeRect(x, wy + 28, 120, FLOOR - wy - 52); g.fillStyle = "rgba(255,210,160,.12)"; g.fillRect(x + 4, wy + 32, 112, 4); }
    g.fillStyle = "#e6dccb"; g.fillRect(0, FLOOR - 16, W, 16); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, FLOOR - 2, W, 2);
    // пол
    for (let y = FLOOR; y < H; y += 24) { g.fillStyle = (y / 24) % 2 ? "#6c3f22" : "#784828"; g.fillRect(0, y, W, 24); g.fillStyle = "rgba(30,14,6,.45)"; g.fillRect(0, y + 22, W, 2); }
    for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(30,14,6,.4)"; g.fillRect(((i * 397) % W), FLOOR + (i % 3) * 24, 2, 22); }
    // коврик под Виски
    g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(CAT_X, FLOOR + 44, 182, 27, 0, 0, 7); g.fill();
    g.fillStyle = "#8f2f2a"; g.beginPath(); g.ellipse(CAT_X, FLOOR + 40, 176, 26, 0, 0, 7); g.fill();
    g.fillStyle = "#a13a33"; g.beginPath(); g.ellipse(CAT_X, FLOOR + 38, 160, 20, 0, 0, 7); g.fill();
    g.strokeStyle = "#e3b55b"; g.lineWidth = 3; g.beginPath(); g.ellipse(CAT_X, FLOOR + 40, 150, 18, 0, 0, 7); g.stroke();
    // провод гирлянды под потолком
    g.strokeStyle = "#3a2a20"; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = 22 + Math.abs(Math.sin(x / 130)) * 26; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    return c;
  }
  function garland(g, t) {
    for (let x = 20, k = 0; x < W; x += 52, k++) {
      const y = 22 + Math.abs(Math.sin(x / 130)) * 26, on = 0.6 + 0.4 * Math.sin(t / 500 + k * 1.7);
      const col = ["255,214,110", "255,150,90", "255,236,170"][k % 3];
      g.fillStyle = `rgba(${col},${0.18 * on})`; g.beginPath(); g.arc(x, y + 8, 16, 0, 7); g.fill();
      g.fillStyle = `rgba(${col},${0.7 + 0.3 * on})`; g.fillRect(x - 4, y + 3, 8, 10); g.fillStyle = "#3a2a20"; g.fillRect(x - 3, y, 6, 4);
    }
  }
  function board(g, x, y, w, h) {                      // деревянный щит, на котором закреплены трубы
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x + 8, y + 10, w, h);
    g.fillStyle = "#5a3620"; g.fillRect(x, y, w, h);
    for (let yy = y + 6; yy < y + h - 6; yy += 38) { g.fillStyle = (yy / 38) % 2 < 1 ? "#7b4c2c" : "#734628"; g.fillRect(x + 6, yy, w - 12, 36); g.fillStyle = "rgba(255,220,170,.08)"; g.fillRect(x + 6, yy, w - 12, 3); }
    g.strokeStyle = "#3a2010"; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, w - 4, h - 4);
    g.fillStyle = "#c9c2b5"; [[x + 16, y + 16], [x + w - 22, y + 16], [x + 16, y + h - 22], [x + w - 22, y + h - 22]].forEach(([a, b]) => { g.fillRect(a, b, 8, 8); g.fillStyle = "#7d766b"; g.fillRect(a + 2, b + 3, 4, 2); g.fillStyle = "#c9c2b5"; });
  }
  // ---------- трубы (рисуются кодом, чтобы стыки совпадали идеально) ----------
  const PC = { out: "#3a1d0e", base: "#b8693a", hi: "#e9a066", sh: "#7d3f1e", fl: "#9a522b", flHi: "#cf8650", riv: "#f0c27a" };
  function arm(g, d, T, pw, hot, t, phase) {
    const h = T / 2;
    g.save(); g.rotate({ 2: 0, 4: Math.PI / 2, 8: Math.PI, 1: -Math.PI / 2 }[d]);
    g.fillStyle = PC.out; g.fillRect(0, -pw / 2 - 3, h, pw + 6);
    g.fillStyle = PC.base; g.fillRect(0, -pw / 2, h, pw);
    g.fillStyle = PC.hi; g.fillRect(0, -pw / 2 + 4, h, pw * 0.22);
    g.fillStyle = PC.sh; g.fillRect(0, pw / 2 - pw * 0.24, h, pw * 0.24);
    if (hot) {
      const k = 0.5 + 0.5 * Math.sin(t / 220 + phase);
      g.fillStyle = `rgb(255,${130 + 60 * k | 0},30)`; g.fillRect(0, -pw * 0.22, h, pw * 0.44);
      g.fillStyle = "#ffe066"; g.fillRect(0, -pw * 0.1, h, pw * 0.2);
      g.fillStyle = "rgba(255,250,200,.9)";
      for (let i = 0; i < 3; i++) { const x = ((t / 9 + i * h / 3 + phase * 40) % h); g.fillRect(x, -3, 6, 6); }
    }
    // фланец на краю клетки
    g.fillStyle = PC.out; g.fillRect(h - 13, -pw * 0.68 - 3, 13, pw * 1.36 + 6);
    g.fillStyle = PC.fl; g.fillRect(h - 11, -pw * 0.68, 9, pw * 1.36);
    g.fillStyle = PC.flHi; g.fillRect(h - 11, -pw * 0.68, 3, pw * 1.36);
    g.fillStyle = PC.riv; g.fillRect(h - 9, -pw * 0.55, 4, 4); g.fillRect(h - 9, pw * 0.48, 4, 4);
    g.restore();
  }
  function drawPipe(g, mask, cx, cy, ang, T, pw, hot, t, phase) {
    g.save(); g.translate(cx, cy); g.rotate(ang);
    for (const d of [N, E, S, Wd]) if (mask & d) arm(g, d, T, pw, hot, t, phase);
    const c = pw * 0.62;
    g.fillStyle = PC.out; g.fillRect(-c - 3, -c - 3, c * 2 + 6, c * 2 + 6);
    g.fillStyle = PC.base; g.fillRect(-c, -c, c * 2, c * 2);
    g.fillStyle = PC.hi; g.fillRect(-c, -c, c * 2, 5); g.fillStyle = PC.sh; g.fillRect(-c, c - 6, c * 2, 6);
    if (hot) { g.fillStyle = "#ffb02e"; g.fillRect(-pw * 0.3, -pw * 0.3, pw * 0.6, pw * 0.6); g.fillStyle = "#ffe066"; g.fillRect(-pw * 0.14, -pw * 0.14, pw * 0.28, pw * 0.28); }
    g.fillStyle = PC.riv; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.fillRect(a * c * 0.7 - 2, b * c * 0.7 - 2, 4, 4));
    g.restore();
  }
  function longPipe(g, x1, y1, x2, y2, pw, hot, t) {      // прямая труба любой длины в том же стиле
    const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
    g.save(); g.translate(x1, y1); g.rotate(ang);
    g.fillStyle = PC.out; g.fillRect(-pw * 0.62, -pw / 2 - 3, len + pw * 1.24, pw + 6);
    g.fillStyle = PC.base; g.fillRect(-pw * 0.62 + 3, -pw / 2, len + pw * 1.24 - 6, pw);
    g.fillStyle = PC.hi; g.fillRect(-pw * 0.62 + 3, -pw / 2 + 4, len + pw * 1.24 - 6, pw * 0.22);
    g.fillStyle = PC.sh; g.fillRect(-pw * 0.62 + 3, pw / 2 - pw * 0.24, len + pw * 1.24 - 6, pw * 0.24);
    if (hot) {
      g.fillStyle = "#ff9a26"; g.fillRect(0, -pw * 0.2, len, pw * 0.4); g.fillStyle = "#ffe066"; g.fillRect(0, -pw * 0.08, len, pw * 0.16);
      g.fillStyle = "rgba(255,250,200,.9)"; for (let x = (t / 8) % 60; x < len; x += 60) g.fillRect(x, -3, 6, 6);
    }
    for (let x = 0; x <= len + 1; x += Math.max(60, len / Math.max(1, Math.round(len / 110)))) {
      g.fillStyle = PC.out; g.fillRect(x - 7, -pw * 0.66 - 3, 14, pw * 1.32 + 6); g.fillStyle = PC.fl; g.fillRect(x - 5, -pw * 0.66, 10, pw * 1.32);
      g.fillStyle = PC.riv; g.fillRect(x - 2, -pw * 0.54, 4, 4); g.fillRect(x - 2, pw * 0.46, 4, 4);
    }
    g.restore();
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function spr(g, name, x, y, s = 1, ax = 0.5, ay = 1, alpha = 1) {
    const m = meta[name]; g.save(); g.globalAlpha = alpha;
    g.drawImage(img, m[0], m[1], m[2], m[3], x - m[2] * s * ax, y - m[3] * s * ay, m[2] * s, m[3] * s); g.restore();
  }

  // ---------- этап 1: трубы ----------
  const G = { cols: 6, rows: 4, T: 112, pw: 40, x0: 560, y0: 210 };
  function buildPipes() {
    const { cols, rows } = G, sr = 1 + Math.floor(Math.random() * 2), er = Math.random() < 0.5 ? 0 : rows - 1;
    let path = null;
    for (let tries = 0; tries < 400 && !path; tries++) {
      const p = [[0, sr]], seen = new Set(["0," + sr]);
      for (let k = 0; k < 60; k++) {
        const [x, y] = p[p.length - 1]; if (x === cols - 1 && y === er) break;
        const opts = [[1, 0], [1, 0], [0, 1], [0, -1], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows && !seen.has(a + "," + b));
        if (!opts.length) break;
        const n = opts[Math.floor(Math.random() * opts.length)]; p.push(n); seen.add(n.join(","));
      }
      const L = p[p.length - 1];
      if (L[0] === cols - 1 && L[1] === er && p.length >= cols + 2 && p.length <= cols + 6) path = p;
    }
    const cell = Array.from({ length: rows }, () => Array(cols).fill(null));
    const dirTo = (a, b) => b[0] > a[0] ? E : b[0] < a[0] ? Wd : b[1] > a[1] ? S : N;
    path.forEach((p, i) => {
      let m = 0;
      m |= i === 0 ? Wd : dirTo(p, path[i - 1]);
      m |= i === path.length - 1 ? E : dirTo(p, path[i + 1]);
      if (Math.random() < 0.15) { const extra = [N, E, S, Wd].filter(d => !(m & d)); m |= extra[Math.floor(Math.random() * extra.length)]; }
      cell[p[1]][p[0]] = m;
    });
    const fill = () => { const r = Math.random(); return r < 0.4 ? SHAPES.corner : r < 0.7 ? SHAPES.straight : r < 0.95 ? SHAPES.tee : SHAPES.cross; };
    st.grid = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const need = cell[y][x], base = need ? shapeOf(need) : fill(), rot = Math.floor(Math.random() * 4);
      st.grid.push({ x, y, base, rot, ang: rot * Math.PI / 2, phase: Math.random() * 6 });
    }
    st.sr = sr; st.er = er; st.path = path; st.t0 = now(); st.hintAt = now() + 40000; st.hint = null;
    st.need = path.map((p, i) => [p[0], p[1], (i === 0 ? Wd : dirTo(p, path[i - 1])) | (i === path.length - 1 ? E : dirTo(p, path[i + 1]))]);
    if (connected().solved) { const c = st.grid.find(c => c.x === path[1][0] && c.y === path[1][1]); c.rot++; c.ang = c.rot * Math.PI / 2; }
  }
  function shapeOf(m) { const n = [N, E, S, Wd].filter(d => m & d).length; return n === 4 ? SHAPES.cross : n === 3 ? SHAPES.tee : (m === 10 || m === 5) ? SHAPES.straight : SHAPES.corner; }
  const maskOf = (c) => rotN(c.base, c.rot);
  const at = (x, y) => st.grid[y * G.cols + x];
  function connected() {
    const hot = new Set(), start = at(0, st.sr);
    if (!(maskOf(start) & Wd)) return { hot, solved: false };
    const q = [start]; hot.add(start);
    while (q.length) {
      const c = q.shift(), m = maskOf(c);
      for (const d of [N, E, S, Wd]) {
        if (!(m & d)) continue; const [dx, dy] = DIRV[d], nx = c.x + dx, ny = c.y + dy;
        if (nx < 0 || ny < 0 || nx >= G.cols || ny >= G.rows) continue;
        const n = at(nx, ny); if (hot.has(n) || !(maskOf(n) & OPP[d])) continue; hot.add(n); q.push(n);
      }
    }
    const end = at(G.cols - 1, st.er);
    return { hot, solved: hot.has(end) && !!(maskOf(end) & E) };
  }
  function clickPipe(x, y) {
    const cx = Math.floor((x - G.x0) / G.T), cy = Math.floor((y - G.y0) / G.T);
    if (cx < 0 || cy < 0 || cx >= G.cols || cy >= G.rows || st.stageDone) return;
    const c = at(cx, cy); c.rot++; SFX.clank();
    const before = st.hot ? st.hot.size : 0, r = connected(); st.hot = r.hot;
    if (r.hot.size > before) { SFX.gurgle(); if (r.hot.size >= before + 2) setTimeout(() => SFX.hissShort(), 120); }
    if (r.hot.size >= before + 2 && r.hot.size >= 4) sayOnce("day29.pipe", 9000);
    if (r.solved) { st.stageDone = true; Sh.confetti(); SFX.steam(1.6, 0.4); SFX.gurgle(); st.puffs = now(); setTimeout(() => SFX.fanfare(), 300); st.tempTarget = 15; setTimeout(() => nextStage(), 2300); }
  }

  // ---------- этап 2: вентили ----------
  const VALVES = [{ y: 330, w: 1 }, { y: 490, w: 3 }, { y: 650, w: 5 }], BASE_T = 9, TARGET = 23;
  function valveTemp() { return BASE_T + st.levels.reduce((a, l, i) => a + l * VALVES[i].w, 0); }
  const BTN = { minus: 770, plus: 990, r: 30 };
  function clickValve(x, y) {
    if (st.stageDone) return;
    const i = VALVES.findIndex(v => Math.abs(y - v.y) < 60); if (i < 0) return;
    let d = 0;
    if (Math.hypot(x - BTN.minus, y - VALVES[i].y) < BTN.r + 8) d = -1;
    else if (Math.hypot(x - BTN.plus, y - VALVES[i].y) < BTN.r + 8 || Math.abs(x - 880) < 60) d = 1;
    if (!d) return;
    const nl = st.levels[i] + d;
    if (nl < 0 || nl > 3) { SFX.deny(); st.btnFlash = { i, d, t: now(), bad: true }; return; }
    st.levels[i] = nl; st.spin[i] = now(); st.spinDir = st.spinDir || []; st.spinDir[i] = d; st.btnFlash = { i, d, t: now() }; SFX.creak(); SFX.clank();
    if (d > 0) { SFX.hissShort(); setTimeout(() => SFX.gurgle(), 150); st.valvePuff = { i, t: now() }; } else SFX.steam(0.5, 0.2);
    st.tempTarget = valveTemp(); st.okSince = 0;
    if (st.tempTarget > TARGET) sayOnce("day29.hot", 6000); else if (st.tempTarget < 15) sayOnce("day29.cold", 8000);
  }

  // ---------- этап 3: ветер распахивает окна — захлопывай и держи тепло ----------
  const WINS = [560, 820, 1080, 1340], WIN_Y = 440, WIN_S = 0.8, HOLD = 25, WARM_OK = 17;
  function openWindow(t) {
    const closed = st.wins.map((w, i) => w.open ? -1 : i).filter(i => i >= 0); if (!closed.length) return;
    const i = closed[Math.floor(Math.random() * closed.length)], w = st.wins[i];
    w.open = true; w.at = t; SFX.whoosh(); SFX.thud();
    if (!st.firstGust) { st.firstGust = true; Sh.say("day29.draft"); }
  }
  function clickWindow(x, y) {
    if (st.stageDone || y < WIN_Y - 240 || y > WIN_Y + 10) return;
    const i = WINS.findIndex(wx => Math.abs(x - wx) < 120); if (i < 0) return;
    const w = st.wins[i];
    if (!w.open) { st.wrong = { i, t: now() }; return; }
    w.open = false; w.closedAt = now(); SFX.unlock(); SFX.thud(); st.closes = (st.closes || 0) + 1;
    if (st.closes % 6 === 0) sayOnce("day29.right", 6000);
  }
  function finish() { st.won = true; SFX.fanfare(); setTimeout(() => SFX.meow(), 600); Sh.win(); }

  // ---------- общий ход ----------
  function nextStage() {
    st.stage++; st.stageDone = false; st.fade = now();
    if (st.stage === 1) { st.levels = [1, 1, 0]; st.spin = [0, 0, 0]; st.tempTarget = valveTemp(); st.okSince = 0; }
    if (st.stage === 2) { st.wins = WINS.map(() => ({ open: false, at: 0 })); st.flakes = []; st.hold = 0; st.nextGust = now() + 1800; st.tempTarget = TARGET; }
    renderHud();
  }
  function renderHud() {
    const goal = ["Соедини трубы", "Собери 23°", "Закрывай окна"][st.stage];
    Sh.hud.textContent = `Этап ${st.stage + 1}/3 · ${goal}`;
  }

  // ---------- Виски ----------
  function drawCat(g, t) {
    let name, jx = 0;
    const warmEnough = st.temp >= 21 && st.stage === 2 && st.wins && !st.wins.some(w => w.open);
    if (st.won || warmEnough) name = "warm" + (Math.floor(t / 700) % 2);
    else if (st.temp >= 17) name = "thaw";
    else {
      const blink = (t % 3600) < 160;                           // моргает раз в ~3.6 с
      name = blink ? "frozen1" : "frozen0";
      const ph = t % 2200, shiver = (ph < 650 && !st.pet) || (st.poke && t - st.poke < 600);   // дрожь; когда гладят — не дрожит
      jx = shiver ? Math.sin(t / 28) * (st.poke && t - st.poke < 600 ? 2.2 : 1.1 * (1 - ph / 650)) : 0;
    }
    const m = meta[name], [foot, fx] = meta[name + "_f"] || [m[3], m[2] / 2], br = name.startsWith("warm") ? 1 + 0.015 * Math.sin(t / 900 * Math.PI) : 1;
    const FY = FLOOR + 46;                                     // лапы — в середине коврика, ближе к зрителю
    g.fillStyle = "rgba(30,8,4,.30)"; g.beginPath(); g.ellipse(CAT_X, FY - 2, m[2] * 0.46, 14, 0, 0, 7); g.fill();
    g.fillStyle = "rgba(20,4,2,.45)"; g.beginPath(); g.ellipse(CAT_X, FY - 1, m[2] * 0.34, 8, 0, 0, 7); g.fill();
    g.save(); g.translate(CAT_X + jx, FY); g.scale(1, br); g.drawImage(img, m[0], m[1], m[2], m[3], -fx, -foot, m[2], m[3]); g.restore();
    st.headY = FY - foot;
  }
  function puff(g, x, y, k, size) {
    for (let j = 0; j < 5; j++) {
      const a = Math.max(0, 1 - k) * 0.55, r = size * (0.4 + k * 1.2) * (0.7 + j * 0.15);
      g.fillStyle = `rgba(255,255,255,${a * (1 - j * 0.15)})`; g.beginPath(); g.arc(x + Math.sin(j * 2.1 + k * 3) * size * 0.8, y - k * size * 3 - j * size * 0.5, r, 0, 7); g.fill();
    }
  }
  function steamFx(g, t) {
    if (st.stage === 0 && st.puffs) { const k = (t - st.puffs) / 1800; if (k < 1) { puff(g, G.x0 + G.cols * G.T + 30, G.y0 + st.er * G.T + 30, k, 26); puff(g, G.x0 - 30, G.y0 + st.sr * G.T + 30, k * 1.1, 20); } }
    if (st.stage === 1 && st.valvePuff) { const k = (t - st.valvePuff.t) / 1100; if (k < 1) puff(g, 900, VALVES[st.valvePuff.i].y - 30, k, 16); }
  }
  function drawThermometer(g, x, y, h) {
    const k = Math.max(0, Math.min(1, (st.temp - 5) / 25));
    g.fillStyle = "#3a2416"; g.fillRect(x - 18, y - 6, 36, h + 12); g.beginPath(); g.arc(x, y + h + 24, 30, 0, 7); g.fill();
    g.fillStyle = "#fbf1da"; g.fillRect(x - 12, y, 24, h); g.beginPath(); g.arc(x, y + h + 24, 24, 0, 7); g.fill();
    const col = st.temp < 17 ? "#4aa3df" : st.temp <= 23.4 ? "#e8463a" : "#ff8a1c";
    g.fillStyle = col; g.fillRect(x - 7, y + h * (1 - k), 14, h * k + 10); g.beginPath(); g.arc(x, y + h + 24, 18, 0, 7); g.fill();
    const ty = y + h * (1 - (TARGET - 5) / 25);
    g.fillStyle = "#2f8a3a"; g.fillRect(x + 14, ty - 2, 26, 4);
    g.font = "700 20px Rubik, sans-serif"; g.fillStyle = "#2f6b2f"; g.fillText("23°", x + 44, ty + 7);
    g.font = "700 30px Rubik, sans-serif"; g.fillStyle = "#3a2416"; g.textAlign = "center"; g.fillText(`${Math.round(st.temp)} °C`, x, y - 18); g.textAlign = "left";
  }
  let frostC = null;
  function frost(g, t) {
    const k = Math.max(0, Math.min(1, (22 - st.temp) / 12)); if (k <= 0.01) return;
    const c = frostC || (frostC = Object.assign(document.createElement("canvas"), { width: W, height: H })), f = c.getContext("2d");
    f.globalCompositeOperation = "source-over"; f.clearRect(0, 0, W, H);
    const gr = f.createRadialGradient(W / 2, H * 0.35, H * 0.3, W / 2, H * 0.35, W * 0.62);
    gr.addColorStop(0, "rgba(200,230,255,0)"); gr.addColorStop(1, "rgba(215,238,255,0.8)");
    f.fillStyle = gr; f.fillRect(0, 0, W, H);
    f.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 70; i++) { const a = i * 2.39996, r = 0.5 + ((i * 37) % 13) / 26; const x = W / 2 + Math.cos(a) * W * 0.5 * r, y = H * 0.35 + Math.sin(a) * H * 0.5 * r; if (Math.hypot((x - W / 2) / W, (y - H * 0.35) / H) > 0.4) f.fillRect(x, y, 3, 3); }
    f.globalCompositeOperation = "destination-out";          // у пола инея нет — Виски и коврик видны
    const fl = f.createLinearGradient(0, FLOOR - 330, 0, FLOOR - 40); fl.addColorStop(0, "rgba(0,0,0,0)"); fl.addColorStop(1, "rgba(0,0,0,1)");
    f.fillStyle = fl; f.fillRect(0, FLOOR - 330, W, H);
    g.save(); g.globalAlpha = k; g.drawImage(c, 0, 0); g.restore();
  }
  function snowIn(g, t, [cx, by, sc]) {                 // снег за стеклом окна
    const m = meta.winClosed, w = m[2] * sc, h = m[3] * sc, x0 = cx - w / 2 + w * 0.3, x1 = cx - w / 2 + w * 0.7, y0 = by - h + h * 0.18, y1 = by - h * 0.15;
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); g.fillStyle = "rgba(240,246,255,.9)";
    for (let i = 0; i < 26; i++) { const sp = 18 + (i * 7) % 25, y = y0 + ((t / 1000 * sp + i * 37) % (y1 - y0)), x = x0 + ((i * 53) % (x1 - x0)) + Math.sin(t / 700 + i) * 4; g.fillRect(x, y, 3, 3); }
    g.restore();
  }

  const game = {
    mount(sh) {
      Sh = sh;
      Sh.cv.addEventListener("pointerdown", (e) => {
        if (!st || Sh.paused) return;
        const r = Sh.cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
        [clickPipe, clickValve, clickWindow][st.stage](x, y);
      });
      Sh.cv.style.cursor = "pointer";
    },
    async load() {
      if (img) return;
      const ld = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      [img, meta] = await Promise.all([ld("assets/game29.webp"), fetch("assets/game29.json").then(r => r.json())]);
      wall = paintWall();
    },
    newGame() { if (window.MUSIC) MUSIC.warm(0); st = { stage: 0, temp: 9, tempTarget: 9, stageDone: false, hot: new Set(), won: false }; buildPipes(); st.hot = connected().hot; renderHud(); },
    step(dt, t) {
      if (!st) return;
      if (st.stage === 2) {
        const open = st.wins.filter(w => w.open).length;
        if (!st.stageDone) {
          st.temp += (1.0 - 1.3 * open) * dt; st.temp = Math.max(12, Math.min(TARGET, st.temp)); st.tempTarget = st.temp;   // батарея греет, окна остужают
          st.rate = Math.max(0.15, Math.min(1, (st.temp - 14) / 6)); st.hold += dt * st.rate;          // в тепле шкала идёт быстро, в холоде — еле ползёт
          const k = Math.min(1, st.hold / HOLD);
          if (t > st.nextGust) { openWindow(t); if (k > 0.66 && Math.random() < 0.2) setTimeout(() => st && st.stage === 2 && !st.stageDone && openWindow(now()), 500); st.nextGust = t + (2800 - 1200 * k) * rnd(0.8, 1.2); }
          if (st.temp < 15) sayOnce("day29.cold", 8000);
          if (st.hold >= HOLD) { st.stageDone = true; Sh.confetti(); st.wins.forEach(w => { if (w.open) { w.open = false; w.closedAt = t; } }); st.tempTarget = TARGET; setTimeout(() => st && finish(), 1200); }
        } else { const d = TARGET - st.temp; st.temp += Math.sign(d) * Math.min(Math.abs(d), 2 * dt); }
        st.wins.forEach((w, i) => { if (w.open && Math.random() < dt * 16) st.flakes.push({ x: WINS[i] + rnd(-70, 70), y: WIN_Y - rnd(40, 180), vx: rnd(-60, 60), vy: rnd(60, 140), t }); });
        for (const f of st.flakes) { f.x += f.vx * dt; f.y += f.vy * dt; }
        st.flakes = st.flakes.filter(f => t - f.t < 1800 && f.y < FLOOR);
      } else {
        const d = st.tempTarget - st.temp; st.temp += Math.sign(d) * Math.min(Math.abs(d), 1.6 * dt * (Math.abs(d) > 3 ? 2 : 1));
      }
      if (st.stage === 1 && !st.stageDone) {
        if (Math.round(st.temp) === TARGET && st.tempTarget === TARGET) { st.okSince = st.okSince || t; if (t - st.okSince > 900) { st.stageDone = true; Sh.confetti(); Sh.say("day29.right"); SFX.fanfare(); setTimeout(() => st && nextStage(), 2000); } }
        else st.okSince = 0;
      }
      if (st.stage === 0 && !st.stageDone && t > st.hintAt) {
        const wrong = st.need.find(([x, y, need]) => (maskOf(at(x, y)) & need) !== need);
        if (wrong) { st.hint = { x: wrong[0], y: wrong[1], t }; st.hintAt = t + 15000; sayOnce("calendar.hint", 20000); }
      }
      if ((st.stage === 0 && st.hot.size > 2) || (st.stage === 1 && st.levels.some(l => l))) {
        if (!st.nextBub || t > st.nextBub) { st.nextBub = t + rnd(1800, 3800); SFX.gurgle(); if (Math.random() < 0.3) setTimeout(() => SFX.hissShort(), 300); }
      }
      if (window.MUSIC) MUSIC.warm(st.won ? 1 : (st.temp - 9) / 14);
      renderHudThrottled(t);
    },
    head() { return st ? { x: CAT_X + 20, y: (st.headY || FLOOR - 200) - 4 } : null; },
    catHit(x, y) { return !!st && Math.abs(x - CAT_X) < 150 && y > (st.headY || FLOOR - 200) - 10 && y < FLOOR + 50; },
    catPet(on) { if (st) st.pet = on; },
    catPoke() { if (st) st.poke = performance.now(); },
    draw(g, t) {
      if (!st) return;
      g.drawImage(wall, 0, 0); garland(g, t);
      const WP = st.stage === 0 ? [190, 590, 1.0] : st.stage === 1 ? [140, 300, 0.8] : null;
      if (WP) { spr(g, "winClosed", WP[0], WP[1], WP[2]); snowIn(g, t, WP); }
      if (st.stage === 0) {
        const hotSet = st.hot, solvedGlow = st.stageDone;
        const by = G.y0 + st.sr * G.T + G.T / 2, ry = G.y0 + st.er * G.T + G.T / 2;
        drawPipe(g, E | Wd, G.x0 - G.T / 2 + 8, by, 0, G.T, G.pw, true, t, 0);
        spr(g, "boiler", G.x0 - G.T - 40, by + 90, 1.0);
        drawPipe(g, E | Wd, G.x0 + G.cols * G.T + G.T / 2 - 8, ry, 0, G.T, G.pw, solvedGlow, t, 1);
        spr(g, "radiator", G.x0 + G.cols * G.T + G.T + 80, ry + 92, 0.9);
        board(g, G.x0 - 24, G.y0 - 24, G.cols * G.T + 48, G.rows * G.T + 48);
        for (const c of st.grid) {
          const target = c.rot * Math.PI / 2; c.ang += (target - c.ang) * 0.35;
          const cx = G.x0 + c.x * G.T + G.T / 2, cy = G.y0 + c.y * G.T + G.T / 2;
          g.strokeStyle = "rgba(30,15,5,.25)"; g.lineWidth = 1; g.strokeRect(G.x0 + c.x * G.T, G.y0 + c.y * G.T, G.T, G.T);
          drawPipe(g, c.base, cx, cy, c.ang, G.T, G.pw, hotSet.has(c), t, c.phase);
        }
        if (st.hint && !solvedGlow) {
          const h = st.hint, ok = (maskOf(at(h.x, h.y)) & st.need.find(n => n[0] === h.x && n[1] === h.y)[2]) === st.need.find(n => n[0] === h.x && n[1] === h.y)[2];
          if (ok) st.hint = null;
          else { g.save(); g.strokeStyle = `rgba(255,230,120,${0.55 + 0.45 * Math.sin(t / 160)})`; g.lineWidth = 6; g.setLineDash([14, 10]); g.lineDashOffset = -t / 30;
            g.strokeRect(G.x0 + h.x * G.T + 4, G.y0 + h.y * G.T + 4, G.T - 8, G.T - 8); g.restore(); }
        }
        if (solvedGlow) { g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(255,170,60,${0.12 + 0.08 * Math.sin(t / 200)})`; g.fillRect(0, 0, W, H); g.restore(); }
      }
      if (st.stage === 1) {
        const anyHot = st.levels.some(l => l > 0);
        longPipe(g, 1214, VALVES[0].y, 1214, VALVES[2].y, 36, anyHot, t);
        longPipe(g, 1214, VALVES[1].y, 1300, VALVES[1].y, 36, anyHot, t);
        longPipe(g, 470, VALVES[0].y, 470, VALVES[2].y, 36, true, t);
        longPipe(g, 380, VALVES[0].y, 470, VALVES[0].y, 36, true, t);
        spr(g, "boiler", 330, VALVES[0].y + 92, 0.95);
        VALVES.forEach((v, i) => { longPipe(g, 470, v.y, 880, v.y, 36, true, t); longPipe(g, 880, v.y, 1214, v.y, 36, st.levels[i] > 0, t); });
        spr(g, "radiator", 1390, VALVES[1].y + 92, 1.0);
        VALVES.forEach((v, i) => {
          const m = meta.valve, wh = meta.valveWheel, s = 1.05, x = 880 - m[2] * s / 2, y = v.y - m[3] * s / 2;
          g.drawImage(img, m[0], m[1], m[2], m[3], x, y, m[2] * s, m[3] * s);
          const sp = st.spin[i] ? Math.min(1, (now() - st.spin[i]) / 300) : 1, sd = (st.spinDir && st.spinDir[i]) || 1, ang = (st.levels[i] - sd + sd * sp) * Math.PI / 2;
          g.save(); g.translate(x + wh[0] * s, y + wh[1] * s); g.beginPath(); g.arc(0, 0, wh[2] * s, 0, 7); g.clip(); g.rotate(ang);
          g.drawImage(img, m[0] + wh[0] - wh[2], m[1] + wh[1] - wh[2], wh[2] * 2, wh[2] * 2, -wh[2] * s, -wh[2] * s, wh[2] * 2 * s, wh[2] * 2 * s); g.restore();
          for (let k = 0; k < 3; k++) { g.fillStyle = k < st.levels[i] ? "#ffb02e" : "rgba(58,36,22,.35)"; g.fillRect(845 + k * 26, v.y + 52, 18, 10); }
          for (const [bx, sign] of [[BTN.minus, -1], [BTN.plus, 1]]) {
            const fl = st.btnFlash && st.btnFlash.i === i && st.btnFlash.d === sign && now() - st.btnFlash.t < 200, bad = fl && st.btnFlash.bad;
            g.fillStyle = "#3a2416"; g.beginPath(); g.arc(bx, v.y + 2, BTN.r + 3, 0, 7); g.fill();
            g.fillStyle = bad ? "#c9483a" : fl ? "#ffe08a" : sign > 0 ? "#ffcf7a" : "#f5e7c8"; g.beginPath(); g.arc(bx, v.y, BTN.r, 0, 7); g.fill();
            g.fillStyle = "#3a2416"; g.fillRect(bx - 12, v.y - 3, 24, 6); if (sign > 0) g.fillRect(bx - 3, v.y - 12, 6, 24);
          }
          // подпись: сила вентиля
          g.fillStyle = "rgba(255,250,235,.92)"; roundRect(g, 585, v.y - 68, 90, 44, 10); g.fill(); g.strokeStyle = "#8a6a35"; g.lineWidth = 2; g.stroke();
          g.font = "800 26px Rubik, sans-serif"; g.fillStyle = "#3a2416"; g.textAlign = "center";
          g.fillText(`+${v.w}°`, 630, v.y - 37); g.textAlign = "left";
        });
        // табличка с расчётом
        const sum = valveTemp(), ok = sum === TARGET, col = ok ? "#2f7a34" : sum > TARGET ? "#c25a1c" : "#2d5f8f";
        g.fillStyle = "rgba(58,36,22,.9)"; roundRect(g, 1015, 34, 170, 92, 14); g.fill();
        g.fillStyle = "#fbf1da"; roundRect(g, 1023, 42, 154, 76, 10); g.fill();
        g.textAlign = "center"; g.font = "800 46px Rubik, sans-serif"; g.fillStyle = col; g.fillText(`${sum}°${ok ? " ✓" : ""}`, 1100, 97);
        g.textAlign = "left";
        drawThermometer(g, 1500, 220, 470);
      }
      if (st.stage === 2) {
        spr(g, "radiator", 950, 650, 0.85);
        WINS.forEach((wx, i) => {
          const w = st.wins[i];
          let jx = 0, name = w.open ? "winOpen" : "winClosed";
          if (w.open) jx = Math.sin(t / 45 + i) * 2.5;
          if (st.wrong && st.wrong.i === i && now() - st.wrong.t < 250) jx = Math.sin((now() - st.wrong.t) / 25) * 3;
          const pop = w.closedAt ? Math.max(0, 1 - (now() - w.closedAt) / 220) : 0;
          spr(g, name, wx + jx, WIN_Y, WIN_S * (1 + pop * 0.04));
          if (w.open) {                                   // ветер внутрь
            const k = ((t - w.at) % 1400) / 1400;
            g.strokeStyle = `rgba(160,210,255,${0.55 * Math.sin(Math.PI * k)})`; g.lineWidth = 4;
            for (let j = 0; j < 3; j++) { const yy = WIN_Y - 170 + j * 45; g.beginPath(); g.moveTo(wx - 30 + k * 60, yy); g.bezierCurveTo(wx + 20 + k * 90, yy - 25, wx + 60 + k * 110, yy + 25, wx + 110 + k * 120, yy + 10); g.stroke(); }
            g.fillStyle = "rgba(255,255,255,.9)"; g.font = "700 22px Rubik, sans-serif"; g.textAlign = "center"; g.fillText("закрой!", wx, WIN_Y - 236 + Math.sin(t / 150) * 3); g.textAlign = "left";
          }
        });
        g.fillStyle = "rgba(240,248,255,.95)";
        for (const f of st.flakes) { g.globalAlpha = Math.max(0, 1 - (t - f.t) / 1800); g.fillRect(f.x, f.y, 4, 4); }
        g.globalAlpha = 1;
        // шкала «держи тепло»
        const k = Math.min(1, st.hold / HOLD), bw = 640, bx = (W - bw) / 2, by = 74;
        g.fillStyle = "rgba(58,36,22,.85)"; roundRect(g, bx - 6, by - 6, bw + 12, 40, 12); g.fill();
        g.fillStyle = "#2b1d14"; roundRect(g, bx, by, bw, 28, 9); g.fill();
        const gr = g.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, "#ffb347"); gr.addColorStop(1, "#ff6a3d");
        const warmBar = (st.rate || 1) >= 0.6;
        g.fillStyle = warmBar ? gr : "#5c7fa3"; roundRect(g, bx, by, Math.max(18, bw * k), 28, 9); g.fill();
        g.fillStyle = "#fff7e6"; g.font = "700 18px Rubik, sans-serif"; g.textAlign = "center";
        g.fillText(warmBar ? "Держи тепло" : "Холодно! Закрой окна", bx + bw / 2, by + 20); g.textAlign = "left";
        drawThermometer(g, 1530, 520, 220);
      }
      steamFx(g, t);
      drawCat(g, t);
      frost(g, t);
      if (st.fade) { const k = 1 - (t - st.fade) / 500; if (k > 0) { g.fillStyle = `rgba(13,16,32,${k})`; g.fillRect(0, 0, W, H); } else st.fade = 0; }
    },
  };
  let hudT = 0; function renderHudThrottled(t) { if (t - hudT > 200) { hudT = t; renderHud(); } }

  Sh = DayShell({
    d: 29, W, H, music: "g29", title: "Замёрзшая Виски", hints: ["day29.hint"],
    rules: { goal: "Отопление сломалось, и Виски мёрзнет. Верни в дом тепло.", how: ["Поворачивай трубы, чтобы горячая вода дошла до батареи", "Настрой вентили так, чтобы получилось ровно 23°", "Захлопывай окна, пока не наполнится шкала тепла"] },
  }, game);
  const shell = Sh;
  window.Game29 = { open: (o) => shell.open(o), _new: () => game.newGame(), _st: () => st, _pipe: clickPipe, _valve: clickValve, _win: clickWindow, _conn: () => connected(), G, VALVES, WINS, WIN_Y };
})();
