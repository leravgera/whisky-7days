// Телефонный режим. На телефоне сайт «видит» экран как маленький ноутбук (около 560 px по высоте) —
// вся вёрстка и игры остаются как на компьютере, просто аккуратно уменьшаются. Вертикально — Виски просит
// повернуть телефон. Во весь экран — через «На экран Домой» (iPhone) или «Добавить на главный экран» (Android).
(() => {
  const ua = navigator.userAgent || "";
  const touch = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
  const short = Math.min(screen.width, screen.height) <= 600;            // телефоны; планшеты шире
  const PHONE = touch && short;
  window.PHONE = PHONE;
  if (touch) {                                                            // любой сенсорный экран (и планшет): без меню долгого нажатия и выделения
    document.documentElement.classList.add("touch");
    const tcss = document.createElement("style");
    tcss.textContent = `html.touch, html.touch body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      html.touch img { -webkit-user-drag: none; }`;
    document.head.appendChild(tcss);
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("selectstart", (e) => { if (!e.target.closest || !e.target.closest("input, textarea")) e.preventDefault(); });
  }
  if (!PHONE) return;
  const IOS = /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const STANDALONE = navigator.standalone === true || matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches;
  const root = document.documentElement;
  root.classList.add("phone"); if (IOS) root.classList.add("ios"); if (STANDALONE) root.classList.add("standalone");
  const TH = +new URLSearchParams(location.search).get("th") || 500;      // «высота экрана», которую видит сайт
  const meta = document.querySelector('meta[name="viewport"]');
  let cur = "";

  function fit() {
    const sw = Math.max(screen.width, screen.height), sh = Math.min(screen.width, screen.height);
    const land = innerWidth > innerHeight || (screen.orientation ? /landscape/.test(screen.orientation.type) : Math.abs(window.orientation || 0) === 90);
    root.classList.toggle("portrait", !land);
    let content;
    if (land) {
      const aspect = innerWidth / innerHeight;                            // видимая часть экрана (без панелей браузера)
      const W = Math.round(Math.max(1000, Math.min(1700, TH * (isFinite(aspect) && aspect > 1 ? aspect : sw / sh))));   // узкие телефоны 16:9 — чуть выше
      content = `width=${W}, user-scalable=no, viewport-fit=cover`;
    } else {
      content = `width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover`;
    }
    if (content !== cur) { cur = content; meta.setAttribute("content", content); }
  }
  // Запасной вариант: если масштаб страницы не сработал (сайт открыт внутри рамки, например в превью claude.ai),
  // уменьшаем только окна с текстом — игры и комната и так подгоняются под экран.
  function fallback() {
    const port = root.classList.contains("portrait");
    const pz = (!port && innerHeight < TH * 0.9) ? Math.max(0.5, Math.min(1, innerHeight / TH)) : 1;
    root.classList.toggle("pzoom", pz < 1); root.style.setProperty("--pz", pz.toFixed(3));
  }
  window.phoneZoom = () => (root.classList.contains("pzoom") ? parseFloat(root.style.getPropertyValue("--pz")) || 1 : 1);
  fit(); fallback(); setTimeout(fallback, 400);
  let t = 0;
  const refit = () => { clearTimeout(t); t = setTimeout(() => { fit(); setTimeout(fallback, 150); }, 120); };
  addEventListener("resize", refit); addEventListener("orientationchange", () => setTimeout(fit, 300));


  // Полноэкранный режим браузера (Fullscreen API) не используем: в нём Chrome сбрасывает масштаб страницы
  // и вёрстка перестаёт помещаться. Во весь экран сайт открывается с ярлыка на главном экране (manifest).
  window.phoneFullscreen = () => {};

  // экран «Поверни телефон»
  const css = `
    html.phone, html.phone body { overscroll-behavior: none; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
    html.pzoom #bonus .bskip, html.pzoom #bonus .bend { zoom: var(--pz); }
    #rotate { display: none; position: fixed; inset: 0; z-index: 2147483000; background: radial-gradient(circle at 50% 35%, #3a2416, #140d0a 70%);
      color: #f5e7c8; align-items: center; justify-content: center; text-align: center; font-family: Rubik, sans-serif; padding: 24px; box-sizing: border-box; }
    html.phone.portrait #rotate { display: flex; }
    html.phone.portrait body > *:not(#rotate) { visibility: hidden; }
    #rotate .rbox { max-width: 340px; }
    #rotate .rcat { width: 150px; image-rendering: pixelated; display: block; margin: 0 auto 16px; }
    #rotate .rph { width: 46px; height: 76px; border: 4px solid #f5e7c8; border-radius: 10px; margin: 0 auto 18px; position: relative;
      animation: rTurn 2.4s ease-in-out infinite; box-sizing: border-box; }
    #rotate .rph::after { content: ""; position: absolute; left: 50%; bottom: 5px; width: 10px; height: 3px; margin-left: -5px; border-radius: 2px; background: #f5e7c8; }
    @keyframes rTurn { 0%, 25% { transform: rotate(0deg); } 55%, 85% { transform: rotate(-90deg); } 100% { transform: rotate(0deg); } }
    #rotate b { display: block; font: 400 15px/1.6 "Press Start 2P", monospace; color: #ffd27a; margin-bottom: 12px; }
    #rotate p { margin: 0 0 10px; font-size: 17px; line-height: 1.45; }
    #rotate .rtip { display: none; margin-top: 18px; font-size: 14px; opacity: .85; background: rgba(245,231,200,.1); border-radius: 12px; padding: 10px 12px; }
    html.ios:not(.standalone) #rotate .ri, html:not(.ios):not(.standalone) #rotate .ra { display: block; }
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const mk = () => {
    if (document.getElementById("rotate")) return;
    const d = document.createElement("div"); d.id = "rotate";
    d.innerHTML = `<div class="rbox"><img class="rcat" src="assets/whisky_talk.png" alt=""><div class="rph"></div>
      <b>Поверни телефон</b><p>Мур. Мой мир помещается только в горизонтальный экран.</p>
      <p class="rtip ri">Совет: в Safari нажми «Поделиться» → «На экран Домой». Так сайт откроется во весь экран, без панелей браузера.</p>
      <p class="rtip ra">Совет: в меню Chrome (⋮) выбери «Добавить на главный экран». Так сайт откроется во весь экран, без панелей браузера.</p></div>`;
    document.body.appendChild(d);
  };
  if (document.body) mk(); else document.addEventListener("DOMContentLoaded", mk);
})();
