// Игра 30 декабря — «Башня Виски». Коробка качается на верёвочке, клик — отпустить.
// Три раунда: 5, 7 и 8 коробок. Перекос копится: если центр тяжести верха выходит за опору — башня рушится.
// Со 2-го раунда Виски подходит «проверить прочность» и толкает башню лапой; если кликнуть по ней — уйдёт.
(function () {
  "use strict";
  const W = 1600, H = 900, BASE = 838, TX = 800, BS = 0.38, CAT_S = 0.78, GRAV = 2600, LIVES = 3, HMAX = 640;
  const ALL = ["red", "green", "blue", "kraft", "polka", "purple", "gold", "hat"];
  const ROUNDS = [
    { need: 5, amp: 260, speed: 250, swat: null, pool: ["red", "green", "purple", "kraft", "hat", "polka"] },
    { need: 7, amp: 300, speed: 330, swat: [11000, 14000], wind: 950, nudge: [10, 16], pool: ALL },
    { need: 8, amp: 330, speed: 400, swat: [8000, 11000], wind: 750, nudge: [12, 20], pool: ALL.concat(["blue", "gold", "polka"]) },
  ];
  const TEMPO = [1, 1.08, 1.16];
  let S, img, meta, bg, st = null, retryRound = null;
  const now = () => performance.now(), rnd = (a, b) => a + Math.random() * (b - a);
  const dims = (type) => ({ w: Math.round(meta[type].w * BS), h: Math.round(meta[type].h * BS) });

  // ---------- фон: комната, чуть размытая и притушенная ----------
  function paintBg(room) {
    const c = window.softCanvas(W, H, (x) => x.drawImage(room, 286, 0, 1461, 822, -10, -10, W + 20, H + 20), { blur: 2 }), g = c.getContext("2d");
    g.fillStyle = "rgba(14,10,24,.22)"; g.fillRect(0, 0, W, H);
    const gr = g.createRadialGradient(TX, 520, 120, TX, 520, 1000);
    gr.addColorStop(0, "rgba(255,220,160,.10)"); gr.addColorStop(0.55, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.42)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return c;
  }

  // ---------- башня ----------
  const topBox = () => st.stack[st.stack.length - 1];
  const topY = () => { const b = topBox(); return b ? b.y - b.h : BASE; };
  const towerH = () => BASE - topY();
  function check() {                       // устойчивость: центр тяжести всего, что выше стыка, должен лежать над стыком
    const s = st.stack; let danger = 0;
    for (let j = 0; j < s.length - 1; j++) {
      const lo = s[j], hi = s[j + 1];
      const l = Math.max(lo.x - lo.w / 2, hi.x - hi.w / 2), r = Math.min(lo.x + lo.w / 2, hi.x + hi.w / 2);
      let m = 0, cx = 0;
      for (let k = j + 1; k < s.length; k++) { const a = s[k].w * s[k].h; m += a; cx += a * s[k].x; }
      cx /= m;
      const mid = (l + r) / 2;
      if (r - l < 2 || cx < l || cx > r) return { fail: j + 1, pivot: { x: cx < mid ? l : r, y: lo.y - lo.h }, dir: cx < mid ? -1 : 1 };
      danger = Math.max(danger, Math.abs(cx - mid) / ((r - l) / 2));
    }
    return { fail: -1, danger };
  }
  function topple(boxes, pivot, dir, w0) {
    st.groups.push({ boxes, px: pivot.x, py: pivot.y, ang: 0, w: dir * (w0 || 0.6), dir });
  }
  function collapse(c) {
    const boxes = st.stack.splice(c.fail);
    topple(boxes, c.pivot, c.dir, 0.4);
    SFX.creak(); st.sway += 0.03; st.danger = 0; st.doneAt = 0;
    if (st.spawnAt === Infinity && !st.hang) st.spawnAt = now() + 900;
    miss(true);
  }
  function miss(big) {
    st.lives--; renderHud();
    if (st.lives <= 0) {
      st.over = true; retryRound = st.round; const my = st;
      setTimeout(() => { if (st === my) S.lose({ title: "Башня рухнула", body: "Ничего, Виски подождёт. Попробуем этот раунд ещё раз?" }); }, 1500);
      return;
    }
    if (big || Math.random() < 0.6) setTimeout(() => S.say("day30.fall"), 500);
  }

  // ---------- коробки ----------
  function pick(extraH, after) {           // after — сколько коробок ещё встанет выше этой: всё должно влезть в кадр
    const R = ROUNDS[st.round], minH = Math.min(...ALL.map(t => dims(t).h));
    const budget = HMAX - towerH() - extraH - Math.max(0, after) * minH;
    let ok = R.pool.filter(t => dims(t).h <= budget && t !== st.lastType);
    if (!ok.length) ok = ALL.filter(t => dims(t).h <= Math.max(budget, minH));
    const t = ok[Math.floor(Math.random() * ok.length)] || "gold";
    st.lastType = t; return t;
  }
  function spawn(t) {
    const R = ROUNDS[st.round], n = st.stack.length;
    const type = st.nextType || pick(0, R.need - n - 1), d = dims(type);
    st.nextType = pick(d.h, R.need - n - 2);
    st.hang = { type, w: d.w, h: d.h, ph: rnd(0, 6.28), x: TX, y: -40, drop: false, vy: 0, ang: 0,
                speed: R.speed * (1 + 0.025 * st.placed) };
    st.spawnAt = Infinity;
  }
  function drop() {
    const h = st.hang;
    if (!h || h.drop || h.y < topY() - 260 || st.over || S.paused) return false;
    h.drop = true; h.vy = 0; SFX.whoosh(); return true;
  }
  function land(h) {
    const lo = topBox(), b = { type: h.type, x: h.x, y: lo ? lo.y - lo.h : BASE, w: h.w, h: h.h };
    st.hang = null; st.spawnAt = now() + 450;
    let dx = 0, perfect = false;
    if (lo) {
      dx = b.x - lo.x;
      if (Math.abs(dx) < 6) { b.x = lo.x; dx = 0; perfect = true; }
      if (Math.abs(dx) > lo.w / 2) {                     // центр коробки мимо опоры — соскальзывает
        topple([b], { x: lo.x + Math.sign(dx) * lo.w / 2, y: b.y }, Math.sign(dx), 1.4);
        SFX.thud(); miss(false); return;
      }
    }
    st.stack.push(b); st.placed++;
    SFX.land(); st.sway += 0.01 + (lo ? 0.03 * Math.abs(dx) / lo.w : 0);
    if (perfect) { SFX.ding(); st.pops.push({ text: "Идеально!", x: b.x, y: b.y - b.h - 16, t: now() }); }
    const c = check();
    if (c.fail >= 0) { collapse(c); return; }
    const wasDanger = st.danger; st.danger = c.danger;
    const R = ROUNDS[st.round];
    if (window.MUSIC) MUSIC.warm(st.stack.length / R.need);
    renderHud();
    if (st.stack.length >= R.need) { st.doneAt = now() + 800; st.spawnAt = Infinity; return; }
    // одна реплика на коробку: последняя > крен > идеально > обычная
    const talk = (key) => { st.lastTalk = now(); S.say(key); };
    if (st.round === ROUNDS.length - 1 && st.stack.length === R.need - 1 && !st.saidLast) { st.saidLast = true; talk("day30.last"); }
    else if (c.danger > 0.82 && wasDanger <= 0.82 && now() - st.lastTalk > 4000) talk("day30.tilt");
    else if (perfect && Math.random() < 0.45 && now() - st.lastTalk > 5000) talk("day30.perfect");
    else if (Math.random() < 0.3 && now() - st.lastTalk > 6000) talk("day30.place");
  }

  // ---------- Виски ----------
  function catHome(side) { return TX + side * 400; }
  function swatTarget() {                  // какую коробку достанет лапой: ту, что на высоте ~70–110 px
    const s = st.stack; if (s.length < 2) return -1;
    for (let k = 1; k < s.length; k++) if (BASE - (s[k].y - s[k].h) >= 75) return k;
    return s.length - 1;
  }
  function nudge() {
    const c = st.cat, k = swatTarget(), R = ROUNDS[st.round];
    st.sway += 0.035; SFX.land();
    if (k < 0) return;
    const d = c.face * rnd(R.nudge[0], R.nudge[1]);
    for (let i = k; i < st.stack.length; i++) st.stack[i].x += d;
    const r = check();
    if (r.fail >= 0) { collapse(r); return; }
    const was = st.danger; st.danger = r.danger;
    const my = st;
    setTimeout(() => { if (st === my && !st.over) S.say(r.danger > 0.55 || was > 0.55 ? "day30.stable" : "day30.swat"); }, 700);
  }
  function catHit(x, y) {
    const c = st.cat; if (!["walk", "wind"].includes(c.mode)) return false;
    return Math.abs(x - c.x) < 110 && y > c.y - 200 && y < c.y + 20;
  }
  function shoo() {
    const c = st.cat; c.mode = "angry"; c.at = now(); SFX.hissShort();
    if (now() - st.lastTalk > 2500) { st.lastTalk = now(); S.say("day30.shoo"); }
    st.nextSwat = now() + rnd(...ROUNDS[st.round].swat) + 2000;
  }
  function stepCat(dt, t) {
    const c = st.cat, R = ROUNDS[st.round];
    if (c.mode === "sit") {
      if (R.swat && st.stack.length >= 3 && st.stack.length < R.need && t > st.nextSwat && !st.doneAt && !st.groups.length && !st.over) {
        const k = swatTarget(); if (k < 0) return;
        const b = st.stack[k], side = Math.random() < 0.5 ? -1 : 1;
        c.side = side; c.tx = side < 0 ? b.x - b.w / 2 - 90 : b.x + b.w / 2 + 90;
        c.mode = "walk"; c.at = t; c.run = false;
      }
    } else if (c.mode === "walk" || c.mode === "back") {
      const d = c.tx - c.x, v = c.run ? 330 : 175;
      c.face = Math.sign(d) || c.face;
      if (Math.abs(d) < 4) {
        c.x = c.tx;
        if (c.mode === "walk") { c.mode = "wind"; c.at = t; c.face = c.side < 0 ? 1 : -1; }
        else { c.mode = "sit"; c.at = t; c.face = c.x < TX ? 1 : -1; }
      } else c.x += Math.sign(d) * Math.min(Math.abs(d), v * dt);
    } else if (c.mode === "wind") {
      if (t - c.at > R.wind) { c.mode = "swat"; c.at = t; c.hit = false; }
    } else if (c.mode === "swat") {
      if (!c.hit && t - c.at > 180) { c.hit = true; nudge(); }
      if (t - c.at > 420) { c.mode = "back"; c.at = t; c.tx = catHome(c.side); c.run = false; st.nextSwat = t + rnd(...R.swat); }
    } else if (c.mode === "angry") {
      if (t - c.at > 380) { c.mode = "back"; c.at = t; c.run = true; c.tx = catHome(c.x < TX ? -1 : 1); }
    } else if (c.mode === "climb") {
      c.k = Math.min(1, (t - c.at) / 950);
      if (c.k >= 1) { c.mode = "top"; c.at = t; SFX.land(); st.sway += 0.03; }
    }
  }
  function catFrame(t) {
    const c = st.cat, A = window.VISKI.A, el = Math.max(0, (t - c.at) / 1000);
    switch (c.mode) {
      case "walk": return A.walk[Math.floor(el * 12) % A.walk.length];
      case "back": return c.run ? A.run[Math.floor(el * 15) % A.run.length] : A.walk[Math.floor(el * 12) % A.walk.length];
      case "wind": return A.swat[0];
      case "swat": return A.swat[Math.min(A.swat.length - 1, Math.floor(el / 0.1))];
      case "angry": return A.angry[0];
      case "climb": return el < 0.16 ? A.jumpUp[0] : c.k < 0.9 ? A.jumpUp[1] : A.jumpUp[2];
      default: return A.sit[Math.floor(el * 2.5) % A.sit.length];
    }
  }

  // ---------- раунды ----------
  function renderHud() {
    if (!st) return;
    const R = ROUNDS[st.round];
    let l = ""; for (let i = 0; i < LIVES; i++) l += `<span class="${i < st.lives ? "" : "off"}"></span>`;
    S.hud.innerHTML = `<span>Раунд ${st.round + 1}/3 · Башня: ${Math.min(st.stack.length, R.need)}/${R.need}</span><span class="lives">${l}</span>`;
  }
  function startRound(r) {
    st.round = r; st.lives = LIVES; st.stack = []; st.hang = null; st.placed = 0; st.doneAt = 0; st.danger = 0;
    st.nextType = null; st.lastType = null; st.bow = null; st.over = false; st.saidLast = false;
    st.nextSwat = now() + 9000;
    if (window.MUSIC) { MUSIC.tempo(TEMPO[r]); MUSIC.warm(0); }
    renderHud();
  }
  function roundDone() {
    st.doneAt = 0; st.spawnAt = Infinity;
    const top = topBox(), my = st, c0 = st.cat;
    S.confetti(TX, topY() - 30);
    if (["walk", "wind", "swat"].includes(c0.mode) && st.round < ROUNDS.length - 1) { c0.mode = "back"; c0.run = false; c0.at = now(); c0.tx = catHome(c0.x < TX ? -1 : 1); }
    if (st.round < ROUNDS.length - 1) {
      st.bow = { type: st.round ? "bowGold" : "bowRed", t: now() }; SFX.pop(); SFX.fanfare();
      setTimeout(() => { if (st === my) S.say("day30.stable"); }, 300);
      setTimeout(() => { if (st !== my) return; st.between = now(); }, 1300);
      setTimeout(() => {
        if (st !== my) return;
        st.fading = { boxes: st.stack.slice(), bow: st.bow, t: now() };
        startRound(st.round + 1); st.spawnAt = now() + 1500;
        if (st.cat.mode !== "sit") { st.cat.mode = "back"; st.cat.run = false; st.cat.at = now(); st.cat.tx = catHome(st.cat.x < TX ? -1 : 1); }
      }, 2000);
      setTimeout(() => { if (st === my) st.between = 0; }, 3700);
      return;
    }
    // финал: Виски забирается на самый верх
    st.over = true; SFX.fanfare();
    const c = st.cat; c.mode = "climb"; c.at = now(); c.k = 0;
    c.x0 = c.x; c.y0 = c.y; c.face = top.x > c.x ? 1 : -1;
    setTimeout(() => { if (st === my) S.win(); }, 1700);     // оболочка сама скажет «Теперь всё на своих местах…» и откроет письмо
  }

  // ---------- шаг ----------
  function stepFall(dt) {
    for (const gp of st.groups) {
      gp.w += gp.dir * (2.6 + Math.abs(gp.ang) * 9) * dt; gp.ang += gp.w * dt;
      if (Math.abs(gp.ang) > 0.5) {               // отрываются и летят по отдельности
        const cs = Math.cos(gp.ang), sn = Math.sin(gp.ang);
        for (const b of gp.boxes) {
          const rx = b.x - gp.px, ry = b.y - b.h / 2 - gp.py;
          const qx = rx * cs - ry * sn, qy = rx * sn + ry * cs;
          st.falling.push({ type: b.type, w: b.w, h: b.h, cx: gp.px + qx, cy: gp.py + qy, ang: gp.ang,
            vx: -gp.w * qy * 0.9 + rnd(-30, 30), vy: gp.w * qx * 0.9, va: gp.w * rnd(0.5, 1.1), lane: rnd(4, 30), rest: 0, bounces: 0 });
        }
        gp.dead = true;
      }
    }
    st.groups = st.groups.filter(g => !g.dead);
    let thuds = 0;
    for (const f of st.falling) {
      if (f.rest) { const q = Math.PI / 2, tgt = Math.round(f.ang / q) * q; f.ang += (tgt - f.ang) * Math.min(1, dt * 8); continue; }
      f.vy += GRAV * dt; f.cx += f.vx * dt; f.cy += f.vy * dt; f.ang += f.va * dt;
      const ext = (Math.abs(Math.cos(f.ang)) * f.h + Math.abs(Math.sin(f.ang)) * f.w) / 2, fl = BASE + f.lane;
      if (f.cy + ext > fl) {
        f.cy = fl - ext;
        if (f.vy > 250 && thuds < 2) { thuds++; SFX.thud(); }
        f.vy *= -0.3; f.vx *= 0.6; f.va *= 0.45; f.bounces++;
        if (Math.abs(f.vy) < 90 || f.bounces > 3) { f.vy = 0; f.vx = 0; f.va = 0; f.rest = now(); }
      }
    }
    st.falling = st.falling.filter(f => !(f.rest && now() - f.rest > 2200) && f.cx > -200 && f.cx < W + 200);
  }
  function step(dt, t) {
    if (!st) return;
    const R = ROUNDS[st.round];
    if (!st.hang && t > st.spawnAt && !st.over) spawn(t);
    const h = st.hang;
    if (h) {
      if (!h.drop) {
        h.ph += dt * h.speed / R.amp;
        h.x = TX + R.amp * Math.sin(h.ph);
        const ty = topY() - 100;
        h.y += (ty - h.y) * Math.min(1, dt * 5);
        h.ang = -Math.atan2(h.x - TX, h.y - h.h + 900) * 0.6;
      } else {
        h.vy += GRAV * dt; h.y += h.vy * dt; h.ang *= Math.exp(-dt * 12);
        if (h.y >= topY()) { h.y = topY(); land(h); }
      }
    }
    stepFall(dt);
    stepCat(dt, t);
    st.sway = Math.min(0.06, st.sway) * Math.exp(-dt * 2.2); st.swayPh += dt * 8.5;
    if (st.danger > 0.82 && t - st.lastCreak > 3200) { st.lastCreak = t; SFX.creak(); }
    if (st.doneAt && t > st.doneAt && !st.groups.length && !(st.hang && st.hang.drop)) roundDone();
  }

  // ---------- рисование ----------
  function drawBox(g, b, alpha) {
    const m = meta[b.type];
    if (alpha != null) g.globalAlpha = alpha;
    g.drawImage(img, m.x, m.y, m.w, m.h, Math.round(b.x - b.w / 2), Math.round(b.y - b.h), b.w, b.h);
    if (alpha != null) g.globalAlpha = 1;
  }
  function drawCat(g, t, x, y, onTop) {
    const c = st.cat, f = catFrame(t);
    const br = ["sit", "top"].includes(c.mode) ? 1 + 0.012 * Math.sin(t / 1000 * Math.PI) : 1;
    let sx = 0; if (c.mode === "wind") sx = Math.sin(t / 30) * 1.5;
    if (!onTop && c.mode !== "climb") { g.fillStyle = "rgba(20,10,5,.32)"; g.beginPath(); g.ellipse(x, y - 2, f.w * CAT_S * 0.34, 9, 0, 0, 7); g.fill(); }
    g.save(); g.translate(x + sx, y); g.scale(c.face * CAT_S, CAT_S * br);
    g.drawImage(window.VISKI.atlas, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h); g.restore();
    if (c.mode === "wind") {                    // «!» — сейчас толкнёт
      const k = Math.min(1, (t - c.at) / 200);
      g.save(); g.globalAlpha = k; g.font = "30px 'Press Start 2P', Rubik, sans-serif"; g.textAlign = "center";
      g.lineWidth = 6; g.strokeStyle = "#3a2416"; g.strokeText("!", x + c.face * 30, y - 205 * CAT_S - 6); g.fillStyle = "#ffd25e"; g.fillText("!", x + c.face * 30, y - 205 * CAT_S - 6); g.restore();
    }
  }
  function draw(g, t) {
    if (!st) return;
    g.drawImage(bg, 0, 0);
    const s = st.stack, base = s[0];
    // тень под башней
    if (base) { g.fillStyle = "rgba(15,8,4,.35)"; g.beginPath(); g.ellipse(base.x, BASE + 2, base.w * 0.62, 10, 0, 0, 7); g.fill(); }
    // прошлая башня тает
    if (st.fading) {
      const k = Math.min(1, (t - st.fading.t) / 600);
      st.fading.boxes.forEach(b => drawBox(g, { ...b, y: b.y + k * 10 }, 1 - k));
      if (k >= 1) st.fading = null;
    }
    // башня (с покачиванием вокруг основания)
    const th = st.sway * Math.sin(st.swayPh) + (st.danger > 0.82 ? 0.004 * Math.sin(t / 25) : 0);
    g.save();
    if (base) { g.translate(base.x, BASE); g.rotate(th); g.translate(-base.x, -BASE); }
    s.forEach(b => drawBox(g, b));
    if (st.bow) {
      const k = Math.min(1, (t - st.bow.t) / 260), m = meta[st.bow.type], top = topBox();
      if (top) {
        const bw = m.w * 0.2 * (0.6 + 0.4 * k), bh = m.h * 0.2 * (0.6 + 0.4 * k);
        g.drawImage(img, m.x, m.y, m.w, m.h, top.x - bw / 2, top.y - top.h - bh + 10 - (1 - k) * 30, bw, bh);
      }
    }
    if (st.cat.mode === "top") { const top = topBox(); if (top) drawCat(g, t, top.x, top.y - top.h + 4, true); }
    g.restore();
    // опрокидывающиеся части
    for (const gp of st.groups) {
      g.save(); g.translate(gp.px, gp.py); g.rotate(gp.ang); g.translate(-gp.px, -gp.py);
      gp.boxes.forEach(b => drawBox(g, b)); g.restore();
    }
    for (const f of st.falling) {
      const m = meta[f.type], a = f.rest ? Math.max(0, 1 - (now() - f.rest - 1400) / 800) : 1;
      g.save(); g.globalAlpha = Math.min(1, a); g.translate(f.cx, f.cy); g.rotate(f.ang);
      g.drawImage(img, m.x, m.y, m.w, m.h, -f.w / 2, -f.h / 2, f.w, f.h); g.restore();
    }
    // верёвочка, качающаяся коробка и подсказка, куда упадёт
    const h = st.hang;
    if (h) {
      const tx = h.x, ty = h.y - h.h;
      if (!h.drop) {
        g.save(); g.strokeStyle = "rgba(255,255,255,.22)"; g.setLineDash([6, 10]); g.lineWidth = 2;
        g.beginPath(); g.moveTo(tx, h.y + 6); g.lineTo(tx, topY() - 4); g.stroke(); g.restore();
        const ax = TX, ay = -900, k = (0 - ty) / (ay - ty);
        g.strokeStyle = "#3a2416"; g.lineWidth = 4; g.beginPath(); g.moveTo(tx, ty + 4); g.lineTo(tx + (ax - tx) * k, 0); g.stroke();
        g.strokeStyle = "#e9dcc0"; g.lineWidth = 2; g.beginPath(); g.moveTo(tx, ty + 4); g.lineTo(tx + (ax - tx) * k, 0); g.stroke();
      }
      const m = meta[h.type];
      g.save(); g.translate(tx, h.y - h.h / 2); g.rotate(h.ang);
      g.drawImage(img, m.x, m.y, m.w, m.h, -h.w / 2, -h.h / 2, h.w, h.h); g.restore();
      if (!h.drop) { g.fillStyle = "#c8452f"; g.strokeStyle = "#3a2416"; g.lineWidth = 2; g.beginPath(); g.arc(tx, ty + 2, 5, 0, 7); g.fill(); g.stroke(); }
    }
    // следующая коробка
    if (st.nextType && !st.over) {
      const m = meta[st.nextType], d = dims(st.nextType), k = 0.7;
      g.save(); g.fillStyle = "rgba(20,12,24,.55)"; g.beginPath(); g.roundRect ? g.roundRect(W - 168, 92, 148, 112, 12) : g.rect(W - 168, 92, 148, 112); g.fill();
      g.fillStyle = "#fff4dc"; g.font = "600 17px Rubik, sans-serif"; g.textAlign = "center"; g.fillText("дальше", W - 94, 116);
      g.drawImage(img, m.x, m.y, m.w, m.h, W - 94 - d.w * k / 2, 194 - d.h * k, d.w * k, d.h * k); g.restore();
    }
    // Виски на полу / в прыжке
    const c = st.cat;
    if (c.mode === "climb") {
      const top = topBox(), x1 = top ? top.x : TX, y1 = top ? top.y - top.h + 4 : BASE, e = c.k;
      const x = c.x0 + (x1 - c.x0) * e, y = c.y0 + (y1 - c.y0) * (e * e * (3 - 2 * e)) - Math.sin(Math.PI * e) * 150;
      c.x = x; c.y = y; drawCat(g, t, x, y, false);
    } else if (c.mode !== "top") drawCat(g, t, c.x, c.y, false);
    // «Идеально!»
    st.pops = st.pops.filter(p => t - p.t < 900);
    for (const p of st.pops) {
      const k = (t - p.t) / 900;
      g.save(); g.globalAlpha = 1 - k * k; g.textAlign = "center"; g.font = "18px 'Press Start 2P', Rubik, sans-serif";
      g.lineWidth = 5; g.strokeStyle = "#3a2416"; g.strokeText(p.text, p.x, p.y - k * 40); g.fillStyle = "#ffe07a"; g.fillText(p.text, p.x, p.y - k * 40); g.restore();
    }
    // табличка раунда
    if (st.between) {
      const e = t - st.between, k = Math.min(1, e / 300), fade = Math.min(1, (2400 - e) / 300);
      const R = ROUNDS[Math.min(st.round + (e < 700 ? 1 : 0), ROUNDS.length - 1)];
      g.save(); g.globalAlpha = Math.max(0, Math.min(k, fade)); g.fillStyle = "rgba(20,12,24,.6)"; g.fillRect(0, H / 2 - 90, W, 180);
      g.textAlign = "center"; g.fillStyle = "#ffe7a8"; g.font = "48px 'Press Start 2P', Rubik, sans-serif";
      g.fillText(`Раунд ${ROUNDS.indexOf(R) + 1}!`, W / 2, H / 2 + 10);
      g.font = "600 30px Rubik, sans-serif"; g.fillStyle = "#fff4dc";
      g.fillText(`${R.need} коробок${R.swat ? " · Виски проверяет прочность" : ""}`, W / 2, H / 2 + 60); g.restore();
    }
  }

  // ---------- игра для DayShell ----------
  function click(x, y) {
    if (!st || S.paused) return;
    if (catHit(x, y)) { shoo(); return; }
    drop();
  }
  const game = {
    mount(sh) {
      S = sh;
      S.cv.addEventListener("pointerdown", (e) => { const r = S.cv.getBoundingClientRect(); click((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H); });
      S.cv.style.cursor = "pointer";
    },
    async load() {
      if (img) return;
      const ld = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      let room;
      [img, meta, room] = await Promise.all([ld("assets/game30.webp"), fetch("assets/game30.json").then(r => r.json()), ld("assets/room.webp")]);
      bg = paintBg(room);
    },
    newGame() {
      const r = retryRound != null ? retryRound : 0; retryRound = null;
      st = { stack: [], groups: [], falling: [], pops: [], sway: 0, swayPh: 0, lastTalk: 0, lastCreak: 0, between: 0, fading: null,
             cat: { x: catHome(-1), y: BASE + 14, face: 1, mode: "sit", at: now(), side: -1 }, spawnAt: Infinity };
      startRound(r);
    },
    begin() { if (st) st.spawnAt = now() + 600; },
    step,
    draw,
    key(k, down) {
      if (![" ", "Enter", "ArrowDown"].includes(k)) return false;
      if (down) drop();
    },
    head() {
      if (!st) return null; const c = st.cat;
      if (c.mode === "top") { const top = topBox(); if (top) return { x: top.x + 20, y: top.y - top.h - 190 * CAT_S }; }
      return { x: c.x + c.face * 30, y: c.y - 200 * CAT_S - 6 };
    },
    stop() { st = null; retryRound = null; },
  };

  const shell = DayShell({
    d: 30, W, H, music: "g30", title: "Башня Виски", hints: ["day30.hint"],
    rules: { goal: "Построй для Виски высокую башню из подарков.", how: ["Нажми на экран или пробел, чтобы отпустить коробку", "Ставь ровно: если башня перекосится, она рухнет", "Виски идёт к башне? Нажми на неё и прогони"] },
  }, game);
  window.Game30 = { open: (o) => shell.open(o), _st: () => st, _drop: drop, _click: click, ROUNDS, TX, BASE };
})();
