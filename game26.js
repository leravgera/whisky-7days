// Игра 26 декабря — «Операция: накормить Виски». Три лабиринта из коробок:
// 1) дойти до миски; 2) найти ключ и открыть дверь; 3) собрать три лакомства и дойти до миски.
(function () {
  "use strict";
  const W = 1600, H = 900;
  const LEVELS = [
    { name: "лёгкий",        cw: 6,  ch: 3, seed: 11 },
    { name: "сложный",       cw: 13, ch: 7, seed: 23, key: true, doorAt: 0.5 },
    { name: "очень сложный", cw: 18, ch: 9, seed: 41, key: true, doorAt: 0.4, treats: 3, dark: true },
  ];
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  let S, img, meta, st = null, held = null, dpad;

  // ---------- лабиринт ----------
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function makeMaze(cw, ch, seed) {
    const R = rng(seed), cols = cw * 2 + 1, rows = ch * 2 + 1;
    const g = Array.from({ length: rows }, () => Array(cols).fill(1));
    const stack = [[0, 0]], seen = new Set(["0,0"]); g[1][1] = 0;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen.has(nx + "," + ny));
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = nb[Math.floor(R() * nb.length)];
      g[y * 2 + 1 + dy][x * 2 + 1 + dx] = 0; g[ny * 2 + 1][nx * 2 + 1] = 0; seen.add(nx + "," + ny); stack.push([nx, ny]);
    }
    return { g, cols, rows };
  }
  function bfs(m, from, blocked) {
    const dist = new Map(), par = new Map(), q = [from], k = (p) => p[0] + "," + p[1];
    dist.set(k(from), 0);
    while (q.length) {
      const p = q.shift();
      for (const [dx, dy] of Object.values(DIRS)) {
        const n = [p[0] + dx, p[1] + dy];
        if (m.g[n[1]] === undefined || m.g[n[1]][n[0]] !== 0 || dist.has(k(n)) || (blocked && blocked(n))) continue;
        dist.set(k(n), dist.get(k(p)) + 1); par.set(k(n), p); q.push(n);
      }
    }
    return { dist, par };
  }
  function pathTo(b, to) { const out = []; let p = to, k = (q) => q[0] + "," + q[1]; while (b.par.has(k(p))) { out.unshift(p); p = b.par.get(k(p)); } return out; }
  const key = (p) => p[0] + "," + p[1];
  const isCell = (p) => p[0] % 2 === 1 && p[1] % 2 === 1;
  function farthest(b, filter) { let best = null, bd = -1; for (const [kk, d] of b.dist) { const p = kk.split(",").map(Number); if (isCell(p) && d > bd && (!filter || filter(p))) { bd = d; best = p; } } return best; }

  function buildLevel(i) {
    const L = LEVELS[i], m = makeMaze(L.cw, L.ch, L.seed), start = [1, 1];
    const b0 = bfs(m, start), bowl = farthest(b0);
    const lv = { i, m, start, bowl, items: [], door: null, needTreats: 0 };
    if (L.key) {
      const path = pathTo(b0, bowl), onPath = new Set(path.map(key)), total = L.cw * L.ch;
      // дверь — там, где и до неё, и после остаётся много лабиринта
      let best = null, bestScore = -1;
      for (let di = Math.floor(path.length * 0.2); di < Math.floor(path.length * 0.85); di++) {
        if (isCell(path[di])) continue;
        const bd = bfs(m, start, (n) => key(n) === key(path[di]));
        let pre = 0, side = 0;
        for (const kk of bd.dist.keys()) { const p = kk.split(",").map(Number); if (isCell(p)) { pre++; if (!onPath.has(kk)) side++; } }
        const score = Math.min(side, total - pre) - Math.abs(di / path.length - L.doorAt) * total * 0.3;
        if (score > bestScore) { bestScore = score; best = { di, bd }; }
      }
      lv.door = { p: path[best.di], open: false };
      const kp = farthest(best.bd, (p) => !onPath.has(key(p)) && key(p) !== key(start)) || farthest(best.bd, (p) => key(p) !== key(start));
      lv.items.push({ t: "key", p: kp });
    }
    if (L.treats) {
      const dead = [];
      for (const [kk, d] of b0.dist) {
        const p = kk.split(",").map(Number);
        if (!isCell(p) || key(p) === key(start) || key(p) === key(bowl) || (lv.door && key(p) === key(lv.door.p)) || lv.items.some(it => key(it.p) === key(p))) continue;
        const open = Object.values(DIRS).filter(([dx, dy]) => m.g[p[1] + dy][p[0] + dx] === 0).length;
        if (open === 1) dead.push([p, d]);
      }
      dead.sort((a, b) => a[1] - b[1]);
      const maxd = b0.dist.get(key(bowl)), picks = [];
      for (const f of [0.3, 0.55, 0.8]) {
        let best = null, bd = 1e9;
        for (const [p, d] of dead) { if (picks.includes(p)) continue; const s = Math.abs(d - f * maxd); if (s < bd) { bd = s; best = p; } }
        if (best) picks.push(best);
      }
      picks.forEach((p, j) => lv.items.push({ t: "treat" + (j % 3), p }));
      lv.needTreats = picks.length;
    }
    // размер клетки и сдвиг, чтобы лабиринт целиком помещался под шапкой
    const T = Math.floor(Math.min((W - 40) / m.cols, (H - 110) / (m.rows + 0.25)));
    lv.T = T; lv.ox = Math.round((W - m.cols * T) / 2); lv.oy = Math.round(78 + 0.25 * T + (H - 90 - (m.rows + 0.25) * T) / 2);
    lv.floor = paintFloor(lv);
    return lv;
  }

  // ---------- рисование ----------
  function paintFloor(lv) {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    g.fillStyle = "#2a1c22"; g.fillRect(0, 0, W, H);
    const { T, ox, oy, m } = lv, R = rng(lv.i * 7 + 3);
    for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
      const px = ox + x * T, py = oy + y * T;
      g.fillStyle = (y % 2 ? "#b77a45" : "#bd8049"); g.fillRect(px, py, T, T);
      g.fillStyle = "rgba(90,50,25,.35)"; g.fillRect(px, py + T - 2, T, 2);
      const seam = ((x + y * 3) % 4) * T / 4; g.fillRect(px + seam, py, 2, T);
      g.fillStyle = `rgba(255,220,170,${0.04 + R() * 0.05})`; g.fillRect(px + 3, py + 4, T - 6, 3);
    }
    // коврик на старте
    const s = lv.start, rx = ox + s[0] * T + T * 0.08, ry = oy + s[1] * T + T * 0.18;
    g.fillStyle = "#b8322c"; g.fillRect(rx, ry, T * 0.84, T * 0.64); g.strokeStyle = "#f2c14e"; g.lineWidth = Math.max(2, T * 0.05);
    g.strokeRect(rx + T * 0.07, ry + T * 0.07, T * 0.7, T * 0.5);
    g.fillStyle = "#f2c14e"; paw(g, rx + T * 0.42, ry + T * 0.33, T * 0.13);
    return c;
  }
  function paw(g, x, y, r) {
    g.beginPath(); g.ellipse(x, y + r * 0.35, r * 0.85, r * 0.7, 0, 0, 7); g.fill();
    [[-0.95, -0.55], [-0.35, -1.05], [0.35, -1.05], [0.95, -0.55]].forEach(([dx, dy]) => { g.beginPath(); g.arc(x + dx * r, y + dy * r, r * 0.32, 0, 7); g.fill(); });
  }
  function drawBox(g, lv, x, y) {
    const { T, ox, oy } = lv, D = Math.round(T * 0.22), px = ox + x * T, py = oy + y * T;
    const h = ((x * 73856093) ^ (y * 19349663)) >>> 0, v = (h % 5) * 4;
    const below = lv.m.g[y + 1] && lv.m.g[y + 1][x] === 1;
    if (!below) { g.fillStyle = `rgb(${160 + v},${112 + v},${62})`; g.fillRect(px, py + T - D, T, D); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(px, py + T - 3, T, 3);
      g.fillStyle = "rgba(255,230,180,.35)"; g.fillRect(px + T * 0.42, py + T - D, T * 0.16, D); }
    g.fillStyle = `rgb(${214 + v},${172 + v},${112 + v})`; g.fillRect(px, py - D, T, T);
    g.fillStyle = "rgba(255,240,205,.45)"; g.fillRect(px + T * 0.42, py - D, T * 0.16, T);          // скотч
    g.strokeStyle = "rgba(110,70,30,.55)"; g.lineWidth = 2; g.strokeRect(px + 1, py - D + 1, T - 2, T - 2);
    if (h % 7 === 0) { g.fillStyle = "rgba(120,80,40,.45)"; paw(g, px + T * 0.24, py - D + T * 0.62, T * 0.08); }
  }
  function spr(g, name, x, y, s, flip, ax, ay) {
    const m = meta[name]; g.save(); g.translate(x, y); g.scale(flip ? -s : s, s);
    g.drawImage(img, m[0], m[1], m[2], m[3], -(ax ?? m[4]), -(ay ?? m[5]), m[2], m[3]); g.restore();
  }

  // ---------- состояние игры ----------
  function startLevel(i) {
    const lv = buildLevel(i);
    st.lv = lv; st.cat = { x: lv.start[0], y: lv.start[1], tx: lv.start[0], ty: lv.start[1], dir: "down", moving: false, still: 0 };
    st.hasKey = false; st.treats = 0; st.queue = []; st.done = false; st.trail = []; st.levelT = performance.now(); st.seen = new Set();
    renderHud();
    if (LEVELS[i].dark) { setTimeout(() => SFX.lightsOff(), 500); const lvRef = lv; setTimeout(() => { if (st && st.lv === lvRef && !S.paused) S.say("day26.dark"); }, 1400); }
  }
  function renderHud(msg) {
    const lv = st.lv, L = LEVELS[lv.i], parts = [];
    if (L.key) parts.push(st.hasKey ? (lv.door.open ? "дверь открыта ✓" : "ключ есть, открой дверь") : "найди ключ");
    if (L.treats) parts.push(`лакомства ${st.treats}/${lv.needTreats}`);
    const ready = (!L.key || st.hasKey) && (!L.treats || st.treats >= lv.needTreats);
    const goal = !parts.length ? "дойди до миски" : ready ? "теперь к миске" : parts.join(" · ");
    S.hud.textContent = `Уровень ${lv.i + 1}/3 (${L.name}) · ${msg || goal}`;
  }
  let lastWall = 0, lastIdle = 0;
  function tryMove(dir) {
    const c = st.cat, [dx, dy] = DIRS[dir], nx = c.x + dx, ny = c.y + dy, lv = st.lv;
    c.dir = dir;
    if (lv.m.g[ny][nx] !== 0) { if (!st.bumpT || performance.now() - st.bumpT > 300) SFX.thud(); bump(); return false; }
    if (lv.door && !lv.door.open && nx === lv.door.p[0] && ny === lv.door.p[1]) {
      if (!st.hasKey) { if (!st.bumpT || performance.now() - st.bumpT > 300) SFX.thud(); bump(); renderHud("Дверь заперта. Нужен ключ"); return false; }
      lv.door.open = true; SFX.unlock(); SFX.creak(); renderHud();
    }
    c.tx = nx; c.ty = ny; c.moving = true; c.still = 0;
    return true;
  }
  function bump() {
    const t = performance.now(); st.bumpT = t;
    if (t - lastWall > 5000) { lastWall = t; S.say("day26.wall"); }
  }
  function arrive() {
    const c = st.cat, lv = st.lv; SFX.step();
    st.trail.push({ x: c.x, y: c.y, t: performance.now(), dir: c.dir }); if (st.trail.length > 40) st.trail.shift();
    for (const it of lv.items) {
      if (it.got || it.p[0] !== c.x || it.p[1] !== c.y) continue;
      it.got = true; it.gotT = performance.now();
      if (it.t === "key") { st.hasKey = true; SFX.jingle(); S.say("day26.key"); }
      else { st.treats++; SFX.crunch(); S.say("day26.treat"); }
      renderHud();
    }
    if (c.x === lv.bowl[0] && c.y === lv.bowl[1]) {
      if (LEVELS[lv.i].treats && st.treats < lv.needTreats) { renderHud(`Сначала лакомства: ${st.treats}/${lv.needTreats}`); return; }
      st.done = true; st.queue = []; held = null; st.eatT = performance.now(); SFX.eat(); setTimeout(() => SFX.fanfare(), 900); setTimeout(() => SFX.meow(), 250);
      const [ddx, ddy] = DIRS[c.dir]; st.sitOff = [-ddx * 0.62, -ddy * 0.62];   // садится рядом с миской, с той стороны, откуда пришла
      setTimeout(() => { if (st && st.lv === lv) S.confetti(lv.ox + (lv.bowl[0] + 0.5) * lv.T, lv.oy + (lv.bowl[1] + 0.5) * lv.T); }, 700);
      setTimeout(() => {
        if (!st) return;
        if (lv.i < LEVELS.length - 1) { startLevel(lv.i + 1); st.fade = performance.now(); }
        else S.win();
      }, 2600);
    }
  }
  function walkTo(tx, ty) {
    const lv = st.lv;
    if (!lv.m.g[ty] || lv.m.g[ty][tx] !== 0) return;
    const blocked = (n) => lv.door && !lv.door.open && !st.hasKey && n[0] === lv.door.p[0] && n[1] === lv.door.p[1];
    const b = bfs(lv.m, [st.cat.tx, st.cat.ty], blocked);
    if (!b.dist.has(tx + "," + ty)) { renderHud("Туда пока не пройти"); return; }
    st.queue = pathTo(b, [tx, ty]);
  }

  const game = {
    mount(sh) {
      S = sh;
      dpad = document.createElement("div");
      const dz = window.PHONE ? 66 : 54;   // на телефоне кнопки покрупнее
      dpad.style.cssText = `position:absolute;right:2%;bottom:3%;z-index:3;display:grid;grid-template-columns:repeat(3,${dz}px);grid-template-rows:repeat(3,${dz}px);gap:5px;opacity:.85`;
      const B = { up: [2, 1, "▲"], left: [1, 2, "◀"], right: [3, 2, "▶"], down: [2, 3, "▼"] };
      for (const [d, [c, r, ch]] of Object.entries(B)) {
        const b = document.createElement("button"); b.textContent = ch;
        b.style.cssText = `grid-column:${c};grid-row:${r};border-radius:12px;border:3px solid #3a2416;background:#f5e7c8;color:#3a2416;font-size:22px;touch-action:none`;
        b.onpointerdown = (e) => { e.preventDefault(); held = d; if (st) { st.queue = []; if (st.cat && !st.cat.moving && !st.done && S.playing && !S.paused) tryMove(d); } };   // короткое касание — тоже шаг
        b.onpointerup = b.onpointerleave = b.onpointercancel = () => { if (held === d) held = null; };
        dpad.appendChild(b);
      }
      if (!matchMedia("(pointer: coarse)").matches) dpad.style.display = "none";
      S.wrap.appendChild(dpad);
    },
    async load() {
      if (img) return;
      const ld = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      [img, meta] = await Promise.all([ld("assets/game26.webp"), fetch("assets/game26.json").then(r => r.json())]);
    },
    newGame() { st = {}; held = null; startLevel(0); },
    key(k, down) {
      const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", "ц": "up", "ы": "down", "ф": "left", "в": "right" };
      const d = map[k] || map[k.toLowerCase && k.toLowerCase()];
      if (!d) return false;
      if (down) { held = d; if (st) st.queue = []; } else if (held === d) held = null;
    },
    step(dt, t) {
      if (!st || st.done) return;
      const c = st.cat, SPEED = window.__fast ? 30 : 6.5;
      if (c.moving) {
        const dx = c.tx - c.x, dy = c.ty - c.y, dist = Math.hypot(dx, dy), stp = SPEED * dt;
        if (dist <= stp) { c.x = c.tx; c.y = c.ty; c.moving = false; arrive(); }
        else { c.x += dx / dist * stp; c.y += dy / dist * stp; }
      }
      if (!c.moving && !st.done) {
        if (held) tryMove(held);
        else if (st.queue.length) { const n = st.queue.shift(); const d = Object.keys(DIRS).find(k => DIRS[k][0] === n[0] - c.x && DIRS[k][1] === n[1] - c.y); if (!d || !tryMove(d)) st.queue = []; }
        else { c.still += dt; if (c.still > 12 && t - lastIdle > 15000) { lastIdle = t; S.say("day26.idle"); } }
      }
    },
    head() { if (!st) return null; const lv = st.lv, c = st.cat; return { x: lv.ox + (c.x + 0.5) * lv.T, y: lv.oy + (c.y - 0.55) * lv.T }; },
    draw(g, t) {
      if (!st) return;
      const lv = st.lv, { T, ox, oy, m } = lv, c = st.cat;
      g.drawImage(lv.floor, 0, 0);
      // следы лап
      for (const p of st.trail) {
        const a = 1 - (t - p.t) / 6000; if (a <= 0) continue;
        g.fillStyle = `rgba(90,50,30,${0.25 * a})`; paw(g, ox + (p.x + 0.5) * T, oy + (p.y + 0.55) * T, T * 0.07);
      }
      const catRow = Math.round(c.y), catFirst = st.done && st.sitOff && st.sitOff[1] < 0;   // сидит за миской — рисуем раньше неё
      for (let y = 0; y < m.rows; y++) {
        if (y === catRow && catFirst) drawCat(g, t);
        // предметы этой строки
        for (const it of lv.items) {
          if (it.p[1] !== y) continue;
          const cx = ox + (it.p[0] + 0.5) * T, cy = oy + (it.p[1] + 0.5) * T;
          if (it.got) { const k = (t - it.gotT) / 500; if (k < 1) { g.globalAlpha = 1 - k; spr(g, it.t, cx, cy - k * T * 0.6, T * 0.75 / meta[it.t][3]); g.globalAlpha = 1; } continue; }
          const bob = Math.sin(t / 300 + it.p[0]) * T * 0.05;
          g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = "rgba(255,220,120,.22)"; g.beginPath(); g.arc(cx, cy, T * 0.42, 0, 7); g.fill(); g.restore();
          spr(g, it.t, cx, cy + bob, (it.t === "key" ? T * 0.72 : T * 0.62) / Math.max(meta[it.t][2], meta[it.t][3]));
        }
        if (lv.bowl[1] === y) {
          const b = st.done && t - st.eatT > 900 ? "bowlEmpty" : "bowlFull";
          spr(g, b, ox + (lv.bowl[0] + 0.5) * T, oy + (lv.bowl[1] + 0.55) * T, T * 0.85 / meta[b][2]);
        }
        if (lv.door && lv.door.p[1] === y) {
          const dn = lv.door.open ? "doorO" : "doorC", s = T * 1.15 / meta.doorC[3], md = meta[dn];
          spr(g, dn, ox + (lv.door.p[0] + 0.5) * T, oy + (lv.door.p[1] + 1) * T, s, false, md[2] / 2, md[3]);
        }
        if (y === catRow && !catFirst) drawCat(g, t);
        for (let x = 0; x < m.cols; x++) if (m.g[y][x] === 1) drawBox(g, lv, x, y);
      }
      if (LEVELS[lv.i].dark) drawDark(g, lv, c);
      if (st.fade) { const k = 1 - (t - st.fade) / 600; if (k > 0) { g.fillStyle = `rgba(13,16,32,${k})`; g.fillRect(0, 0, W, H); } else st.fade = 0; }
      if (st.done && t - st.eatT < 1500) {
        g.font = `700 ${Math.round(T * 0.45)}px Rubik, sans-serif`; g.fillStyle = "#fff4dc"; g.textAlign = "center";
        g.fillText("Ням!", ox + (lv.bowl[0] + 0.5) * T, oy + (lv.bowl[1] - 0.6) * T - (t - st.eatT) / 30); g.textAlign = "left";
      }
    },
    stop() { held = null; },
  };
  function drawDark(g, lv, c) {
    const { T, ox, oy, m } = lv, cx = c.x + 0.5, cy = c.y + 0.5, R0 = 2.1, R1 = 3.3;
    for (let y = Math.max(0, Math.floor(cy - R1)); y <= Math.min(m.rows - 1, Math.ceil(cy + R1)); y++)
      for (let x = Math.max(0, Math.floor(cx - R1)); x <= Math.min(m.cols - 1, Math.ceil(cx + R1)); x++)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R1 - 0.4) st.seen.add(x + "," + y);
    const dk = st.darkC || (st.darkC = Object.assign(document.createElement("canvas"), { width: W, height: H }));
    const d = dk.getContext("2d");
    d.globalCompositeOperation = "source-over"; d.clearRect(0, 0, W, H); d.fillStyle = "rgba(6,5,12,0.97)"; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = "destination-out"; d.fillStyle = "rgba(0,0,0,0.33)";
    for (const k of st.seen) { const [x, y] = k.split(",").map(Number); d.fillRect(ox + x * T, oy + y * T - T * 0.25, T, T * 1.25); }
    const px = ox + cx * T, py = oy + cy * T, gr = d.createRadialGradient(px, py, R0 * T * 0.6, px, py, R1 * T);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(R0 / R1, "rgba(0,0,0,0.95)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    d.fillStyle = gr; d.fillRect(px - R1 * T, py - R1 * T, R1 * T * 2, R1 * T * 2);
    g.drawImage(dk, 0, 0);
  }
  function drawCat(g, t) {
    const lv = st.lv, T = lv.T, c = st.cat;
    const so = st.done && st.sitOff ? st.sitOff : [0, 0], sk = st.done ? Math.min(1, (performance.now() - st.eatT) / 260) : 0;
    const x = lv.ox + (c.x + 0.5 + so[0] * sk) * T, y = lv.oy + (c.y + 0.42 + so[1] * sk) * T;
    const bump = st.bumpT && t - st.bumpT < 160 ? Math.sin((t - st.bumpT) / 160 * Math.PI) * T * 0.08 : 0;
    const [bx, by] = DIRS[c.dir];
    let name, flip = false;
    if (st.done || (!c.moving && c.still > 0.6)) { name = "sit"; if (st.done && st.sitOff && st.sitOff[0] > 0) flip = true; }   // у миски смотрит на неё
    else {
      const f = c.moving ? Math.floor(t / 110) % 3 : 0;
      name = c.dir === "up" ? "up" + f : c.dir === "down" ? "down" + f : "right" + f; flip = c.dir === "left";
    }
    const s = name === "sit" ? T * 1.0 / meta.sit[3] : name.startsWith("right") ? T * 1.25 / meta.right0[2] : T * 1.4 / meta.down0[3];
    g.fillStyle = "rgba(40,20,10,.25)"; g.beginPath(); g.ellipse(x, y + T * 0.3, T * 0.32, T * 0.1, 0, 0, 7); g.fill();
    spr(g, name, x + bx * bump, y + by * bump, s, flip);
  }

  const shell = DayShell({
    d: 26, W, H, music: "g26", title: "Операция: накормить Виски", hints: ["day26.hint1", "day26.hint2"],
    rules: { goal: "Виски голодна. Проведи её к миске через три лабиринта.", how: ["Управление: стрелки, WASD или кнопки на экране", "Во втором лабиринте сначала найди ключ от двери", "В третьем погаснет свет, а по пути ждут лакомства"] },
  }, game);
  window.Game26 = { open: (o) => shell.open(o), _st: () => st, _walk: (x, y) => walkTo(x, y), _lv: () => st && st.lv };
})();
