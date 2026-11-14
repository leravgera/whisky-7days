// Секретный бонус за все 7 карточек: ретро-«файтинг» словами. Виски против Пылесоса.
// Портреты по бокам, внизу рамка с текстом, который печатается по буквам с писком. Около 4 минут.
(function () {
  "use strict";
  const W = 1600, H = 900, CHAR_MS = 75;
  const EMO = { "спокойная": "calm", "довольная": "smug", "злая": "angry", "удивлённая": "surprised", "хитрая": "sly", "смущённая": "shy" };
  const SCRIPT = `
[ВСПЫШКА]
ПЫЛЕСОС (злая): ВНИМАНИЕ! Обнаружен главный источник шерсти и хаоса!
ВИСКИ (спокойная): О, мусорное ведро научилось разговаривать.
ПЫЛЕСОС (хитрая): Я пришёл навести порядок. Начну с твоей власти!
ВИСКИ (хитрая): Смело для существа, которое боится носков.
[ROUND 1]
[FIGHT!]
ПЫЛЕСОС (довольная): Ты разбила ёлочные шары! У меня есть доказательства!
ВИСКИ (спокойная): Подозреваемая не найдена. Читай карточку.
ПЫЛЕСОС (злая): А лабиринт из коробок? Марсель часами искал твою миску!
ВИСКИ (хитрая): Великая исследовательница не обязана знать дорогу.
ПЫЛЕСОС (удивлённая): Ты ещё и обманула его в игре на память!
ВИСКИ (довольная): Мастер отвлечения. Две карточки мимо, жестянка.
[ТРЯСКА]
[ROUND 2]
ПЫЛЕСОС (хитрая): А сырники? Ты даже не готовила, только критиковала!
ВИСКИ (довольная): Кулинарный критик. Сгущёнки было маловато.
ПЫЛЕСОС (злая): А отопление? Марсель спасал тебя от холода!
ВИСКИ (злая): Повелительница батареи заслуживает комфорт.
ПЫЛЕСОС (удивлённая): И башня подарков! Он строил, а ты просто сидела!
ВИСКИ (хитрая): Главный архитектор руководит, а не таскает коробки.
[ВСПЫШКА]
[ROUND 3]
ПЫЛЕСОС (злая): ШЕСТЬ КАРТОЧЕК! Седьмая не спасёт тебя!
ВИСКИ (злая): Седьмая называется «Хозяйка дома». Вопросы?
ПЫЛЕСОС (хитрая): Но это Марсель всё делал! Ты только командовала!
ВИСКИ (хитрая): И прекрасно делегировала. Учись, пока не разрядился.
ПЫЛЕСОС (удивлённая): Постой. Значит, весь праздник был ради него?
ВИСКИ (спокойная): Ну... кто-то же должен был сделать ему сюрприз.
[ПАУЗА]
ПЫЛЕСОС (спокойная): Кажется, ты его любишь.
ВИСКИ (смущённая): Ещё слово, и я забью тебя шерстью.
[K.O.]
[ВСПЫШКА]
ВИСКИ (спокойная): Марсель, семь испытаний позади. Ты выжил. Впечатляет.
ВИСКИ (довольная): Спасибо за игры, сырники, тёплую батарею и терпение.
ВИСКИ (смущённая): Я вообще-то рада, что ты у нас есть. Очень.
ВИСКИ (хитрая): Только не зазнавайся. Квартира всё ещё моя.
[ПАУЗА]
ВИСКИ (довольная): С Новым годом! А теперь иди погладь меня. Я разрешаю. ❤️`;
  const EVENTS = SCRIPT.trim().split("\n").map(s => s.trim()).filter(Boolean).map(s => {
    const fx = s.match(/^\[(.+)\]$/); if (fx) return { fx: fx[1] };
    const m = s.match(/^(ВИСКИ|ПЫЛЕСОС)\s*\(([^)]+)\):\s*(.+)$/);
    return { who: m[1] === "ВИСКИ" ? "W" : "P", emo: EMO[m[2].trim()] || "calm", text: m[3] };
  });

  let layer, cv, g, raf = 0, st = null, img = {}, meta = {}, bg = null, onClose = null;
  const now = () => performance.now(), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (k) => k * k * (3 - 2 * k);

  // ---------- слой ----------
  function build() {
    const css = document.createElement("style");
    css.textContent = `
    #bonus { position: fixed; inset: 0; z-index: 60; background: #05060c; display: none; align-items: center; justify-content: center; font-family: Rubik, sans-serif; }
    #bonus.open { display: flex; }
    #bonus .bwrap { position: relative; }
    #bonus canvas { display: block; width: 100%; height: 100%; cursor: pointer; image-rendering: pixelated; }
    #bonus .bskip { position: absolute; right: calc(1.4% + var(--sr, 0px)); top: 2%; font: 600 15px Rubik, sans-serif; color: #fff4dc; background: rgba(0,0,0,.45); border: 2px solid rgba(255,244,220,.5);
      border-radius: 8px; padding: 6px 12px; cursor: pointer; }
    #bonus .bend { position: absolute; left: 0; right: 0; bottom: 4%; display: none; justify-content: center; gap: 14px; }
    #bonus .bend.show { display: flex; }
    #bonus .bend button { font: 700 18px Rubik, sans-serif; padding: 11px 20px; border-radius: 9px; border: 3px solid #3a2416; background: #f5e7c8; color: #3a2416; cursor: pointer; box-shadow: 0 4px 0 #3a2416; }
    #bonus .bend button.bmain { background: #ffcf7a; }`;
    document.head.appendChild(css);
    layer = document.createElement("div"); layer.id = "bonus";
    layer.innerHTML = `<div class="bwrap"><canvas width="${W}" height="${H}"></canvas><button class="bskip">Пропустить ▸▸</button>
      <div class="bend"><button class="bagain">Смотреть ещё раз</button><button class="bmain bclose">Закрыть</button></div></div>`;
    document.body.appendChild(layer);
    cv = layer.querySelector("canvas"); g = cv.getContext("2d");
    cv.addEventListener("pointerdown", advance);
    addEventListener("keydown", (e) => { if (!layer.classList.contains("open")) return; if (e.key === " " || e.key === "Enter") { e.preventDefault(); advance(); } if (e.key === "Escape") close(); });
    layer.querySelector(".bskip").onclick = () => finish();
    layer.querySelector(".bagain").onclick = () => start();
    layer.querySelector(".bclose").onclick = () => close();
    addEventListener("resize", fit);
  }
  function fit() {
    if (!layer) return; const w = layer.querySelector(".bwrap"), k = Math.min(innerWidth / W, innerHeight / H);
    w.style.width = W * k + "px"; w.style.height = H * k + "px";
  }
  async function load() {
    if (img.w) return;
    const ld = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    [img.w, meta.w, img.room] = await Promise.all([ld("assets/bonus_whisky.webp"), fetch("assets/bonus_whisky.json").then(r => r.json()), ld("assets/room.webp")]);
    try { [img.p, meta.p] = await Promise.all([ld("assets/bonus_vacuum.webp"), fetch("assets/bonus_vacuum.json").then(r => r.json())]); } catch (e) { img.p = null; }
    bg = window.softCanvas(W, H, (c) => c.drawImage(img.room, 150, 0, 1613, 822, -10, -10, W + 20, H + 20), { blur: 2, bright: 0.32, sat: 0.8 });
    const b = bg.getContext("2d");
    for (let y = 0; y < H; y += 4) { b.fillStyle = "rgba(0,0,0,.18)"; b.fillRect(0, y, W, 2); }
  }

  // ---------- сценарий ----------
  function start() {
    layer.querySelector(".bend").classList.remove("show"); layer.querySelector(".bskip").style.display = "";
    st = { i: -1, ev: null, t0: now(), hp: { W: 100, P: 100 }, shown: { W: 100, P: 100 }, hit: { W: 0, P: 0 }, round: 0, fight: false, ko: 0, final: 0,
           flash: 0, shake: 0, banner: null, zoomNext: false, zoom: 0, speaker: null, emo: { W: "calm", P: "calm" }, done: false, blipAt: 0, fw: [], fwNext: 0, fwSide: 0 };
    if (window.MUSIC) MUSIC.play("bonusFight");
    next();
  }
  function next() {
    st.i++;
    if (st.i >= EVENTS.length) { finish(); return; }
    const e = EVENTS[st.i], t = now(); st.ev = { ...e, t0: t, typed: 0, doneAt: 0 };
    if (e.fx) {
      const fx = e.fx;
      let dur = 600;
      if (fx === "ВСПЫШКА") { st.flash = t; SFX.whoosh(); dur = 650; if (st.ko && !st.final) { st.final = t; if (window.MUSIC) MUSIC.play("bonusCalm"); dur = 2400; } }
      else if (fx === "ТРЯСКА") { st.shake = t; SFX.punch(); dur = 800; }
      else if (fx.startsWith("ROUND")) { st.round = +fx.split(" ")[1]; st.banner = { text: fx, t, col: "#ffe07a" }; SFX.roundBell(); dur = 2300; if (window.MUSIC) MUSIC.tempo(1 + (st.round - 1) * 0.06); }
      else if (fx === "FIGHT!") { st.fight = true; st.banner = { text: "FIGHT!", t, col: "#ff5a4a" }; SFX.punch(); setTimeout(() => SFX.punch(), 120); dur = 1500; }
      else if (fx === "K.O.") { st.ko = t; st.zoom = 0; st.fight = false; st.shake = t; st.banner = { text: "K.O.", t, col: "#ff3b3b", big: true }; SFX.ko(); if (window.MUSIC) MUSIC.play("silence"); dur = 3600; }
      else if (fx === "ПАУЗА") dur = 1800;
      st.ev.until = t + dur;
    } else {
      st.speaker = e.who; st.emo[e.who] = e.emo;
      if (st.zoomNext && e.who === "W") { st.zoom = t; st.zoomNext = false; }
      else if (st.zoom && e.who !== "W") st.zoom = 0;
      if (e.who === "P" && /любишь/.test(e.text)) st.zoomNext = true;
    }
  }
  function lineDone() {
    const e = st.ev; e.doneAt = now();
    if (st.fight) {                                       // реплика «попала»: шкала соперника уменьшается
      const tgt = e.who === "W" ? "P" : "W";
      st.hp[tgt] = Math.max(0, st.hp[tgt] - (e.who === "W" ? 10 : 4)); st.hit[tgt] = now(); SFX.punch();
    }
  }
  function advance() {
    if (!st || st.done) return;
    const e = st.ev; if (!e) return;
    if (e.fx) return;                                      // эффекты доигрывают сами
    if (!e.doneAt) { e.typed = e.text.length; lineDone(); return; }
    next();
  }
  function finish() {
    if (!st) return;
    st.done = true; st.final = st.final || now(); st.ko = st.ko || now(); st.ev = null; st.speaker = "W"; st.emo.W = "smug";
    if (window.MUSIC) MUSIC.play("bonusCalm");
    st.endAt = now(); layer.querySelector(".bend").classList.add("show"); layer.querySelector(".bskip").style.display = "none";
  }

  // ---------- шаг ----------
  function step(t) {
    if (!st) return;
    const e = st.ev;
    if (e && !e.fx && !e.doneAt) {
      const n = Math.min(e.text.length, Math.floor((t - e.t0) / CHAR_MS));
      if (n > e.typed) {
        const ch = e.text[n - 1];
        if (ch && /\S/.test(ch) && t - st.blipAt > 55) { st.blipAt = t; SFX.blip(e.who === "W" ? 880 + Math.random() * 120 : 190 + Math.random() * 40, e.who === "W" ? "square" : "sawtooth"); }
        e.typed = n;
      }
      if (e.typed >= e.text.length) lineDone();
    } else if (e && !e.fx && e.doneAt && t - e.doneAt > 1900 + e.text.length * 18) next();
    else if (e && e.fx && t > e.until) next();
    for (const k of ["W", "P"]) st.shown[k] += (st.hp[k] - st.shown[k]) * 0.08;
  }

  // ---------- рисование ----------
  function portrait(who, emo, cx, by, k, opt = {}) {
    let im, m;
    if (who === "W") { im = img.w; m = meta.w[emo] || meta.w.calm; }
    else if (img.p) { im = img.p; m = meta.p[emo] || meta.p.calm; }
    if (who === "P" && img.p) k *= (meta.w.calm.h * 1.08) / meta.p.calm.h;   // пылесос в размер портрета Виски
    const t = now(), w = (m ? m.w : 250) * k, h = (m ? m.h : 280) * k;
    const talking = st.speaker === who && st.ev && !st.ev.fx && !st.ev.doneAt;
    const bob = talking ? Math.sin(t / 45) * 4 : Math.sin(t / 700) * 2;
    const hit = st.hit[who] && t - st.hit[who] < 350, sx = hit ? Math.sin((t - st.hit[who]) / 18) * 10 : 0;
    g.save(); g.imageSmoothingEnabled = false;
    const active = st.speaker === who || st.final;
    const mode = hit ? "hit" : active ? null : "dim";
    if (opt.alpha != null) g.globalAlpha = opt.alpha;
    g.translate(cx + sx + (opt.dx || 0), by + bob); if (opt.rot) g.rotate(opt.rot);
    const ox = -(m && m.ax != null ? m.ax * k : w / 2);
    if (im && mode) g.drawImage(tint(im, m, mode), 0, 0, m.w, m.h, ox, -h, w, h);
    else if (im) g.drawImage(im, m.x, m.y, m.w, m.h, ox, -h, w, h); else drawVacuum(emo, w, h);
    g.restore();
    return { w: m && m.hw ? m.hw * k : m && m.ax != null ? m.ax * 2 * k : w, h };   // ширина головы, без дорисованных плеч и усов
  }
  // покраснение от удара и притушенный «молчащий» боец: готовим один раз, без ctx.filter (его нет в Safari на iPhone)
  const tintCache = new Map();
  function tint(im, m, mode) {
    const key = m.x + "," + m.y + "," + (im === img.w ? "W" : "P") + mode;
    let c = tintCache.get(key); if (c) return c;
    c = document.createElement("canvas"); c.width = m.w; c.height = m.h; const x = c.getContext("2d");
    const sprite = () => x.drawImage(im, m.x, m.y, m.w, m.h, 0, 0, m.w, m.h);
    sprite();
    x.globalCompositeOperation = mode === "hit" ? "color" : "saturation";
    x.globalAlpha = mode === "hit" ? 0.92 : 0.3;
    x.fillStyle = mode === "hit" ? "#ff5f70" : "#808080"; x.fillRect(0, 0, m.w, m.h);
    x.globalAlpha = 1; x.globalCompositeOperation = "destination-in"; sprite();
    x.globalCompositeOperation = "source-atop";
    if (mode === "dim") { x.fillStyle = "rgba(0,0,0,.5)"; x.fillRect(0, 0, m.w, m.h); }
    else { x.globalCompositeOperation = "soft-light"; x.fillStyle = "rgba(255,214,140,.5)"; x.fillRect(0, 0, m.w, m.h);
      x.globalCompositeOperation = "destination-in"; sprite(); }
    tintCache.set(key, c); return c;
  }
  function drawVacuum(emo, w, h) {                         // временный пылесос, пока нет портрета
    g.fillStyle = "#3d4352"; g.fillRect(-w * 0.32, -h * 0.82, w * 0.64, h * 0.82);
    g.fillStyle = "#c8323a"; g.fillRect(-w * 0.32, -h * 0.82, w * 0.64, h * 0.14);
    g.fillStyle = "#596173"; g.fillRect(-w * 0.26, -h * 0.6, w * 0.52, h * 0.3);
    g.strokeStyle = "#2a2e38"; g.lineWidth = 14; g.beginPath(); g.moveTo(-w * 0.3, -h * 0.5); g.quadraticCurveTo(-w * 0.62, -h * 0.4, -w * 0.5, -h * 0.05); g.stroke();
    const eyeY = -h * 0.5, red = emo === "angry";
    [-1, 1].forEach(s => { g.fillStyle = red ? "#ff3b3b" : "#e8f4ff"; g.fillRect(s * w * 0.11 - 16, eyeY - 14, 32, emo === "surprised" ? 34 : 24);
      g.fillStyle = "#111"; g.fillRect(s * w * 0.11 - 6 - 4, eyeY - 4, 12, 12); });
    if (emo === "angry" || emo === "sly") { g.strokeStyle = "#111"; g.lineWidth = 6; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * w * 0.11 - 20 * s, eyeY - 26); g.lineTo(s * w * 0.11 + 20 * s, eyeY - 18 + (emo === "sly" ? 6 : 0)); g.stroke(); }); }
    g.fillStyle = "#111"; g.fillRect(-26, -h * 0.36, 52, emo === "surprised" ? 22 : 8);
  }
  function hpBar(x, y, w, val, shown, label, rtl) {
    g.fillStyle = "#1a1020"; g.fillRect(x - 4, y - 4, w + 8, 44);
    g.fillStyle = "#5a1a1a"; g.fillRect(x, y, w, 36);
    const vw = w * clamp(shown / 100, 0, 1), cw = w * clamp(val / 100, 0, 1);
    g.fillStyle = "#ffde5a"; g.fillRect(rtl ? x + w - vw : x, y, vw, 36);
    g.fillStyle = "#4fd36a"; g.fillRect(rtl ? x + w - cw : x, y, cw, 36);
    g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(x, y + 4, w, 6);
    g.strokeStyle = "#fff4dc"; g.lineWidth = 3; g.strokeRect(x - 4, y - 4, w + 8, 44);
    g.font = "800 28px Rubik, sans-serif"; g.textAlign = rtl ? "right" : "left"; g.fillStyle = "#fff4dc";
    g.fillText(label, rtl ? x + w : x, y + 74);
  }
  function wrap(text, maxW) {
    const words = text.split(" "), lines = []; let cur = "";
    for (const wd of words) { const tt = cur ? cur + " " + wd : wd; if (g.measureText(tt).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tt; }
    if (cur) lines.push(cur); return lines;
  }
  function garland(t) {
    const k = clamp((t - st.final) / 2500, 0, 1), n = 22;
    g.strokeStyle = "#2a1a10"; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 60; i++) { const x = i / 60 * W, y = 30 + Math.abs(Math.sin(i / 60 * Math.PI * 4)) * 34; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    const cols = ["#ffd27a", "#ff8a5c", "#fff1b0", "#ff6f8e", "#9fe3ff"];
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n * W, y = 30 + Math.abs(Math.sin((i + 0.5) / n * Math.PI * 4)) * 34 + 10, on = k * n > i;
      const tw = on ? 0.75 + 0.25 * Math.sin(t / 300 + i * 1.7) : 0.15, c = cols[i % cols.length];
      if (on) { const gr = g.createRadialGradient(x, y, 0, x, y, 46); gr.addColorStop(0, c + "aa"); gr.addColorStop(1, c + "00"); g.globalAlpha = tw; g.fillStyle = gr; g.fillRect(x - 46, y - 46, 92, 92); }
      g.globalAlpha = on ? 1 : 0.35; g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 9, 12, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    }
    const warm = g.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.45, 900); warm.addColorStop(0, `rgba(255,190,120,${0.12 * k})`); warm.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = warm; g.fillRect(0, 0, W, H);
  }
  // фейерверки последнего кадра: каждый залп целиком внутри кадра (слева и справа от Виски, ниже гирлянды, выше надписи)
  const FW_COLS = ["#ffd27a", "#ff6f8e", "#9fe3ff", "#b6ff8a", "#ffb35c", "#d7a8ff", "#fff3c4"];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function fireworks(t) {
    if (!st.endAt) return;
    if (t - st.endAt > 400 && t > st.fwNext && st.fw.length < 4) {
      st.fwSide ^= 1;
      const R = 100 + Math.random() * 30;                              // радиус с учётом осыпания: залп целиком в кадре
      const x = st.fwSide ? 1225 + Math.random() * 170 : 205 + Math.random() * 170;
      const y = 255 + Math.random() * 170;
      const c1 = pick(FW_COLS), c2 = pick(FW_COLS), parts = [];
      for (let i = 0; i < 52; i++) parts.push({ a: i / 52 * Math.PI * 2 + Math.random() * 0.06, r: R * (0.9 + Math.random() * 0.1), c: c1, s: 8 });
      for (let i = 0; i < 26; i++) parts.push({ a: i / 26 * Math.PI * 2 + 0.12, r: R * 0.52, c: c2, s: 6 });
      st.fw.push({ x, y, t0: t, parts, c1 }); st.fwNext = t + 650 + Math.random() * 550;
      if (window.SFX && SFX.firework) SFX.firework();
    }
    const RISE = 600, LIFE = 2000, FALL = 26;
    st.fw = st.fw.filter(f => t - f.t0 < RISE + LIFE);
    g.save(); g.globalCompositeOperation = "lighter";
    for (const f of st.fw) {
      const el = t - f.t0;
      if (el < RISE) {                                                   // ракета взлетает от низа комнаты
        const k = ease(el / RISE), ry = 640 - (640 - f.y) * k;
        g.fillStyle = "#fff6d8"; g.fillRect(f.x - 4, ry - 4, 8, 8);
        for (let j = 1; j < 7; j++) { g.globalAlpha = 0.6 - j * 0.08; g.fillStyle = "#ffc98a"; g.fillRect(f.x - 3, ry + j * 10, 6, 6); }
        g.globalAlpha = 1; continue;
      }
      const p = (el - RISE) / LIFE, spread = 1 - Math.pow(1 - Math.min(1, p * 1.7), 3), alpha = p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.45);
      if (p < 0.25) {                                                    // вспышка в момент взрыва
        const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, 120); gr.addColorStop(0, `rgba(255,240,210,${0.55 * (1 - p / 0.25)})`); gr.addColorStop(1, "rgba(255,240,210,0)");
        g.fillStyle = gr; g.fillRect(f.x - 120, f.y - 120, 240, 240);
      }
      for (const q of f.parts) {
        const d = q.r * spread, drop = FALL * p * p;
        if (p > 0.6 && Math.sin(t / 55 + q.a * 9) < -0.4) continue;   // мерцание на излёте
        for (let j = 0; j < 3; j++) {                                    // точка и короткий хвост
          const dd = d * (1 - j * 0.09), px = f.x + Math.cos(q.a) * dd, py = f.y + Math.sin(q.a) * dd + drop * (1 - j * 0.15), sz = q.s - j * 2;
          g.globalAlpha = alpha * (j ? 0.5 / j : 1); g.fillStyle = j ? q.c : (p < 0.3 ? "#fffbe8" : q.c);
          g.fillRect(Math.round(px - sz / 2), Math.round(py - sz / 2), sz, sz);
        }
      }
    }
    g.restore();
  }
  function draw(t) {
    g.save();
    if (st.shake && t - st.shake < 700) { const k = 1 - (t - st.shake) / 700; g.translate(Math.sin(t / 14) * 16 * k, Math.cos(t / 11) * 10 * k); }
    g.drawImage(bg, 0, 0);
    const finalK = st.final ? clamp((t - st.final) / 1200, 0, 1) : 0;
    // шкалы здоровья (в финале гаснут)
    if (finalK < 1) {
      g.save(); g.globalAlpha = 1 - finalK;
      hpBar(70, 40, 620, st.hp.W, st.shown.W, "ВИСКИ", false); hpBar(910, 40, 620, st.hp.P, st.shown.P, "ПЫЛЕСОС", true);
      g.font = "30px 'Press Start 2P', Rubik, sans-serif"; g.textAlign = "center"; g.fillStyle = "#ffe07a"; g.fillText("VS", W / 2, 76);
      if (st.round) { g.font = "13px 'Press Start 2P', Rubik, sans-serif"; g.fillStyle = "#fff4dc"; g.fillText(`ROUND ${st.round}`, W / 2, 112); }
      g.restore();
    }
    if (st.final) garland(t);
    fireworks(t);
    // портреты
    const zk = st.zoom ? ease(clamp((t - st.zoom) / 220, 0, 1)) : 0;
    if (!st.final) {
      if (zk > 0) {                                          // крупный план смущённой Виски
        portrait("W", st.emo.W, 380 + 300 * zk, 716 + 44 * zk, 1.75 + 0.6 * zk);   // голова не залезает на полоски здоровья
      } else {
        const k = 1.75;
        portrait("W", st.emo.W, 380, 716, k);   // низ портрета прячется за рамкой диалога
        const off = st.ko ? ease(clamp((t - st.ko - 900) / 2500, 0, 1)) : 0;   // пылесос медленно уезжает за край
        portrait("P", st.emo.P, 1220 + off * 900, 672, k, { rot: off * 0.25, dx: 0 });
      }
    } else {
      const fk = clamp((t - st.final - 600) / 900, 0, 1);
      if (fk > 0) {                                          // Виски впервые смотрит прямо на Марселя
        const r = portrait("W", "front", W / 2, 716, 2.0, { alpha: fk });
        if (st.emo.W === "shy" && fk >= 1) { g.save(); g.globalAlpha = 0.35; g.fillStyle = "#ff7d8e"; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(W / 2 + s * r.w * 0.24, 716 - r.h * 0.36, 26, 13, 0, 0, 7); g.fill(); }); g.restore(); }
      }
    }
    // рамка диалога
    const e = st.ev;
    // когда рамки диалога нет (таблички раундов, K.O., финал), низ портретов мягко уходит в тень и срез не виден
    const noBox = !(e && !e.fx);
    st.fadeK = (st.fadeK || 0) + ((noBox ? 1 : 0) - (st.fadeK || 0)) * 0.08;
    if (st.fadeK > 0.01) {
      g.save(); g.globalAlpha = st.fadeK;
      const sh = g.createLinearGradient(0, 545, 0, 712); sh.addColorStop(0, "rgba(14,9,6,0)"); sh.addColorStop(1, "rgba(14,9,6,.97)");
      g.fillStyle = sh; g.fillRect(0, 545, W, 167); g.fillStyle = "rgba(14,9,6,.97)"; g.fillRect(0, 712, W, H - 712);
      g.restore();
    }
    if (e && !e.fx) {
      const bx = 60, by = 690, bw = W - 120, bh = 180;
      g.fillStyle = "rgba(8,8,24,.9)"; g.fillRect(bx, by, bw, bh);
      g.strokeStyle = "#fff4dc"; g.lineWidth = 6; g.strokeRect(bx, by, bw, bh); g.strokeStyle = "#2b1d14"; g.lineWidth = 3; g.strokeRect(bx + 8, by + 8, bw - 16, bh - 16);
      const name = e.who === "W" ? "ВИСКИ" : "ПЫЛЕСОС", nx = e.who === "W" ? bx + 24 : bx + bw - 24;
      g.font = "800 27px Rubik, sans-serif"; const nw = g.measureText(name).width + 36;
      const tx = e.who === "W" ? nx : nx - nw; g.fillStyle = e.who === "W" ? "#b9822c" : "#8a2f36"; g.fillRect(tx, by - 26, nw, 44); g.strokeStyle = "#fff4dc"; g.lineWidth = 4; g.strokeRect(tx, by - 26, nw, 44);
      g.fillStyle = "#fff4dc"; g.textAlign = "left"; g.fillText(name, tx + 18, by + 8);
      g.font = "600 34px Rubik, sans-serif"; g.fillStyle = "#fff4dc"; g.textAlign = "left";
      wrap(e.text.slice(0, e.typed), bw - 80).forEach((ln, i) => g.fillText(ln, bx + 40, by + 70 + i * 46));
      if (e.doneAt && Math.floor(t / 400) % 2) { g.fillStyle = "#ffe07a"; g.textAlign = "right"; g.fillText("▼", bx + bw - 30, by + bh - 22); }
    }
    // таблички раундов и K.O.
    if (st.banner) {
      const b = st.banner, el = t - b.t, life = b.big ? 3200 : b.text === "FIGHT!" ? 1300 : 2100;
      if (el < life) {
        const kin = ease(clamp(el / 260, 0, 1)), kout = clamp((life - el) / 300, 0, 1), s = b.big ? 3 - 2 * kin : 1.6 - 0.6 * kin;
        g.save(); g.globalAlpha = Math.min(kin, kout); g.translate(W / 2, H * 0.42); g.scale(s, s);
        g.font = `${b.big ? 124 : b.text.startsWith("ROUND") ? 64 : 76}px 'Press Start 2P', Rubik, sans-serif`; g.textAlign = "center";
        g.lineWidth = b.big ? 22 : 16; g.strokeStyle = "#1a0606"; g.strokeText(b.text, 0, 40); g.fillStyle = b.col; g.fillText(b.text, 0, 40);
        g.restore();
      }
    }
    if (st.done && st.endAt) {
      const k = clamp((t - st.endAt) / 800, 0, 1);
      g.save(); g.globalAlpha = k; g.font = "900 80px Rubik, sans-serif"; g.textAlign = "center"; g.lineWidth = 12; g.strokeStyle = "#2a1408";
      g.strokeText("С НОВЫМ ГОДОМ!", W / 2, 790); g.fillStyle = "#ffe07a"; g.fillText("С НОВЫМ ГОДОМ!", W / 2, 790); g.restore();
    }
    g.restore();
    if (st.flash && t - st.flash < 300) { g.fillStyle = `rgba(255,255,255,${1 - (t - st.flash) / 300})`; g.fillRect(0, 0, W, H); }
  }
  function loop() { const t = now(); step(t); if (st) draw(t); raf = requestAnimationFrame(loop); }

  // ---------- открыть / закрыть ----------
  async function open(opts = {}) {
    if (window.phoneFullscreen) window.phoneFullscreen();   // Android: игра во весь экран
    if (!layer) build();
    onClose = opts.onClose || null;
    const fade = window.fadeVeil || (async (fn) => fn());
    await fade(async () => {
      await load();
      if (opts.beforeShow) opts.beforeShow();
      layer.classList.add("open"); fit(); window.__gameOpen = true;
      cancelAnimationFrame(raf); start(); loop();
    });
  }
  function close() {
    const fade = window.fadeVeil || (async (fn) => fn());
    fade(() => {
      cancelAnimationFrame(raf); st = null; layer.classList.remove("open"); window.__gameOpen = false;
      if (window.MUSIC) MUSIC.play("room");
      if (onClose) onClose(); else if (window.VISKI) window.VISKI.backToRoom(null);
    });
  }
  window.allCardsCollected = () => { const P = window.VISKI && window.VISKI.getP(); return !!P && [25, 26, 27, 28, 29, 30, 31].every(d => P.days[d] && P.days[d].card); };
  window.openBonus = open;
  window.Bonus = { open, _st: () => st, EVENTS };
})();
