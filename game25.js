// Игра 25 декабря — «Это само упало!»
// Виски сбрасывает игрушки с ёлки, Марсель ловит их корзинкой. 10 поймать, разбить можно не больше 3.
(function () {
  "use strict";
  const GW = 1672, GH = 941;
  const LIVES = 3;
  // три раунда: сколько поймать, скорость падения, паузы между бросками, прыжки, обманки, «обманка → резкий прыжок → бросок»
  const ROUNDS = [
    { need: 6, g: 430, gap: [1500, 2100], jump: 560, wind: 360, fake: 0.08, combo: 0, maxOrn: 1 },
    { need: 7, g: 600, gap: [950, 1400], jump: 440, wind: 280, fake: 0.35, combo: 0.25, maxOrn: 2 },
    { need: 7, g: 760, gap: [650, 1000], jump: 340, wind: 220, fake: 0.45, combo: 0.8, maxOrn: 2 },
  ];
  const NEED = ROUNDS.reduce((a, r) => a + r.need, 0);
  const SHELVES = [            // верхняя поверхность «полок» на ёлке: x от/до, y
    { x0: 668, x1: 840, y: 214 }, { x0: 600, x1: 880, y: 370 },
    { x0: 840, x1: 1105, y: 477 }, { x0: 560, x1: 960, y: 643 },
  ];
  const FLOOR = 905, BASKET_Y = 928, CAT_S = 0.62;
  const now = () => performance.now();
  const rnd = (a, b) => a + Math.random() * (b - a);

  let V, img = {}, meta, cv, ctx, layer, wrap, bub, hud, panel;
  let st = null, raf = 0, keys = {};

  // ---------- разметка ----------
  const css = document.createElement("style");
  css.textContent = `
  #g25 { position: fixed; inset: 0; z-index: 40; background: #0d1020; display: none; align-items: center; justify-content: center; font-family: Rubik, sans-serif; }
  #g25.open { display: flex; }
  #g25 .wrap { position: relative; }
  #g25 canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: none; }
  #g25 .hud { position: absolute; left: calc(1.5% + var(--sl, 0px)); top: 2.5%; display: flex; gap: 14px; align-items: center; color: #fff4dc; font-weight: 700;
    font-size: max(14px, calc(22px * var(--k))); background: rgba(30,20,30,.55); padding: .35em .8em; border-radius: 10px; pointer-events: none; }
  #g25 .hud .lives span { display: inline-block; width: .9em; height: .9em; border-radius: 50%; margin-left: .25em; background: #e8463a; box-shadow: inset -2px -2px 0 rgba(0,0,0,.25); }
  #g25 .hud .lives span.off { background: rgba(255,255,255,.18); box-shadow: none; }
  #g25 .x { position: absolute; right: calc(1.5% + var(--sr, 0px)); top: 2.5%; width: calc(44px * var(--k)); height: calc(44px * var(--k)); min-width: 32px; min-height: 32px;
    border-radius: 10px; border: 2px solid #3a2416; background: #f5e7c8; color: #3a2416; font: 700 18px Rubik, sans-serif; cursor: pointer; z-index: 5; }
  #g25 .bubble { position: absolute; z-index: 6; max-width: calc(360px * var(--k)); background: #fffaf0; color: #2b1d14; border: 3px solid #2b1d14; border-radius: 10px;
    padding: .55em .8em; font-size: max(13px, calc(19px * var(--k))); line-height: 1.3; box-shadow: 0 4px 0 rgba(0,0,0,.25); pointer-events: none;
    opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s; }
  #g25 .bubble.show { opacity: 1; transform: none; }
  #g25 .bubble::after { content: ""; position: absolute; left: var(--tail, 50%); bottom: -14px; margin-left: -9px; border: 9px solid transparent; border-top-color: #2b1d14; border-bottom: 0; }
  #g25 .panel { position: absolute; inset: 0; z-index: 4; display: none; overflow: hidden; align-items: center; justify-content: center; background: rgba(10,8,22,.55); }
  #g25 .panel.show { display: flex; }
  #g25 .box .vcard { zoom: var(--cz, 1); }
  #g25 .box { position: relative; width: min(640px, 90%); flex: none; background: repeating-linear-gradient(45deg, #c49a64 0 6px, #be945e 6px 12px);
    border: 8px solid #6b4628; box-shadow: 0 0 0 3px #3a2416, 0 20px 60px rgba(0,0,0,.5); border-radius: 14px; padding: 22px 28px 20px; text-align: center; color: #3a2416;
    animation: g25pop .3s ease; }
  @keyframes g25pop { from { transform: scale(.8); opacity: 0; } }
  #g25 h2 { margin: 0 0 10px; font: 400 19px/1.55 "Press Start 2P", Rubik, sans-serif; color: #fff6e3; text-shadow: 2px 2px 0 #6b4628; }
  #g25 .tag { font: 700 14px Rubik, sans-serif; opacity: .75; letter-spacing: .5px; }
  #g25 .rules { background: #fffaf0; border: 3px solid #3a2416; border-radius: 12px; padding: 14px 18px; font-size: 17px; line-height: 1.45; margin: 10px 0 16px; text-align: left; }
  #g25 .rules .goal { margin: 0 0 11px; font-size: 18px; line-height: 1.4; color: #2b1d14; }
  #g25 .rules ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
  #g25 .rules li { position: relative; padding-left: 24px; font-size: 16px; line-height: 1.35; color: #5a3e2b; }
  #g25 .rules li::before { content: ""; position: absolute; left: 3px; top: .45em; width: 9px; height: 9px; background: #e0913a; box-shadow: 2px 2px 0 #3a2416; }
  #g25 .btn { font: 700 16px Rubik, sans-serif; padding: 11px 18px; margin: 4px 5px; border-radius: 9px; border: 3px solid #3a2416; background: #f5e7c8; color: #3a2416;
    cursor: pointer; box-shadow: 0 4px 0 #3a2416; }
  #g25 .btn.main { background: #ffcf7a; }
  #g25 .btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #3a2416; }
  #g25 .letter { background: #fffaf0 repeating-linear-gradient(#fffaf0 0 31px, #eadfc8 31px 32px); border: 3px solid #3a2416; border-radius: 6px;
    padding: 18px 22px; text-align: left; font-size: 18px; line-height: 32px; white-space: pre-wrap; margin: 6px 0 16px; color: #2b1d14; min-height: 160px; }
  #g25 .card { width: 230px; margin: 6px auto 14px; perspective: 900px; }
  #g25 .card .in { position: relative; transition: transform .8s ease; transform-style: preserve-3d; }
  #g25 .card.flip .in { transform: rotateY(180deg); }
  #g25 .card .face, #g25 .card .back { backface-visibility: hidden; border-radius: 14px; border: 6px solid #6b4628; box-shadow: 0 0 0 3px #3a2416; overflow: hidden; }
  #g25 .card .back { position: absolute; inset: 0; background: repeating-linear-gradient(45deg, #8f2f2a 0 10px, #7f2824 10px 20px); display: flex; align-items: center; justify-content: center; }
  #g25 .card .back b { font: 400 18px "Press Start 2P", Rubik, sans-serif; color: #ffd98a; text-shadow: 2px 2px 0 #3a1010; }
  #g25 .card .face { transform: rotateY(180deg); background: #fff6e3; }
  #g25 .card img { display: block; width: 100%; }
  #g25 .card .ttl { font: 700 17px Rubik, sans-serif; padding: 9px 8px 4px; color: #3a2416; }
  #g25 .card .no { font: 600 12px Rubik, sans-serif; padding: 0 0 9px; opacity: .6; }
  #g25 .note { background: #fffaf0; border: 3px solid #3a2416; border-radius: 6px; padding: 16px 20px; font-size: 19px; line-height: 1.45; margin: 8px 0 14px; transform: rotate(-.6deg); }
  #g25 .hint { background: #fff3c4; border: 2px dashed #a57a2a; border-radius: 8px; padding: 9px 14px; margin: 0 0 10px; font-size: 16px; }
  #g25 .who { display: flex; align-items: center; gap: 12px; justify-content: center; margin: 0 0 6px; }
  #g25 .who img { width: 70px; }
  #g25 .who .say.pop { animation: g25pop .22s ease-out; }
  #g25 .who .say { background: #fffaf0; border: 3px solid #2b1d14; border-radius: 10px; padding: 8px 12px; font-size: 16px; text-align: left; max-width: 380px; }
  #g25 .found { font: 700 18px Rubik, sans-serif; color: #2f6b2f; margin: 6px 0 12px; }
  `;
  document.head.appendChild(css);

  function build() {
    layer = document.createElement("div"); layer.id = "g25";
    layer.innerHTML = `<div class="wrap"><canvas width="${GW}" height="${GH}"></canvas>
      <div class="hud"><span class="cnt"></span><span class="lives"></span></div>
      <div class="bubble"></div><button class="x" title="Выйти">×</button><div class="panel"></div></div>`;
    document.body.appendChild(layer);
    wrap = layer.querySelector(".wrap"); cv = layer.querySelector("canvas"); ctx = cv.getContext("2d");
    bub = layer.querySelector(".bubble"); hud = layer.querySelector(".hud"); panel = layer.querySelector(".panel");
    layer.querySelector(".x").onclick = () => quit();
    const move = (e) => { if (!st) return; const r = cv.getBoundingClientRect(); st.target = (e.clientX - r.left) / r.width * GW; st.mouse = true; };
    cv.addEventListener("pointermove", move); cv.addEventListener("pointerdown", move);
    addEventListener("keydown", (e) => {
      if (!layer.classList.contains("open")) return;
      keys[e.key] = true; if (/Arrow|^[adфв]$/i.test(e.key)) e.preventDefault();
      if (e.key === "Escape") quit();
    });
    addEventListener("keyup", (e) => { keys[e.key] = false; });
    addEventListener("resize", fit);
  }
  function fit() {
    if (!wrap) return;
    const k = Math.min(innerWidth / GW, innerHeight / GH);
    wrap.style.width = GW * k + "px"; wrap.style.height = GH * k + "px"; wrap.style.setProperty("--k", Math.max(0.6, k * 1.15));
    wrap.style.setProperty("--cz", Math.min(1, Math.max(0.6, (GH * k * 0.94 - 150) / 385)).toFixed(3));
  }
  const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

  // ---------- реплики над Виски ----------
  let bubT = 0;
  const panelOn = () => panel && panel.classList.contains("show");
  function say(key, ms) {
    if (panelOn()) {
      const s = panel.querySelector(".who .say");
      if (s) { s.textContent = V.line(key); s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); SFX.pop(); if (Math.random() < 0.4) SFX.meow(); }
      return;
    }
    const t = V.line(key); bub.textContent = t; bub.classList.add("show");
    clearTimeout(bubT); bubT = setTimeout(() => bub.classList.remove("show"), ms || Math.min(4200, 1500 + t.length * 45));
    SFX.pop(); if (Math.random() < 0.4) SFX.meow();
  }
  function placeBubble() {
    if (!st) return;
    const s = wrap.clientWidth / GW, bw = bub.offsetWidth, bh = bub.offsetHeight;
    const hx = st.cat.x * s, hy = (st.cat.y - 210 * CAT_S - 10) * s;
    const left = (window.safeClamp ? safeClamp(wrap, hx - bw / 2, bw) : Math.max(8, Math.min(wrap.clientWidth - bw - 8, hx - bw / 2))), top = Math.max(8, hy - bh);
    bub.style.left = left + "px"; bub.style.top = top + "px"; bub.style.setProperty("--tail", Math.max(16, Math.min(bw - 16, hx - left)) + "px");
  }

  // ---------- игра ----------
  function newGame(round = 0) {
    const sh = SHELVES[3];
    st = {
      round, rCaught: 0, _t: window.MUSIC && MUSIC.tempo([1, 1.14, 1.3][round]), caught: ROUNDS.slice(0, round).reduce((a, r) => a + r.need, 0),
      last: now(), missed: 0, over: false, target: GW / 2, bx: GW / 2, paused: false,
      cat: { x: (sh.x0 + sh.x1) / 2, y: sh.y, shelf: 3, face: -1, anim: "sit", at: now(), jump: null },
      orns: [], shards: [], nextAct: now() + 1800, busy: false, catchFx: 0,
    };
    renderHud();
  }
  function renderHud() {
    hud.querySelector(".cnt").textContent = `Раунд ${st.round + 1}/3 · Поймано: ${st.rCaught}/${ROUNDS[st.round].need}`;
    hud.querySelector(".lives").innerHTML = Array.from({ length: LIVES }, (_, i) => `<span class="${i < st.missed ? "off" : ""}"></span>`).join("");
  }
  const RC = () => ROUNDS[st.round];
  const level = () => Math.min(1, st.rCaught / (RC().need - 1));   // разгон внутри раунда
  async function act() {               // один «ход» Виски
    st.busy = true;
    const my = st, c = st.cat;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    // раунд закончился (собраны все игрушки, проигрыш или победа) — Виски сразу замирает и больше не бросает
    const stopped = () => my !== st || st.over || st.between;
    const halt = () => { if (my !== st) return true; st.busy = false; c.anim = st.won ? "tail" : "sit"; c.at = now(); return true; };
    // каждый раз новое место: другая полка или другое место на той же полке, подальше от прошлых бросков
    const recent = st.throws || (st.throws = []);
    let best = null, bestScore = -1;
    for (let k = 0; k < 16; k++) {
      const to = Math.floor(Math.random() * SHELVES.length), sh = SHELVES[to];
      const x = rnd(sh.x0 + 25, sh.x1 - 25), face = (x < GW / 2 ? -1 : 1) * (Math.random() < 0.25 ? -1 : 1);
      const tx = x + face * 75 * CAT_S;
      const score = Math.min(400, ...recent.map(r => Math.abs(r - tx)), Math.abs(x - c.x) + 60);
      if (score > bestScore) { bestScore = score; best = { to, x, face, tx }; }
      if (score >= 260) break;
    }
    {
      const sh = SHELVES[best.to], same = best.to === c.shelf;
      c.jump = { sx: c.x, sy: c.y, tx: best.x, ty: sh.y, t0: now(), dur: (same ? 0.72 : 1) * RC().jump * (1 - 0.2 * level()), up: sh.y < c.y, hop: same };
      c.face = best.x > c.x ? 1 : -1; c.shelf = best.to;
      await wait(c.jump.dur + 20); if (my !== st) return;
      c.jump = null; c.x = best.x; c.y = sh.y; c.anim = "sit"; SFX.land();
      if (stopped()) return halt();
      await wait(RC().wind * 0.7); if (stopped()) return halt();
    }
    c.face = best.face;                 // чаще наружу, иногда внутрь ёлки
    const cfg = RC(), fake = (st.round > 0 || st.rCaught >= 2) && Math.random() < cfg.fake;
    c.swatFps = 9 + st.round * 4 + level() * 3; c.anim = "swat"; c.at = now(); SFX.whoosh();
    await wait(cfg.wind); if (stopped()) return halt();
    const throwIt = (fast) => {
      if (st !== my || st.over || st.between) return;
      recent.push(c.x + c.face * 75 * CAT_S); if (recent.length > 2) recent.shift();
      st.orns.push({ k: Math.floor(Math.random() * 8), x: c.x + c.face * 75 * CAT_S, y: c.y - 70 * CAT_S, vx: c.face * rnd(30, 90) * (fast ? 1.6 : 1),
        vy: fast ? rnd(120, 220) : -rnd(60, 160), rot: 0, vr: rnd(-1.5, 1.5) });
    };
    if (fake) {
      say("day25.fake"); await wait(380); if (stopped()) return halt();
      c.anim = "sit";
      if (Math.random() < cfg.combo) {          // обманка → резкий прыжок на другую ветку → резкий бросок
        let to; do { to = Math.floor(Math.random() * SHELVES.length); } while (to === c.shelf);
        const sh = SHELVES[to], x = rnd(sh.x0 + 25, sh.x1 - 25);
        c.jump = { sx: c.x, sy: c.y, tx: x, ty: sh.y, t0: now(), dur: 230, up: sh.y < c.y };
        c.face = x > c.x ? 1 : -1; c.shelf = to;
        await wait(250); if (my !== st) return;
        c.jump = null; c.x = x; c.y = sh.y; SFX.land(); if (stopped()) return halt();
        c.face = (x < GW / 2 ? -1 : 1); c.swatFps = 22; c.anim = "swat"; c.at = now(); SFX.whoosh();
        await wait(120); if (stopped()) return halt();
        throwIt(true);
        await wait(300); if (stopped()) return halt(); c.anim = "happy";
      }
    } else {
      throwIt(false);
      await wait(380 - level() * 150); if (stopped()) return halt(); c.anim = Math.random() < 0.5 ? "happy" : "sit";
    }
    st.nextAct = now() + (fake ? 300 : rnd(cfg.gap[0], cfg.gap[1]) * (1 - 0.25 * level()));
    st.busy = false;
  }
  function crash(o) {
    st.missed++; renderHud(); SFX.smash();
    st.shards.push({ k: o.k, x: o.x, t: now() });
    for (let i = 0; i < 9; i++) st.shards.push({ p: true, x: o.x, y: FLOOR - 10, vx: rnd(-260, 260), vy: rnd(-420, -150), t: now(), c: ["#e8463a", "#ffd166", "#5a8de0", "#e9e9f2"][o.k % 4] });
    if (st.missed >= LIVES) { lose(); return; }
    say("day25.miss"); st.cat.anim = "happy";
  }
  function step() {
    const t = now(), dt = Math.min(0.04, (t - st.last) / 1000); st.last = t;
    const kd = (keys.ArrowLeft || keys.a || keys.A || keys["ф"] || keys["Ф"] ? -1 : 0) + (keys.ArrowRight || keys.d || keys.D || keys["в"] || keys["В"] ? 1 : 0);
    if (kd) st.target = st.bx + kd * 70;
    st.target = Math.max(110, Math.min(GW - 110, st.target));
    st.bx += (st.target - st.bx) * Math.min(1, dt * (kd ? 10 : 16));
    if (!st.over && !st.between && !st.busy && t > st.nextAct && st.orns.length < (st.rCaught >= 2 ? RC().maxOrn : 1)) act();
    const g = RC().g * (1 + 0.15 * level());
    for (let i = st.orns.length - 1; i >= 0; i--) {
      const o = st.orns[i], py = o.y;
      o.vy += g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
      if (o.x < 60 || o.x > GW - 60) o.vx *= -1;
      const rim = BASKET_Y - 120;
      if (!st.over && !st.between && py < rim && o.y >= rim && Math.abs(o.x - st.bx) < 84) {
        st.orns.splice(i, 1); st.caught++; st.rCaught++; st.catchFx = t; renderHud(); SFX.catch();
        if (st.rCaught >= RC().need) { nextRound(); return; }
        if (Math.random() < 0.4) say("day25.catch");
        continue;
      }
      if (o.y > FLOOR) { st.orns.splice(i, 1); if (!st.over && !st.between) crash(o); if (!st) return; }
    }
    for (const s of st.shards) if (s.p) { s.vy += 1400 * dt; s.x += s.vx * dt; s.y = Math.min(FLOOR + 8, s.y + s.vy * dt); if (s.y >= FLOOR + 8) s.vx *= 0.9; }
    st.shards = st.shards.filter(s => t - s.t < (s.p ? 900 : 1600));
  }
  function frameOf(name, at, fps, loop) {
    const fr = V.A[name]; let i = Math.floor((now() - at) / 1000 * fps); i = loop ? i % fr.length : Math.min(i, fr.length - 1); return fr[i];
  }
  function drawCat(f, x, y, face, sy = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(face * CAT_S, CAT_S * sy);
    ctx.drawImage(V.atlas, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h); ctx.restore();
  }
  function drawItem(name, x, y, s = 1, rot = 0, alpha = 1) {
    const m = meta[name]; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.drawImage(img.items, m[0], m[1], m[2], m[3], -m[2] / 2, -m[3] / 2, m[2], m[3]); ctx.restore();
  }
  function draw() {
    const t = now();
    ctx.drawImage(img.bg, 0, 0);
    const c = st.cat;
    if (c.jump) {
      const j = c.jump, k = Math.min(1, (t - j.t0) / j.dur);
      const x = j.sx + (j.tx - j.sx) * k, y = j.sy + (j.ty - j.sy) * k - Math.sin(Math.PI * k) * (j.hop ? 35 : j.up ? 110 : 50);
      const fr = V.A[j.up ? "jumpUp" : "jumpDown"]; drawCat(fr[k < 0.15 ? 0 : k < 0.85 ? 1 : 2], x, y, c.face);
      c.x = x; c.y = y;
    } else {
      const f = c.anim === "swat" ? frameOf("swat", c.at, c.swatFps || 9, false) : c.anim === "happy" ? V.A.happy[0] : c.anim === "tail" ? frameOf("tail", c.at, 4, true) : V.A.sit[Math.floor(t / 400) % V.A.sit.length];
      drawCat(f, c.x, c.y, c.face, 1 + 0.012 * Math.sin(t / 1000 * Math.PI));
    }
    for (const o of st.orns) drawItem("orn" + o.k, o.x, o.y, 1, o.rot * 0.4);
    for (const s of st.shards) {
      const a = 1 - (t - s.t) / (s.p ? 900 : 1600);
      if (s.p) { ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = s.c; ctx.fillRect(s.x - 4, s.y - 4, 8, 8); ctx.globalAlpha = 1; }
      else drawItem("brk" + s.k, s.x, FLOOR - 22, 1, 0, Math.max(0, Math.min(1, a * 2)));
    }
    const bk = st.caught >= 14 ? 2 : st.caught >= 5 ? 1 : 0, m = meta["basket" + bk];
    const pop = Math.max(0, 1 - (t - st.catchFx) / 220);
    drawItem("basket" + bk, st.bx, BASKET_Y - m[3] / 2, 1 + pop * 0.06);
    if (pop > 0) {
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(255,220,140,${pop * 0.5})`;
      ctx.beginPath(); ctx.ellipse(st.bx, BASKET_Y - 125, 90, 26, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    }
    if (st.between) {
      const k = Math.min(1, (t - st.between) / 300), fade = Math.min(1, (2200 - (t - st.between)) / 300);
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(k, fade));
      ctx.fillStyle = "rgba(20,12,24,.55)"; ctx.fillRect(0, GH / 2 - 90, GW, 180);
      ctx.textAlign = "center"; ctx.fillStyle = "#ffe7a8"; ctx.font = "48px 'Press Start 2P', Rubik, sans-serif";
      ctx.fillText(`Раунд ${st.round + 2}!`, GW / 2, GH / 2 + 10);
      ctx.font = "600 30px Rubik, sans-serif"; ctx.fillStyle = "#fff4dc";
      ctx.fillText(st.round === 0 ? "Виски входит во вкус" : "Теперь она хитрит по-настоящему", GW / 2, GH / 2 + 60);
      ctx.restore();
    }
    placeBubble();
  }
  let conf = null;
  const confetti = (x, y, n) => { if (!conf) conf = window.makeConfetti(GW, GH); conf.burst(x, y, n); };
  function loop() {
    if (!st) return;
    if (panelOn()) {                                  // под табличкой всё замирает, но конфетти долетает до конца
      if (conf && (conf.active || conf._was)) { draw(); conf.draw(ctx, now()); conf._was = conf.active; }
      raf = requestAnimationFrame(loop); return;
    }
    if (conf) conf._was = false;
    if (!st.paused) step();
    if (st) draw(); if (conf) conf.draw(ctx, now());
    raf = requestAnimationFrame(loop);
  }

  // ---------- экраны ----------
  function showPanel(html) { bub.classList.remove("show"); clearTimeout(bubT); panel.innerHTML = `<div class="box">${html}</div>`; panel.classList.add("show"); const bx = panel.querySelector(".box"); window.fitBox(bx); return bx; }
  function hidePanel() { panel.classList.remove("show"); panel.innerHTML = ""; }
  function start(retry, round = 0) {
    hidePanel(); newGame(round); st.last = now(); st.nextAct = now() + 1600;
    setTimeout(() => say(retry ? "game.retry" : "day25.start"), 300);
  }
  function intro() {
    newGame(); st.paused = true;
    const b = showPanel(`<div class="tag">25 ДЕКАБРЯ</div><h2>«Это само упало!»</h2>
      <div class="rules"><p class="goal">Виски «случайно» роняет игрушки с ёлки. Лови их корзинкой.</p><ul>
        <li>Двигай корзинку мышью, стрелками или пальцем</li><li>Три раунда, и с каждым Виски всё хитрее</li><li>За раунд можно разбить не больше трёх игрушек</li></ul></div>
      <button class="btn main">Начать</button>`);
    b.querySelector(".btn").onclick = () => start(false);
  }
  function nextRound() {
    if (st.between) return;
    if (st.round >= ROUNDS.length - 1) { win(); return; }
    st.between = now(); st.orns = []; SFX.ding(); confetti(st.bx, GH * 0.7);
    setTimeout(() => {
      if (!st || !st.between) return;
      st.round++; st.rCaught = 0; st.missed = 0; st.between = 0; st.nextAct = now() + 900; renderHud(); if (window.MUSIC) MUSIC.tempo([1, 1.14, 1.3][st.round]);
      say(st.round === 1 ? "day25.start" : "day25.fake", 2600);
    }, 2200);
  }
  function lose() {
    st.over = true; st.orns = [];
    setTimeout(() => {
      if (!st) return;
      say("day25.lose", 3000);
      const b = showPanel(`<h2>Ёлка пострадала</h2><p class="rules" style="text-align:center">Раунд ${st.round + 1}: поймано ${st.rCaught} из ${RC().need}. Попробуем этот раунд ещё раз?</p>
        <button class="btn main">Ещё раз</button> <button class="btn">В комнату</button>`);
      const [again, home] = b.querySelectorAll(".btn");
      const r = st.round; again.onclick = () => start(true, r);
      home.onclick = () => quit();
    }, 700);
  }
  function win() {
    st.over = true; st.won = true; st.orns = []; st.cat.anim = "tail"; st.cat.at = now(); confetti(st.bx, GH * 0.7, 90);
    const replay = !!day().card;                         // повторная победа: коротко, без письма и загадки
    SFX.ding(); say("day25.win", replay ? 2400 : 3500);
    day().game = true; V.save();
    setTimeout(() => st && (replay ? replayDone() : letter(true)), replay ? 2400 : 2800);
  }
  function replayDone() {
    if (st) st.paused = true;
    const key = V.has && V.has("replay.win") ? "replay.win" : "calendar.done";
    const b = showPanel(`<div class="who"><img src="assets/whisky_talk.png" alt=""><div class="say">${esc(V.line(key))}</div></div>
      <h2>Пройдено ещё раз!</h2>
      <button class="btn main" data-a="play">Сыграть ещё раз</button> <button class="btn" data-a="menu">Меню дня</button> <button class="btn" data-a="home">В комнату</button>`);
    b.querySelectorAll(".btn").forEach(btn => btn.onclick = () => {
      const a = btn.dataset.a; if (a === "play") start(true); if (a === "menu") menu(); if (a === "home") quit();
    });
  }
  const day = () => { const P = V.getP(); return (P.days[25] = P.days[25] || {}); };
  function letter(chain) {
    if (st) st.paused = true;
    day().letter = true; V.save();
    window.letterFlow(showPanel, 25, chain ? "Дальше ▸" : "Назад", () => chain ? card(true) : menu());
  }
  function card(chain) {
    const b = showPanel(`<div class="tag">КОЛЛЕКЦИОННАЯ КАРТОЧКА</div>
      ${window.renderCard(25)}
      <button class="btn main">${chain ? "Дальше ▸" : "Назад"}</button>`);
    const c = b.querySelector(".vcard"), im = c.querySelector(".art img");
    const ready = im && !(im.complete && im.naturalWidth) ? Promise.race([im.decode().catch(() => {}), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
    ready.then(() => setTimeout(() => { if (b.isConnected) { c.classList.add("flip"); SFX.ding(); } }, chain ? 600 : 80));
    day().card = true; V.save();
    b.querySelector(".btn").onclick = () => chain ? riddle() : menu();
  }
  function riddle() {
    if (st) st.paused = true;
    const d = day(), hints = ["day25.hint1", "day25.hint"];
    const render = () => {
      const shown = hints.slice(0, d.hints || 0).map(k => `<div class="hint">${esc(V.line(k))}</div>`).join("");
      const b = showPanel(`<div class="tag">ЗАГАДКА ВИСКИ</div>
        <div class="who"><img src="assets/whisky_talk.png" alt=""><div class="say">${esc(V.line("day25.tease"))}</div></div>
        <div class="note">${esc(V.line("day25.riddle"))}</div>${shown}
        ${d.found ? `<div class="found">Подарок найден ✓</div>` : ""}
        ${(d.hints || 0) < hints.length && !d.found ? `<button class="btn" data-a="hint">${d.hints ? "Ещё подсказка" : "Подсказка"}</button>` : ""}
        ${d.found ? `<button class="btn main" data-a="home">В комнату</button>` : `<button class="btn main" data-a="found">Подарок найден!</button>`}`);
      b.querySelectorAll(".btn").forEach(btn => btn.onclick = () => {
        const a = btn.dataset.a;
        if (a === "hint") { d.hints = (d.hints || 0) + 1; V.save(); SFX.paper(); render(); say("calendar.hint", 2200); }
        if (a === "found") confirmFound();
        if (a === "home") quit();
      });
    };
    const confirmFound = () => {
      const b = showPanel(`<h2>Точно нашёл?</h2><p class="rules" style="text-align:center">Подтверди, когда подарок уже у тебя в руках.</p>
        <button class="btn main">Да, нашёл!</button> <button class="btn">Ещё ищу</button>`);
      const [yes, no] = b.querySelectorAll(".btn");
      yes.onclick = () => { d.found = true; V.save(); SFX.ding(); render(); say("day25.found", 6000); };
      no.onclick = render;
    };
    render();
  }
  function menu() {               // повторное открытие пройденного дня
    if (!st) newGame();
    st.paused = true; st.over = true;
    const d = day();
    const b = showPanel(`<div class="tag">25 ДЕКАБРЯ</div><h2>«Это само упало!»</h2>
      <button class="btn main" data-a="play">Сыграть ещё раз</button><br>
      <button class="btn" data-a="letter">Письмо</button> <button class="btn" data-a="card">Карточка</button>
      <button class="btn" data-a="riddle">Загадка${d.found ? " ✓" : ""}</button>`);
    b.querySelectorAll(".btn").forEach(btn => btn.onclick = () => {
      const a = btn.dataset.a;
      if (a === "play") start(true);
      if (a === "letter") letter(false);
      if (a === "card") card(false);
      if (a === "riddle") riddle();
    });
  }
  const esc = (s) => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  async function open(opts = {}) {
    if (window.phoneFullscreen) window.phoneFullscreen();   // Android: игра во весь экран
    V = window.VISKI; if (!layer) build();
    const fade = window.fadeVeil || (async (fn) => fn());
    await fade(async () => {
      if (!img.bg) [img.bg, img.items, meta] = await Promise.all([load("assets/game25_bg.webp"), load("assets/game25.webp"), fetch("assets/game25.json").then(r => r.json())]);
      if (opts.beforeShow) opts.beforeShow();
      cancelAnimationFrame(raf); st = null;
      // сначала правила/меню, и только потом показываем слой с игрой
      const d0 = day();
      if (!d0.game) intro();
      else if (!d0.card) { newGame(); st.paused = true; st.over = true; letter(true); }   // вышел сразу после победы: продолжаем с письма
      else menu();
      layer.classList.add("open"); fit(); window.__gameOpen = true; if (window.MUSIC) MUSIC.play("g25");
      draw();
      loop();
    });
  }
  function quit() {
    const playing = st && !st.over && !st.paused;
    if (st) st.paused = true; bub.classList.remove("show");
    if (window.MUSIC) MUSIC.play("room");
    const fade = window.fadeVeil || (async (fn) => fn());
    fade(() => {
      cancelAnimationFrame(raf); st = null; hidePanel();
      layer.classList.remove("open"); window.__gameOpen = false;
      V.backToRoom(playing ? "game.quit" : null);
    });
  }
  window.Game25 = { open, _state: () => st };
})();
