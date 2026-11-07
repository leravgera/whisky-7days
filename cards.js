// Коллекционные карточки Виски: общий шаблон для всех семи дней.
// Тексты и характеристики карточек — в letters.js (window.CARDS).
(function () {
  // Окно (табличка) всегда целиком на экране: если не помещается — уменьшается целиком, без прокрутки.
  // Свойство scale складывается с анимацией появления, поэтому ничего не «прыгает».
  window.fitBox = function (box) {
    const panel = box.parentElement; if (!panel) return;
    const apply = () => {
      if (!box.isConnected) return;
      const h = box.offsetHeight, w = box.offsetWidth; if (!h || !w) return;
      const k = Math.min(1, panel.clientHeight * 0.95 / h, panel.clientWidth * 0.97 / w);
      box.style.scale = k < 0.995 ? k.toFixed(3) : "";
    };
    apply(); requestAnimationFrame(apply);
    if (window.ResizeObserver) { const ro = new ResizeObserver(apply); ro.observe(box); ro.observe(panel); }
    box.addEventListener("load", apply, true);
    if (document.fonts) document.fonts.ready.then(apply);
  };
  "use strict";
  const css = document.createElement("style");
  css.textContent = `
  .vcard { --w: 260px; width: var(--w); height: calc(var(--w) * 1.48); perspective: 1000px; margin: 6px auto 14px; font-family: Rubik, sans-serif; }
  .vcard .in { position: relative; width: 100%; height: 100%; transition: transform .9s cubic-bezier(.3,1.3,.5,1); transform-style: preserve-3d; }
  .vcard.flip .in { transform: rotateY(180deg); }
  .vcard .side { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 16px; padding: 7px;
    background: linear-gradient(135deg, #f7e08a, #b8862b 30%, #ffe9a3 50%, #a8741f 72%, #f3d27a); box-shadow: 0 0 0 2px #3a2416, 0 12px 30px rgba(0,0,0,.45); }
  .vcard .front { transform: rotateY(180deg); }
  .vcard .body { position: relative; height: 100%; border-radius: 11px; overflow: hidden; display: flex; flex-direction: column; padding: 7px 8px 6px;
    background: radial-gradient(circle at 30% 20%, #6b2a2a, #3c1416 70%); box-shadow: inset 0 0 0 2px rgba(255,230,160,.5); }
  .vcard .top { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
  .vcard .num { flex: none; width: 30px; height: 30px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff2c0, #c9952f); color: #3a2416;
    font: 700 14px Rubik, sans-serif; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #3a2416; }
  .vcard .ttl { flex: 1; min-width: 0; overflow-wrap: anywhere; color: #fff3d4; font: 400 10px/1.45 "Press Start 2P", Rubik, sans-serif; text-align: left; text-shadow: 1px 1px 0 #2a0c0c; }
  .vcard .stars { position: absolute; right: 5px; top: 5px; z-index: 2; color: #ffd45c; font-size: 12px; letter-spacing: -1px; line-height: 1;
    background: rgba(40,12,12,.72); padding: 3px 5px 3px 4px; border-radius: 9px; text-shadow: 0 0 4px rgba(255,200,80,.7); }
  .vcard .art { position: relative; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 3px #e7c46a, 0 0 0 5px #3a2416; margin: 2px 2px 7px; background: #fff6e3; }
  .vcard .art { flex: 1; min-height: 0; background: radial-gradient(circle at 50% 42%, var(--c1) 0%, var(--c2) 58%, var(--c3) 100%); }
  .vcard .art .rays { position: absolute; left: 50%; top: 42%; width: 260%; aspect-ratio: 1; transform: translate(-50%, -50%); pointer-events: none;
    background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.13) 0deg 7deg, rgba(255,255,255,0) 7deg 18deg);
    -webkit-mask: radial-gradient(circle, #000 0 22%, transparent 55%); mask: radial-gradient(circle, #000 0 22%, transparent 55%);
    animation: vrays 70s linear infinite; }
  @keyframes vrays { to { transform: translate(-50%, -50%) rotate(360deg); } }
  .vcard .art .dots { position: absolute; inset: 0; pointer-events: none; opacity: .75;
    background-image: radial-gradient(circle, rgba(255,250,220,.9) 0 1.2px, transparent 1.8px), radial-gradient(circle, rgba(255,250,220,.6) 0 1px, transparent 1.6px);
    background-size: 37px 41px, 23px 29px; background-position: 4px 7px, 15px 3px; animation: vtw 3s ease-in-out infinite alternate; }
  @keyframes vtw { from { opacity: .35; } to { opacity: .8; } }
  .vcard .art img { position: absolute; left: 4%; top: 3%; width: 92%; height: 92%; object-fit: contain; filter: drop-shadow(0 5px 0 rgba(0,0,0,.28)) drop-shadow(0 0 10px rgba(255,240,200,.25)); }
  .vcard .type { align-self: center; margin: -13px 0 2px; position: relative; z-index: 1; background: #e7c46a; color: #3a2416; font: 700 10px Rubik, sans-serif;
    letter-spacing: .6px; text-transform: uppercase; padding: 3px 9px; border-radius: 20px; box-shadow: 0 0 0 2px #3a2416; }
  .vcard .txt { flex: 1; background: #fbf1da; border-radius: 6px; box-shadow: inset 0 0 0 2px #c9a35a; padding: 6px 8px 5px; color: #3a2416; text-align: left; display: flex; flex-direction: column; }
  .vcard .flavor { font: italic 500 11.5px/1.32 Rubik, sans-serif; margin-bottom: 5px; }
  .vcard .stat { display: flex; align-items: center; gap: 6px; font: 700 10.5px Rubik, sans-serif; margin-top: 2px; }
  .vcard .stat span { flex: 1; }
  .vcard .bar { display: flex; gap: 2px; }
  .vcard .bar i { width: 9px; height: 7px; background: #e0cfa8; box-shadow: 0 0 0 1px #8a6a35; }
  .vcard .bar i.on { background: #d24a3a; box-shadow: 0 0 0 1px #6b1d14; }
  .vcard .foot { display: flex; justify-content: space-between; color: #f3d68c; font: 600 9px Rubik, sans-serif; letter-spacing: .4px; padding: 5px 2px 0; opacity: .85; }
  .vcard .shine { position: absolute; inset: 0; border-radius: 11px; pointer-events: none; mix-blend-mode: soft-light;
    background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.75) 45%, rgba(160,220,255,.5) 50%, rgba(255,180,240,.45) 55%, transparent 70%);
    background-size: 250% 100%; animation: vshine 4.5s ease-in-out infinite; }
  @keyframes vshine { 0% { background-position: 120% 0; } 55%, 100% { background-position: -120% 0; } }
  .vcard .back .body { align-items: center; justify-content: center; background: repeating-linear-gradient(45deg, #7a2622 0 10px, #6c201d 10px 20px); }
  .vcard .back .frame { position: absolute; inset: 10px; border: 2px solid rgba(240,200,110,.8); border-radius: 8px; }
  .vcard .back .frame::before, .vcard .back .frame::after { content: "✦"; position: absolute; color: #f0c86e; font-size: 14px; }
  .vcard .back .frame::before { left: 6px; top: 2px; } .vcard .back .frame::after { right: 6px; bottom: 2px; }
  .vcard .paw { position: relative; width: 92px; height: 92px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff2c0, #c9952f); box-shadow: 0 0 0 3px #3a2416, 0 0 24px rgba(255,210,120,.45); }
  .vcard .paw b { position: absolute; background: #6c201d; border-radius: 50%; }
  .vcard .paw b:nth-child(1) { left: 28px; top: 42px; width: 36px; height: 30px; border-radius: 45% 45% 50% 50%; }
  .vcard .paw b:nth-child(2) { left: 17px; top: 24px; width: 14px; height: 18px; } .vcard .paw b:nth-child(3) { left: 33px; top: 14px; width: 14px; height: 18px; }
  .vcard .paw b:nth-child(4) { left: 50px; top: 14px; width: 14px; height: 18px; } .vcard .paw b:nth-child(5) { left: 64px; top: 25px; width: 14px; height: 18px; }
  .vcard .bname { margin-top: 14px; font: 400 17px "Press Start 2P", Rubik, sans-serif; color: #ffd98a; text-shadow: 2px 2px 0 #2a0c0c; }
  .vcard .bsub { font: 600 10px Rubik, sans-serif; color: #f3d68c; letter-spacing: 1px; opacity: .85; margin-top: 3px; }
  `;
  css.textContent += `
  .wnote { position: relative; background: #e9d3a6 repeating-linear-gradient(0deg, rgba(120,80,40,.05) 0 2px, transparent 2px 6px); border: 3px solid #3a2416;
    border-radius: 6px; padding: 18px 22px 16px; margin: 8px 0 16px; text-align: left; font: 500 18px/1.5 Rubik, sans-serif; color: #2b1d14; transform: rotate(-.8deg);
    box-shadow: 3px 4px 0 rgba(58,36,22,.35); }
  .wnote .txt { white-space: pre-wrap; }
  .wnote .sign { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 10px; font: 400 15px "Press Start 2P", Rubik, sans-serif; color: #6b2a2a; }
  .wnote .sign img { width: 44px; }
  .wnote::before { content: ""; position: absolute; right: 16px; top: -12px; width: 58px; height: 22px; background: rgba(255,240,200,.75); transform: rotate(6deg); box-shadow: 0 1px 2px rgba(0,0,0,.2); }
  .wpaws { position: absolute; left: 14px; bottom: 10px; opacity: .22; font-size: 26px; letter-spacing: 6px; transform: rotate(-12deg); }
  /* ---------- письмо: конверт → листок от руки → поцелуй ---------- */
  .box.lbox { background: none !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; width: auto !important; max-width: none !important; max-height: none !important; overflow: visible !important; animation: none !important; }
  .lwrap { display: grid; grid-template-areas: "m" "h" "b"; justify-items: center; align-items: center; }
  .lwrap .lenv, .lwrap .lsheet { grid-area: m; }
  .lenv { position: relative; width: 380px; height: 236px; cursor: pointer; perspective: 1000px; animation: envIn .45s cubic-bezier(.2,.9,.3,1.2), envFloat 2.6s ease-in-out .45s infinite; }
  .lenv .e-back { position: absolute; inset: 0; background: #d6b98a; border-radius: 10px; box-shadow: 0 22px 50px rgba(0,0,0,.5); }
  .lenv .e-paper { position: absolute; left: 24px; right: 24px; top: 14px; height: 190px; z-index: 2; border-radius: 4px; background: #fffaf0 repeating-linear-gradient(#fffaf0 0 21px, rgba(108,138,198,.34) 21px 22px); transition: transform .7s cubic-bezier(.3,.7,.25,1); }
  .lenv .e-front { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; }
  .lenv .e-flap { position: absolute; left: 0; top: 0; width: 100%; height: 140px; z-index: 4; transform-origin: 50% 0; transition: transform .45s ease-in; }
  .lenv .e-flap svg { width: 100%; height: 100%; display: block; }
  .lenv .e-seal { position: absolute; left: 50%; top: 106px; width: 56px; height: 56px; margin-left: -28px; z-index: 5; border-radius: 50%;
    background: radial-gradient(circle at 36% 34%, #e65468, #a8162c 72%); box-shadow: 0 3px 7px rgba(0,0,0,.35), inset 0 0 0 4px rgba(110,8,24,.35);
    color: #ffd6dc; font: 700 24px/56px Rubik, sans-serif; text-align: center; transition: transform .35s, opacity .35s; }
  .lwrap.opening .e-seal { transform: scale(1.6) rotate(25deg); opacity: 0; }
  .lwrap.opening .e-flap { transform: rotateX(180deg); }
  .lwrap.slide .e-flap { z-index: 1; }
  .lwrap.slide .e-paper { transform: translateY(-118px); }
  .lwrap.read .lenv { animation: envOut .32s ease-in forwards; pointer-events: none; }
  .lwrap.gone .lenv { display: none; }
  .lhint { grid-area: h; margin-top: 18px; font: 500 16px Rubik, sans-serif; color: #ffe9b8; cursor: pointer; animation: hintPulse 1.6s ease-in-out infinite; }
  .lwrap.opening .lhint { visibility: hidden; }
  .lsheet { display: none; position: relative; width: min(660px, 88vw); box-sizing: border-box; border-radius: 6px; text-align: left;
    background: radial-gradient(circle at 18% 8%, rgba(255,255,255,.95), transparent 45%), radial-gradient(circle at 88% 92%, rgba(225,200,155,.35), transparent 55%), #fffaf0;
    box-shadow: 0 24px 60px rgba(0,0,0,.5), inset 0 0 44px rgba(200,165,110,.2); color: #263463; font: 600 32px/1.2 "Caveat", "Segoe Print", "Comic Sans MS", cursive; scrollbar-width: thin; }
  /* лист в линейку, как бумага в конверте: строки текста ложатся ровно на линии */
  .lsheet .lscroll { position: relative; overflow: visible; padding: 44px 38px 12px 36px; box-sizing: border-box; line-height: 1.2;
    background-image: linear-gradient(to bottom, transparent calc(100% - 2px), rgba(108,138,198,.34) calc(100% - 2px)); background-size: 100% 1.2em;
    background-origin: content-box; background-clip: padding-box; background-position: 0 0; }
  .lsheet p .em { line-height: 0; }
  .lwrap.read .lsheet { display: block; animation: sheetIn .62s cubic-bezier(.2,.9,.3,1.1) .3s both; }
  .lsheet .ldate { position: absolute; right: 38px; top: 8px; font-size: .78em; line-height: 1.2; opacity: .65; }
  .lsheet p { margin: 0; text-indent: 1.3em; opacity: 0; }
  .lwrap.read .lsheet p { animation: pIn .55s ease both; }
  .lsheet .lend { height: 1.2em; }
  .lsheet .lkiss { position: absolute; right: 30px; bottom: 16px; width: 120px; height: 82px; opacity: 0; transform: scale(2.3) rotate(-30deg); pointer-events: none; }
  .lwrap.kissed .lkiss { animation: kissIn .5s cubic-bezier(.3,1.4,.4,1) forwards; }
  .lwrap .lnext { grid-area: b; margin-top: 18px !important; opacity: 0; pointer-events: none; transition: opacity .35s; }
  .lwrap.done .lnext { opacity: 1; pointer-events: auto; }
  @keyframes envIn { from { transform: translateY(40px) scale(.85); opacity: 0; } }
  @keyframes envFloat { 50% { transform: translateY(-6px) rotate(-.6deg); } }
  @keyframes envOut { to { transform: translateY(80px) scale(.9); opacity: 0; } }
  @keyframes sheetIn { from { transform: translateY(70px) scale(var(--s0, .62)) rotate(-3deg); opacity: 0; } 35% { opacity: 1; } to { transform: rotate(-.6deg); opacity: 1; } }
  @keyframes pIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes kissIn { 0% { opacity: 0; transform: scale(2.3) rotate(-30deg); } 60% { opacity: .95; transform: scale(.9) rotate(-12deg); } 100% { opacity: .9; transform: scale(1) rotate(-14deg); } }
  @keyframes hintPulse { 50% { opacity: .45; } }
  /* ---------- записка Виски: листок из тетради, кошачий почерк, следы лап ---------- */
  .wn { filter: drop-shadow(0 18px 26px rgba(0,0,0,.45)); animation: wnIn .6s cubic-bezier(.25,1.35,.4,1) both; margin-bottom: 16px; }
  .wn .wpage { position: relative; width: min(500px, 84vw); box-sizing: border-box; padding: 40px 34px 22px 64px; text-align: left; color: #40291b;
    font: 400 25px/33px "Neucha", "Segoe Print", "Comic Sans MS", cursive; background: repeating-linear-gradient(#fdf9ee 0 32px, #c8dbf0 32px 33px) 0 7px / 100% 33px, #fdf9ee; }
  .wn .wpage::before { content: ""; position: absolute; left: 46px; top: 0; bottom: 0; width: 2px; background: rgba(222,92,92,.5); }
  .wn .wtxt p { margin: 0 0 33px; }
  .wn .wtxt p:last-child { margin-bottom: 0; }
  .wn .wsign { text-align: right; font-size: 30px; margin-top: 4px; color: #5a2f1c; }
  .wpaw { display: inline-block; position: relative; width: 30px; height: 30px; vertical-align: -4px; margin-left: 8px; }
  .wpaw::before { content: ""; position: absolute; left: 6px; top: 12px; width: 19px; height: 15px; border-radius: 50% 50% 46% 46%; background: currentColor; }
  .wpaw i { position: absolute; width: 7px; height: 9px; border-radius: 50%; background: currentColor; }
  .wpaw i:nth-child(1) { left: 1px; top: 6px; } .wpaw i:nth-child(2) { left: 8px; top: 0; } .wpaw i:nth-child(3) { left: 16px; top: 0; } .wpaw i:nth-child(4) { left: 23px; top: 6px; }
  .wn .wstamp { position: absolute; color: rgba(110,58,30,.42); margin: 0; }
  .wn .wscratch { position: absolute; right: 18px; top: 46%; width: 46px; height: 60px; opacity: .45; }
  @keyframes wnIn { from { transform: translateY(-60px) rotate(-8deg); opacity: 0; } to { transform: rotate(1.4deg); opacity: 1; } }
  `;
  document.head.appendChild(css);
  if (document.fonts && document.fonts.load) ['500 32px "Caveat"', '600 32px "Caveat"', '25px "Neucha"'].forEach(f => document.fonts.load(f).catch(() => {}));
  // Письмо дня: сначала записка от Виски (если есть), потом письмо автора.
  const ENV_FRONT = `<svg class="e-front" viewBox="0 0 380 236" preserveAspectRatio="none">
    <path d="M0 8 L176 130 Q190 140 204 130 L380 8 L380 226 Q380 236 370 236 L10 236 Q0 236 0 226 Z" fill="#e4c896"/>
    <path d="M2 236 L174 118 Q190 108 206 118 L378 236 Z" fill="#eed6a9"/>
    <path d="M0 8 L176 130 Q190 140 204 130 L380 8" fill="none" stroke="rgba(110,70,30,.28)" stroke-width="2"/>
    <path d="M2 236 L174 118 Q190 108 206 118 L378 236" fill="none" stroke="rgba(110,70,30,.22)" stroke-width="2"/></svg>`;
  const ENV_FLAP = `<svg viewBox="0 0 380 140" preserveAspectRatio="none"><path d="M0 0 L380 0 L204 128 Q190 138 176 128 Z" fill="#d8b984" stroke="rgba(110,70,30,.32)" stroke-width="2"/></svg>`;
  const KISS = `<svg class="lkiss" viewBox="0 0 120 82"><defs><filter id="kissTex" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.9 1.7" result="m"/>
    <feComposite in="SourceGraphic" in2="m" operator="in"/></filter></defs>
    <g filter="url(#kissTex)" fill="#c21f3a">
      <path d="M8 42 C16 24 34 12 50 19 C55 21 58 24 60 27 C62 24 65 21 70 19 C86 12 104 24 112 42 C98 39 80 40 60 41 C40 40 22 39 8 42 Z"/>
      <path d="M9 45 C26 47 43 48 60 48 C77 48 94 47 111 45 C103 64 84 76 60 76 C36 76 17 64 9 45 Z"/></g>
    <g stroke="#fffaf0" stroke-width="1.4" opacity=".5" fill="none" stroke-linecap="round">
      <path d="M30 23 L33 38"/><path d="M42 19 L44 37"/><path d="M52 22 L53 38"/><path d="M68 22 L67 38"/><path d="M78 19 L76 37"/><path d="M90 23 L87 38"/>
      <path d="M24 53 L28 66"/><path d="M36 51 L38 70"/><path d="M48 51 L49 73"/><path d="M60 51 L60 74"/><path d="M72 51 L71 73"/><path d="M84 51 L82 70"/><path d="M96 53 L92 66"/></g></svg>`;
  const PAW = `<span class="wpaw"><i></i><i></i><i></i><i></i></span>`;
  const paras = (t) => t.split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, "<br>").replace(/(\p{Extended_Pictographic}\uFE0F?)/gu, '<span class="em">$1</span>')}</p>`).join("");
  function tornEdge() {                     // неровный оторванный верх листка
    const pts = []; for (let x = 0; x <= 100; x += 3.5) pts.push(`${Math.min(100, x).toFixed(1)}% ${(2 + Math.random() * 9).toFixed(1)}px`);
    return `polygon(${pts.join(", ")}, 100% 100%, 0% 100%)`;
  }
  // Письмо дня: сначала записка от Виски (если есть), потом письмо автора в конверте.
  window.letterFlow = function (showPanel, d, nextLabel, onDone) {
    const note = (window.WHISKY_NOTES || {})[d], text = (window.LETTERS || {})[d] || `Здесь будет твоё письмо на ${d} декабря.`;
    const author = () => {
      if (window.SFX) SFX.paper();
      const b = showPanel(`<div class="lwrap">
        <div class="lenv"><div class="e-back"></div><div class="e-paper"></div>${ENV_FRONT}<div class="e-flap">${ENV_FLAP}</div><div class="e-seal">♥</div></div>
        <div class="lhint">нажми на конверт, чтобы открыть</div>
        <div class="lsheet"><div class="lscroll"><div class="ldate">${d} декабря</div>${paras(text)}<div class="lend"></div></div>${KISS}</div>
        <button class="btn main lnext">${nextLabel}</button></div>`);
      b.classList.add("lbox");
      const w = b.querySelector(".lwrap"), ps = w.querySelectorAll(".lsheet p");
      ps.forEach((p, i) => p.style.animationDelay = (0.45 + i * 0.16) + "s");
      let opened = false;
      const open = () => {
        if (opened || !w.isConnected) return; opened = true;
        if (window.SFX) SFX.whoosh();
        w.classList.add("opening");
        setTimeout(() => { w.classList.add("slide"); if (window.SFX) SFX.paper(); }, 420);
        setTimeout(() => {                      // письмо раскрывается; длинное — чуть мельче, чтобы влезло целиком
          w.classList.add("read");
          // поцелуй лежит вне прокручиваемой части, поэтому листок от него не «едет»; длинное письмо сначала шире, потом мельче
          // никакой прокрутки: длинное письмо сначала становится шире, потом чуть мельче (не мельче 24 px),
          // а если и так не помещается — окно уменьшается целиком (fitBox)
          const sh = w.querySelector(".lsheet"), pnl = w.closest(".panel"); let fs = 32;
          const nb = w.querySelector(".lnext"), bh = nb ? nb.offsetHeight + 18 : 60;
          const over = () => pnl && sh.offsetHeight + bh > pnl.clientHeight * 0.95;
          if (over()) sh.style.width = Math.round(Math.min(1080, pnl.clientWidth * 0.94)) + "px";
          while (over() && fs > 25) { fs--; sh.style.fontSize = fs + "px"; }
          sh.style.setProperty("--s0", Math.min(0.62, 360 / (sh.offsetWidth || 660)).toFixed(3));   // широкий лист «вырастает» из конверта, а не из пустоты
        }, 1150);
        setTimeout(() => w.classList.add("gone"), 1600);
        const kissAt = 1150 + 450 + ps.length * 160 + 450;
        setTimeout(() => { if (!w.isConnected) return; w.classList.add("kissed"); if (window.SFX) SFX.kiss(); }, kissAt);
        setTimeout(() => w.classList.add("done"), kissAt + 500);
      };
      w.querySelector(".lenv").onclick = open; w.querySelector(".lhint").onclick = open;
      setTimeout(open, 4500);                // не нажал — конверт откроется сам
      w.querySelector(".lnext").onclick = onDone;
    };
    if (!note) { author(); return; }
    if (window.SFX) { SFX.paper(); SFX.meow(); }
    const b = showPanel(`<div class="wn"><div class="wpage" style="clip-path:${tornEdge()}">
        <span class="wstamp" style="right:22px;top:16px;transform:rotate(24deg)">${PAW}</span>
        <span class="wstamp" style="left:10px;bottom:16px;transform:rotate(-18deg) scale(.8)">${PAW}</span>
        <svg class="wscratch" viewBox="0 0 46 60"><g stroke="#7a4a2a" stroke-width="2" stroke-linecap="round" fill="none"><path d="M8 4 Q14 30 6 56"/><path d="M22 2 Q28 30 20 58"/><path d="M36 6 Q42 30 34 54"/></g></svg>
        <div class="wtxt">${paras(note)}</div><div class="wsign">Виски${PAW}</div></div></div>
      <button class="btn main">Читать письмо ▸</button>`);
    b.classList.add("lbox");
    b.querySelector(".btn").onclick = author;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NUM = { 25: 1, 26: 2, 27: 3, 28: 4, 29: 5, 30: 6, 31: 7 };
  window.renderCard = function (d, { flipped = false } = {}) {
    const c = (window.CARDS || {})[d] || {};
    const BG = { 25: ["#4b67b8", "#25336e", "#141a3d"], 26: ["#f2b45a", "#c06a26", "#6e3212"], 27: ["#3fb08a", "#1d6b5a", "#0d3530"],
      28: ["#f28fa6", "#b4466a", "#5c1f36"], 29: ["#9fd8f5", "#3f86c4", "#183f6b"], 30: ["#b58cf0", "#6a3fb0", "#2e1659"], 31: ["#ffe08a", "#d19a2a", "#7a4a0c"] };
    const bg = c.bg || BG[d] || BG[25];
    const stars = "★".repeat(c.rarity || 3) + "☆".repeat(5 - (c.rarity || 3));
    const stats = (c.stats || []).map(([n, v]) => `<div class="stat"><span>${esc(n)}</span><div class="bar">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? "on" : ""}"></i>`).join("")}</div></div>`).join("");
    return `<div class="vcard${flipped ? " flip" : ""}"><div class="in">
      <div class="side back"><div class="body"><div class="frame"></div><div class="paw"><b></b><b></b><b></b><b></b><b></b></div>
        <div class="bname">Виски</div><div class="bsub">КОЛЛЕКЦИЯ · 7 ДНЕЙ</div></div></div>
      <div class="side front"><div class="body">
        <div class="top"><div class="num">${NUM[d] || "?"}</div><div class="ttl">${esc(c.title || "")}</div></div>
        <div class="art" style="--c1:${bg[0]};--c2:${bg[1]};--c3:${bg[2]}"><div class="rays"></div><div class="dots"></div><img src="${esc(c.img || "")}" alt=""><div class="stars">${stars}</div></div>
        <div class="type">${esc(c.type || "Кошка")}</div>
        <div class="foot"><span>СЕМЬ ДНЕЙ С ВИСКИ</span><span>${NUM[d] || "?"}/7 · ${d}.12.2026</span></div>
        <div class="shine"></div></div></div>
    </div></div>`;
  };
})();
