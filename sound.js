// Звук «Семь дней с Виски»: музыка и эффекты синтезируются прямо в браузере (Web Audio).
// Мяуканье — три записи «мррр-мяу» (встроены в meows.js).
(function () {
  "use strict";
  const KEY = "viski7.sound";
  const S = { on: false, musicOn: true, sfxOn: true, music: 0.45, sfx: 0.7 };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  let ac = null, master, musicBus, sfxBus, dryBus, verb, noiseBuf, started = false;
  const meows = [];

  function init() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}   // iPhone: звук и при беззвучном режиме
    master = ac.createGain(); master.gain.value = 1; master.connect(ac.destination);
    musicBus = ac.createGain(); sfxBus = ac.createGain(); dryBus = ac.createGain(); dryBus.connect(master);   // dryBus — без эха (мяуканье)
    // мягкая «комнатная» реверберация из сгенерированного импульса
    verb = ac.createConvolver();
    const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir;
    const wet = ac.createGain(); wet.gain.value = 0.32; verb.connect(wet); wet.connect(master);
    musicBus.connect(master); musicBus.connect(verb);
    sfxBus.connect(master); const sw = ac.createGain(); sw.gain.value = 0.25; sfxBus.connect(sw); sw.connect(verb);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    applyVolumes();
    (window.MEOW_DATA || []).forEach(b64 => {
      const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      ac.decodeAudioData(u.buffer).then(buf => meows.push(buf)).catch(e => console.warn("meow decode", e));
    });
  }
  function applyVolumes() {
    if (!ac) return;
    const t = ac.currentTime;
    musicBus.gain.setTargetAtTime(S.on && S.musicOn ? S.music * 0.55 : 0, t, 0.25);
    sfxBus.gain.setTargetAtTime(S.on && S.sfxOn ? S.sfx : 0, t, 0.05);
    dryBus.gain.setTargetAtTime(S.on && S.sfxOn ? S.sfx : 0, t, 0.05);
  }

  // ---------- инструменты ----------
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (n) => { const m = n.match(/^([A-G])(#?)(\d)$/); return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] ? 1 : 0); };

  let OUT = null;                                       // куда идут ноты трека, который сейчас расписывается
  function box(m, t, vel = 0.25, dur = 1.8) {          // музыкальная шкатулка / колокольчик
    const g = ac.createGain(); g.connect(OUT || musicBus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    [[1, 1], [2.0, 0.28], [3.01, 0.10], [4.2, 0.05]].forEach(([k, a]) => {
      const o = ac.createOscillator(), og = ac.createGain(); o.type = "sine"; o.frequency.value = freq(m) * k; og.gain.value = a;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function pad(ms, t, dur, vol = 0.045) {               // тихий тёплый фон аккорда
    const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
    f.connect(g); g.connect(OUT || musicBus);
    ms.forEach(m => [-4, 4].forEach(dt => { const o = ac.createOscillator(); o.type = "triangle"; o.frequency.value = freq(m); o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + dur + 0.1); }));
  }

  // ---------- мелодия (авторская, вальс 3/4) ----------
  const BEAT = 0.72;
  const CH = { F: ["F3", "C4", "A4"], C: ["C3", "G3", "E4"], Am: ["A2", "E3", "C4"], G: ["G2", "D3", "B3"], Dm: ["D3", "A3", "F4"], Em: ["E3", "B3", "G4"] };
  const SONG = [
    ["F", [["C6", 1], ["A5", 1], ["F5", 1]]], ["C", [["G5", 1.5], ["E5", 0.5], ["G5", 1]]],
    ["Am", [["A5", 1], ["C6", 1], ["E6", 1]]], ["G", [["D6", 2], ["B5", 1]]],
    ["F", [["C6", 1], ["A5", 0.5], ["G5", 0.5], ["F5", 1]]], ["C", [["E5", 1], ["G5", 1], ["C6", 1]]],
    ["Dm", [["D6", 1], ["C6", 1], ["A5", 1]]], ["G", [["B5", 2], ["G5", 1]]],
    ["F", [["A5", 1], ["C6", 1], ["F6", 1]]], ["Em", [["E6", 1.5], ["D6", 0.5], ["B5", 1]]],
    ["Am", [["C6", 1], ["A5", 1], ["E5", 1]]], ["C", [["G5", 3]]],
    ["F", [["F5", 1], ["A5", 1], ["C6", 1]]], ["G", [["D6", 1], ["B5", 1], ["G5", 1]]],
    ["C", [["E6", 1], ["D6", 1], ["C6", 1]]], ["C", [["C6", 3]]],
    [null, []], [null, []],                                   // короткая тишина перед повтором
  ];
  // ---------- 8-битные инструменты ----------
  function chip(type, m, t, dur, vol, cut = 3200, vib = 0) {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = type; o.frequency.value = freq(m); f.type = "lowpass"; f.frequency.value = cut;
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setValueAtTime(vol * 0.8, t + dur * 0.6); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f); f.connect(g); g.connect(OUT); o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(kind, t, vol = 1) {
    if (kind === "kick" || kind === "dum") {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine";
      o.frequency.setValueAtTime(kind === "kick" ? 150 : 120, t); o.frequency.exponentialRampToValueAtTime(kind === "kick" ? 45 : 70, t + 0.12);
      g.gain.setValueAtTime(0.5 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kind === "kick" ? 0.16 : 0.22));
      o.connect(g); g.connect(OUT); o.start(t); o.stop(t + 0.25); return;
    }
    const sr = ac.createBufferSource(); sr.buffer = noiseBuf; const f = ac.createBiquadFilter(), g = ac.createGain();
    const P = { hat: ["highpass", 7000, 0.03, 0.08], snare: ["bandpass", 1800, 0.12, 0.22], tek: ["bandpass", 3200, 0.05, 0.16], tak: ["bandpass", 2400, 0.08, 0.12] }[kind];
    f.type = P[0]; f.frequency.value = P[1]; f.Q.value = 1.2;
    g.gain.setValueAtTime(P[3] * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + P[2]);
    sr.connect(f); f.connect(g); g.connect(OUT); sr.start(t, Math.random()); sr.stop(t + P[2] + 0.02);
  }
  // мелодия по восьмым: "E5", "-" (тянуть), null (пауза)
  function lead(bars, i, t, step, type, vol, cut, vib) {
    const row = bars[i];
    for (let k = 0; k < row.length; k++) {
      const n = row[k]; if (!n || n === "-") continue;
      let len = 1; while (row[k + len] === "-") len++;
      chip(type, midi(n.replace("b", "")) + (n.includes("b") ? -1 : 0), t + k * step, len * step * 0.92, vol, cut, vib);
    }
  }

  // ---------- треки ----------
  const TRACKS = {
    // комната: музыкальная шкатулка, вальс
    room: { len: SONG.length, dur: () => BEAT * 3, play(i, t) { scheduleBar(i, t); } },

    // «Это само упало!»: заводной 8-бит, темп растёт по раундам
    g25: (() => {
      const L = [
        ["E5", "G5", "C6", "G5", "E5", "G5", "C6", "E6"], ["D6", "C6", "A5", "E5", "A5", "C6", "E6", "C6"],
        ["F5", "A5", "C6", "A5", "F5", "A5", "C6", "F6"], ["E6", "D6", "B5", "G5", "D6", "-", "B5", "-"],
        ["E5", "G5", "C6", "E6", "G6", "E6", "C6", "G5"], ["A5", "C6", "E6", "C6", "A5", "E5", "A5", "C6"],
        ["A5", "C6", "F6", "C6", "B5", "D6", "G6", "D6"], ["C6", "G5", "E5", "G5", "C6", "-", null, null],
      ];
      const B = ["C3", "A2", "F2", "G2", "C3", "A2", "F2", "C3"];
      return { len: 8, bpm: 132, dur() { return 60 / (this.bpm * MUSIC_TEMPO) * 4; }, play(i, t) {
        const s8 = this.dur() / 8, b = midi(B[i]);
        lead(L, i, t, s8, "square", 0.045, 2600);
        for (let k = 0; k < 8; k++) {
          const nt = i === 6 && k >= 4 ? midi("G2") : b;
          chip("triangle", nt + (k % 2 ? 12 : 0), t + k * s8, s8 * 0.85, 0.16, 1200);
          drum("hat", t + k * s8, k % 2 ? 0.6 : 1);
          if (k === 0 || k === 4) drum("kick", t + k * s8); if (k === 2 || k === 6) drum("snare", t + k * s8);
        }
        if (MUSIC_TEMPO > 1.15) for (let k = 1; k < 8; k += 2) chip("square", midi(L[i][k - 1] || "C6") + 12, t + k * s8, s8 * 0.4, 0.012, 4000);
      } };
    })(),

    // лабиринт: «египетский» 8-бит (лад фригийский доминантовый от ми), ритм максум
    g26: (() => {
      const L = [
        ["E5", "F5", "G#5", "A5", "G#5", "F5", "E5", "-"], ["E5", "F5", "G#5", "B5", "A5", "G#5", "F5", "E5"],
        ["A5", "B5", "C6", "B5", "A5", "G#5", "A5", "-"], ["G#5", "F5", "E5", "F5", "G#5", "-", "E5", "-"],
        ["B5", "C6", "D6", "C6", "B5", "A5", "G#5", "A5"], ["B5", "-", "A5", "G#5", "F5", "G#5", "A5", "-"],
        ["E6", "D6", "C6", "B5", "A5", "G#5", "F5", "G#5"], ["E5", "-", "-", "-", "E5", "F5", "E5", "-"],
      ];
      const B = ["E2", "E2", "A2", "E2", "E2", "A2", "D2", "E2"], MAQSUM = ["dum", "tek", null, "tek", "dum", null, "tek", "tak"];
      return { len: 8, bpm: 104, dur() { return 60 / (this.bpm * MUSIC_TEMPO) * 4; }, play(i, t) {
        const s8 = this.dur() / 8;
        lead(L, i, t, s8, "square", 0.04, 2200, 6);
        chip("triangle", midi(B[i]), t, s8 * 7.6, 0.13, 900);                     // бурдон
        chip("triangle", midi(B[i]) + 7, t + s8 * 4, s8 * 3.6, 0.06, 900);
        MAQSUM.forEach((d, k) => d && drum(d, t + k * s8, d === "dum" ? 0.9 : 0.8));
        if (i % 2 === 1) chip("sawtooth", midi("E4"), t, s8 * 8, 0.012, 700);       // тихий «зурна»-фон
      } };
    })(),
    // «Кошачья память»: спокойный «лаунж»-8-бит со свингом, ля минор
    g27: (() => {
      const L = [
        ["E5", "-", "C5", "D5", "E5", "G5", "A5", "-"], ["F5", "-", "E5", "D5", "C5", "-", "A4", "-"],
        ["B4", "D5", "G5", "-", "F5", "E5", "D5", "-"], ["E5", "-", "-", "-", null, "G5", "E5", "C5"],
        ["A5", "-", "G5", "F5", "E5", "-", "C5", "-"], ["D5", "-", "F5", "A5", "G5", "-", "F5", "-"],
        ["E5", "G#5", "B5", "-", "A5", "G#5", "F5", "E5"], ["A4", "-", "-", "-", null, null, null, null],
      ];
      const C = [["A2", "C4", "E4", "G4"], ["D3", "F4", "A4", "C5"], ["G2", "B3", "D4", "F4"], ["C3", "E4", "G4", "B4"],
                 ["F2", "A3", "C4", "E4"], ["B2", "D4", "F4", "A4"], ["E2", "G#3", "B3", "D4"], ["A2", "C4", "E4", "A4"]];
      return { len: 8, bpm: 92, dur() { return 60 / (this.bpm * MUSIC_TEMPO) * 4; }, play(i, t) {
        const q = this.dur() / 4, s8 = q / 2, sw = s8 * 0.32, row = L[i], ch = C[i].map(midi);
        for (let k = 0; k < 8; k++) {
          const n = row[k]; if (!n || n === "-") continue;
          let len = 1; while (row[k + len] === "-") len++;
          const at = t + k * s8 + (k % 2 ? sw : 0);
          chip("triangle", midi(n), at, len * s8 * 0.9, 0.11, 2400, 3); chip("square", midi(n), at, len * s8 * 0.5, 0.012, 1800);
        }
        [0, 1, 2, 3].forEach(b => chip("triangle", ch[0] + (b === 2 ? 7 : b === 3 ? 12 : 0), t + b * q, q * 0.8, 0.13, 900));
        [1, 3].forEach(b => { ch.slice(1).forEach(m => chip("square", m, t + b * q, q * 0.35, 0.008, 1400)); drum("tak", t + b * q, 0.5); });
        for (let k = 0; k < 8; k++) drum("hat", t + k * s8 + (k % 2 ? sw : 0), k % 2 ? 0.35 : 0.55);
      } };
    })(),
    // «Замёрзшая Виски»: музыка «оттаивает» вместе с комнатой (WARM от 0 до 1 задаёт игра по температуре)
    g29: (() => {
      const CH = [["D3", "F3", "A3", "D4"], ["A#2", "D3", "F3", "A#3"], ["F2", "A2", "C3", "F3"], ["C3", "E3", "G3", "C4"]];
      const MEL = [["A5", null, "F5", null, "D5", "-", "E5", "F5"], ["F5", null, "D5", null, "A#4", "-", "C5", "D5"],
                   ["C6", null, "A5", null, "F5", "-", "G5", "A5"], ["G5", "-", "-", "-", "E5", null, "C5", null],
                   ["D6", null, "A5", null, "F5", "-", "G5", "A5"], ["A#5", null, "F5", null, "D5", "-", "F5", "A#5"],
                   ["A5", null, "C6", "A5", "G5", "-", "F5", "E5"], ["F5", "-", "-", "-", null, null, null, null]];
      const ss = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
      return { len: 8, bpm: 84, dur() { return 60 / ((this.bpm + 14 * WARM) * MUSIC_TEMPO) * 4; }, play(i, t) {
        const s8 = this.dur() / 8, s16 = s8 / 2, ch = CH[i % 4].map(midi), w = WARM;
        // 1) лёд: редкие колокольчики — всегда, на холоде громче
        const bell = 0.05 + 0.05 * (1 - w);
        [0, 3, 6].forEach((k, j) => { if (Math.random() < 0.75) chip("sine", ch[(j + i) % 4] + 36, t + k * s8 + Math.random() * 0.03, s8 * 3, bell, 9000); });
        // 2) переливы — с 20% тепла
        const arp = 0.05 * ss(0.15, 0.45, w);
        if (arp > 0.002) for (let k = 0; k < 16; k++) chip("triangle", ch[k % 4] + 12 + (k >= 8 ? 12 : 0), t + k * s16, s16 * 0.8, arp, 1800 + 1600 * w);
        // 3) бас и тёплые аккорды — с 45%
        const bass = 0.13 * ss(0.4, 0.7, w);
        if (bass > 0.003) { chip("triangle", ch[0] - 12, t, s8 * 3.6, bass, 700); chip("triangle", ch[0] - 5, t + s8 * 4, s8 * 3.6, bass * 0.8, 700); }
        const padV = 0.04 * ss(0.45, 0.8, w);
        if (padV > 0.002) pad(ch.slice(1).map(m => m + 12), t, s8 * 8.2, padV);
        // 4) мелодия — с 60%, к теплу ярче
        const mel = 0.034 * ss(0.55, 0.85, w);
        if (mel > 0.002) lead(MEL, i, t, s8, "square", mel, 1600 + 2600 * w, 4);
        // 5) мягкий ритм — когда совсем тепло
        const dr = ss(0.8, 1, w);
        if (dr > 0.02) { drum("tak", t + s8 * 2, 0.35 * dr); drum("tak", t + s8 * 6, 0.35 * dr); for (let k = 0; k < 8; k++) drum("hat", t + k * s8, (k % 2 ? 0.25 : 0.4) * dr); drum("dum", t, 0.5 * dr); }
      } };
    })(),
    // «Сырники»: уютная кухонная босса-нова, ре мажор
    g28: (() => {
      const L = [
        ["F#5", "-", "A5", "-", "C#6", "-", "A5", "F#5"], ["D5", "-", "F#5", "A5", "-", "F#5", "D5", "-"],
        ["G5", "-", "B5", "-", "D6", "-", "B5", "G5"], ["E5", "-", "G5", "-", "C#6", "-", "A5", "-"],
        ["A5", "-", "F#5", "-", "D6", "-", "C#6", "A5"], ["B5", "-", "D6", "-", "F#6", "-", "D6", "B5"],
        ["G5", "F#5", "E5", "-", "G5", "-", "A5", "-"], ["F#5", "-", "-", "-", "E5", "-", "D5", "-"],
      ];
      const C = [["D3", "F#4", "A4", "C#5"], ["B2", "D4", "F#4", "A4"], ["E3", "G4", "B4", "D5"], ["A2", "G4", "C#5", "E5"],
                 ["D3", "F#4", "A4", "C#5"], ["G2", "F#4", "B4", "D5"], ["E3", "G4", "B4", "D5"], ["A2", "G4", "C#5", "E5"]];
      const CLAVE = [[0, 3, 6], [2, 4]];
      return { len: 8, bpm: 100, dur() { return 60 / (this.bpm * MUSIC_TEMPO) * 4; }, play(i, t) {
        const s8 = this.dur() / 8, ch = C[i].map(midi), row = L[i];
        for (let k = 0; k < 8; k++) {                       // «вибрафон»
          const n = row[k]; if (!n || n === "-") continue;
          let len = 1; while (row[k + len] === "-") len++;
          chip("sine", midi(n), t + k * s8, len * s8 * 0.95, 0.075, 5000, 2.5);
          chip("triangle", midi(n), t + k * s8, s8 * 0.4, 0.02, 2500);
        }
        [[0, 0], [3, 7], [4, 0], [7, 7]].forEach(([k, d]) => chip("triangle", ch[0] + d, t + k * s8, s8 * 1.1, 0.13, 800));
        pad(ch.slice(1), t, s8 * 8.1, 0.022);
        CLAVE[i % 2].forEach(k => drum("tak", t + k * s8, 0.42));
        for (let k = 0; k < 8; k++) drum("hat", t + k * s8, k % 2 ? 0.18 : 0.3);
      } };
    })(),
    // бонус: бой с Пылесосом — быстрый «файтинговый» 8-бит, ля минор
    bonusFight: (() => {
      const L = [
        ["A5", "-", "E5", "A5", "C6", "-", "B5", "A5"], ["G5", "-", "E5", "G5", "B5", "-", "A5", "G5"],
        ["F5", "-", "C5", "F5", "A5", "-", "G5", "F5"], ["E5", "-", "G#5", "B5", "E6", "-", "D6", "B5"],
        ["A5", "C6", "E6", "C6", "A5", "-", "E5", "-"], ["G5", "B5", "D6", "B5", "G5", "-", "D5", "-"],
        ["F5", "A5", "C6", "A5", "F5", "G5", "A5", "B5"], ["C6", "-", "B5", "-", "G#5", "-", "E5", "-"],
      ];
      const B = ["A2", "G2", "F2", "E2", "A2", "G2", "F2", "E2"];
      return { len: 8, bpm: 150, dur() { return 60 / (this.bpm * MUSIC_TEMPO) * 4; }, play(i, t) {
        const s8 = this.dur() / 8, b = midi(B[i]);
        lead(L, i, t, s8, "square", 0.04, 3000);
        for (let k = 0; k < 8; k++) {
          chip("triangle", b + (k % 2 ? 12 : 0), t + k * s8, s8 * 0.85, 0.15, 1000);
          drum("hat", t + k * s8, k % 2 ? 0.5 : 0.8);
          if (k % 2 === 0) drum("kick", t + k * s8, k === 0 || k === 4 ? 1 : 0.7);
          if (k === 2 || k === 6) drum("snare", t + k * s8);
        }
      } };
    })(),
    // бонус: финал — спокойная тёплая 8-битная мелодия, до мажор
    bonusCalm: (() => {
      const L = [
        ["E5", "-", "G5", "-", "C6", "-", "B5", "-"], ["A5", "-", "G5", "-", "E5", "-", "-", "-"],
        ["F5", "-", "A5", "-", "D6", "-", "C6", "-"], ["B5", "-", "G5", "-", "D5", "-", "-", "-"],
        ["E5", "-", "G5", "-", "C6", "-", "E6", "-"], ["D6", "-", "C6", "-", "A5", "-", "-", "-"],
        ["F5", "-", "E5", "-", "D5", "-", "G5", "-"], ["C5", "-", "-", "-", null, null, null, null],
      ];
      const C = [["C3", "E4", "G4"], ["A2", "C4", "E4"], ["F2", "A3", "C4"], ["G2", "B3", "D4"], ["C3", "E4", "G4"], ["A2", "C4", "E4"], ["F2", "A3", "C4"], ["C3", "E4", "G4"]];
      return { len: 8, bpm: 76, dur() { return 60 / (this.bpm * MUSIC_TEMPO) * 4; }, play(i, t) {
        const s8 = this.dur() / 8, ch = C[i].map(midi);
        lead(L, i, t, s8, "sine", 0.07, 4000, 3);
        for (let k = 0; k < 8; k++) chip("triangle", ch[(k % 3)] + 12, t + k * s8, s8 * 0.8, 0.035, 2200);
        chip("triangle", ch[0], t, s8 * 7.5, 0.1, 700);
        pad(ch.slice(1).map(m => m + 12), t, s8 * 8.1, 0.025);
      } };
    })(),
    silence: { len: 1, dur: () => 2, play() {} },
    // «Башня Виски»: бодрая «стройка» в фа мажоре; чем выше башня (WARM), тем больше слоёв
    g30: (() => {
      const L = [
        ["C5", "F5", "A5", "F5", "C6", "A5", "F5", "A5"], ["G5", "E5", "C5", "E5", "G5", "-", "E5", "-"],
        ["F5", "A5", "D6", "A5", "F5", "A5", "D6", "F6"], ["E6", "D6", "A#5", "F5", "D6", "-", "A#5", "-"],
        ["A5", "C6", "F6", "C6", "A5", "C6", "F6", "A5"], ["A#5", "G5", "D5", "G5", "A#5", "D6", "G6", "D6"],
        ["E6", "D6", "C6", "A#5", "A5", "G5", "E5", "G5"], ["F5", "-", "A5", "C6", "F6", "-", null, null],
      ];
      const C = [["F2", "A3", "C4", "F4"], ["C2", "G3", "C4", "E4"], ["D2", "A3", "D4", "F4"], ["A#1", "A#3", "D4", "F4"],
                 ["F2", "A3", "C4", "F4"], ["G2", "G3", "A#3", "D4"], ["C2", "G3", "A#3", "E4"], ["F2", "A3", "C4", "F4"]];
      const ss = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
      return { len: 8, bpm: 112, dur() { return 60 / (this.bpm * MUSIC_TEMPO) * 4; }, play(i, t) {
        const s8 = this.dur() / 8, ch = C[i].map(midi), w = WARM, row = L[i];
        // «маримба»: мягкий треугольник + звонкий призвук
        for (let k = 0; k < 8; k++) {
          const n = row[k]; if (!n || n === "-") continue;
          let len = 1; while (row[k + len] === "-") len++;
          chip("triangle", midi(n), t + k * s8, Math.min(len * s8, s8 * 1.6) * 0.8, 0.085, 3200);
          chip("sine", midi(n) + 12, t + k * s8, s8 * 0.35, 0.025, 6000);
        }
        // прыгающий бас
        [[0, 0], [3, 7], [4, 12], [6, 7]].forEach(([k, d]) => chip("triangle", ch[0] + d, t + k * s8, s8 * 0.8, 0.14, 900));
        drum("kick", t); drum("kick", t + 4 * s8, 0.8); drum("tak", t + 2 * s8, 0.55); drum("tak", t + 6 * s8, 0.55);
        for (let k = 1; k < 8; k += 2) drum("hat", t + k * s8, 0.35);
        // выше башня → аккорды на слабые доли
        const st = 0.012 * ss(0.3, 0.6, w);
        if (st > 0.001) [1, 3, 5, 7].forEach(k => ch.slice(1).forEach(m => chip("square", m, t + k * s8, s8 * 0.35, st, 1600)));
        // почти достроили → шестнадцатые и мелодия октавой выше
        const top = ss(0.65, 0.95, w);
        if (top > 0.02) {
          for (let k = 0; k < 16; k++) drum("hat", t + k * s8 / 2, (k % 2 ? 0.2 : 0.32) * top);
          lead(L, i, t, s8, "square", 0.014 * top, 3600);
        }
      } };
    })(),
  };
  let WARM = 0, WARM_TARGET = 0, TEMPO_TARGET = 1, MUSIC_TEMPO = 1, cur = "room", want = "room", step = 0, nextT = 0, timer = null;
  const tbus = {};
  function bus(name) {
    if (!tbus[name]) { tbus[name] = ac.createGain(); tbus[name].gain.value = 0; tbus[name].connect(musicBus); }
    return tbus[name];
  }
  let bar = 0;
  function scheduleBar(i, t) {
    const [ch, mel] = SONG[i];
    if (ch) {
      const c = CH[ch].map(midi);
      pad(c.map(m => m + 12), t, BEAT * 3.1);
      box(c[0] + 12, t, 0.10, 2.2); box(c[1] + 12, t + BEAT, 0.07, 1.6); box(c[2], t + BEAT * 2, 0.07, 1.6);
      let tt = t; mel.forEach(([n, b]) => { box(midi(n), tt, 0.2, 2.0); tt += b * BEAT; });
      if (Math.random() < 0.25) box(c[2] + 24, t + BEAT * 2.5, 0.05, 2.5);   // искорка
    }
  }
  function ramp(param, to, t, dur) {                     // плавно, от текущего значения
    param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(to, t + dur);
  }
  function switchTo(name) {                              // перекрёстное затухание: старый трек уходит ~2 с, новый входит ~2.5 с
    const t = ac.currentTime;
    if (cur !== name) { ramp(bus(cur).gain, 0, t, 2.0); cur = name; step = 0; nextT = t + 0.6; ramp(bus(cur).gain, 0, t, 0.05); }
    const g = bus(cur).gain; g.cancelScheduledValues(t + 0.06); g.setValueAtTime(g.value, t + 0.06); g.linearRampToValueAtTime(name === "room" ? 1 : 0.9, t + 2.6);
  }
  function tick() {
    if (!ac) return;
    if (want !== cur) switchTo(want);
    WARM += (WARM_TARGET - WARM) * 0.05;
    if (Math.abs(MUSIC_TEMPO - TEMPO_TARGET) > 0.002) MUSIC_TEMPO += (TEMPO_TARGET - MUSIC_TEMPO) * 0.06;   // темп меняется плавно
    const tr = TRACKS[cur];
    while (nextT < ac.currentTime + 0.6) { OUT = bus(cur); tr.play(step, nextT); OUT = null; nextT += tr.dur(); step = (step + 1) % tr.len; }
  }
  function startMusic() { if (timer) return; nextT = ac.currentTime + 0.3; step = 0; switchTo(want); timer = setInterval(tick, 120); tick(); }
  window.MUSIC = {
    play(name) { const n = TRACKS[name] ? name : "room"; if (n !== want) { want = n; TEMPO_TARGET = 1; MUSIC_TEMPO = 1; } if (ac && timer) tick(); },
    tempo(x) { TEMPO_TARGET = x; },
    warm(x) { WARM_TARGET = Math.max(0, Math.min(1, x)); },
    _dbg: () => ({ ac, master, cur, want, tempo: MUSIC_TEMPO, tick, stop: () => clearInterval(timer) }),
  };

  // ---------- эффекты ----------
  function noise(t, dur, type, f0, f1, vol, q = 1) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone(t, f0, f1, dur, vol, type = "sine") {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  let purr = null, lastMeow = -1;
  const FX = {
    click() { const t = ac.currentTime; tone(t, 1300, 900, 0.06, 0.12); },
    pop() { const t = ac.currentTime; tone(t, 520, 760, 0.09, 0.05); },
    deny() { const t = ac.currentTime; tone(t, 220, 150, 0.16, 0.16, "triangle"); },
    ding() { const t = ac.currentTime; [1568, 2349, 3136].forEach((f, i) => tone(t + i * 0.07, f, f, 1.1, 0.07)); },
    paper() { const t = ac.currentTime; noise(t, 0.18, "bandpass", 2500, 4200, 0.35, 0.8); noise(t + 0.16, 0.26, "bandpass", 3800, 1800, 0.3, 0.8); },
    land() { const t = ac.currentTime; tone(t, 140, 55, 0.14, 0.35); noise(t, 0.08, "lowpass", 600, 200, 0.2); },
    whoosh() { const t = ac.currentTime; noise(t, 0.22, "bandpass", 600, 2600, 0.35, 1.2); },
    catch() { const t = ac.currentTime; tone(t, 1319, 1319, 0.35, 0.10); tone(t + 0.06, 1976, 1976, 0.45, 0.07); },
    smash() {                                  // стеклянный шар: треск, звон осколков, удар об пол, отскоки
      const t = ac.currentTime;
      noise(t, 0.09, "highpass", 1800, 5000, 0.75, 0.5);
      noise(t, 0.4, "bandpass", 5200, 3000, 0.3, 2.5);
      tone(t, 180, 60, 0.12, 0.28, "sine");
      for (let i = 0; i < 14; i++) { const f = 2800 + Math.random() * 4800, d = Math.random() * 0.18; tone(t + d, f, f * (0.97 + Math.random() * 0.04), 0.09 + Math.random() * 0.25, 0.07 + Math.random() * 0.05); }
      for (let i = 0; i < 4; i++) { const d = 0.18 + i * 0.09 + Math.random() * 0.05, f = 3500 + Math.random() * 3000; tone(t + d, f, f, 0.06, 0.05 / (i + 1)); noise(t + d, 0.03, "highpass", 4000, 6000, 0.12 / (i + 1)); }
    },
    steam(len = 0.9, vol = 0.32) {                       // шипение пара
      const t = ac.currentTime;
      noise(t, len, "highpass", 2400, 5200, vol, 0.7); noise(t + 0.02, len * 0.8, "bandpass", 5200, 3000, vol * 0.6, 1.5);
    },
    gurgle() {                                            // бульканье воды в трубах
      const t = ac.currentTime;
      for (let i = 0; i < 6; i++) { const d = i * 0.07 + Math.random() * 0.05, f = 180 + Math.random() * 220; tone(t + d, f, f * 1.8, 0.06, 0.05, "sine"); }
      noise(t, 0.4, "lowpass", 500, 250, 0.08, 0.8);
    },
    blip(f = 880, type = "square") { const t = ac.currentTime; tone(t, f, f * 0.98, 0.04, 0.045, type); },     // печать текста
    punch() { const t = ac.currentTime; tone(t, 170, 45, 0.16, 0.38, "sine"); noise(t, 0.12, "lowpass", 1400, 200, 0.45, 0.8); },
    roundBell() { const t = ac.currentTime; [988, 1319, 1976].forEach((f, i) => tone(t + i * 0.09, f, f, 0.5, 0.09, "square")); noise(t, 0.05, "highpass", 4000, 6000, 0.15, 1); },
    ko() { const t = ac.currentTime; tone(t, 700, 70, 1.1, 0.22, "square"); tone(t + 0.02, 350, 40, 1.2, 0.18, "sawtooth"); noise(t, 0.7, "lowpass", 2400, 120, 0.45, 0.7); },
    firework() {                                          // свист вверх, хлопок и треск
      const t = ac.currentTime;
      tone(t, 500, 1400, 0.35, 0.04, "sine");
      noise(t + 0.33, 0.25, "lowpass", 900, 200, 0.35, 0.8);
      for (let i = 0; i < 9; i++) { const d = 0.4 + Math.random() * 0.5; noise(t + d, 0.02, "bandpass", 3000 + Math.random() * 3000, 2500, 0.08, 3); }
    },
    kiss() {                                              // «чмок»
      const t = ac.currentTime;
      tone(t, 700, 1900, 0.05, 0.16, "sine"); noise(t + 0.012, 0.045, "bandpass", 2400, 3400, 0.22, 2.5); tone(t + 0.055, 1600, 900, 0.035, 0.05, "sine");
    },
    sizzle(v = 1) {                                       // шкворчание масла: шипение + мелкие щелчки
      const t = ac.currentTime;
      noise(t, 0.32, "highpass", 4200, 5600, 0.035 * v, 0.6);
      for (let i = 0; i < 4; i++) { const d = Math.random() * 0.28; noise(t + d, 0.018, "bandpass", 2600 + Math.random() * 3200, 2400, 0.09 * v, 3); }
    },
    hissShort() { const t = ac.currentTime; noise(t, 0.28, "highpass", 3200, 4600, 0.18, 0.8); },
    clank() { const t = ac.currentTime; tone(t, 520, 380, 0.07, 0.12, "square"); noise(t, 0.05, "bandpass", 3200, 2200, 0.25, 4); tone(t + 0.03, 1250, 1180, 0.18, 0.04, "triangle"); },
    flip() { const t = ac.currentTime; noise(t, 0.05, "bandpass", 2600, 1800, 0.35, 1.8); noise(t + 0.04, 0.04, "bandpass", 1600, 1200, 0.2, 1.8); },
    step() { const t = ac.currentTime, f = 180 + Math.random() * 60; noise(t, 0.05, "lowpass", 700, 300, 0.12, 0.7); tone(t, f, f * 0.7, 0.05, 0.04); },
    thud() { const t = ac.currentTime; tone(t, 110, 55, 0.16, 0.32); noise(t, 0.12, "lowpass", 900, 250, 0.3, 0.8); },
    jingle() { const t = ac.currentTime; [2637, 3136, 3951, 3520, 4186].forEach((f, i) => tone(t + i * 0.045 + Math.random() * 0.02, f, f * 0.99, 0.28, 0.07, "triangle")); },
    unlock() { const t = ac.currentTime; noise(t, 0.04, "bandpass", 2500, 2500, 0.4, 3); tone(t + 0.07, 900, 500, 0.06, 0.12, "square"); },
    creak() {
      const t = ac.currentTime + 0.12, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(90, t);
      for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(80 + Math.random() * 70, t + i * 0.07);
      f.type = "bandpass"; f.frequency.value = 1100; f.Q.value = 6;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.05); g.gain.linearRampToValueAtTime(0, t + 0.6);
      o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.65);
    },
    crunch() { const t = ac.currentTime; for (let i = 0; i < 4; i++) noise(t + i * 0.06, 0.05, "bandpass", 1500 + Math.random() * 1500, 900, 0.3, 1.5); tone(t + 0.25, 660, 990, 0.12, 0.08, "square"); },
    eat() { const t = ac.currentTime; for (let i = 0; i < 7; i++) noise(t + i * 0.13 + Math.random() * 0.03, 0.06, "bandpass", 1300 + Math.random() * 1200, 800, 0.28, 1.4); },
    fanfare() { const t = ac.currentTime; [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]].forEach(([f, d]) => tone(t + d, f, f, d > 0.3 ? 0.5 : 0.14, 0.1, "square")); },
    lightsOff() { const t = ac.currentTime; noise(t, 0.03, "bandpass", 3000, 3000, 0.5, 4); tone(t, 1200, 300, 0.25, 0.06, "sine"); },
    sneezeIn() { const t = ac.currentTime; noise(t, 0.45, "bandpass", 700, 1900, 0.07, 0.8); noise(t + 0.52, 0.4, "bandpass", 900, 2400, 0.09, 0.8); },   // «а… а-а…»: короткие вдохи
    sneezeOut() { const t = ac.currentTime; noise(t, 0.05, "lowpass", 900, 500, 0.2, 0.8); noise(t + 0.03, 0.2, "highpass", 2600, 5400, 0.34, 0.7); tone(t + 0.02, 560, 300, 0.09, 0.05, "triangle"); },   // «пчх»
    tvStatic(len = 0.5) { const t = ac.currentTime; noise(t, len, "highpass", 3800, 3200, 0.1, 0.5); tone(t, 15700, 15700, len, 0.004); },
    rustle() { const t = ac.currentTime; noise(t, 0.7, "bandpass", 1300, 700, 0.1, 0.6); noise(t + 0.35, 0.6, "bandpass", 900, 1500, 0.08, 0.6); },
    knock() { const t = ac.currentTime; [0, 0.22].forEach(d => { tone(t + d, 150, 70, 0.12, 0.3); noise(t + d, 0.06, "lowpass", 900, 300, 0.3, 0.8); }); },
    hiss() { const t = ac.currentTime; noise(t, 0.75, "highpass", 2600, 3800, 0.22, 0.7); },
    purrStart() {
      if (purr) return; const t = ac.currentTime;
      const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 260;
      const am = ac.createGain(); am.gain.value = 0.5;
      const lfo = ac.createOscillator(); lfo.frequency.value = 24; const lg = ac.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.9, t + 0.4);
      // медленное «вдох-выдох» мурчания
      const br = ac.createOscillator(); br.frequency.value = 0.55; const bg = ac.createGain(); bg.gain.value = 0.35; br.connect(bg); bg.connect(g.gain);
      s.connect(f); f.connect(am); am.connect(g); g.connect(sfxBus);
      s.start(t); lfo.start(t); br.start(t); purr = { s, lfo, br, g };
    },
    purrStop() {
      if (!purr) return; const t = ac.currentTime, p = purr; purr = null;
      p.g.gain.cancelScheduledValues(t); p.g.gain.setTargetAtTime(0, t, 0.15);
      [p.s, p.lfo, p.br].forEach(n => n.stop(t + 0.8));
    },
    meow(mood) {
      if (!meows.length) return;
      let k = Math.floor(Math.random() * meows.length);
      if (meows.length > 1 && k === lastMeow) k = (k + 1 + Math.floor(Math.random() * (meows.length - 1))) % meows.length;
      lastMeow = k;
      const s = ac.createBufferSource(); s.buffer = meows[k];
      s.playbackRate.value = mood === "angry" ? 0.92 : 0.97 + Math.random() * 0.08;
      const g = ac.createGain(); g.gain.value = 0.85; s.connect(g); g.connect(dryBus); s.start();
    },
  };

  // публичный интерфейс для страницы
  window.SFX = new Proxy({}, { get: (_, k) => (...a) => { try { if (ac && S.on && S.sfxOn && FX[k]) FX[k](...a); } catch (e) {} } });
  window.SFX_HAS_MEOW = () => meows.length > 0;

  function turnOn() {
    init(); if (ac.state === "suspended") ac.resume();
    S.on = true; save(); applyVolumes(); startMusic(); render();
  }
  function turnOff() { S.on = false; save(); applyVolumes(); FX.purrStop && ac && FX.purrStop(); render(); }

  // ---------- кнопка и панель ----------
  const css = document.createElement("style");
  css.textContent = `
  #snd { position: absolute; right: 1.2%; top: 2.2%; z-index: 7; width: calc(46px * var(--u)); height: calc(46px * var(--u)); min-width: 30px; min-height: 30px;
    border-radius: 50%; border: 2px solid rgba(255,236,200,.55); background: rgba(24,18,34,.6); color: #ffe7b8; cursor: pointer;
    font: calc(20px * var(--u)) Rubik, sans-serif; display: flex; align-items: center; justify-content: center; }
  #snd.off { opacity: .75; }
  #snd svg { width: 58%; height: 58%; display: block; }
  #sndp { position: absolute; right: 1.2%; top: calc(2.2% + 54px * var(--u)); z-index: 7; display: none; background: rgba(24,18,34,.88);
    color: #fff1d8; border: 2px solid rgba(255,236,200,.35); border-radius: 12px; padding: 12px 14px; font: 14px Rubik, sans-serif; width: 230px; }
  #sndp.open { display: block; }
  #sndp label { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
  #sndp input[type=range] { flex: 1; accent-color: #ffcf7a; }
  #sndp .row { display: flex; justify-content: space-between; align-items: center; }
  #sndp button { font: 13px Rubik, sans-serif; background: #ffcf7a; color: #2b1d14; border: 0; border-radius: 8px; padding: 6px 10px; cursor: pointer; }`;
  document.head.appendChild(css);
  const stage = document.getElementById("stage");
  const btn = document.createElement("button"); btn.id = "snd"; btn.title = "Звук";
  const pan = document.createElement("div"); pan.id = "sndp";
  pan.innerHTML = `<div class="row"><b>Звук</b><button id="sndAll"></button></div>
    <label><input type="checkbox" id="sndM"> Музыка <input type="range" id="sndMv" min="0" max="1" step="0.05"></label>
    <label><input type="checkbox" id="sndE"> Эффекты <input type="range" id="sndEv" min="0" max="1" step="0.05"></label>`;
  stage.appendChild(btn); stage.appendChild(pan);
  const $ = (id) => pan.querySelector(id);
  const ICON_ON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.2h3.8l4.9-4v13.6l-4.9-4H3.5z" fill="currentColor"/><path d="M15.8 8.6a4.8 4.8 0 0 1 0 6.8"/><path d="M18.6 5.8a8.8 8.8 0 0 1 0 12.4"/></svg>`;
  const ICON_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.2h3.8l4.9-4v13.6l-4.9-4H3.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>`;
  function render() {
    btn.classList.toggle("off", !S.on); btn.innerHTML = S.on ? ICON_ON : ICON_OFF;
    $("#sndAll").textContent = S.on ? "Выключить" : "Включить";
    $("#sndM").checked = S.musicOn; $("#sndE").checked = S.sfxOn; $("#sndMv").value = S.music; $("#sndEv").value = S.sfx;
  }
  btn.onclick = (e) => { e.stopPropagation(); if (!S.on && !started) { started = true; turnOn(); } pan.classList.toggle("open"); };
  $("#sndAll").onclick = () => (S.on ? turnOff() : turnOn());
  $("#sndM").onchange = (e) => { S.musicOn = e.target.checked; save(); applyVolumes(); };
  $("#sndE").onchange = (e) => { S.sfxOn = e.target.checked; save(); applyVolumes(); };
  $("#sndMv").oninput = (e) => { S.music = +e.target.value; save(); applyVolumes(); };
  $("#sndEv").oninput = (e) => { S.sfx = +e.target.value; save(); applyVolumes(); };
  document.addEventListener("pointerdown", (e) => { if (!pan.contains(e.target) && e.target !== btn) pan.classList.remove("open"); });
  // iPhone/Android: звук «просыпается» только от настоящего касания (touchend/click), а после блокировки экрана засыпает снова
  let woke = false;
  const wake = () => {
    if (!ac || !S.on) return;
    if (ac.state !== "running") ac.resume();
    if (!woke) { woke = true; try { const b = ac.createBuffer(1, 1, 22050), src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(0); } catch (e) {} }
  };
  ["touchend", "click", "pointerup", "keydown"].forEach((ev) => document.addEventListener(ev, wake, true));
  document.addEventListener("visibilitychange", () => {      // свернули сайт — музыка замолкает, вернулись — играет дальше
    if (!document.hidden) wake(); else if (ac && ac.state === "running") ac.suspend().catch(() => {});
  });
  // если звук был включён в прошлый раз — вернём его после первого клика (браузеры не дают играть звук без действия)
  if (S.on) { S.on = false; const once = () => { document.removeEventListener("pointerdown", once, true); turnOn(); }; document.addEventListener("pointerdown", once, true); }
  render();
})();
