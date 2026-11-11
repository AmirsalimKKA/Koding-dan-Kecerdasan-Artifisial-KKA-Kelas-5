/* VisualMath.Lim – Audio bersama Bab 2 (Pertemuan 2–5)
   - Efek suara: Web Audio API (dibuat lokal, tanpa file musik eksternal)
   - Narasi: Web Speech API (id-ID), bila tersedia di browser
   - Tidak ada suara otomatis; semua suara dimulai oleh tindakan murid. */
(function (w) {
  'use strict';
  var KEY = 'bab2_audio_v1';
  var st = { on: false, vol: 0.7, voice: '' };
  try {
    var s = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof s.vol === 'number') st.vol = Math.min(1, Math.max(0, s.vol));
    if (typeof s.voice === 'string') st.voice = s.voice;
    if (s.on === true) st.on = true;
  } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  /* ---------- Efek suara ---------- */
  var ctx = null;
  function ac() {
    if (!ctx) {
      var C = w.AudioContext || w.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  function tone(f, t0, d, type, g) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), a = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    var v = Math.max(0.0001, (g || 0.15) * st.vol);
    var t = c.currentTime + t0;
    a.gain.setValueAtTime(0.0001, t);
    a.gain.exponentialRampToValueAtTime(v, t + 0.02);
    a.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(a); a.connect(c.destination);
    o.start(t); o.stop(t + d + 0.03);
  }
  var FX = {
    click: function () { tone(660, 0, 0.07, 'sine', 0.1); },
    pop: function () { tone(880, 0, 0.08, 'sine', 0.1); },
    ok: function () { tone(523, 0, 0.12, 'sine', 0.15); tone(784, 0.1, 0.22, 'sine', 0.15); },
    no: function () { tone(300, 0, 0.16, 'triangle', 0.1); tone(250, 0.14, 0.22, 'triangle', 0.09); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.28, 'sine', 0.15); }); }
  };
  function sfx(n) {
    if (!st.on || !FX[n]) return;
    try { FX[n](); } catch (e) {}
  }

  /* ---------- Narasi ---------- */
  var SS = w.speechSynthesis || null;
  var ui = {};
  function idVoices() {
    if (!SS) return [];
    return SS.getVoices().filter(function (v) { return /^id/i.test(v.lang) || /indones/i.test(v.name); });
  }
  function clean(t) {
    var r = String(t || '');
    try { r = r.replace(/[\p{Extended_Pictographic}️‍]/gu, ''); } catch (e) {}
    return r.replace(/[•▶◀✔]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function note(msg) { if (ui.note) { ui.note.textContent = msg || ''; ui.note.hidden = !msg; } }
  function setState(s) {
    if (!ui.play) return;
    ui.pause.disabled = s === 'idle';
    ui.stop.disabled = s === 'idle';
    ui.pause.textContent = s === 'paused' ? '▶ Lanjut' : '⏸ Jeda';
    ui.play.classList.toggle('on', s === 'playing');
  }
  function stop() {
    if (SS) { try { SS.cancel(); } catch (e) {} }
    setState('idle');
  }
  function speak(text) {
    if (!SS || !w.SpeechSynthesisUtterance) {
      note('Browser ini belum mendukung narasi suara. Silakan baca teks di layar.');
      return false;
    }
    var vs = SS.getVoices(), idv = idVoices();
    if (vs.length && !idv.length) {
      note('Suara Bahasa Indonesia belum tersedia di perangkat ini. Silakan baca teks di layar.');
      return false;
    }
    note('');
    stop();
    setOn(true);
    var parts = clean(text).match(/[^.!?]+[.!?]*/g) || [];
    var chunks = [];
    parts.forEach(function (p) {
      p = p.trim();
      while (p.length > 180) {
        var cut = p.lastIndexOf(',', 180); if (cut < 40) cut = p.lastIndexOf(' ', 180);
        if (cut < 1) cut = 180;
        chunks.push(p.slice(0, cut + 1)); p = p.slice(cut + 1).trim();
      }
      if (p) chunks.push(p);
    });
    if (!chunks.length) return false;
    var chosen = null;
    if (st.voice) idv.forEach(function (v) { if (v.name === st.voice) chosen = v; });
    if (!chosen && idv.length) chosen = idv[0];
    try {
      chunks.forEach(function (c, i) {
        var u = new SpeechSynthesisUtterance(c);
        u.lang = 'id-ID'; u.rate = 0.95; u.volume = st.vol;
        if (chosen) u.voice = chosen;
        if (i === chunks.length - 1) { u.onend = function () { setState('idle'); }; u.onerror = function () { setState('idle'); }; }
        SS.speak(u);
      });
    } catch (e) {
      stop();
      note('Narasi suara tidak dapat dijalankan di perangkat ini. Silakan baca teks di layar.');
      return false;
    }
    setState('playing');
    return true;
  }

  /* ---------- Panel kontrol ---------- */
  function setOn(v) {
    st.on = !!v; save();
    if (ui.mute) {
      ui.mute.setAttribute('aria-pressed', String(st.on));
      ui.mute.textContent = st.on ? '🔊 Suara menyala' : '🔇 Suara mati';
      ui.mute.classList.toggle('on', st.on);
    }
    if (!st.on) stop();
  }
  function css() {
    if (document.getElementById('kk-aud-css')) return;
    var s = document.createElement('style'); s.id = 'kk-aud-css';
    s.textContent =
      '.kk-aud{max-width:980px;margin:10px auto 0;padding:8px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:rgba(255,255,255,.18);border-radius:18px;color:#fff;font:700 .85rem Nunito,system-ui,sans-serif}' +
      '.kk-aud button{border:0;cursor:pointer;font:inherit;font-weight:800;color:#1d1b4c;background:#fff;border-radius:99px;padding:6px 12px;min-height:44px;box-shadow:0 3px 0 rgba(0,0,0,.2)}' +
      '.kk-aud button.on{background:#ffc93c}' +
      '.kk-aud button[disabled]{opacity:.45;cursor:default}' +
      '.kk-aud label{display:inline-flex;align-items:center;gap:6px}' +
      '.kk-aud input[type=range]{width:90px;accent-color:#ffc93c}' +
      '.kk-aud select{font:inherit;min-height:44px;border-radius:12px;border:0;padding:0 8px;max-width:180px}' +
      '.kk-aud .kk-n{flex-basis:100%;margin:0;font-weight:700;background:rgba(0,0,0,.25);padding:6px 10px;border-radius:10px}' +
      '.kk-aud button:focus-visible,.kk-aud input:focus-visible,.kk-aud select:focus-visible{outline:3px solid #ffc93c;outline-offset:2px}';
    document.head.appendChild(s);
  }
  /* opsi: { target: Element, getText: function():string } */
  function mount(opt) {
    css();
    var box = document.createElement('div');
    box.className = 'kk-aud'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Pengaturan suara dan narasi');
    box.innerHTML =
      '<button type="button" data-k="mute" aria-pressed="false">🔇 Suara mati</button>' +
      '<button type="button" data-k="play">🔈 Putar Narasi</button>' +
      '<button type="button" data-k="pause" disabled>⏸ Jeda</button>' +
      '<button type="button" data-k="stop" disabled>⏹ Henti</button>' +
      '<label>Volume <input type="range" min="0" max="1" step="0.1" data-k="vol" aria-label="Volume"></label>' +
      '<label data-k="vl" hidden>Suara <select data-k="voice" aria-label="Pilih suara narasi"></select></label>' +
      '<p class="kk-n" data-k="note" role="status" hidden></p>';
    opt.target.insertBefore(box, opt.target.firstChild);
    var q = function (k) { return box.querySelector('[data-k=' + k + ']'); };
    ui = { box: box, mute: q('mute'), play: q('play'), pause: q('pause'), stop: q('stop'), vol: q('vol'), vl: q('vl'), voice: q('voice'), note: q('note') };
    ui.vol.value = st.vol;
    setOn(st.on);
    ui.mute.onclick = function () { setOn(!st.on); if (st.on) sfx('pop'); };
    ui.play.onclick = function () { speak(opt.getText()); };
    ui.pause.onclick = function () {
      if (!SS) return;
      if (SS.paused) { SS.resume(); setState('playing'); } else { SS.pause(); setState('paused'); }
    };
    ui.stop.onclick = stop;
    ui.vol.oninput = function () { st.vol = parseFloat(ui.vol.value); save(); };
    ui.voice.onchange = function () { st.voice = ui.voice.value; save(); };
    function fillVoices() {
      var v = idVoices();
      ui.voice.innerHTML = v.map(function (x) { return '<option value="' + x.name.replace(/"/g, '&quot;') + '">' + x.name + '</option>'; }).join('');
      if (st.voice) ui.voice.value = st.voice;
      ui.vl.hidden = v.length < 2;
    }
    if (SS) { fillVoices(); SS.onvoiceschanged = fillVoices; }
    else note('Browser ini belum mendukung narasi suara. Semua penjelasan tetap tersedia dalam bentuk teks.');
    /* efek klik ringan untuk tombol, kecuali yang bertanda data-nosfx */
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('button,a.btn,.opt');
      if (t && !t.closest('[data-nosfx]') && !t.closest('.kk-aud')) sfx('click');
    });
    w.addEventListener('pagehide', stop);
  }
  w.KKA = { sfx: sfx, speak: speak, stop: stop, mount: mount, isOn: function () { return st.on; } };
})(window);
