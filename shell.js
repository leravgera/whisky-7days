// Общая «обвязка» дня: окно мини-игры, облачка Виски, правила, проигрыш,
// письмо, коллекционная карточка, загадка с подсказками, «Подарок найден!», меню повторного входа.
// Каждая игра даёт только объект game: { load, newGame, step, draw, head, key? }.
(function () {
  "use strict";
  // ---- конфетти: общий эффект для конца уровня/раунда (рисуется поверх игры) ----
  window.makeConfetti = function (W, H) {
    const COLS = ["#ff5a5f", "#ffd25a", "#5ad1ff", "#7be07b", "#c58cff", "#ff9f43", "#fff3c4", "#ff7eb6"];
    const P = []; let last = 0;
    const k = W / 1600, rnd = (a, b) => a + Math.random() * (b - a);
    const piece = (o) => P.push(Object.assign({ rot: rnd(0, 6.3), vr: rnd(-9, 9), ph: rnd(0, 6.3), fs: rnd(6, 13),
      w: rnd(9, 16) * k, h: rnd(5, 9) * k, c: COLS[Math.floor(Math.random() * COLS.length)], age: 0, sway: rnd(0.6, 1.6) }, o));
    return {
      burst(x, y, n = 70) {                              // хлопушка из точки + дождь сверху
        for (let i = 0; i < n; i++) { const a = rnd(-Math.PI * 0.92, -Math.PI * 0.08), v = rnd(520, 1150) * k;
          piece({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1500 * k, drag: 1.4 }); }
        for (let i = 0; i < Math.round(n * 0.8); i++) piece({ x: rnd(0, W), y: rnd(-260, -20) * k, vx: rnd(-40, 40) * k, vy: rnd(120, 260) * k, g: 0, drag: 0, rain: true });
        if (window.SFX) { SFX.pop(); setTimeout(() => SFX.pop(), 90); }
      },
      get active() { return P.length > 0; },
      draw(g, t) {
        const dt = last && t - last < 250 ? Math.min(0.04, (t - last) / 1000) : 0.016; last = t;
        if (!P.length) return;
        g.save();
        for (let i = P.length - 1; i >= 0; i--) {
          const p = P[i]; p.age += dt;
          if (p.rain) { p.vy = Math.min(p.vy + 260 * k * dt, 300 * k); p.vx = Math.sin(p.age * 3 * p.sway + p.ph) * 70 * k; }
          else { p.vy += p.g * dt; p.vx *= 1 - p.drag * dt; if (p.vy > 330 * k) { p.vy = 330 * k; p.vx += Math.sin(p.age * 4 + p.ph) * 30 * k * dt * 10; } }
          p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          const life = p.age > 3.2 ? 1 - (p.age - 3.2) / 0.6 : 1;
          if (p.y > H + 40 || life <= 0) { P.splice(i, 1); continue; }
          const flip = Math.cos(p.age * p.fs + p.ph);
          g.globalAlpha = Math.max(0, life); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, flip);
          g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          if (flip < 0) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
          g.setTransform(1, 0, 0, 1, 0, 0);
        }
        g.restore();
      },
      clear() { P.length = 0; },
    };
  };
  // ---- размытая и притушенная картинка, одинаковая во всех браузерах ----
  // (Safari на iPhone не умеет ctx.filter: там фон был бы ярким и резким)
  window.softCanvas = function (W, H, paint, { blur = 0, bright = 1, sat = 1 } = {}) {
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
    const out = mk(W, H), g = out.getContext("2d");
    if (blur > 0) {                                   // размытие: уменьшаем в несколько шагов и растягиваем обратно
      let cur = mk(W, H); paint(cur.getContext("2d"));
      const f = Math.max(1.6, blur * 1.5); let k = 1;
      while (k * 2 <= f) { const n = mk(W / (k * 2), H / (k * 2)), ng = n.getContext("2d"); ng.imageSmoothingQuality = "high"; ng.drawImage(cur, 0, 0, n.width, n.height); cur = n; k *= 2; }
      if (f / k > 1.05) { const n = mk(W / f, H / f), ng = n.getContext("2d"); ng.imageSmoothingQuality = "high"; ng.drawImage(cur, 0, 0, n.width, n.height); cur = n; }
      g.imageSmoothingQuality = "high"; g.drawImage(cur, 0, 0, out.width, out.height);
    } else paint(g);
    if (sat < 1) { g.save(); g.globalCompositeOperation = "saturation"; g.globalAlpha = 1 - sat; g.fillStyle = "#808080"; g.fillRect(0, 0, out.width, out.height); g.restore(); }
    if (bright < 1) { g.fillStyle = `rgba(0,0,0,${(1 - bright).toFixed(3)})`; g.fillRect(0, 0, out.width, out.height); }
    return out;
  };
  const css = document.createElement("style");
  css.textContent = `
  .gm { position: fixed; inset: 0; z-index: 40; background: #0d1020; display: none; align-items: center; justify-content: center; font-family: Rubik, sans-serif; }
  .gm.open { display: flex; }
  .gm .wrap { position: relative; }
  .gm canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  .gm .hud { position: absolute; left: calc(1.5% + var(--sl, 0px)); top: 2.5%; display: flex; gap: 14px; align-items: center; color: #fff4dc; font-weight: 700;
    font-size: max(14px, calc(21px * var(--k))); background: rgba(30,20,30,.6); padding: .35em .8em; border-radius: 10px; pointer-events: none; }
  .gm .hud .lives span { display: inline-block; width: .9em; height: .9em; border-radius: 50%; margin-left: .25em; background: #e8463a; box-shadow: inset -2px -2px 0 rgba(0,0,0,.25); }
  .gm .hud .lives span.off { background: rgba(255,255,255,.18); box-shadow: none; }
  .gm .x { position: absolute; right: calc(1.5% + var(--sr, 0px)); top: 2.5%; width: calc(44px * var(--k)); height: calc(44px * var(--k)); min-width: 32px; min-height: 32px;
    border-radius: 10px; border: 2px solid #3a2416; background: #f5e7c8; color: #3a2416; font: 700 18px Rubik, sans-serif; cursor: pointer; z-index: 7; }
  .gm .bubble { position: absolute; z-index: 6; max-width: calc(360px * var(--k)); background: #fffaf0; color: #2b1d14; border: 3px solid #2b1d14; border-radius: 10px;
    padding: .55em .8em; font-size: max(13px, calc(19px * var(--k))); line-height: 1.3; box-shadow: 0 4px 0 rgba(0,0,0,.25); pointer-events: none;
    opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s; }
  .gm .bubble.show { opacity: 1; transform: none; }
  .gm .bubble::after { content: ""; position: absolute; left: var(--tail, 50%); bottom: -14px; margin-left: -9px; border: 9px solid transparent; border-top-color: #2b1d14; border-bottom: 0; }
  .gm .panel { position: absolute; inset: 0; z-index: 4; display: none; overflow: hidden; align-items: center; justify-content: center; background: rgba(10,8,22,.55); }
  .gm .panel.show { display: flex; }
  .gm .box .vcard { zoom: var(--cz, 1); }                        /* карточка ужимается на низких экранах (телефон) */
  .gm .box { position: relative; width: min(640px, 90%); flex: none; background: repeating-linear-gradient(45deg, #c49a64 0 6px, #be945e 6px 12px);
    border: 8px solid #6b4628; box-shadow: 0 0 0 3px #3a2416, 0 20px 60px rgba(0,0,0,.5); border-radius: 14px; padding: 22px 28px 20px; text-align: center; color: #3a2416;
    animation: gmpop .3s ease; }
  @keyframes gmpop { from { transform: scale(.8); opacity: 0; } }
  .gm h2 { margin: 0 0 12px; font: 400 19px/1.55 "Press Start 2P", Rubik, sans-serif; color: #fff6e3; text-shadow: 2px 2px 0 #6b4628; }
  .gm .tag { font: 700 14px Rubik, sans-serif; opacity: .75; letter-spacing: .5px; }
  .gm .rules { background: #fffaf0; border: 3px solid #3a2416; border-radius: 12px; padding: 14px 18px; font-size: 17px; line-height: 1.45; margin: 10px 0 16px; text-align: left; }
  .gm .rules .goal { margin: 0 0 11px; font-size: 18px; line-height: 1.4; color: #2b1d14; }
  .gm .rules ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
  .gm .rules li { position: relative; padding-left: 24px; font-size: 16px; line-height: 1.35; color: #5a3e2b; }
  .gm .rules li::before { content: ""; position: absolute; left: 3px; top: .45em; width: 9px; height: 9px; background: #e0913a; box-shadow: 2px 2px 0 #3a2416; }
  .gm .btn { font: 700 16px Rubik, sans-serif; padding: 11px 18px; margin: 4px 5px; border-radius: 9px; border: 3px solid #3a2416; background: #f5e7c8; color: #3a2416;
    cursor: pointer; box-shadow: 0 4px 0 #3a2416; }
  .gm .btn.main { background: #ffcf7a; }
  .gm .btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #3a2416; }
  .gm .letter { background: #fffaf0 repeating-linear-gradient(#fffaf0 0 31px, #eadfc8 31px 32px); border: 3px solid #3a2416; border-radius: 6px;
    padding: 18px 22px; text-align: left; font-size: 18px; line-height: 32px; white-space: pre-wrap; margin: 6px 0 16px; color: #2b1d14; min-height: 160px; }
  .gm .note { background: #fffaf0; border: 3px solid #3a2416; border-radius: 6px; padding: 16px 20px; font-size: 19px; line-height: 1.45; margin: 8px 0 14px; transform: rotate(-.6deg); }
  .gm .hint { background: #fff3c4; border: 2px dashed #a57a2a; border-radius: 8px; padding: 9px 14px; margin: 0 0 10px; font-size: 16px; }
  .gm .who { display: flex; align-items: center; gap: 12px; justify-content: center; margin: 0 0 6px; }
  .gm .who img { width: 70px; }
  .gm canvas.petcur { cursor: grab !important; }
  .gm .who .say.pop { animation: gmpop .22s ease-out; }
  .gm .who .say { background: #fffaf0; border: 3px solid #2b1d14; border-radius: 10px; padding: 8px 12px; font-size: 16px; text-align: left; max-width: 380px; }
  .gm .found { font: 700 18px Rubik, sans-serif; color: #2f6b2f; margin: 6px 0 12px; }
  `;
  document.head.appendChild(css);
  const esc = (s) => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const now = () => performance.now();

  window.DayShell = function (cfg, game) {
    // cfg: { d, W, H, title, rules, hints: [keys] }
    const d = cfg.d, W = cfg.W, H = cfg.H;
    let V, layer, wrap, cv, ctx, bub, hud, panel, raf = 0, last = 0, bubT = 0;
    const sh = { paused: true, playing: false };

    function build() {
      layer = document.createElement("div"); layer.className = "gm"; layer.id = "gm" + d;
      layer.innerHTML = `<div class="wrap"><canvas width="${W}" height="${H}"></canvas><div class="hud"></div>
        <div class="bubble"></div><button class="x" title="Выйти">×</button><div class="panel"></div></div>`;
      document.body.appendChild(layer);
      wrap = layer.querySelector(".wrap"); cv = layer.querySelector("canvas"); ctx = cv.getContext("2d");
      bub = layer.querySelector(".bubble"); hud = layer.querySelector(".hud"); panel = layer.querySelector(".panel");
      layer.querySelector(".x").onclick = () => quit();
      addEventListener("keydown", (e) => {
        if (!layer.classList.contains("open")) return;
        if (e.key === "Escape") { quit(); return; }
        if (game.key && game.key(e.key, true) !== false) e.preventDefault();
      });
      addEventListener("keyup", (e) => { if (layer.classList.contains("open") && game.key) game.key(e.key, false); });
      addEventListener("resize", fit);
      Object.assign(sh, { cv, ctx, wrap, hud, layer });
      const conf = window.makeConfetti(W, H);
      sh.confetti = (x = W / 2, y = H * 0.55, n) => conf.burst(x, y, n); sh._conf = conf;
      // погладить Виски: зажать на ней ≈0,4 с; короткий клик — просто реакция. Слушаем раньше игры, чтобы клик не ушёл в игру.
      const toXY = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
      cv.addEventListener("pointerdown", (e) => {
        if (!sh.playing || sh.paused || !game.catHit || panelOn()) return;
        const [x, y] = toXY(e); if (!game.catHit(x, y)) return;
        e.stopImmediatePropagation(); e.preventDefault();
        PET.down = true; clearTimeout(PET.timer); PET.timer = setTimeout(petStart, 380);
      });
      cv.addEventListener("pointermove", (e) => {
        const [x, y] = toXY(e); PET.mx = x; PET.my = y;
        const over = sh.playing && !sh.paused && game.catHit && game.catHit(x, y);
        cv.classList.toggle("petcur", !!over);
        if (PET.on && !over) petEnd();
      });
      addEventListener("pointerup", () => petRelease());
      cv.addEventListener("pointerleave", () => { cv.classList.remove("petcur"); if (PET.on || PET.down) { PET.down = false; clearTimeout(PET.timer); petEnd(); } });
      if (game.mount) game.mount(sh);
    }
    function fit() {
      if (!wrap) return;
      const k = Math.min(innerWidth / W, innerHeight / H);
      wrap.style.width = W * k + "px"; wrap.style.height = H * k + "px"; wrap.style.setProperty("--k", Math.max(0.6, k * 1.15));
      wrap.style.setProperty("--cz", Math.min(1, Math.max(0.6, (H * k * 0.94 - 150) / 385)).toFixed(3));
    }
    // ---- Виски можно погладить ----
    const PET = { on: false, down: false, timer: 0, since: 0, long: false, cool: 0, lastPoke: 0, hearts: [], lastHeart: 0 };
    const petKey = (b) => (window.LINES && window.LINES[`day${d}.${b}`] && Math.random() < 0.6) ? `day${d}.${b}` : `game.${b}`;
    function petStart() {
      PET.down = false;
      if (!sh.playing || sh.paused || panelOn()) return;
      if (now() < PET.cool) { sh.say("game.petCooldown", 2200); if (game.catPoke) game.catPoke(); return; }
      PET.on = true; PET.since = now(); PET.long = false; V.getP().petTried = true;
      SFX.purrStart(); if (game.catPet) game.catPet(true);
      sh.say(petKey("pet"), 2600);
    }
    function petEnd(tooLong) {
      if (!PET.on) return;
      PET.on = false; SFX.purrStop(); if (game.catPet) game.catPet(false);
      if (tooLong) { PET.cool = now() + 10000; sh.say("game.petStop", 2600); if (game.catPoke) game.catPoke(); }
    }
    function petRelease() {
      if (PET.down) {                         // отпустил раньше, чем началось поглаживание: это просто клик
        PET.down = false; clearTimeout(PET.timer);
        if (now() - PET.lastPoke > 1500 && sh.playing && !sh.paused) { PET.lastPoke = now(); sh.say(petKey("poke"), 2400); if (game.catPoke) game.catPoke(); }
        return;
      }
      petEnd();
    }
    function petStep(t) {
      if (PET.on) {
        const el = t - PET.since;
        if (el > 4000 && !PET.long) { PET.long = true; sh.say("game.petLong", 2400); }
        if (el > 8000) petEnd(true);
        if (t - PET.lastHeart > 260) { PET.lastHeart = t; const h = game.head && game.head(); if (h) PET.hearts.push({ x: h.x + (Math.random() - 0.5) * 70, y: h.y + 30, t, s: 0.7 + Math.random() * 0.6 }); }
      }
      PET.hearts = PET.hearts.filter(h => t - h.t < 1100);
      for (const h of PET.hearts) {
        const k = (t - h.t) / 1100;
        ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.font = `700 ${Math.round(26 * h.s)}px Rubik, sans-serif`; ctx.textAlign = "center";
        ctx.lineWidth = 4; ctx.strokeStyle = "#5a1a24"; ctx.strokeText("♥", h.x + Math.sin(k * 6 + h.s * 9) * 10, h.y - k * 80);
        ctx.fillStyle = "#ff6f8e"; ctx.fillText("♥", h.x + Math.sin(k * 6 + h.s * 9) * 10, h.y - k * 80); ctx.restore();
      }
    }
    // ---- облачко ----
    const panelOn = () => panel && panel.classList.contains("show");
    sh.say = function (key, ms) {
      if (panelOn()) {                      // табличка поверх: фон замер, Виски говорит прямо в табличке (если там есть её место)
        const s = panel.querySelector(".who .say");
        if (s) { s.textContent = V.line(key); s.classList.remove("pop"); void s.offsetWidth; s.classList.add("pop"); SFX.pop(); if (Math.random() < 0.4) SFX.meow(); }
        return;
      }
      const t = V.line(key); bub.textContent = t; bub.classList.add("show");
      clearTimeout(bubT); bubT = setTimeout(() => bub.classList.remove("show"), ms || Math.min(4500, 1500 + t.length * 45));
      SFX.pop(); if (Math.random() < 0.4) SFX.meow();
    };
    function placeBubble() {
      const h = game.head && game.head(); if (!h) return;
      const s = wrap.clientWidth / W, bw = bub.offsetWidth, bh = bub.offsetHeight, hx = h.x * s, hy = h.y * s;
      const left = (window.safeClamp ? safeClamp(wrap, hx - bw / 2, bw) : Math.max(8, Math.min(wrap.clientWidth - bw - 8, hx - bw / 2))), top = Math.max(8, hy - bh - 14);
      bub.style.left = left + "px"; bub.style.top = top + "px"; bub.style.setProperty("--tail", Math.max(16, Math.min(bw - 16, hx - left)) + "px");
    }
    // ---- цикл ----
    function loop() {
      const t = now(), dt = Math.min(0.04, (t - last) / 1000); last = t;
      if (panelOn()) {                                // под табличкой всё замирает…
        const c = sh._conf;
        if (c && (c.active || c._was)) {             // …но конфетти долетает до конца поверх застывшей картинки
          if (!sh._freezeT) sh._freezeT = t;
          game.draw(ctx, sh._freezeT); c.draw(ctx, t); c._was = c.active;
        }
        raf = requestAnimationFrame(loop); return;
      }
      sh._freezeT = 0; if (sh._conf) sh._conf._was = false;
      if (!sh.paused) game.step(dt, t);
      game.draw(ctx, t);
      if (sh._conf) sh._conf.draw(ctx, t);
      petStep(t);
      placeBubble();
      raf = requestAnimationFrame(loop);
    }
    // ---- панели ----
    function showPanel(html) { if (PET.on) petEnd(); PET.down = false; clearTimeout(PET.timer); bub.classList.remove("show"); clearTimeout(bubT); panel.innerHTML = `<div class="box">${html}</div>`; panel.classList.add("show"); const bx = panel.querySelector(".box"); window.fitBox(bx); return bx; }
    function hidePanel() { panel.classList.remove("show"); panel.innerHTML = ""; }
    sh.showPanel = showPanel; sh.hidePanel = hidePanel;
    const day = () => { const P = V.getP(); return (P.days[d] = P.days[d] || {}); };
    function start(retry) {
      hidePanel(); game.newGame(); if (game.begin) game.begin(); sh.paused = false; sh.playing = true; last = now();
      setTimeout(() => sh.say(retry ? "game.retry" : `day${d}.start`), 300);
    }
    function intro() {
      game.newGame(); sh.paused = true;
      const b = showPanel(`<div class="tag">${d} ДЕКАБРЯ</div><h2>«${esc(cfg.title)}»</h2><div class="rules">${typeof cfg.rules === "string" ? cfg.rules : `<p class="goal">${cfg.rules.goal}</p><ul>${cfg.rules.how.map((x) => `<li>${x}</li>`).join("")}</ul>`}</div><button class="btn main">Начать</button>`);
      b.querySelector(".btn").onclick = () => start(false);
    }
    sh.lose = function (text) {
      sh.playing = false;
      setTimeout(() => {
        const b = showPanel(`<h2>${esc(text.title || "Не вышло")}</h2><p class="rules" style="text-align:center">${esc(text.body || "Попробуем ещё раз?")}</p>
          <button class="btn main">Ещё раз</button> <button class="btn">В комнату</button>`);
        const [again, home] = b.querySelectorAll(".btn");
        again.onclick = () => start(true); home.onclick = () => quit();
      }, 700);
    };
    sh.win = function () {
      const dd0 = day();
      if (dd0.card && (!cfg.finale || dd0.finaleSeen)) {     // повторная победа: без письма и загадки, коротко
        sh.playing = false; SFX.ding(); if (!cfg.finale) sh.say(`day${d}.win`, 2600); else SFX.fanfare();
        setTimeout(() => layer.classList.contains("open") && replayDone(), cfg.finale ? 1400 : 2400);
        return;
      }
      if (cfg.finale) {                       // финал: шкатулка открыта → сразу загадка про последний подарок
        sh.playing = false; day().game = true; V.save(); SFX.fanfare();
        setTimeout(() => layer.classList.contains("open") && riddle(), 1400);
        return;
      }
      sh.playing = false; SFX.ding(); sh.say(`day${d}.win`, 3500);
      day().game = true; V.save();
      setTimeout(() => layer.classList.contains("open") && letter(true), 2800);
    };
    function replayDone() {
      sh.paused = true;
      const key = V.has && V.has("replay.win") ? "replay.win" : "calendar.done";
      const b = showPanel(`<div class="who"><img src="assets/whisky_talk.png" alt=""><div class="say">${esc(V.line(key))}</div></div>
        <h2>Пройдено ещё раз!</h2>
        <button class="btn main" data-a="play">${cfg.finale ? "Пройти ещё раз" : "Сыграть ещё раз"}</button> <button class="btn" data-a="menu">Меню дня</button> <button class="btn" data-a="home">В комнату</button>`);
      b.querySelectorAll(".btn").forEach(btn => btn.onclick = () => {
        const a = btn.dataset.a; if (a === "play") start(true); if (a === "menu") menu(); if (a === "home") quit();
      });
    }
    function letter(chain) {
      sh.paused = true; day().letter = true; V.save();
      window.letterFlow(showPanel, d, chain ? "Дальше ▸" : "Назад", () => chain ? card(true) : menu());
    }
    // финал после «Подарок найден»: письмо → тихие слова Виски → карточка → «С Новым годом!» с фейерверком
    function finaleLetter() {
      sh.paused = true; day().letter = true; V.save();
      window.letterFlow(showPanel, d, "Дальше ▸", () => finalLines(0));
    }
    function finalLines(i) {
      const keys = ["day31.final1", "day31.final2", "day31.final3", "day31.final4"];
      SFX.pop(); if (i === 1) SFX.purrStart(); if (i === 3) SFX.purrStop();
      const b = showPanel(`<div class="who"><img src="assets/whisky_talk.png" alt=""><div class="say">${esc(V.line(keys[i]))}</div></div>
        <button class="btn main">${i < keys.length - 1 ? "▸" : "Дальше ▸"}</button>`);
      b.querySelector(".btn").onclick = () => i < keys.length - 1 ? finalLines(i + 1) : card(true, newYear);
    }
    function newYear() {
      SFX.purrStop(); hidePanel(); const dd = day(); dd.finaleSeen = true; V.save();
      if (game.newYear) game.newYear((fromBonus) => fromBonus ? quietQuit() : quit()); else quit();
    }
    function card(chain, next) {
      const b = showPanel(`<div class="tag">КОЛЛЕКЦИОННАЯ КАРТОЧКА</div>${window.renderCard(d)}<button class="btn main">${chain ? "Дальше ▸" : "Назад"}</button>`);
      const c = b.querySelector(".vcard"), im = c.querySelector(".art img");
      // переворачиваем только когда картинка уже готова
      const ready = im && !(im.complete && im.naturalWidth) ? Promise.race([im.decode().catch(() => {}), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
      ready.then(() => setTimeout(() => { if (b.isConnected) { c.classList.add("flip"); SFX.ding(); } }, chain ? 600 : 80));
      day().card = true; V.save();
      b.querySelector(".btn").onclick = () => chain ? (next ? next() : riddle()) : menu();
    }
    function riddle() {
      sh.paused = true;
      const dd = day(), hints = cfg.hints || [];
      const render = () => {
        const shown = hints.slice(0, dd.hints || 0).map(k => `<div class="hint">${esc(V.line(k))}</div>`).join("");
        const b = showPanel(`<div class="tag">ЗАГАДКА ВИСКИ</div>
          <div class="who"><img src="assets/whisky_talk.png" alt=""><div class="say">${esc(V.line(`day${d}.tease`))}</div></div>
          <div class="note">${esc(V.line(`day${d}.riddle`))}</div>${shown}
          ${dd.found ? `<div class="found">Подарок найден ✓</div>` : ""}
          ${(dd.hints || 0) < hints.length && !dd.found ? `<button class="btn" data-a="hint">${dd.hints ? "Ещё подсказка" : "Подсказка"}</button>` : ""}
          ${dd.found ? (cfg.finale && !dd.finaleSeen ? `<button class="btn main" data-a="finale">Дальше ▸</button>` : `<button class="btn main" data-a="home">В комнату</button>`) : `<button class="btn main" data-a="found">Подарок найден!</button>`}`);
        b.querySelectorAll(".btn").forEach(btn => btn.onclick = () => {
          const a = btn.dataset.a;
          if (a === "hint") { dd.hints = (dd.hints || 0) + 1; V.save(); SFX.paper(); render(); sh.say("calendar.hint", 2200); }
          if (a === "found") confirmFound();
          if (a === "home") quit();
          if (a === "finale") finaleLetter();
        });
      };
      const confirmFound = () => {
        const b = showPanel(`<h2>Точно нашёл?</h2><p class="rules" style="text-align:center">Подтверди, когда подарок уже у тебя в руках.</p>
          <button class="btn main">Да, нашёл!</button> <button class="btn">Ещё ищу</button>`);
        const [yes, no] = b.querySelectorAll(".btn");
        yes.onclick = () => { dd.found = true; V.save(); SFX.ding(); render(); sh.say(`day${d}.found`, 6000); };
        no.onclick = render;
      };
      render();
    }
    function menu() {
      game.newGame(); sh.paused = true; sh.playing = false;
      const dd = day();
      const b = showPanel(`<div class="tag">${d} ДЕКАБРЯ</div><h2>«${esc(cfg.title)}»</h2>
        <button class="btn main" data-a="play">${cfg.finale ? "Пройти ещё раз" : "Сыграть ещё раз"}</button><br>
        <button class="btn" data-a="letter">Письмо</button> <button class="btn" data-a="card">Карточка</button>
        <button class="btn" data-a="riddle">Загадка${dd.found ? " ✓" : ""}</button>${cfg.finale && dd.finaleSeen ? ` <button class="btn" data-a="ny">Фейерверк</button>` : ""}`);
      b.querySelectorAll(".btn").forEach(btn => btn.onclick = () => {
        const a = btn.dataset.a;
        if (a === "play") start(true); if (a === "letter") letter(false); if (a === "card") card(false); if (a === "riddle") riddle();
        if (a === "ny") newYear();
      });
    }
    async function open(opts = {}) {
      if (window.phoneFullscreen) window.phoneFullscreen();   // Android: игра во весь экран
      V = window.VISKI;
      if (!layer) build();
      const fade = window.fadeVeil || (async (fn) => fn());
      await fade(async () => {               // шторка темнеет сразу, загрузка идёт уже под ней (с лапками, если долго)
        await game.load();
        if (opts.beforeShow) opts.beforeShow();
        cancelAnimationFrame(raf); last = now();
        // сначала правила/меню, и только потом показываем слой с игрой
        const dd = day();
        if (!dd.game) intro();
        else if (cfg.finale ? !dd.finaleSeen : !dd.card) { game.newGame(); sh.paused = true; sh.playing = false; cfg.finale ? riddle() : letter(true); }   // вышел сразу после победы: продолжаем с письма
        else menu();
        layer.classList.add("open"); fit(); window.__gameOpen = true; window.__sh = sh;
        if (window.MUSIC) MUSIC.play(cfg.music || "room");
        game.draw(ctx, now());
        loop();
      });
    }
    function quietQuit() {                   // бонус уже закрылся шторкой: просто убираем слой игры
      cancelAnimationFrame(raf); sh.paused = true; sh.playing = false; hidePanel(); bub.classList.remove("show"); petEnd();
      if (game.stop) game.stop(); layer.classList.remove("open"); window.__gameOpen = false; V.backToRoom(null);
    }
    function quit() {
      const playing = sh.playing && !sh.paused;
      sh.paused = true; sh.playing = false; bub.classList.remove("show"); petEnd();
      if (game.stop) game.stop();
      if (window.MUSIC) MUSIC.play("room");
      const fade = window.fadeVeil || (async (fn) => fn());
      fade(() => {
        cancelAnimationFrame(raf); hidePanel();
        layer.classList.remove("open"); window.__gameOpen = false;
        V.backToRoom(playing ? "game.quit" : null);
      });
    }
    sh.open = open; sh.quit = quit; sh.V = () => V;
    return sh;
  };
})();
