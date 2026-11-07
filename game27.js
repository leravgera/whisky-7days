// Игра 27 декабря — «Кошачья память». Три раунда поиска пар: 3, 4 и 6 пар. Без таймера.
// Виски бродит по краю стола, умывается, машет хвостом и комментирует — отвлекает, но не мешает.
(function () {
  "use strict";
  const W = 1600, H = 900, FLOOR = 884, CAT_S = 0.62;
  const ROUNDS = [{ pairs: 3, cols: 3, rows: 2, show: 3000 }, { pairs: 4, cols: 4, rows: 2, show: 4000 }, { pairs: 6, cols: 6, rows: 2, show: 5000 }];
  const ICONS = ["cat", "bowl", "tree", "monitor", "phones", "gift", "cocoa", "yarn"];
  let S, img, meta, table, st = null, lastClick = 0, lastIdle = 0, lastMis = 0;
  const now = () => performance.now(), rnd = (a, b) => a + Math.random() * (b - a);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- стол ----------
  function paintTable() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    for (let y = 0; y < H; y += 60) {
      const v = (y / 60) % 2 ? 0 : 8;
      g.fillStyle = `rgb(${120 + v},${74 + v},${42 + v})`; g.fillRect(0, y, W, 60);
      g.fillStyle = "rgba(60,30,12,.45)"; g.fillRect(0, y + 58, W, 2);
      for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(70,38,16,${0.08 + Math.random() * 0.1})`; g.fillRect(Math.random() * W, y + 8 + Math.random() * 44, 40 + Math.random() * 160, 2); }
      const seam = ((y / 60) * 397) % W; g.fillStyle = "rgba(60,30,12,.4)"; g.fillRect(seam, y, 2, 58);
    }
    // войлочный коврик под карты
    g.fillStyle = "#5b2a2a"; roundRect(g, 150, 70, W - 300, 690, 26); g.fill();
    g.strokeStyle = "#d9b25b"; g.lineWidth = 4; roundRect(g, 166, 86, W - 332, 658, 18); g.stroke();
    g.fillStyle = "rgba(255,255,255,.03)"; for (let i = 0; i < 1800; i++) g.fillRect(150 + Math.random() * (W - 300), 70 + Math.random() * 690, 2, 2);
    // тёплый свет сверху и виньетка
    const gr = g.createRadialGradient(W / 2, 260, 80, W / 2, 420, 900);
    gr.addColorStop(0, "rgba(255,210,140,.22)"); gr.addColorStop(0.6, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.45)");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return c;
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ---------- раунд ----------
  function startRound(r) {
    const R = ROUNDS[r], icons = shuffle(ICONS.slice()).slice(0, R.pairs);
    // пары не должны лежать рядом или друг над другом
    const near = (a, b) => { const ra = Math.floor(a / R.cols), ca = a % R.cols, rb = Math.floor(b / R.cols), cb = b % R.cols; return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1); };
    let deck;
    for (let k = 0; k < 500; k++) {
      deck = shuffle(icons.concat(icons));
      if (!deck.some((ic, i) => deck.some((jc, j) => j > i && jc === ic && near(i, j)))) break;
    }
    const ch = R.cols >= 6 ? 236 : 250, cw = Math.round(ch * 0.757), gap = R.cols >= 6 ? 26 : 34;
    const tw = R.cols * cw + (R.cols - 1) * gap, th = R.rows * ch + (R.rows - 1) * gap;
    const x0 = (W - tw) / 2, y0 = 70 + (690 - th) / 2;
    st.round = r; st.open = []; st.found = 0; st.moves = 0; st.lock = true;
    // карты пока не разданы (deal = Infinity) — раздача начнётся в beginRound()
    st.cards = deck.map((icon, i) => ({ icon, x: x0 + (i % R.cols) * (cw + gap), y: y0 + Math.floor(i / R.cols) * (ch + gap), w: cw, h: ch, up: false, done: false, flipT: 0, deal: Infinity }));
    renderHud();
  }
  function beginRound() {
    // раздача → все лицом вверх → «Запоминай!» → закрыть
    const R = ROUNDS[st.round], t0 = now();
    st.cards.forEach((c, i) => { c.deal = t0 + i * 70; });
    const my = st, dealMs = st.cards.length * 70 + 350;
    setTimeout(() => { if (st !== my) return; st.cards.forEach(c => { c.up = true; c.flipT = now(); }); SFX.flip(); st.preview = { t: now(), dur: R.show }; }, dealMs);
    setTimeout(() => { if (st !== my) return; st.cards.forEach(c => { c.up = false; c.flipT = now(); }); SFX.flip(); st.preview = null; st.lock = false; lastClick = now(); }, dealMs + R.show + 260);
  }
  function renderHud() { S.hud.textContent = `Раунд ${st.round + 1}/3 · Пары: ${st.found}/${ROUNDS[st.round].pairs}`; }
  function flip(c, up) { c.up = up; c.flipT = now(); SFX.flip(); }
  function click(x, y) {
    if (!st || st.lock || st.between || S.paused) return;
    lastClick = now();
    const c = st.cards.find(c => !c.done && !c.up && x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
    if (!c) return;
    flip(c, true); st.open.push(c);
    if (st.open.length === 1 && Math.random() < 0.25) distract();
    if (st.open.length < 2) return;
    st.moves++;
    const [a, b] = st.open; st.open = [];
    if (a.icon === b.icon) {
      st.lock = true;
      setTimeout(() => {
        if (!st) return;
        a.done = b.done = true; a.doneT = b.doneT = now(); st.found++; st.lock = false; SFX.catch(); renderHud();
        if (st.found >= ROUNDS[st.round].pairs) roundDone();
        else if (Math.random() < 0.55) S.say("day27.match");
      }, 380);
    } else {
      st.lock = true;
      setTimeout(() => { if (!st) return; SFX.deny(); if (now() - lastMis > 4000 && Math.random() < 0.6) { lastMis = now(); S.say("day27.mismatch"); } }, 450);
      setTimeout(() => { if (!st) return; flip(a, false); flip(b, false); st.lock = false; }, 1050);
    }
  }
  function roundDone() {
    S.confetti();
    if (st.round >= ROUNDS.length - 1) { SFX.fanfare(); setTimeout(() => st && S.win(), 900); return; }
    st.between = now(); SFX.fanfare(); S.say("day27.round", 2400);
    setTimeout(() => { if (!st) return; st.between = 0; startRound(st.round + 1); beginRound(); }, 2300);
  }

  // ---------- Виски на краю стола ----------
  function catPlan() {
    const c = st.cat, t = now(), r = Math.random();
    if (r < 0.4) { c.tx = rnd(120, W - 120); c.mode = "walk"; c.face = c.tx > c.x ? 1 : -1; }
    else if (r < 0.55) { c.mode = "groom"; c.until = t + rnd(3000, 5000); }
    else if (r < 0.7) { c.mode = "tail"; c.until = t + rnd(2500, 4000); }
    else if (r < 0.82) { c.mode = "loaf"; c.until = t + rnd(4000, 7000); }
    else { c.mode = "sit"; c.until = t + rnd(2500, 4500); }
    c.at = t;
  }
  function distract() {                     // при первой открытой карте иногда проходит прямо под рукой
    const c = st.cat; if (c.mode === "walk") return;
    c.tx = c.x < W / 2 ? rnd(W * 0.55, W - 140) : rnd(140, W * 0.45); c.mode = "walk"; c.face = c.tx > c.x ? 1 : -1; c.at = now();
  }
  function catFrame(t) {
    const c = st.cat, A = window.VISKI.A, el = Math.max(0, (t - c.at) / 1000);
    if (c.mode === "walk") return A.walk[Math.floor(el * 12) % A.walk.length];
    if (c.mode === "groom") return A.groom[Math.floor(el * 3.5) % A.groom.length];
    if (c.mode === "tail") { const n = A.tail.length, k = Math.floor(el * 4) % (n * 2 - 2); return A.tail[k < n ? k : n * 2 - 2 - k]; }
    if (c.mode === "loaf") return A.loaf[Math.floor(el * 0.3) % A.loaf.length];
    if (c.mode === "happy") return A.happy[0];
    if (c.mode === "love") return A.love[0];
    return A.sit[Math.floor(el * 2.5) % A.sit.length];
  }

  // ---------- рисование карт ----------
  function drawCard(g, c, t) {
    const appear = Math.min(1, Math.max(0, (t - c.deal) / 260)); if (appear <= 0) return;
    const ft = Math.min(1, (t - c.flipT) / 260), showUp = ft < 0.5 ? !c.up : c.up, sx = Math.abs(Math.cos(ft * Math.PI)) || 0.02;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2 - (1 - appear) * 40;
    const pulse = c.done ? Math.max(0, 1 - (t - c.doneT) / 600) : 0;
    g.save(); g.globalAlpha = appear; g.translate(cx, cy); g.scale(sx * (1 + pulse * 0.06), 1 + pulse * 0.06);
    g.fillStyle = "rgba(0,0,0,.35)"; roundRect(g, -c.w / 2 + 5, -c.h / 2 + 7, c.w, c.h, 14); g.fill();
    if (showUp) {
      g.fillStyle = c.done ? "#fff3d0" : "#fbf1da"; roundRect(g, -c.w / 2, -c.h / 2, c.w, c.h, 14); g.fill();
      g.lineWidth = 5; g.strokeStyle = c.done ? "#e0b44a" : "#c9a35a"; g.stroke();
      g.lineWidth = 2; g.strokeStyle = "rgba(160,110,50,.4)"; roundRect(g, -c.w / 2 + 9, -c.h / 2 + 9, c.w - 18, c.h - 18, 9); g.stroke();
      const m = meta[c.icon], k = Math.min((c.w - 30) / m[2], (c.h - 50) / m[3]);
      g.drawImage(img, m[0], m[1], m[2], m[3], -m[2] * k / 2, -m[3] * k / 2, m[2] * k, m[3] * k);
      if (c.done) { g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(255,220,140,${0.12 + pulse * 0.35})`; roundRect(g, -c.w / 2, -c.h / 2, c.w, c.h, 14); g.fill(); }
    } else {
      const m = meta.back; g.drawImage(img, m[0], m[1], m[2], m[3], -c.w / 2, -c.h / 2, c.w, c.h);
    }
    g.restore();
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
      [img, meta] = await Promise.all([ld("assets/game27.webp"), fetch("assets/game27.json").then(r => r.json())]);
      table = paintTable();
    },
    newGame() {
      st = { cat: { x: W - 200, face: -1, mode: "sit", at: now(), until: now() + 3000, tx: 0 } };
      startRound(0); lastClick = now();
    },
    begin() { if (st) { beginRound(); lastClick = now(); } },
    step(dt, t) {
      if (!st) return;
      const c = st.cat;
      if (c.mode === "walk") { const d = c.tx - c.x; if (Math.abs(d) < 4) { c.mode = "sit"; c.at = t; c.until = t + rnd(2000, 4000); } else c.x += Math.sign(d) * Math.min(Math.abs(d), 150 * dt); }
      else if (t > c.until) catPlan();
      if (t - lastClick > 12000 && t - lastIdle > 20000 && !st.between) { lastIdle = t; S.say("day27.idle"); }
    },
    catHit(x, y) { if (!st) return false; const c = st.cat; return Math.abs(x - c.x) < 85 && y > FLOOR - 160 && y < FLOOR + 6; },
    catPet(on) { if (!st) return; const c = st.cat; c.mode = on ? "love" : "sit"; c.at = now(); c.until = on ? Infinity : now() + 2500; },
    catPoke() { if (!st) return; const c = st.cat; c.mode = "happy"; c.at = now(); c.until = now() + 1300; },
    head() { if (!st) return null; const c = st.cat; return { x: c.x + c.face * 20, y: FLOOR - 150 * CAT_S - 10 }; },
    draw(g, t) {
      if (!st) return;
      g.drawImage(table, 0, 0);
      for (const c of st.cards) drawCard(g, c, t);
      const f = catFrame(t), c = st.cat;
      const br = ["sit", "loaf", "tail"].includes(c.mode) ? 1 + 0.012 * Math.sin(t / 1000 * Math.PI) : 1;
      g.fillStyle = "rgba(20,10,5,.3)"; g.beginPath(); g.ellipse(c.x, FLOOR - 2, f.w * CAT_S * 0.36, 8, 0, 0, 7); g.fill();
      g.save(); g.translate(c.x, FLOOR); g.scale(c.face * CAT_S, CAT_S * br);
      g.drawImage(window.VISKI.atlas, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h); g.restore();
      if (st.preview) {
        const left = Math.max(0, Math.ceil((st.preview.dur - (t - st.preview.t)) / 1000));
        g.save(); g.fillStyle = "rgba(20,12,24,.62)"; roundRect(g, W / 2 - 200, 6, 400, 58, 14); g.fill();
        g.textAlign = "center"; g.fillStyle = "#ffe7a8"; g.font = "22px 'Press Start 2P', Rubik, sans-serif"; g.fillText(`Запоминай! ${left}`, W / 2, 48); g.restore();
      }
      if (st.between) {
        const k = Math.min(1, (t - st.between) / 300), fade = Math.min(1, (2300 - (t - st.between)) / 300);
        g.save(); g.globalAlpha = Math.max(0, Math.min(k, fade)); g.fillStyle = "rgba(20,12,24,.6)"; g.fillRect(0, H / 2 - 90, W, 180);
        g.textAlign = "center"; g.fillStyle = "#ffe7a8"; g.font = "48px 'Press Start 2P', Rubik, sans-serif"; g.fillText(`Раунд ${st.round + 2}!`, W / 2, H / 2 + 10);
        g.font = "600 30px Rubik, sans-serif"; g.fillStyle = "#fff4dc"; g.fillText(`${ROUNDS[st.round + 1].pairs} пар${ROUNDS[st.round + 1].pairs < 5 ? "ы" : ""}`, W / 2, H / 2 + 60); g.restore();
      }
    },
  };

  const shell = DayShell({
    d: 27, W, H, music: "g27", title: "Кошачья память", hints: ["day27.hint1", "day27.hint2"],
    rules: { goal: "Карты лежат рубашкой вверх. Открывай по две и ищи пары.", how: ["Три раунда, и в каждом пар всё больше", "Таймера нет, можно не спешить", "Виски будет отвлекать. Не поддавайся"] },
  }, game);
  window.Game27 = { open: (o) => shell.open(o), _st: () => st, _click: click };
})();
