// Игра 28 декабря — «Рецепт под секретом: Сырники».
// 1) выбрать продукты (творог, яйцо, мука, сахар, соль) среди лишних; 2) расставить шаги рецепта по порядку;
// 3) пожарить 6 сырников, вовремя переворачивая (крупный план плиты, вид сверху); 4) подача: полить сгущёнкой, штамп «Одобрено Марселем!».
(function () {
  "use strict";
  const W = 1600, H = 900;
  const GOOD = ["tvorog", "egg", "flour", "sugar", "salt"], BAD = ["carrot", "cucumber", "fish", "ketchup", "onion", "sausage"];
  const STEPS = [
    { t: "Размять\nтворог", ic: ["it", "tvorog"], r: 1 },
    { t: "Вбить\nяйцо", ic: ["it", "egg"], r: 2 },
    { t: "Добавить сахар\nи щепотку соли", ic: ["it", "sugar"], r: 2 },
    { t: "Всыпать муку,\nзамесить тесто", ic: ["it", "flour"], r: 3 },
    { t: "Слепить сырники,\nобвалять в муке", ic: ["it", "flourPlate"], r: 4 },
    { t: "Обжарить\nс двух сторон", ic: ["fd", "raw"], r: 5 },
  ];
  const LAYOUTS = (() => {                              // все раскладки 2×3, где шаг i и i+1 не соседи
    const near = (a, b) => (Math.floor(a / 3) === Math.floor(b / 3) && Math.abs(a % 3 - b % 3) === 1) || (a % 3 === b % 3 && a !== b) || b === a + 1;
    const perm = (a) => a.length < 2 ? [a] : a.flatMap((x, i) => perm(a.filter((_, j) => j !== i)).map(p => [x, ...p]));
    return perm([0, 1, 2, 3, 4, 5]).filter(p => p.every((c, i) => i === 0 || !near(p[i - 1], c)));
  })();
  const NEED = 6, BURN_MAX = 3, GOLD = 0.62, BURN = 1.2, RAW = 0.3;
  const PAN = { x: 700, y: 480, r: 285, ri: 245 }, SLOTS = [[-96, -96], [96, -96], [-96, 96], [96, 96]], CK = 1.0;
  const PLATE = { x: 1400, y: 610, r: 120 };
  const CAT = { x: 150, y: 640, s: 0.98 }, CAT_TOP = { x: 172, y: 680, s: 1.8 };
  let S, it, itM, fd, fdM, panImg = null, panM = null, kitchen, top, st = null, retryStage = null;
  const mouse = { x: -999, y: -999, in: false };
  const now = () => performance.now(), rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const ease = (k) => k * k * (3 - 2 * k);

  // ---------- вспомогательное рисование ----------
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function spr(g, src, name, cx, by, w, h) {           // по центру снизу
    const img = src === "it" ? it : fd, m = (src === "it" ? itM : fdM)[name];
    g.drawImage(img, m[0], m[1], m[2], m[3], cx - w / 2, by - h, w, h);
  }
  function fit(src, name, box) { const m = (src === "it" ? itM : fdM)[name], k = Math.min(box / m[2], box / m[3]); return [m[2] * k, m[3] * k]; }
  function label(g, text, x, y, size, fill, stroke) {
    g.font = `${Math.round(size * 0.62)}px 'Press Start 2P', Rubik, sans-serif`; g.textAlign = "center";
    if (stroke) { g.lineWidth = Math.max(4, size / 7); g.strokeStyle = stroke; g.strokeText(text, x, y); }
    g.fillStyle = fill; g.fillText(text, x, y);
  }

  // ---------- крупный план: столешница и стеклянная плита сверху ----------
  function paintTop() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#8f5f40"); gr.addColorStop(1, "#77482f");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) {                     // «мраморные» крапинки
      const x = Math.floor(R() * W), y = Math.floor(R() * H), s = 2 + Math.floor(R() * 4), v = R();
      g.fillStyle = v < 0.45 ? `rgba(230,205,175,${0.18 + R() * 0.3})` : v < 0.8 ? `rgba(60,32,18,${0.15 + R() * 0.25})` : `rgba(180,120,80,${0.3})`;
      g.fillRect(x, y, s, s);
    }
    g.strokeStyle = "rgba(240,220,195,.16)"; g.lineWidth = 3;
    for (let i = 0; i < 14; i++) { g.beginPath(); let x = R() * W, y = R() * H; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-90, 90); y += rnd(30, 90); g.lineTo(x, y); } g.stroke(); }
    // стена-фартук сверху
    g.fillStyle = "#4a2b1c"; g.fillRect(0, 0, W, 34);
    for (let x = 0; x < W; x += 88) { g.fillStyle = (x / 88) % 2 ? "#6b3d26" : "#5c3420"; g.fillRect(x + 3, 4, 82, 24); }
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, 34, W, 10);
    // стеклянная плита
    const hx = 300, hy = 70, hw = 1000, hh = 790;
    g.save(); g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 24; g.shadowOffsetY = 8;
    rr(g, hx, hy, hw, hh, 22); g.fillStyle = "#121014"; g.fill(); g.restore();
    rr(g, hx, hy, hw, hh, 22); g.strokeStyle = "#2d2a30"; g.lineWidth = 6; g.stroke();
    const sh = g.createLinearGradient(hx, hy, hx + hw, hy + hh); sh.addColorStop(0, "rgba(255,255,255,.07)"); sh.addColorStop(0.45, "rgba(255,255,255,0)"); sh.addColorStop(0.55, "rgba(255,255,255,.04)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    rr(g, hx, hy, hw, hh, 22); g.fillStyle = sh; g.fill();
    g.strokeStyle = "rgba(200,190,200,.28)"; g.lineWidth = 3;
    [[PAN.x, PAN.y, 300], [1150, 210, 95], [1150, 690, 115]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); });
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(220,210,220,.35)"; g.beginPath(); g.arc(hx + 330 + i * 70, hy + hh - 30, 7, 0, 7); g.fill(); }
    // тёплый свет и виньетка
    const v = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 950); v.addColorStop(0, "rgba(255,200,130,.06)"); v.addColorStop(1, "rgba(0,0,0,.45)");
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c;
  }
  function drawPan(g, t, x, y, alpha) {
    g.save(); g.globalAlpha = alpha;
    // жар индукции вокруг сковороды
    const heat = st && st.stage === 2 ? 0.35 + 0.08 * Math.sin(t / 300) : 0;
    if (heat) { const hg = g.createRadialGradient(x, y, PAN.r - 10, x, y, PAN.r + 40); hg.addColorStop(0, `rgba(255,90,30,${heat})`); hg.addColorStop(1, "rgba(255,90,30,0)"); g.fillStyle = hg; g.beginPath(); g.arc(x, y, PAN.r + 40, 0, 7); g.fill(); }
    if (panImg) {
      const k = (PAN.r * 2) / panM.d;
      g.drawImage(panImg, x - panM.cx * k, y - panM.cy * k, panImg.width * k, panImg.height * k);
    } else {                                             // временная сковорода, пока нет картинки
      g.save(); g.translate(x, y);
      g.fillStyle = "#5b3a20"; rr(g, PAN.r - 30, -30, 330, 60, 26); g.fill(); g.strokeStyle = "#2a1a0e"; g.lineWidth = 5; g.stroke();
      g.fillStyle = "#7a4f2c"; rr(g, PAN.r + 10, -18, 270, 20, 10); g.fill();
      g.fillStyle = "#8d8d95"; rr(g, PAN.r - 40, -24, 70, 48, 10); g.fill(); g.strokeStyle = "#3a3a40"; g.lineWidth = 4; g.stroke();
      g.beginPath(); g.arc(0, 0, PAN.r, 0, 7); g.fillStyle = "#3b3b42"; g.fill(); g.lineWidth = 6; g.strokeStyle = "#151518"; g.stroke();
      const b = g.createRadialGradient(-60, -70, 20, 0, 0, PAN.ri); b.addColorStop(0, "#34343a"); b.addColorStop(1, "#1a1a1e");
      g.beginPath(); g.arc(0, 0, PAN.ri, 0, 7); g.fillStyle = b; g.fill();
      g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, PAN.ri - 6, 3.6, 5.2); g.stroke();
      g.fillStyle = "rgba(255,210,120,.07)"; g.beginPath(); g.ellipse(-40, -30, 150, 110, -0.4, 0, 7); g.fill();
      g.restore();
    }
    g.restore();
  }
  function drawPlate(g, x, y, r) {
    g.save(); g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(x + 6, y + 10, r, r * 0.96, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = "#f6f1e6"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#cfc6b4"; g.stroke();
    g.beginPath(); g.arc(x, y, r * 0.86, 0, 7); g.strokeStyle = "#4f78bb"; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.arc(x, y, r * 0.66, 0, 7); g.strokeStyle = "rgba(0,0,0,.06)"; g.lineWidth = 3; g.stroke(); g.restore();
  }
  const PILE = [[-34, 16], [34, 16], [0, -20], [-14, 4], [18, -4], [2, -14]];
  function drawPile(g, x, y, n, k) {
    const m = fdM.gold;
    for (let i = 0; i < n; i++) { const [dx, dy] = PILE[i], w = m[2] * 0.62 * k, h = m[3] * 0.62 * k; g.drawImage(fd, m[0], m[1], m[2], m[3], x + dx * k - w / 2, y + dy * k - h / 2 - i * 3 * k, w, h); }
  }

  // ---------- Виски ----------
  function catPlan(t) {
    const c = st.cat, r = Math.random();
    if ((c.mode === "puzzled" || c.mode === "love" || c.mode === "happy") && t < c.until) return;
    c.mode = r < 0.8 ? "sit" : "groom"; c.at = t; c.until = t + rnd(3000, 5500);
  }
  function catFrame(t) {
    const c = st.cat, A = window.VISKI.A, el = Math.max(0, (t - c.at) / 1000);
    if (c.mode === "groom") return A.groom[Math.floor(el * 3.5) % A.groom.length];
    if (c.mode === "tail") { const n = A.tail.length, k = Math.floor(el * 4) % (n * 2 - 2); return A.tail[k < n ? k : n * 2 - 2 - k]; }
    if (c.mode === "puzzled") return A.puzzled[0];
    if (c.mode === "happy") return A.happy[0];
    if (c.mode === "love") return A.love[0];
    return A.sit[Math.floor(el * 2.5) % A.sit.length];
  }
  function drawCatFront(g, t) {
    const f = catFrame(t), br = 1 + 0.012 * Math.sin(t / 1000 * Math.PI);
    g.fillStyle = "rgba(20,10,5,.3)"; g.beginPath(); g.ellipse(CAT.x, CAT.y - 2, f.w * CAT.s * 0.34, 7, 0, 0, 7); g.fill();
    g.save(); g.translate(CAT.x, CAT.y); g.scale(CAT.s, CAT.s * br);
    g.drawImage(window.VISKI.atlas, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h); g.restore();
  }
  let catTop = null;
  function drawCatTop(g, t) {                           // Виски сверху сидит на столешнице рядом с плитой
    if (!catTop) return;
    const c = st.cat, pet = c.mode === "love", hop = c.mode === "happy" && t < c.until ? Math.max(0, Math.sin((t - c.at) / 1300 * Math.PI * 2)) * 10 : 0;
    const br = 1 + (pet ? 0.03 : 0.012) * Math.sin(t / 1000 * Math.PI * (pet ? 2.2 : 1.1)), w = catTop.width * CAT_TOP.s, h = catTop.height * CAT_TOP.s;
    g.fillStyle = "rgba(20,10,5,.32)"; g.beginPath(); g.ellipse(CAT_TOP.x + 4, CAT_TOP.y - 30, w * 0.46, 44, 0, 0, 7); g.fill();
    g.save(); g.translate(CAT_TOP.x, CAT_TOP.y - hop); g.scale(1, br);
    g.drawImage(catTop, -w / 2, -h, w, h); g.restore();
  }

  // ---------- этапы ----------
  function renderHud() {
    if (!st) return;
    const s = st.stage;
    if (s === 0) S.hud.innerHTML = `<span>Этап 1/3 · Продукты: ${st.slots.length}/5</span>`;
    else if (s === 1) S.hud.innerHTML = `<span>Этап 2/3 · Рецепт по порядку: ${st.picked}/6</span>`;
    else if (s === 2) {
      let l = ""; for (let i = 0; i < BURN_MAX; i++) l += `<span class="${i < BURN_MAX - st.burnt ? "" : "off"}"></span>`;
      S.hud.innerHTML = `<span>Этап 3/3 · На тарелке: ${st.done}/${NEED}</span><span class="lives">${l}</span>`;
    } else S.hud.innerHTML = `<span>Подача</span>`;
  }
  function stage0() {
    st.stage = 0; st.view = "front"; st.slots = [];
    // два ряда слева и справа от плиты (плита свободна): дальний ряд чуть мельче
    const SPOTS = [];
    for (const [y, k] of [[572, 0.84], [666, 1]]) for (const x of [330, 432, 534, 1078, 1186, 1294]) SPOTS.push([x, y, k]);
    const order = shuffle(GOOD.concat(BAD)), spots = shuffle(SPOTS.slice()).slice(0, order.length);
    st.items = order.map((n, i) => { const [x, y, k] = spots[i]; const [w, h] = fit("it", n, (n === "fish" || n === "sausage" ? 100 : 88) * k); return { n, x, y, w, h, good: GOOD.includes(n), state: "idle", t: 0 }; })
      .sort((a, b) => a.y - b.y);
    renderHud();
  }
  function stage1() {
    st.stage = 1; st.picked = 0;
    const pos = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)], t = now();
    st.notes = STEPS.map((s, i) => { const p = pos[i]; return { ...s, x: [420, 840, 1260][p % 3], y: [292, 424][Math.floor(p / 3)], rot: rnd(-0.05, 0.05), num: 0, at: t + i * 90, shake: 0 }; });
    SFX.paper(); renderHud();
    const my = st; setTimeout(() => { if (st === my) S.say("day28.steps"); }, 500);
  }
  function stage2() {
    st.stage = 2; st.view = "top"; st.cakes = []; st.done = 0; st.burnt = 0; st.plated = 0; st.over = false;
    const t = now(); st.slotNext = [600, 2100, 3600, 5100].map(d => t + d); st.lastSizzle = 0;
    S.cv.style.cursor = "none"; renderHud();
    const my = st; setTimeout(() => { if (st === my) S.say("day28.fry"); }, 900);
  }
  function stage3() {
    st.stage = 3; st.serve = { t: now(), poured: 0 }; S.cv.style.cursor = "pointer"; renderHud();
  }
  function fade(mid) { st.fade = { t: now(), mid, fired: false }; }

  // ---------- клики ----------
  function hitItem(x, y) { return st.items.find(i => i.state === "idle" && x > i.x - i.w / 2 - 8 && x < i.x + i.w / 2 + 8 && y > i.y - i.h - 8 && y < i.y + 6); }
  function hitNote(x, y) { return st.notes.find(n => !n.num && Math.abs(x - n.x) < 152 && Math.abs(y - n.y) < 62); }
  function slotXY(i) { return [PAN.x + SLOTS[i][0], PAN.y + SLOTS[i][1]]; }
  function sideName(p) { return p < RAW ? "raw" : p < GOLD ? "half" : p <= BURN ? "gold" : "burnt"; }
  function click(x, y) {
    if (!st || S.paused || st.fade) return;
    const t = now();
    if (st.stage === 0) {
      const i = hitItem(x, y); if (!i) return;
      if (i.good) {
        const k = st.slots.length + st.items.filter(z => z.state === "fly").length;
        i.state = "fly"; i.t = t; i.to = [300 + k * 65, 374]; SFX.pop();
        const first = !st.items.some(z => z !== i && z.good && z.state !== "idle");
        if (k < 4 && (first || Math.random() < 0.45)) S.say("day28.right");
      } else {
        i.state = "shake"; i.t = t; SFX.deny();
        st.cat.mode = "puzzled"; st.cat.at = t; st.cat.until = t + 1500;
        S.say(i.n === "carrot" ? "day28.wrongCarrot" : "day28.wrongAny");
      }
    } else if (st.stage === 1) {
      const n = hitNote(x, y); if (!n) return;
      const min = Math.min(...st.notes.filter(z => !z.num).map(z => z.r));
      if (n.r === min) { n.num = ++st.picked; n.pinT = t; SFX.paper(); renderHud(); if (st.picked === 6) finishOrder(); }
      else { n.shake = t; SFX.deny(); if (t - (st.lastOrder || 0) > 2200) { st.lastOrder = t; S.say("day28.order"); } }
    } else if (st.stage === 2) {
      if (st.over) return;
      const c = st.cakes.find(c => !c.out && !c.burntAt && Math.hypot(x - c.x, y - c.y) < 88);
      if (!c) return;
      st.flick = t;
      const top = c.p[1 - c.down], bot = c.p[c.down];
      if (top >= GOLD && bot >= GOLD) {                  // обе стороны золотые — на тарелку
        c.out = { t, kind: "plate", x0: c.x, y0: c.y }; st.done++; SFX.ding(); renderHud();
        if (st.done < NEED && st.done > 1 && Math.random() < 0.35 && t - (st.lastPlate || 0) > 8000) { st.lastPlate = t; S.say("day28.plate"); }
        st.slotNext[c.s] = t + 1500;
        if (st.done >= NEED) { const my = st; st.over = true; S.confetti(PLATE.x, PLATE.y - 60); setTimeout(() => { if (st === my) fade(stage3); }, 1300); }
      } else { c.down = 1 - c.down; c.flipT = t; SFX.flip(); }
    } else if (st.stage === 3) {
      const sv = st.serve;
      if (!sv.poured && t - sv.t > 900) {
        sv.poured = t; SFX.whoosh(); const my = st;
        [900, 1700, 2500, 3300].forEach(d => setTimeout(() => { if (st === my) SFX.gurgle(); }, d));
        setTimeout(() => { if (st === my) S.say("day28.condensed", 3600); }, 4400);
        setTimeout(() => { if (st === my) { st.stamp = now(); SFX.thud(); SFX.fanfare(); S.confetti(800, 700, 90); } }, 6000);
        setTimeout(() => { if (st === my) S.win(); }, 8200);      // оболочка сама скажет «Одобрено Марселем…» и откроет письмо
      }
    }
  }
  function finishOrder() {
    const my = st; S.confetti();
    setTimeout(() => { if (st !== my) return; st.bowl = now(); SFX.land(); }, 700);
    setTimeout(() => { if (st === my) S.say("day28.right"); }, 1100);
    setTimeout(() => { if (st === my) fade(stage2); }, 2700);
  }

  // ---------- шаг ----------
  function step(dt, t) {
    if (!st) return;
    if (t > st.cat.until) catPlan(t);
    if (st.fade && !st.fade.fired && t - st.fade.t > 450) { st.fade.fired = true; st.fade.mid(); }
    if (st.fade && t - st.fade.t > 900) st.fade = null;
    if (st.stage === 0) {
      for (const i of st.items) if (i.state === "fly" && t - i.t > 480) { i.state = "slot"; st.slots.push(i.n); SFX.catch(); renderHud(); }
      for (const i of st.items) if (i.state === "shake" && t - i.t > 450) i.state = "idle";
      if (st.slots.length === 5 && !st.s0done) {
        S.confetti();
        st.s0done = t; const my = st;
        setTimeout(() => { if (st === my) { st.itemsOut = now(); } }, 700);
        setTimeout(() => { if (st === my) stage1(); }, 1300);
      }
    }
    if (st.stage === 2 && !st.fade) stepFry(dt, t);
  }
  function stepFry(dt, t) {
    const rate = (1 / 9.5) * (1 + 0.04 * st.done);
    let smoking = false;
    for (const c of st.cakes) {
      if (c.out) continue;
      if (t - c.enter < 350) continue;
      c.p[c.down] += rate * dt;
      if (c.p[c.down] > 1.0) { smoking = true; if (!c.warned && !c.burntAt && t - (st.lastFlipTalk || 0) > 7000) { c.warned = true; st.lastFlipTalk = t; S.say("day28.flip"); } }
      if (c.p[c.down] > BURN && !c.burntAt) {
        c.burntAt = t; st.burnt++; renderHud(); SFX.hissShort();
        if (st.burnt >= BURN_MAX) {
          st.over = true; retryStage = 2; const my = st;
          setTimeout(() => { if (st === my) S.lose({ title: "Сырники сгорели", body: "Виски осуждает. Но даёт ещё одну попытку пожарить." }); }, 1400);
        } else if (Math.random() < 0.8) S.say(Math.random() < 0.5 ? "day28.burnt" : "day28.pan");
      }
      if (c.burntAt && !c.out && t - c.burntAt > 700) { c.out = { t, kind: "trash", x0: c.x, y0: c.y }; st.slotNext[c.s] = t + 1200; }
    }
    st.cakes = st.cakes.filter(c => !(c.out && t - c.out.t > 600));
    // новые сырники в свободные места
    if (!st.over) {
      const inPan = st.cakes.filter(c => !c.out).length;
      let need = NEED - st.done - inPan;
      for (let s = 0; s < 4 && need > 0; s++) {
        if (st.cakes.some(c => c.s === s && !c.out)) continue;
        if (t < st.slotNext[s]) continue;
        const [x, y] = slotXY(s);
        st.cakes.push({ s, x, y, p: [0, 0], down: 0, flipT: 0, enter: t }); SFX.pop(); need--;
      }
    }
    if (st.cakes.some(c => !c.out) && t - st.lastSizzle > 300) { st.lastSizzle = t; SFX.sizzle(smoking ? 1.4 : 0.8); }
  }

  // ---------- рисование ----------
  function drawFront(g, t) {
    g.drawImage(kitchen, 0, 0);
    // рецепт-записка на фартуке (этап 1)
    if (st.stage === 0) {
      g.save(); g.translate(430, 330); g.rotate(-0.025);
      g.fillStyle = "rgba(0,0,0,.25)"; rr(g, -172, -96, 350, 200, 10); g.fill();
      g.fillStyle = "#fff6e3"; rr(g, -178, -102, 350, 196, 10); g.fill(); g.strokeStyle = "#c9a46a"; g.lineWidth = 4; g.stroke();
      g.fillStyle = "rgba(255,240,170,.75)"; g.fillRect(-40, -116, 84, 28);
      g.font = "600 46px Caveat, Rubik, sans-serif"; g.fillStyle = "#7a3e1f"; g.textAlign = "center"; g.fillText("Сырники", -3, -48);
      g.font = "500 26px Caveat, Rubik, sans-serif"; g.fillStyle = "#7a5a40"; g.fillText("что нужно:", -3, -18);
      g.restore();
      for (let k = 0; k < 5; k++) {
        const x = 300 + k * 65, y = 374, n = st.slots[k];
        g.save(); g.setLineDash(n ? [] : [6, 6]); g.strokeStyle = n ? "#6aa84f" : "#c9a46a"; g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, 29, 0, 7); g.stroke(); g.restore();
        if (n) { const [w, h] = fit("it", n, 46); spr(g, "it", n, x, y + h / 2, w, h); }
        else { g.font = "700 24px Rubik"; g.fillStyle = "#c9a46a"; g.textAlign = "center"; g.fillText("?", x, y + 9); }
      }
    }
    // продукты на столешнице (Виски рисуется между дальним и ближним рядом)
    let catDrawn = false;
    if (!(st.stage === 0 || (st.itemsOut && t - st.itemsOut < 600))) { drawCatFront(g, t); catDrawn = true; }
    if (st.stage === 0 || (st.itemsOut && t - st.itemsOut < 600)) {
      const fadeK = st.itemsOut ? 1 - (t - st.itemsOut) / 600 : 1;
      g.save(); g.globalAlpha = clamp(fadeK, 0, 1);
      for (const i of st.items) {
        if (!catDrawn && i.y > CAT.y) { g.restore(); drawCatFront(g, t); catDrawn = true; g.save(); g.globalAlpha = clamp(fadeK, 0, 1); }
        if (i.state === "slot") continue;
        let x = i.x, y = i.y, w = i.w, h = i.h;
        if (i.state === "fly") {
          const k = ease(clamp((t - i.t) / 480, 0, 1)), [tx, ty] = i.to, s = 1 - 0.5 * k;
          x = x + (tx - x) * k; y = (y - h / 2) + (ty - (y - h / 2)) * k - Math.sin(Math.PI * k) * 120 + h * s / 2; w *= s; h *= s;
        } else if (i.state === "shake") x += Math.sin((t - i.t) / 28) * 7 * (1 - (t - i.t) / 450);
        const hov = i.state === "idle" && st.stage === 0 && mouse.in && hitItem(mouse.x, mouse.y) === i;
        g.fillStyle = "rgba(30,15,5,.28)"; g.beginPath(); g.ellipse(x, i.y - 2, w * 0.42, 7, 0, 0, 7); g.fill();
        if (hov) { g.save(); g.shadowColor = "rgba(255,230,150,.95)"; g.shadowBlur = 18; spr(g, "it", i.n, x, y - 6, w * 1.06, h * 1.06); g.restore(); }
        else spr(g, "it", i.n, x, y, w, h);
        if (i.state === "shake") { g.save(); g.globalAlpha = 1 - (t - i.t) / 450; label(g, "✕", x, y - h - 10, 40, "#e8463a", "#3a1a10"); g.restore(); }
      }
      g.restore();
    }
    if (!catDrawn) drawCatFront(g, t);
    // карточки рецепта (этап 2)
    if (st.stage === 1) {
      for (const n of st.notes) {
        const k = clamp((t - n.at) / 300, 0, 1); if (k <= 0) continue;
        const hov = !n.num && mouse.in && hitNote(mouse.x, mouse.y) === n;
        let x = n.x; if (n.shake && t - n.shake < 450) x += Math.sin((t - n.shake) / 28) * 8 * (1 - (t - n.shake) / 450);
        g.save(); g.globalAlpha = k; g.translate(x, n.y - (1 - k) * 40 - (hov ? 4 : 0)); g.rotate(n.rot);
        g.fillStyle = "rgba(0,0,0,.28)"; rr(g, -146, -55, 300, 122, 8); g.fill();
        g.fillStyle = n.num ? "#f1ead8" : "#fff8e8"; rr(g, -150, -60, 300, 120, 8); g.fill();
        g.strokeStyle = hov ? "#e2a43a" : n.num ? "#8cbf6a" : "#c9a46a"; g.lineWidth = hov ? 5 : 3; g.stroke();
        g.fillStyle = "rgba(255,240,170,.8)"; g.fillRect(-26, -72, 52, 22);
        const [w, h] = fit(n.ic[0], n.ic[1], 72); spr(g, n.ic[0], n.ic[1], -104, h / 2 + 2, w, h);
        const lines = n.t.split("\n"); let fs = 21;
        g.font = `600 ${fs}px Rubik, sans-serif`; while (fs > 15 && Math.max(...lines.map(l => g.measureText(l).width)) > 180) { fs--; g.font = `600 ${fs}px Rubik, sans-serif`; }
        g.fillStyle = "#4a2c1a"; g.textAlign = "left";
        lines.forEach((ln, j) => g.fillText(ln, -56, j * (fs + 5) - (lines.length - 1) * (fs + 5) / 2 + fs * 0.35));
        if (n.num) {
          const pk = clamp((t - n.pinT) / 220, 0, 1), s = 1.6 - 0.6 * pk;
          g.save(); g.translate(124, -44); g.scale(s, s); g.beginPath(); g.arc(0, 0, 24, 0, 7); g.fillStyle = "#6aa84f"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#2f5a22"; g.stroke();
          label(g, String(n.num), 0, 10, 28, "#fff"); g.restore();
        }
        g.restore();
      }
      if (st.bowl) {
        const k = clamp((t - st.bowl) / 420, 0, 1), b = 1 - Math.abs(Math.sin(k * Math.PI * 2.5)) * (1 - k) * 0.35, [w, h] = fit("fd", "bowl", 178);
        g.save(); g.globalAlpha = Math.min(1, k * 3);
        g.fillStyle = "rgba(30,15,5,.35)"; g.beginPath(); g.ellipse(800, 636, w * 0.4, 10, 0, 0, 7); g.fill();   // стоит в центре плиты
        spr(g, "fd", "bowl", 800, 640 - (1 - k) * 160, w * (2 - b), h * b); g.restore();
      }
    }
  }
  function drawCake(g, c, t) {
    let x = c.x, y = c.y, sc = 1, a = 1, rot = 0;
    const ek = clamp((t - c.enter) / 350, 0, 1);
    if (ek < 1) { sc = 0.6 + 0.4 * ease(ek); y -= (1 - ek) * 60; a = ek; }
    if (c.out) {
      const k = clamp((t - c.out.t) / 550, 0, 1);
      if (c.out.kind === "plate") { x = c.out.x0 + (PLATE.x - c.out.x0) * ease(k); y = c.out.y0 + (PLATE.y - c.out.y0) * ease(k) - Math.sin(Math.PI * k) * 140; sc = 1 - 0.38 * k; }
      else { x = c.out.x0 - k * 260; y = c.out.y0 + k * k * 520; rot = -k * 3; a = 1 - k; }
    }
    // флип: сплющивание и подскок
    const fk = c.flipT ? clamp((t - c.flipT) / 320, 0, 1) : 1;
    const sy = fk < 1 ? Math.max(0.06, Math.abs(Math.cos(Math.PI * fk))) : 1;
    if (fk < 1) y -= Math.sin(Math.PI * fk) * 46;
    const showSide = fk < 0.5 ? c.down : 1 - c.down;
    const name = c.burntAt ? (fk < 0.5 ? "gold" : "burnt") : sideName(c.p[showSide]);
    const m = fdM[name], w = m[2] * CK * sc, h = m[3] * CK * sc;
    g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(1, sy);
    if (!c.out) { g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(4, 10, w * 0.47, h * 0.44, 0, 0, 7); g.fill(); }
    g.drawImage(fd, m[0], m[1], m[2], m[3], -w / 2, -h / 2, w, h); g.restore();
    if (c.out || c.burntAt) return;
    // кольцо готовности нижней стороны
    const p = c.p[c.down], A0 = -Math.PI / 2, ang = (v) => A0 + Math.PI * 2 * clamp(v / BURN, 0, 1), R = 86;
    g.save(); g.lineCap = "round";
    g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 12; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke();
    g.strokeStyle = "rgba(90,200,90,.55)"; g.lineWidth = 12; g.beginPath(); g.arc(x, y, R, ang(GOLD), ang(1.0)); g.stroke();
    g.strokeStyle = "rgba(230,70,50,.55)"; g.beginPath(); g.arc(x, y, R, ang(1.0), ang(BURN)); g.stroke();
    const col = p < GOLD ? "#ffe9b0" : p <= 1.0 ? "#7be06f" : "#ff6a4a";
    g.strokeStyle = col; g.lineWidth = 7; g.beginPath(); g.arc(x, y, R, A0, ang(p) + 0.001); g.stroke();
    if (p >= GOLD && p <= 1.0) { g.globalAlpha = 0.5 + 0.5 * Math.sin(t / 110); g.strokeStyle = "#b8ff9e"; g.lineWidth = 3; g.beginPath(); g.arc(x, y, R + 10, 0, 7); g.stroke(); }
    g.restore();
    // дымок, если подгорает
    if (p > 0.95) {
      const sm = fdM.smoke, k = clamp((p - 0.95) / (BURN - 0.95), 0, 1);
      for (let i = 0; i < 2; i++) {
        const ph = ((t / 900) + i * 0.5 + c.s * 0.3) % 1;
        g.save(); g.globalAlpha = (1 - ph) * (0.35 + 0.6 * k); g.drawImage(fd, sm[0], sm[1], sm[2], sm[3], x - 20 + i * 24, y - 60 - ph * 90, sm[2] * 0.9, sm[3] * 0.9); g.restore();
      }
    }
  }
  // ---------- полив сгущёнкой ----------
  // Пиксельная «жидкость»: струя рисует зигзаг по верхнему сырнику, полоски медленно расплываются и сливаются,
  // с краёв стекают подтёки с каплями. Форма — сглаженное объединение кругов (SDF) на пиксельной сетке P×P,
  // поэтому края чёткие, как в пиксель-арте, а движение плавное (каждый кадр).
  const POUR = { in: 650, dur: 3000, end: 420, out: 600, settle: 3200 };
  const PX = 3;                                        // размер «пикселя» сгущёнки на холсте
  const prand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const MILK = { rimDark: [196, 150, 78], rim: [228, 194, 126], base: [246, 229, 182], light: [255, 247, 222], spec: [255, 255, 250], shadow: [110, 62, 18, 90] };
  function topCake(cx, cy) { return { x: cx + 2 * 1.75, y: cy - 14 * 1.75 - 5 * 3 * 1.75, rx: 80, ry: 66 }; }
  function pourHit(k, tc) {                             // зигзаг: 3 прохода через сырник, плавные развороты у краёв
    const PASSES = 3, u = k * PASSES;
    const yy = -0.6 + 1.12 * k;                                            // сверху вниз
    const A = tc.rx * 0.8 * Math.sqrt(Math.max(0.08, 1 - yy * yy));
    return [tc.x + A * Math.cos(Math.PI * u), tc.y + tc.ry * yy * 0.92 - 2];
  }
  function milkPlan(sv, cx, cy) {                       // путь струи и подтёки считаем один раз
    if (sv.plan) return sv.plan;
    const tc = topCake(cx, cy), path = [], N = 360;
    for (let i = 0; i <= N; i++) { const k = i / N, [x, y] = pourHit(k, tc); path.push({ x, y, k }); }
    for (let i = 0; i <= N; i++) { const a = path[Math.max(0, i - 1)], b = path[Math.min(N, i + 1)]; path[i].v = Math.hypot(b.x - a.x, b.y - a.y); }
    const vmax = Math.max(...path.map(p => p.v));
    // подтёки: там, где струя доходит до края сырника (развороты и нижняя кромка)
    const drips = [];
    path.forEach((p, i) => {
      const u = ((p.x - tc.x) / tc.rx) ** 2 + ((p.y - tc.y) / tc.ry) ** 2;
      const turn = i > 0 && i < N && (Math.sign(path[i + 1].x - p.x) !== Math.sign(p.x - path[i - 1].x));
      if ((turn && u > 0.3 && p.y > tc.y - tc.ry * 0.3) || (u > 0.4 && p.y > tc.y + tc.ry * 0.3)) {
        if (drips.every(d => Math.hypot(d.x - p.x, d.y - p.y) > 30) && drips.length < 5) {
          const j = drips.length, side = (p.x - tc.x) / tc.rx;
          const dir = [side * 0.35 + (prand(j + 5) - 0.5) * 0.2, 1]; const l = Math.hypot(dir[0], dir[1]);
          drips.push({ x: p.x, y: p.y, k: p.k, dx: dir[0] / l, dy: dir[1] / l, L: 18 + prand(j + 11) * 26 + (p.y > tc.y ? 10 : 0), w: 4.6 + prand(j + 2) * 1.2 });
        }
      }
    });
    sv.plan = { tc, path, vmax, drips };
    return sv.plan;
  }
  function milkCanvas(sv) {
    if (!sv.mc) { sv.mc = document.createElement("canvas"); sv.mc.width = 1; sv.mc.height = 1; }
    return sv.mc;
  }
  function renderMilk(sv, e, cx, cy) {                  // возвращает {c, x, y, w, h} — пиксельный слой сгущёнки
    const P = PX, plan = milkPlan(sv, cx, cy), tc = plan.tc;
    const x0 = Math.floor((tc.x - 150) / P) * P, y0 = Math.floor((tc.y - 110) / P) * P, cols = Math.ceil(300 / P), rows = Math.ceil(260 / P);
    const D = sv.D && sv.D.length === cols * rows ? sv.D : (sv.D = new Float32Array(cols * rows));
    D.fill(1e3);
    const K = 4;                                         // мягкость слияния
    const add = (x, y, r) => {                           // круг радиуса r в мировых координатах
      if (r <= 0.3) return;
      const ci0 = Math.max(0, Math.floor((x - r - K - x0) / P)), ci1 = Math.min(cols - 1, Math.ceil((x + r + K - x0) / P));
      const cj0 = Math.max(0, Math.floor((y - r - K - y0) / P)), cj1 = Math.min(rows - 1, Math.ceil((y + r + K - y0) / P));
      for (let j = cj0; j <= cj1; j++) {
        const py = y0 + (j + 0.5) * P - y;
        for (let i = ci0; i <= ci1; i++) {
          const px = x0 + (i + 0.5) * P - x, d = Math.sqrt(px * px + py * py) - r, o = j * cols + i, a = D[o];
          const h = Math.max(K - Math.abs(a - d), 0) / K; D[o] = Math.min(a, d) - h * h * K * 0.25;
        }
      }
    };
    const pk = clamp((e - POUR.in) / POUR.dur, 0, 1);      // докуда дошла струя
    const tAt = (k) => POUR.in + k * POUR.dur;
    // полоски
    for (const p of plan.path) {
      if (p.k > pk) break;
      const age = e - tAt(p.k), slow = 1 - p.v / plan.vmax;
      const n = 0.5 + 0.5 * Math.sin(p.k * 37 + 1.3) * Math.sin(p.k * 13 + 0.4);   // неровный край
      const rMax = 5.2 + 3.4 * slow * slow + 1.3 * n, rFresh = 3.0;
      const r = rFresh + (rMax - rFresh) * (1 - Math.exp(-age / 700)) + 2.4 * (1 - Math.exp(-age / 2600));   // потом ещё медленно расплывается
      add(p.x, p.y, r);
    }
    // подтёки
    for (const d of plan.drips) {
      const age = e - tAt(d.k) - 280; if (age <= 0) continue;
      const L = d.L * (1 - Math.exp(-age / 900)), n = Math.max(2, Math.ceil(L / 3));
      for (let q = 0; q <= n; q++) { const u = q / n; add(d.x + d.dx * L * u, d.y + d.dy * L * u, d.w * (1.15 - 0.45 * u)); }
      add(d.x + d.dx * L, d.y + d.dy * L, d.w * (0.78 + 0.25 * Math.min(1, L / d.L)));     // капля на конце
    }
    // пиксели
    const c = milkCanvas(sv); if (c.width !== cols || c.height !== rows) { c.width = cols; c.height = rows; sv.img = null; }
    const cg = c.getContext("2d"); const img = sv.img || (sv.img = cg.createImageData(cols, rows)); const px = img.data; px.fill(0);
    const IN = (i, j) => i >= 0 && j >= 0 && i < cols && j < rows && D[j * cols + i] < 0;
    const put = (o, col, a = 255) => { px[o * 4] = col[0]; px[o * 4 + 1] = col[1]; px[o * 4 + 2] = col[2]; px[o * 4 + 3] = a; };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const o = j * cols + i;
      if (!IN(i, j)) { if (IN(i, j - 1) || IN(i - 1, j - 1)) put(o, MILK.shadow, MILK.shadow[3]); continue; }   // тень снизу-справа
      const up = IN(i, j - 1), dn = IN(i, j + 1), lf = IN(i - 1, j), rt = IN(i + 1, j);
      let col = MILK.base;
      if (!dn || !rt) col = MILK.rimDark;                                   // нижний/правый край в тени
      else if (!up || !lf) col = MILK.rim;                                  // верхний/левый край
      else if (!IN(i - 1, j - 1) || (!IN(i - 2, j - 1) && !IN(i - 1, j - 2))) col = MILK.light;
      else if (!IN(i - 2, j - 2) && IN(i + 2, j + 2)) col = MILK.spec;     // глянцевая полоска вдоль верхнего края
      put(o, col);
    }
    cg.putImageData(img, 0, 0);
    return { c, x: x0, y: y0, w: cols * P, h: rows * P };
  }
  function drawPour(g, t, sv, cx, cy) {
    const m = itM.condensed, REST = [1210, 560], appear = clamp((t - sv.t - 600) / 400, 0, 1);
    const e = sv.poured ? t - sv.poured : -1;
    const plan = e >= 0 ? milkPlan(sv, cx, cy) : null, tc = plan ? plan.tc : topCake(cx, cy), total = POUR.in + POUR.dur;   // путь считаем, когда тарелка уже на месте
    // слой сгущёнки (когда всё растеклось — больше не пересчитываем)
    if (e > POUR.in) {
      if (!sv.done || !sv.layer) { sv.layer = renderMilk(sv, e, cx, cy); if (e > total + POUR.settle) sv.done = true; }
      const L = sv.layer; g.save(); g.imageSmoothingEnabled = false; g.drawImage(L.c, L.x, L.y, L.w, L.h); g.restore();
    }
    // блёстки после полива
    if (e > total + 900) {
      const q = (e - total - 900) / 1000;
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + q * 0.6, r = 70 + (i * 37) % 50, tw = 0.5 + 0.5 * Math.sin(t / 160 + i * 1.7);
        g.save(); g.globalAlpha = clamp(1.4 - q * 0.4, 0, 1) * tw; label(g, "✦", tc.x + Math.cos(a) * r, tc.y + Math.sin(a) * r * 0.85, 20, "#fff7d6"); g.restore(); }
    }
    // банка: подлетает к краю тарелки, наклоняется, во время полива слегка следует за струёй, потом возвращается
    const pk = clamp((e - POUR.in) / POUR.dur, 0, 1), [hx, hy] = pourHit(pk, tc);
    const POS = [tc.x + 108 + (hx - tc.x) * 0.45, tc.y - 96 + (hy - tc.y) * 0.4], TILT = -0.7;   // банка ведёт струю за собой
    let x = REST[0], y = REST[1], rot = 0;
    const w = m[2] * 1.1, h = m[3] * 1.1;
    if (e >= 0) {
      if (e < POUR.in) { const q = ease(e / POUR.in); x += (POS[0] - x) * q; y += (POS[1] - y) * q; rot = TILT * ease(clamp(e / POUR.in * 1.4 - 0.4, 0, 1)); }
      else if (e < total + POUR.end) { x = POS[0]; y = POS[1]; rot = TILT + Math.sin(e / 230) * 0.025; }
      else { const q = ease(clamp((e - total - POUR.end) / POUR.out, 0, 1)); x = POS[0] + (REST[0] - POS[0]) * q; y = POS[1] + (REST[1] - POS[1]) * q; rot = TILT * (1 - q); }
    }
    if (e < 0 && appear >= 1 && !window.__cleanShot) {
      const pul = 0.5 + 0.5 * Math.sin(t / 200);
      g.save(); g.globalAlpha = 0.3 + 0.3 * pul; g.fillStyle = "#ffe8a0"; g.beginPath(); g.arc(x, y, 100, 0, 7); g.fill(); g.restore();
      g.save(); g.font = "700 30px Rubik, sans-serif"; g.textAlign = "center"; g.lineWidth = 6; g.strokeStyle = "#3a2416"; g.strokeText("Полить сгущёнкой!", x, y + 120); g.fillStyle = "#fff3c4"; g.fillText("Полить сгущёнкой!", x, y + 120); g.restore();
    }
    g.save(); g.globalAlpha = appear; g.translate(x, y); g.rotate(rot);
    g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(6, h * 0.42, w * 0.42, 14, 0, 0, 7); if (e < 0) g.fill();
    g.drawImage(it, m[0], m[1], m[2], m[3], -w / 2, -h / 2, w, h); g.restore();
    // струйка: пиксельная, от края банки до сырника; в конце истончается и отрывается каплей
    if (e > POUR.in - 80 && e < total + POUR.end) {
      const lx = -w * 0.21, ly = -h * 0.03, cs = Math.cos(rot), sn = Math.sin(rot);   // нижний левый край отверстия (не крышка)
      const lip = [x + lx * cs - ly * sn, y + lx * sn + ly * cs];
      const endT = e - total, thin = endT > 0 ? clamp(1 - endT / 260, 0, 1) : clamp((e - POUR.in + 80) / 160, 0, 1);
      g.save();
      const P = PX, snap = (v) => Math.round(v / P) * P;
      if (thin > 0.05) {
        g.fillStyle = "rgb(" + MILK.base + ")"; g.fillRect(snap(lip[0]) - P * 2, snap(lip[1]) - P, P * 3, P * 2);   // сгущёнка переливается через край
        g.fillStyle = "rgb(" + MILK.spec + ")"; g.fillRect(snap(lip[0]) - P * 2, snap(lip[1]) - P, P, P);
        const steps = Math.ceil(Math.hypot(hx - lip[0], hy - lip[1]) / P) + 1, wv = 1 + Math.round(thin * 1.6);
        for (let q = 0; q <= steps; q++) {
          const u = q / steps, bow = Math.sin(u * Math.PI) * (6 + Math.sin(t / 140) * 1.5);
          const sx = lip[0] + (hx - lip[0]) * u - bow * 0.5, sy = lip[1] + (hy - lip[1]) * u - bow, ww = wv + (u > 0.85 ? 1 : 0);
          g.fillStyle = "rgb(" + MILK.rim + ")"; g.fillRect(snap(sx) - P * ww / 2 + P * 0.5, snap(sy) - P * ww / 2 + P, P * ww, P);
          g.fillStyle = "rgb(" + MILK.base + ")"; g.fillRect(snap(sx) - P * ww / 2, snap(sy) - P * ww / 2, P * ww, P * ww);
          if (ww > 1) { g.fillStyle = "rgb(" + MILK.spec + ")"; g.fillRect(snap(sx) - P * ww / 2, snap(sy) - P * ww / 2, P, P); }
        }
      } else if (endT < POUR.end) {                        // последняя капля
        const q = clamp((endT - 260) / 160, 0, 1), dx = lip[0] + (hx - lip[0]) * q, dy = lip[1] + (hy - lip[1]) * q;
        g.fillStyle = "rgb(" + MILK.base + ")"; g.fillRect(snap(dx) - P, snap(dy) - P, P * 2, P * 2);
        g.fillStyle = "rgb(" + MILK.spec + ")"; g.fillRect(snap(dx) - P, snap(dy) - P, P, P);
      }
      g.restore();
    }
  }
  function drawTop(g, t) {
    g.drawImage(top, 0, 0);
    const sv = st.serve;
    // сковорода (на подаче уезжает)
    let panA = 1, px = PAN.x;
    if (st.stage === 3) { const k = clamp((t - sv.t) / 600, 0, 1); panA = 1 - k; px = PAN.x - ease(k) * 200; }
    if (panA > 0) drawPan(g, t, px, PAN.y, panA);
    // тарелка
    let plx = PLATE.x, ply = PLATE.y, pk = 1;
    if (st.stage === 3) { const k = ease(clamp((t - sv.t - 200) / 700, 0, 1)); plx = PLATE.x + (760 - PLATE.x) * k; ply = PLATE.y + (480 - PLATE.y) * k; pk = 1 + 0.75 * k; }
    drawPlate(g, plx, ply, PLATE.r * pk);
    drawPile(g, plx, ply, st.stage === 3 ? NEED : st.done - st.cakes.filter(c => c.out && c.out.kind === "plate").length, pk);
    for (const c of st.cakes) drawCake(g, c, t);
    if (st.stage === 3) drawPour(g, t, sv, plx, ply);
    drawCatTop(g, t);
    // штамп
    if (st.stamp) {
      const k = clamp((t - st.stamp) / 180, 0, 1), s = 2.2 - 1.2 * ease(k);
      g.save(); g.globalAlpha = 0.92 * k; g.translate(800, 770); g.rotate(-0.1); g.scale(s, s);
      g.lineWidth = 7; g.strokeStyle = "#c8352b"; rr(g, -330, -54, 660, 108, 16); g.stroke();
      g.lineWidth = 2; rr(g, -318, -42, 636, 84, 10); g.stroke();
      g.font = "900 48px Rubik, sans-serif"; g.textAlign = "center"; g.fillStyle = "#c8352b"; g.fillText("ОДОБРЕНО МАРСЕЛЕМ!", 0, 17); g.restore();
    }
    // лопатка вместо курсора
    if (st.stage === 2 && mouse.in) {
      const m = fdM.spatula, fl = st.flick ? clamp((t - st.flick) / 220, 0, 1) : 1, rot = 0.35 - Math.sin(Math.PI * fl) * 0.55;
      g.save(); g.translate(mouse.x, mouse.y); g.rotate(rot); const k = 0.85;
      g.drawImage(fd, m[0], m[1], m[2], m[3], -100 * k, -52 * k, m[2] * k, m[3] * k); g.restore();
    }
  }
  function draw(g, t) {
    if (!st) return;
    if (st.view === "front") drawFront(g, t); else drawTop(g, t);
    if (st.fade) { const k = (t - st.fade.t) / 900, a = k < 0.5 ? k * 2 : 2 - k * 2; g.fillStyle = `rgba(13,16,32,${clamp(a, 0, 1)})`; g.fillRect(0, 0, W, H); }
  }

  // ---------- игра для DayShell ----------
  const game = {
    mount(sh) {
      S = sh;
      const pos = (e) => { const r = S.cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
      S.cv.addEventListener("pointerdown", (e) => { const [x, y] = pos(e); mouse.x = x; mouse.y = y; click(x, y); });
      S.cv.addEventListener("pointermove", (e) => { const [x, y] = pos(e); mouse.x = x; mouse.y = y; mouse.in = true; });
      S.cv.addEventListener("pointerleave", () => { mouse.in = false; });
      S.cv.style.cursor = "pointer";
    },
    async load() {
      if (it) return;
      const ld = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      let bgImg;
      [it, itM, fd, fdM, bgImg, catTop] = await Promise.all([
        ld("assets/game28_items.webp"), fetch("assets/game28_items.json").then(r => r.json()),
        ld("assets/game28_food.webp"), fetch("assets/game28_food.json").then(r => r.json()),
        ld("assets/game28_bg.webp"), ld("assets/game28_cat.webp")]);
      panImg = null;                                   // сковорода рисуется кодом
      kitchen = bgImg; top = paintTop();
    },
    newGame() {
      const s = retryStage; retryStage = null;
      st = { cat: { mode: "sit", at: now(), until: now() + 3000 }, items: [], slots: [], notes: [], cakes: [], done: 0, burnt: 0, fade: null, stamp: 0 };
      S.cv.style.cursor = "pointer";
      if (s === 2) stage2(); else stage0();
    },
    step, draw,
    catHit(x, y) {
      if (!st || st.fade) return false;
      if (st.view === "top") return Math.abs(x - CAT_TOP.x) < 55 * CAT_TOP.s && y > CAT_TOP.y - 163 * CAT_TOP.s && y < CAT_TOP.y;
      return Math.abs(x - CAT.x) < 88 && y > CAT.y - 190 && y < CAT.y + 4;
    },
    catPet(on) { if (!st) return; const c = st.cat; c.mode = on ? "love" : "sit"; c.at = now(); c.until = on ? Infinity : now() + 2500; },
    catPoke() { if (!st) return; const c = st.cat; c.mode = "happy"; c.at = now(); c.until = now() + 1300; },
    head() {
      if (!st) return null;
      if (st.view === "top") return { x: CAT_TOP.x + 10, y: CAT_TOP.y - 167 * CAT_TOP.s };
      return { x: CAT.x + 30, y: CAT.y - 200 * CAT.s - 4 };
    },
    stop() { st = null; retryStage = null; },
  };

  const shell = DayShell({
    d: 28, W, H, music: "g28", title: "Рецепт под секретом: Сырники", hints: ["day28.hint1", "day28.hint"],
    rules: { goal: "Рецепт сырников перепутался. Готовим по шагам, а в конце будет сгущёнка.", how: ["Собери на столе нужные продукты, лишнего не бери", "Разложи шаги рецепта по порядку", "Жарь: нажимай на сырник, когда кольцо станет зелёным"] },
  }, game);
  window.Game28 = { open: (o) => shell.open(o), _st: () => st, _click: click, PAN, SLOTS, slotXY, _stage: (n) => [stage0, stage1, stage2, stage3][n](), _art: () => ({ drawPlate, drawPile, it, itM }) };
})();
