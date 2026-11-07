// Финал 31 декабря — «Последний секрет Виски». Приключение прямо в комнате: Виски сама ходит к ёлке, компьютеру и стеллажу,
// Марсель кликает подсвеченные места. 1) под ёлкой записка с лапкой; 2) в компьютере папка «Для Марселя»: расставить картинки по дням,
// откроется порядок символов; 3) на стеллаже найти три символа; 4) шкатулка под ёлкой: выставить код → загадка про последний подарок.
(function () {
  "use strict";
  const W = 1913, H = 822, FLOOR = 772;
  const SYMS = ["star", "heart", "paw", "snow", "fish", "ball"], CODE = ["star", "heart", "paw"];
  const CH = ["tree", "pc", "shelf", "box"];
  const POINT = { start: 700, tree: 1100, pc: 1450, shelf: 870, box: 1100 }, FACE = { tree: 1, pc: 1, shelf: -1, box: 1 };
  const HOT = { tree: [1175, 245, 195, 425], pc: [1350, 370, 375, 135], shelf: [385, 60, 425, 590], box: [1150, 585, 240, 120] };
  const ARRIVE = { tree: "day31.tree", pc: "day31.computer", shelf: "day31.stitch", box: "day31.box" };
  // крупные планы (в координатах холста комнаты)
  const FT = { x: 290, y: 36, w: 1333, h: 750 };                         // ёлка: фон из игры 25 (1672×941)
  const FP = { x: 356, y: 40, w: 1200, h: 740 };                         // монитор
  const SH = { sx: 370, sy: 40, k: 1.2 }, FS = { x: 680, y: 45, w: 552, h: 732 }; // стеллаж: кусок комнаты ×1.2
  const FB = { x: 306, y: 36, w: 1300, h: 750 };
  let fbBg = null;                                                         // размытый фон шкатулки (считается один раз)                         // шкатулка
  const HIDE = [{ k: "star", rx: 447, ry: 262, s: 22 }, { k: "heart", rx: 688, ry: 170, s: 20 }, { k: "paw", rx: 497, ry: 150, s: 0 }]; // лапка — это светильник с лапкой
  const TRAY = ["paw", "star", "heart"];
  const NOTE1 = "Я спрятала шкатулку под ёлкой. Код из трёх символов.\n\nВ каком порядке их ставить, знает твой компьютер. А сами символы спрятаны на полке у Стича.";
  const TXT = "Шпаргалка. Порядок символов:\n1. То, что горит на макушке ёлки.\n2. То, что я к тебе чувствую. Иногда.\n3. Моя подпись.";
  let S, img = {}, meta = {}, st = null;
  const now = () => performance.now(), rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (k) => k * k * (3 - 2 * k);
  const inR = (x, y, r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
  const esc = (s) => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const paras = (t) => t.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const day = () => { const p = window.VISKI.getP(); return (p.days[31] = p.days[31] || {}); };
  const saveCh = (ch) => { day().ch = ch; window.VISKI.save(); };

  // ---------- рисование мелочей ----------
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function sym(g, k, x, y, s, fill) {                    // символы замка: звезда, сердце, лапка, снежинка, рыбка, клубок
    g.save(); g.translate(x, y); g.lineJoin = "round"; g.lineCap = "round";
    g.fillStyle = fill; g.strokeStyle = "#3a2416"; g.lineWidth = Math.max(2, s * 0.09);
    const r = s / 2;
    if (k === "star") { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); g.stroke(); }
    else if (k === "heart") { g.beginPath(); g.moveTo(0, r * 0.85); g.bezierCurveTo(-r * 1.25, -r * 0.05, -r * 0.7, -r * 1.05, 0, -r * 0.4); g.bezierCurveTo(r * 0.7, -r * 1.05, r * 1.25, -r * 0.05, 0, r * 0.85); g.closePath(); g.fill(); g.stroke(); }
    else if (k === "paw") { g.beginPath(); g.ellipse(0, r * 0.32, r * 0.5, r * 0.42, 0, 0, 7); g.fill(); g.stroke(); [[-r * 0.62, -r * 0.2], [-r * 0.22, -r * 0.62], [r * 0.22, -r * 0.62], [r * 0.62, -r * 0.2]].forEach(([a, b]) => { g.beginPath(); g.ellipse(a, b, r * 0.2, r * 0.26, 0, 0, 7); g.fill(); g.stroke(); }); }
    else if (k === "snow") { g.strokeStyle = fill; g.lineWidth = Math.max(3, s * 0.11); for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, -r); g.lineTo(0, r); g.moveTo(-r * 0.3, -r * 0.7); g.lineTo(0, -r * 0.45); g.lineTo(r * 0.3, -r * 0.7); g.moveTo(-r * 0.3, r * 0.7); g.lineTo(0, r * 0.45); g.lineTo(r * 0.3, r * 0.7); g.stroke(); g.restore(); } }
    else if (k === "fish") { g.beginPath(); g.ellipse(-r * 0.12, 0, r * 0.62, r * 0.38, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(r * 0.45, 0); g.lineTo(r * 0.95, -r * 0.42); g.lineTo(r * 0.95, r * 0.42); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#3a2416"; g.beginPath(); g.arc(-r * 0.45, -r * 0.08, r * 0.07, 0, 7); g.fill(); }
    else if (k === "ball") { g.beginPath(); g.arc(0, 0, r * 0.78, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(-r * 0.9, 0, r * 0.9, -0.7, 0.7); g.stroke(); g.beginPath(); g.arc(r * 0.9, 0, r * 0.9, Math.PI - 0.7, Math.PI + 0.7); g.stroke(); }
    g.restore();
  }
  function frame(g, f) {                                // затемнение комнаты и деревянная рамка крупного плана
    g.fillStyle = "rgba(10,8,22,.62)"; g.fillRect(0, 0, W, H);
    g.save(); g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 30; rr(g, f.x - 10, f.y - 10, f.w + 20, f.h + 20, 18); g.fillStyle = "#6b4628"; g.fill(); g.restore();
    rr(g, f.x - 10, f.y - 10, f.w + 20, f.h + 20, 18); g.strokeStyle = "#3a2416"; g.lineWidth = 4; g.stroke();
  }
  function closeBtn(f) { return [f.x + f.w - 28, f.y + 28]; }
  function drawClose(g, f) {
    const [x, y] = closeBtn(f);
    g.beginPath(); g.arc(x, y, 22, 0, 7); g.fillStyle = "#f5e7c8"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#3a2416"; g.stroke();
    g.fillStyle = "#3a2416"; g.font = "700 26px Rubik, sans-serif"; g.textAlign = "center"; g.fillText("×", x, y + 9);
  }
  function text(g, t, x, y, size, col, align = "center", weight = 700, font = "Rubik") {
    g.font = `${weight} ${size}px ${font}, sans-serif`; g.textAlign = align; g.fillStyle = col; g.fillText(t, x, y);
  }
  function button(g, r, label, hot) {
    rr(g, r[0], r[1], r[2], r[3], 10); g.fillStyle = hot ? "#ffd98a" : "#ffcf7a"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#3a2416"; g.stroke();
    text(g, label, r[0] + r[2] / 2, r[1] + r[3] / 2 + 7, 20, "#3a2416");
  }

  // ---------- Виски в комнате ----------
  function walkTo(target) {
    const c = st.cat; c.target = target; c.tx = POINT[target]; c.mode = "walk"; c.at = now(); st.arrived = false;
  }
  function catFrame(t) {
    const c = st.cat, A = window.VISKI.A, el = Math.max(0, (t - c.at) / 1000);
    if (c.mode === "walk") return A.walk[Math.floor(el * 11) % A.walk.length];
    if (c.mode === "love") return A.love[0];
    if (c.mode === "happy") return A.happy[0];
    if (c.mode === "lookup") return A.lookup[0];
    return A.sit[Math.floor(el * 2.5) % A.sit.length];
  }
  function drawCat(g, t) {
    const c = st.cat, f = catFrame(t), br = c.mode === "walk" ? 1 : 1 + 0.012 * Math.sin(t / 1000 * Math.PI);
    g.fillStyle = "rgba(20,10,5,.3)"; g.beginPath(); g.ellipse(c.x, FLOOR - 2, f.w * 0.36, 9, 0, 0, 7); g.fill();
    g.save(); g.translate(c.x, FLOOR); g.scale(c.face, br); g.drawImage(window.VISKI.atlas, f.x, f.y, f.w, f.h, -f.ax, -f.ay, f.w, f.h); g.restore();
  }

  // ---------- главы ----------
  function openView(v) {
    st.fade = { t: now(), mid: () => { st.view = v; if (v === "tree" && !st.tree) setupTree(); if (v === "pc" && !st.pc) st.pc = { open: false, placed: [], tiles: shuffle([25, 26, 27, 28]), shake: {} }; } };
    SFX.whoosh();
  }
  function closeView(next) {
    st.fade = { t: now(), mid: () => { st.view = "room"; if (next) next(); } };
  }
  function chapterDone(ch) {
    st.ch = ch + 1; saveCh(st.ch);
    closeView(() => { if (st.ch < CH.length) setTimeout(() => st && walkTo(CH[st.ch]), 500); });
  }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // 1) ёлка: три подарка, в одном записка
  function setupTree() {
    const types = shuffle(["kraft", "polka", "purple"]), noteAt = Math.floor(Math.random() * 3);
    const xs = [FT.x + 560 * 0.797, FT.x + 815 * 0.797, FT.x + 1070 * 0.797];
    st.tree = { boxes: types.map((ty, i) => { const m = meta.g30[ty], k = ty === "purple" ? 0.48 : ty === "kraft" ? 0.52 : 0.6; return { ty, x: xs[i], y: FT.y + 885 * 0.797, w: m.w * k, h: m.h * k, note: i === noteAt, state: "closed", t: 0 }; }) };
  }
  function showNote(text, btn, onClose) {
    const torn = () => { const p = []; for (let x = 0; x <= 100; x += 3.5) p.push(`${Math.min(100, x).toFixed(1)}% ${(2 + Math.random() * 9).toFixed(1)}px`); return `polygon(${p.join(", ")}, 100% 100%, 0% 100%)`; };
    const b = S.showPanel(`<div class="wn"><div class="wpage" style="clip-path:${torn()}"><div class="wtxt">${paras(text)}</div>
      <div class="wsign">Виски<span class="wpaw"><i></i><i></i><i></i><i></i></span></div></div></div><button class="btn main">${btn}</button>`);
    b.classList.add("lbox"); SFX.paper();
    b.querySelector(".btn").onclick = () => { S.hidePanel(); if (onClose) onClose(); };
  }
  function showTxt(onClose) { showNote(TXT, onClose ? "Понятно ▸" : "Закрыть", onClose); }   // «Шпаргалка Виски» — её записка от руки
  function clickTree(x, y) {
    for (const b of st.tree.boxes) {
      if (b.state !== "closed") continue;
      if (x > b.x - b.w / 2 - 10 && x < b.x + b.w / 2 + 10 && y > b.y - b.h - 10 && y < b.y + 6) {
        b.state = "shake"; b.t = now(); SFX.thud();
        const my = st;
        setTimeout(() => {
          if (st !== my) return; b.state = "open"; b.t = now(); SFX.pop();
          if (b.note) { SFX.jingle(); setTimeout(() => { if (st !== my) return; S.say("day31.note", 2400); showNote(NOTE1, "Понятно ▸", () => { st.have.note = true; chapterDone(0); }); }, 900); }
          else S.say("day31.empty", 2200);
        }, 420);
        return;
      }
    }
  }
  // 2) компьютер: папка «Для Марселя»
  const TILE = { 25: ["g25", "orn2"], 26: ["g26", "bowlFull"], 27: ["g27", "yarn"], 28: ["g28", "gold"] };
  const SCR = { x: FP.x + 34, y: FP.y + 34, w: FP.w - 68, h: FP.h - 120 };
  const WIN = { x: SCR.x + 180, y: SCR.y + 70, w: SCR.w - 360, h: SCR.h - 130 };
  const ICONS = { folder: [SCR.x + 60, SCR.y + 50], search: [SCR.x + 60, SCR.y + 200], trash: [SCR.x + 60, SCR.y + 350] };
  function slotRect(i) { const sw = 150, gap = 26, x0 = WIN.x + (WIN.w - (4 * sw + 3 * gap)) / 2; return [x0 + i * (sw + gap), WIN.y + 110, sw, 150]; }
  function tileRect(i) { const sw = 130, gap = 34, x0 = WIN.x + (WIN.w - (4 * sw + 3 * gap)) / 2; return [x0 + i * (sw + gap), WIN.y + 320, sw, 130]; }
  function drawSprite(g, key, cx, cy, box) {
    const src = { g25: [img.g25, meta.g25], g26: [img.g26, meta.g26], g27: [img.g27, meta.g27], g28: [img.g28, meta.g28] }[key[0]];
    let m = src[1][key[1]]; if (!Array.isArray(m)) m = [m.x, m.y, m.w, m.h];
    const k = Math.min(box / m[2], box / m[3]); g.drawImage(src[0], m[0], m[1], m[2], m[3], cx - m[2] * k / 2, cy - m[3] * k / 2, m[2] * k, m[3] * k);
  }
  function clickPc(x, y) {
    const pc = st.pc;
    if (!pc.open) {
      const hit = (p) => Math.abs(x - (p[0] + 45)) < 60 && y > p[1] - 10 && y < p[1] + 120;
      if (hit(ICONS.folder)) { pc.open = true; pc.openT = now(); SFX.click(); return; }
      if (hit(ICONS.search)) { SFX.deny(); S.say("day31.search", 2600); return; }
      if (hit(ICONS.trash)) { SFX.click(); S.say("day31.trash", 2400); return; }
      return;
    }
    if (pc.done) return;
    const order = [25, 26, 27, 28];
    pc.tiles.forEach((dd, i) => {
      if (pc.placed.includes(dd) || !inR(x, y, tileRect(i))) return;
      if (dd === order[pc.placed.length]) {
        pc.placed.push(dd); SFX.click();
        if (pc.placed.length === 4) {
          pc.done = true; SFX.ding(); const my = st;
          setTimeout(() => { if (st !== my) return; S.say("day31.pcDone", 2400); showTxt(() => { st.have.txt = true; chapterDone(1); }); }, 900);
        }
      } else { pc.shake[dd] = now(); SFX.deny(); if (now() - (pc.lastWrong || 0) > 2500) { pc.lastWrong = now(); S.say("day31.pcWrong", 2200); } }
    });
  }
  // 3) стеллаж: три символа
  const V3 = (rx, ry) => [FS.x + (rx - SH.sx) * SH.k, FS.y + (ry - SH.sy) * SH.k];
  function clickShelf(x, y) {
    const sh = st.shelf;
    for (const h of HIDE) {
      if (sh.found[h.k]) continue;
      const [vx, vy] = V3(h.rx, h.ry);
      if (Math.hypot(x - vx, y - vy) < (h.s ? 34 : 44)) {
        sh.found[h.k] = now(); SFX.jingle();
        const n = Object.keys(sh.found).length;
        if (n < 3) S.say("day31.found1", 1800);
        else { const my = st; setTimeout(() => { if (st !== my) return; S.say("day31.three", 2600); }, 700); setTimeout(() => { if (st === my) chapterDone(2); }, 2600); }
        return;
      }
    }
    const [sx1, sy1] = V3(462, 52), [sx2, sy2] = V3(578, 142);
    if (x > sx1 && x < sx2 && y > sy1 && y < sy2 && now() - (sh.lastStitch || 0) > 3000) { sh.lastStitch = now(); S.say("day31.stitch", 2600); }
  }
  // 4) шкатулка
  const BOX = { cx: FB.x + FB.w / 2, by: FB.y + 470, k: 1.0, byO: FB.y + 650, kO: 0.86 };   // закрытая (с колёсиками) и открытая (ниже и мельче, чтобы влезла крышка)
  function noteXY() { const m = meta.g31.boxOpen, w = m.w * BOX.kO, h = m.h * BOX.kO; return [BOX.cx - w / 2 + 232 * BOX.kO, BOX.byO - h + 372 * BOX.kO]; }
  function dialRect(i) { return [BOX.cx - 210 + i * 150 - 55, FB.y + 530, 110, 150]; }
  const CLUE = { note: [FB.x + 40, FB.y + 90, 200, 70], txt: [FB.x + 40, FB.y + 180, 200, 70] };
  function clickBox(x, y) {
    const b = st.box;
    if (b.opened) {
      const [nx, ny] = noteXY();
      if (Math.hypot(x - nx, y - ny) < 130 && !b.done) { b.done = true; SFX.paper(); setTimeout(() => { if (!st) return; st.view = "room"; S.win(); }, 300); }
      return;
    }
    if (inR(x, y, CLUE.note)) { showNote(NOTE1, "Закрыть"); return; }
    if (inR(x, y, CLUE.txt)) { showTxt(); return; }
    for (let i = 0; i < 3; i++) {
      const r = dialRect(i);
      if (!inR(x, y, r)) continue;
      const up = y < r[1] + r[3] / 2;
      b.dial[i] = (b.dial[i] + (up ? 1 : SYMS.length - 1)) % SYMS.length; b.turn[i] = now(); SFX.click();
      if (b.dial.every((v, j) => SYMS[v] === CODE[j])) {
        b.opened = now(); SFX.unlock(); setTimeout(() => SFX.creak(), 250); setTimeout(() => SFX.fanfare(), 700);
        setTimeout(() => st && S.say("day31.boxOpen", 2600), 900);
      } else {
        const set = b.dial.map(v => SYMS[v]);
        if (CODE.every(k => set.includes(k))) {            // символы верные, порядок нет: шкатулка щёлкает и не открывается
          b.wrongAt = now(); b.hintTxt = now(); SFX.deny(); setTimeout(() => SFX.thud(), 90);
          S.say("day31.order", 3200);
        }
      }
      return;
    }
  }

  // ---------- шаг ----------
  function step(dt, t) {
    if (!st) return;
    if (st.fade && !st.fade.done && t - st.fade.t > 260) { st.fade.done = true; st.fade.mid(); }
    if (st.fade && t - st.fade.t > 560) st.fade = null;
    const c = st.cat;
    if (c.mode === "walk") {
      const d = c.tx - c.x; c.face = Math.sign(d) || c.face;
      if (Math.abs(d) < 4) {
        c.x = c.tx; c.mode = "sit"; c.at = t; c.face = FACE[c.target] || c.face; st.arrived = true; st.hotT = t;
        if (!st.said[c.target]) { st.said[c.target] = true; S.say(ARRIVE[c.target], 3200); }
      } else c.x += Math.sign(d) * Math.min(Math.abs(d), 230 * dt);
    } else if ((c.mode === "happy") && t > c.until) { c.mode = "sit"; c.at = t; }
    if (st.view === "room" && st.arrived && st.ch < CH.length && t - st.hotT > 16000 && t - st.lastNudge > 16000) { st.lastNudge = t; S.say("day31.nudge", 2200); }
    if (st.ny) stepNY(dt, t);
  }

  // ---------- рисование ----------
  function drawRoom(g, t) {
    g.drawImage(img.room, 0, 0, W, H);
    if (st.view === "room" && st.arrived && st.ch < CH.length && !st.ny) {          // подсветка того, что показывает Виски
      const r = HOT[CH[st.ch]], p = 0.5 + 0.5 * Math.sin(t / 260);
      g.save(); g.strokeStyle = `rgba(255,214,110,${0.45 + 0.45 * p})`; g.lineWidth = 4; g.setLineDash([14, 10]); g.lineDashOffset = -t / 40;
      rr(g, r[0], r[1], r[2], r[3], 18); g.stroke(); g.restore();
      for (let i = 0; i < 3; i++) { const a = t / 700 + i * 2.1; text(g, "✦", r[0] + r[2] / 2 + Math.cos(a) * r[2] * 0.42, r[1] + r[3] / 2 + Math.sin(a) * r[3] * 0.42, 22, `rgba(255,236,170,${0.5 + 0.5 * Math.sin(t / 200 + i)})`); }
    }
    drawCat(g, t);
  }
  function drawTree(g, t) {
    frame(g, FT); g.drawImage(img.g25bg, FT.x, FT.y, FT.w, FT.h);
    for (const b of st.tree.boxes) {
      const m = meta.g30[b.ty]; let x = b.x, lift = 0, a = 1;
      if (b.state === "shake") x += Math.sin((t - b.t) / 25) * 6;
      if (b.state === "open") { const k = clamp((t - b.t) / 400, 0, 1); lift = ease(k) * 60; a = 1 - 0.6 * k; }
      g.fillStyle = "rgba(20,10,5,.35)"; g.beginPath(); g.ellipse(b.x, b.y - 2, b.w * 0.5, 9, 0, 0, 7); g.fill();
      if (b.state === "open" && b.note) {                                   // из коробки выглядывает записка с лапкой
        const k = clamp((t - b.t) / 500, 0, 1), ny = b.y - 30 - ease(k) * 70;
        g.save(); g.translate(b.x, ny); g.rotate(-0.12); rr(g, -46, -32, 92, 64, 4); g.fillStyle = "#fdf8ea"; g.fill(); g.lineWidth = 2; g.strokeStyle = "#b8a585"; g.stroke();
        sym(g, "paw", 0, 2, 34, "#a0402a"); g.restore();
      }
      g.save(); g.globalAlpha = a; g.drawImage(img.g30, m.x, m.y, m.w, m.h, x - b.w / 2, b.y - b.h - lift, b.w, b.h); g.restore();
    }
    text(g, "Загляни в подарки под ёлкой", FT.x + FT.w / 2, FT.y + FT.h - 18, 24, "#fff3dc");
    drawClose(g, FT);
  }
  function drawPc(g, t) {
    frame(g, FP);
    rr(g, FP.x, FP.y, FP.w, FP.h, 14); g.fillStyle = "#111117"; g.fill();
    // обои: ночь, звёзды, горы (как на его мониторах)
    g.save(); rr(g, SCR.x, SCR.y, SCR.w, SCR.h, 6); g.clip();
    const sky = g.createLinearGradient(0, SCR.y, 0, SCR.y + SCR.h); sky.addColorStop(0, "#0b1430"); sky.addColorStop(1, "#24407a"); g.fillStyle = sky; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    for (let i = 0; i < 70; i++) { const sx = SCR.x + (i * 197) % SCR.w, sy = SCR.y + (i * 89) % (SCR.h * 0.55); g.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * ((i * 37) % 10) / 10})`; g.fillRect(sx, sy, 3, 3); }
    g.fillStyle = "#1b2a52"; g.beginPath(); g.moveTo(SCR.x, SCR.y + SCR.h); [[0.1, 0.62], [0.28, 0.42], [0.45, 0.6], [0.62, 0.35], [0.8, 0.58], [1, 0.48]].forEach(([a, b]) => g.lineTo(SCR.x + SCR.w * a, SCR.y + SCR.h * b)); g.lineTo(SCR.x + SCR.w, SCR.y + SCR.h); g.fill();
    g.fillStyle = "#e8f0ff"; g.beginPath(); g.moveTo(SCR.x + SCR.w * 0.55, SCR.y + SCR.h * 0.43); g.lineTo(SCR.x + SCR.w * 0.62, SCR.y + SCR.h * 0.35); g.lineTo(SCR.x + SCR.w * 0.69, SCR.y + SCR.h * 0.43); g.fill();
    // значки рабочего стола
    const icon = (p, label, kind) => {
      const [x, y] = p;
      if (kind === "folder") { g.fillStyle = "#f2c14e"; rr(g, x, y + 14, 90, 66, 6); g.fill(); g.fillStyle = "#e0a92e"; rr(g, x, y + 4, 40, 18, 4); g.fill(); g.fillStyle = "#ffd76a"; rr(g, x, y + 24, 90, 56, 6); g.fill(); }
      else if (kind === "search") { g.fillStyle = "#fffaf0"; rr(g, x + 14, y, 62, 80, 4); g.fill(); g.fillStyle = "#9aa"; for (let i = 0; i < 5; i++) g.fillRect(x + 22, y + 14 + i * 12, 46, 4); sym(g, "paw", x + 62, y + 66, 26, "#c04040"); }
      else { g.fillStyle = "#cfd6e4"; rr(g, x + 18, y + 14, 54, 66, 6); g.fill(); g.fillStyle = "#aab3c4"; g.fillRect(x + 12, y + 6, 66, 10); }
      g.save(); g.font = "600 17px Rubik, sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "rgba(0,0,0,.7)"; label.split("\n").forEach((l, i) => { g.strokeText(l, x + 45, y + 104 + i * 20); g.fillStyle = "#fff"; g.fillText(l, x + 45, y + 104 + i * 20); }); g.restore();
    };
    icon(ICONS.folder, "Для Марселя", "folder"); icon(ICONS.search, "Поисковые\nзапросы Виски", "search"); icon(ICONS.trash, "Корзина", "trash");
    const pc = st.pc;
    if (pc.open) {
      const k = clamp((t - pc.openT) / 220, 0, 1);
      g.save(); g.globalAlpha = k; g.translate(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2); g.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); g.translate(-(WIN.x + WIN.w / 2), -(WIN.y + WIN.h / 2));
      rr(g, WIN.x, WIN.y, WIN.w, WIN.h, 10); g.fillStyle = "#f4f1ea"; g.fill(); g.lineWidth = 2; g.strokeStyle = "#555"; g.stroke();
      g.fillStyle = "#2f3a55"; rr(g, WIN.x, WIN.y, WIN.w, 44, 10); g.fill(); g.fillRect(WIN.x, WIN.y + 30, WIN.w, 14);
      text(g, "Для Марселя", WIN.x + 18, WIN.y + 30, 19, "#fff", "left", 600);
      text(g, "Расставь картинки по дням, когда ты их видел", WIN.x + WIN.w / 2, WIN.y + 86, 21, "#2b1d14", "center", 600);
      [25, 26, 27, 28].forEach((dd, i) => {
        const r = slotRect(i); rr(g, r[0], r[1], r[2], r[3], 10);
        g.setLineDash(pc.placed[i] ? [] : [8, 6]); g.strokeStyle = pc.placed[i] ? "#6aa84f" : "#9b8f78"; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
        text(g, `${dd} декабря`, r[0] + r[2] / 2, r[1] + r[3] + 28, 18, "#5a4a3a", "center", 600);
        if (pc.placed[i]) drawSprite(g, TILE[pc.placed[i]], r[0] + r[2] / 2, r[1] + r[3] / 2, 112);
      });
      pc.tiles.forEach((dd, i) => {
        if (pc.placed.includes(dd)) return;
        const r = tileRect(i); let x = r[0]; const sk = pc.shake[dd] && t - pc.shake[dd] < 400; if (sk) x += Math.sin((t - pc.shake[dd]) / 25) * 7;
        rr(g, x, r[1], r[2], r[3], 10); g.fillStyle = "#fffaf0"; g.fill(); g.lineWidth = 3; g.strokeStyle = sk ? "#e8463a" : "#c9a46a"; g.stroke();
        drawSprite(g, TILE[dd], x + r[2] / 2, r[1] + r[3] / 2, 100);
      });
      g.restore();
    }
    g.restore();
    g.fillStyle = "#222230"; rr(g, FP.x + FP.w / 2 - 70, FP.y + FP.h - 70, 140, 30, 6); g.fill();
    drawClose(g, FP);
  }
  function drawShelf(g, t) {
    frame(g, FS);
    g.drawImage(img.room, SH.sx, SH.sy, FS.w / SH.k, FS.h / SH.k, FS.x, FS.y, FS.w, FS.h);
    const sh = st.shelf;
    for (const h of HIDE) {
      const [x, y] = V3(h.rx, h.ry), got = sh.found[h.k];
      if (got) { const k = clamp((t - got) / 600, 0, 1); g.save(); g.globalAlpha = 1 - k; sym(g, h.k, x, y - k * 40, (h.s || 30) * SH.k * (1 + k), "#ffd25e"); g.restore(); continue; }
      if (h.s) { g.save(); g.globalAlpha = 0.85; sym(g, h.k, x, y, h.s * SH.k, "#e9c45a"); g.restore(); }
      const tw = (t / 1000 + HIDE.indexOf(h) * 1.3) % 3.4;                 // редкий блик, чтобы было за что зацепиться глазу
      if (tw < 0.5) { g.save(); g.globalAlpha = Math.sin(tw / 0.5 * Math.PI) * 0.9; text(g, "✦", x + 14, y - 14, 26, "#fff7d0"); g.restore(); }
    }
    // найденные символы (в перемешанном порядке, чтобы не подсказывать код)
    const n = 3; for (let i = 0; i < n; i++) {
      const x = FS.x + FS.w / 2 + (i - 1) * 76, y = FS.y + FS.h - 46, k = TRAY[i];
      g.beginPath(); g.arc(x, y, 30, 0, 7); g.fillStyle = "rgba(20,12,24,.75)"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#e9c45a"; g.stroke();
      if (sh.found[k]) sym(g, k, x, y, 36, "#ffd25e"); else text(g, "?", x, y + 9, 26, "#e9c45a");
    }
    drawClose(g, FS);
  }
  function drawBox(g, t) {
    frame(g, FB);
    if (!fbBg) fbBg = window.softCanvas(FB.w, FB.h, (x) => x.drawImage(img.g25bg, -20, -20, FB.w + 40, FB.h * 1.06 + 40), { blur: 4, bright: 0.55 });
    g.save(); rr(g, FB.x, FB.y, FB.w, FB.h, 8); g.clip(); g.drawImage(fbBg, FB.x, FB.y); g.restore();
    const b = st.box, mC = meta.g31.boxClosed, mO = meta.g31.boxOpen;
    const op = b.opened ? clamp((t - b.opened) / 450, 0, 1) : 0;
    const e = ease(op), K = BOX.k + (BOX.kO - BOX.k) * e, BY = BOX.by + (BOX.byO - BOX.by) * e;
    const shk = b.wrongAt && t - b.wrongAt < 450 ? Math.sin((t - b.wrongAt) / 22) * 8 * (1 - (t - b.wrongAt) / 450) : 0;
    const drawB = (m, alpha, winY) => {
      const w = m.w * K, h = m.h * K, x = BOX.cx - w / 2 + shk, y = BY - h;
      g.save(); g.globalAlpha = alpha; g.drawImage(img.g31, m.x, m.y, m.w, m.h, x, y, w, h);
      [174, 229, 284].forEach((wx, i) => sym(g, SYMS[b.dial[i]], x + (wx + (m === mO ? 4 : 0)) * K, y + winY * K, 24 * K / BOX.k, "#3a2416"));
      g.restore();
    };
    g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(BOX.cx, BY + 4, 250 * K, 20, 0, 0, 7); g.fill();
    if (op < 1) drawB(mC, 1 - op, 297);
    if (op > 0) {
      drawB(mO, op, 520);
      if (!b.done) { const p = 0.5 + 0.5 * Math.sin(t / 220), [nx, ny] = noteXY(); g.save(); g.globalAlpha = op * (0.25 + 0.35 * p); g.fillStyle = "#fff2b0"; g.beginPath(); g.ellipse(nx, ny, 130, 60, 0, 0, 7); g.fill(); g.restore();
        if (op >= 1) { g.save(); g.lineWidth = 6; g.strokeStyle = "#3a2416"; g.font = "700 26px Rubik, sans-serif"; g.textAlign = "center"; g.strokeText("Нажми на записку", BOX.cx, FB.y + FB.h - 30); g.fillStyle = "#fff3c4"; g.fillText("Нажми на записку", BOX.cx, FB.y + FB.h - 30); g.restore(); } }
    }
    if (op < 1) {
      g.save(); g.globalAlpha = 1 - op;
      for (let i = 0; i < 3; i++) {                                    // колёсики замка
        const r = dialRect(i), turn = b.turn[i] ? clamp((t - b.turn[i]) / 160, 0, 1) : 1;
        rr(g, r[0], r[1], r[2], r[3], 14); g.fillStyle = "#2a1a10"; g.fill(); g.lineWidth = 4; g.strokeStyle = "#e9c45a"; g.stroke();
        text(g, "▲", r[0] + r[2] / 2, r[1] + 30, 22, "#e9c45a"); text(g, "▼", r[0] + r[2] / 2, r[1] + r[3] - 12, 22, "#e9c45a");
        g.save(); g.globalAlpha = turn; sym(g, SYMS[b.dial[i]], r[0] + r[2] / 2, r[1] + r[3] / 2, 54, "#fff3dc"); g.restore();
      }
      // подсказки, которые уже есть
      const chip = (r, label, on) => { rr(g, r[0], r[1], r[2], r[3], 12); g.fillStyle = on ? "rgba(255,246,227,.95)" : "rgba(255,246,227,.35)"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#c9a46a"; g.stroke(); text(g, label, r[0] + r[2] / 2, r[1] + r[3] / 2 + 7, 19, "#4a2c1a", "center", 600); };
      chip(CLUE.note, "Записка Виски", true); chip(CLUE.txt, "Шпаргалка Виски", true);
      if (b.hintTxt && t - b.hintTxt < 6000) { const p = 0.5 + 0.5 * Math.sin(t / 150); rr(g, CLUE.txt[0] - 5, CLUE.txt[1] - 5, CLUE.txt[2] + 10, CLUE.txt[3] + 10, 15); g.lineWidth = 4; g.strokeStyle = `rgba(255,214,110,${0.4 + 0.6 * p})`; g.stroke(); }
      text(g, "Символы с полки:", FB.x + 140, FB.y + 300, 18, "#fff3dc", "center", 600);
      text(g, "порядок в шпаргалке Виски", FB.x + 140, FB.y + 392, 15, "rgba(255,243,220,.75)", "center", 500);
      TRAY.forEach((k, i) => sym(g, k, FB.x + 80 + i * 60, FB.y + 345, 40, "#ffd25e"));
      g.restore();
    }
    drawClose(g, FB);
  }

  // ---------- «С Новым годом!» и фейерверк за окном ----------
  const WINR = [905, 110, 225, 400];                                    // окно комнаты
  function stepNY(dt, t) {
    const ny = st.ny;
    if (t > ny.next) {
      ny.next = t + rnd(380, 750);
      const cx = rnd(WINR[0] + 30, WINR[0] + WINR[2] - 30), cy = rnd(WINR[1] + 40, WINR[1] + 230), col = ["#ff5a6e", "#ffd25e", "#7be0ff", "#b98cff", "#8cff9a", "#ffffff"][Math.floor(Math.random() * 6)];
      const n = 52; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd(-0.05, 0.05), v = rnd(110, 210); ny.parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t, col, life: rnd(1.1, 1.8) }); }
      ny.flashes.push({ x: cx, y: cy, t, col });
      SFX.firework();
    }
    for (const p of ny.parts) { p.vy += 70 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; }
    ny.parts = ny.parts.filter(p => (t - p.t) / 1000 < p.life); ny.flashes = ny.flashes.filter(f => t - f.t < 400);
  }
  function drawNY(g, t) {
    const ny = st.ny;
    g.save(); g.beginPath(); g.rect(WINR[0], WINR[1], WINR[2], WINR[3]); g.clip();
    g.globalCompositeOperation = "lighter";
    for (const f of ny.flashes) { const k = (t - f.t) / 400, gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, 70); gr.addColorStop(0, `rgba(255,255,230,${0.8 * (1 - k)})`); gr.addColorStop(1, "rgba(255,255,230,0)"); g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(f.x - 70, f.y - 70, 140, 140); }
    for (const p of ny.parts) { const k = (t - p.t) / 1000 / p.life, a = Math.max(0, 1 - k); g.fillStyle = p.col;
      g.globalAlpha = a * 0.45; g.fillRect(Math.round(p.x - p.vx * 0.05) - 3, Math.round(p.y - p.vy * 0.05) - 3, 6, 6);
      g.globalAlpha = a; g.fillRect(Math.round(p.x) - 4, Math.round(p.y) - 4, 8, 8); }
    g.restore();
    const k = clamp((t - ny.t0) / 900, 0, 1);
    g.save(); g.globalAlpha = k; g.textAlign = "center";
    g.font = "900 62px Rubik, sans-serif"; g.lineWidth = 10; g.strokeStyle = "#2a1408";
    g.strokeText("С НОВЫМ ГОДОМ, МАРСЕЛЬ!", W / 2, 690); g.fillStyle = "#ffe07a"; g.fillText("С НОВЫМ ГОДОМ, МАРСЕЛЬ!", W / 2, 690); g.restore();
    if (t - ny.t0 > 6000) {
      const p = 0.5 + 0.5 * Math.sin(t / 300);
      if (ny.bonus) { button(g, BONUSBTN, "★ Секретный бонус", p > 0.5); button(g, NYBTN2, "Продолжить ▸", false); }
      else button(g, NYBTN, "Продолжить ▸", p > 0.5);
    }
  }
  const NYBTN = [W / 2 - 110, 724, 220, 52], BONUSBTN = [W / 2 - 250, 724, 260, 52], NYBTN2 = [W / 2 + 30, 724, 220, 52];

  function draw(g, t) {
    if (!st) return;
    drawRoom(g, t);
    if (st.ny) drawNY(g, t);
    else if (st.view === "tree") drawTree(g, t);
    else if (st.view === "pc") drawPc(g, t);
    else if (st.view === "shelf") drawShelf(g, t);
    else if (st.view === "box") drawBox(g, t);
    if (st.fade) { const k = (t - st.fade.t) / 560, a = k < 0.46 ? k / 0.46 : (1 - k) / 0.54; g.fillStyle = `rgba(13,16,32,${clamp(a, 0, 1)})`; g.fillRect(0, 0, W, H); }
  }
  function click(x, y) {
    if (!st || st.fade) return;
    if (st.ny) {
      if (now() - st.ny.t0 < 6000) return;
      const done = () => { const cb = st.ny.cb; st.ny = null; cb && cb(); };
      if (st.ny.bonus && inR(x, y, BONUSBTN)) { const cb = st.ny.cb; st.ny = null; window.openBonus({ onClose: () => cb && cb(true) }); return; }
      if (inR(x, y, st.ny.bonus ? NYBTN2 : NYBTN)) done();
      return;
    }
    if (S.paused) return;
    const F = { tree: FT, pc: FP, shelf: FS, box: FB }[st.view];
    if (F) { const [cx, cy] = closeBtn(F); if (Math.hypot(x - cx, y - cy) < 26) { closeView(); return; } }
    if (st.view === "room") { if (st.arrived && st.ch < CH.length && inR(x, y, HOT[CH[st.ch]])) { if (CH[st.ch] === "box" && !st.box) st.box = { dial: [3, 4, 5], turn: [0, 0, 0], opened: 0 }; if (CH[st.ch] === "shelf" && !st.shelf) st.shelf = { found: {} }; openView(CH[st.ch]); } return; }
    if (st.view === "tree") clickTree(x, y);
    else if (st.view === "pc") clickPc(x, y);
    else if (st.view === "shelf") clickShelf(x, y);
    else if (st.view === "box") clickBox(x, y);
  }

  // ---------- игра для DayShell ----------
  const game = {
    mount(sh) {
      S = sh;
      S.cv.addEventListener("pointerdown", (e) => { const r = S.cv.getBoundingClientRect(); click((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H); });
      S.cv.style.cursor = "pointer";
    },
    async load() {
      if (img.room) return;
      const ld = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
      const js = (f) => fetch(f).then(r => r.json());
      [img.room, img.g25bg, img.g25, meta.g25, img.g26, meta.g26, img.g27, meta.g27, img.g28, meta.g28, img.g30, meta.g30, img.g31, meta.g31] = await Promise.all([
        ld("assets/room.webp"), ld("assets/game25_bg.webp"), ld("assets/game25.webp"), js("assets/game25.json"), ld("assets/game26.webp"), js("assets/game26.json"),
        ld("assets/game27.webp"), js("assets/game27.json"), ld("assets/game28_food.webp"), js("assets/game28_food.json"),
        ld("assets/game30.webp"), js("assets/game30.json"), ld("assets/game31.webp"), js("assets/game31.json")]);
      // атласы 25 и 27 хранят кадры как {x,y,w,h} или массивы — приводим к одному виду при рисовании
    },
    newGame() {
      const d = day(), ch = d.game ? 0 : Math.min(d.ch || 0, CH.length - 1);
      st = { ch, view: "room", arrived: false, hotT: 0, lastNudge: 0, said: {}, have: { note: ch > 0, txt: ch > 1 }, fade: null, ny: null,
             cat: { x: ch === 0 ? POINT.start : POINT[CH[ch - 1]], face: 1, mode: "sit", at: now(), tx: 0, target: null } };
      if (ch >= 3) st.shelf = { found: { star: 1, heart: 1, paw: 1 } };
    },
    begin() { if (!st) return; const my = st; setTimeout(() => { if (st === my) walkTo(CH[st.ch]); }, 1400); },
    step, draw,
    head() { if (!st) return null; const c = st.cat; return { x: c.x + c.face * 40, y: FLOOR - 190 }; },
    catHit(x, y) { if (!st || st.view !== "room" || st.ny || st.cat.mode === "walk") return false; const c = st.cat; return Math.abs(x - c.x) < 90 && y > FLOOR - 200 && y < FLOOR + 6; },
    catPet(on) { if (!st) return; const c = st.cat; c.mode = on ? "love" : "sit"; c.at = now(); },
    catPoke() { if (!st) return; const c = st.cat; c.mode = "happy"; c.at = now(); c.until = now() + 1200; },
    newYear(cb) {
      if (!st) game.newGame();
      st.view = "room"; st.arrived = false; st.ch = CH.length;
      st.cat.x = 1010; st.cat.mode = "lookup"; st.cat.face = 1; st.cat.at = now();
      st.ny = { t0: now(), parts: [], flashes: [], next: now() + 300, cb, bonus: !!(window.allCardsCollected && window.allCardsCollected()) };
      S.paused = false; S.playing = false; if (window.MUSIC) MUSIC.play("room");
      setTimeout(() => SFX.fanfare(), 400);
    },
    stop() { st = null; },
  };

  const shell = DayShell({
    d: 31, W, H, music: "room", title: "Последний секрет Виски", finale: true, hints: ["day31.hint1", "day31.hint2", "day31.hint3"],
    rules: { goal: "Виски спрятала кое-что важное и, конечно, не помнит куда.", how: ["Иди за ней и нажимай на то, что она подсвечивает", "Собери подсказки и открой шкатулку", "Виски по-прежнему можно погладить"] },
  }, game);
  window.Game31 = { open: (o) => shell.open(o), _st: () => st, _click: click, _ny: () => game.newYear(() => {}), HOT, CH };
})();
