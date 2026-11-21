/* AI Video Editor: the animated scenes.
 *
 * render.js puts the reel spec in window.SPEC and loads this file into a 1080x1920 page. This file builds every scene
 * as HTML, and window.seek(t) shows the exact frame at t seconds (render.js calls it once per frame, so every frame is
 * the same on every run). Opened on its own in a browser, the page plays in a loop.
 *
 * Every animation is a CSS animation with fill "both" and a delay counted from the start of its scene: seek(t) pauses
 * them all and sets each one's clock to (t - scene start). Custom scenes follow the same rule (see SKILL.md).
 */
(function () {
  'use strict';
  var S = window.SPEC || {};
  var W = 1080, H = 1920;
  if (S.size) { var m = String(S.size).split('x'); W = +m[0] || W; H = +m[1] || H; }
  var brand = S.brand || {};
  var C = Object.assign({ bg: '#101216', accent: '#FFD23F', text: '#FFFFFF', ink: '#111111' }, brand.colors || {});
  var scenes = S.scenes || [];

  // ---------- timeline (render.js fills S.timeline and S.words; this is the fallback for a raw page) ----------
  var tl = S.timeline;
  if (!tl) {
    tl = []; var at = 0;
    scenes.forEach(function (sc) {
      var words = String(sc.voice || sc.title || sc.text || '').split(/\s+/).length;
      var d = sc.duration || Math.max(2.4, words / 2.6 + 0.6);
      tl.push({ start: at, dur: d, voiceAt: 0.25, voiceDur: d - 0.5 }); at += d;
    });
  }
  var TOTAL = tl.length ? tl[tl.length - 1].start + tl[tl.length - 1].dur : 1;
  var WORDS = S.words || [];

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function an(name, dur, delay, ease, extra) {
    return 'animation:' + name + ' ' + dur + 's ' + (ease || 'cubic-bezier(.2,.8,.2,1)') + ' ' + (delay || 0) + 's ' + (extra || '') + ' both;';
  }
  function photo(sc) { return sc.photo || S.photo || ''; }
  // **word** in any text = accent color
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="acc">$1</span>'); }
  function popWords(text, start, step) {
    var parts = String(text).split(/\s+/).filter(Boolean), out = [], k = 0;
    parts.forEach(function (w) {
      var hot = /^\*\*.*\*\*[^\w]*$/.test(w) || /^\*\*/.test(w);
      out.push('<span class="w' + (hot ? ' acc' : '') + '" style="' + an('slam', 0.5, start + k * step, 'cubic-bezier(.2,.9,.3,1.25)') + '">' + esc(w.replace(/\*\*/g, '')) + '</span>');
      k++;
    });
    return out.join(' ');
  }
  function bgLayer(sc, dur) {
    var p = photo(sc);
    if (!p) return '<div class="bg grad"></div>';
    return '<div class="bg"><img src="' + esc(p) + '" style="' + an('kbBg', dur, 0, 'linear') + '"></div><div class="shade"></div>';
  }
  function card(sc, dur, cls, delay) {
    var p = photo(sc);
    if (!p) return '';
    var fit = sc.fit === 'contain' ? 'contain' : 'cover';
    var pos = sc.focus || 'center';
    return '<div class="card ' + (cls || '') + '" style="' + an('rise', 0.6, delay || 0) + '">' +
      '<img style="object-fit:' + fit + ';object-position:' + esc(pos) + ';' + an('kb', dur, 0, 'linear') + '" src="' + esc(p) + '"></div>';
  }

  // ---------- scene builders: each returns inner HTML ----------
  var B = {
    hook: function (sc, d) {
      return bgLayer(sc, d) +
        '<div class="hookText fit" data-max="560">' + popWords(sc.title || sc.text || '', 0.08, 0.09) + '</div>' +
        card(sc, d, 'hookCard', 0.25) +
        '<div class="sticker" style="' + an('stamp', 0.5, 0.55 + 0.09 * String(sc.title || '').split(/\s+/).length * 0.5) + '">' + esc(sc.sticker || '?') + '</div>';
    },
    answer: function (sc, d) {
      return bgLayer(sc, d) + card(sc, d, 'answerCard', 0) +
        '<div class="answerBox" style="' + an('slam', 0.55, 0.3, 'cubic-bezier(.2,.9,.3,1.25)') + '">' +
        '<div class="answerTitle fit" data-max="330">' + rich(sc.title || '') + '</div>' +
        (sc.sub ? '<div class="answerSub" style="' + an('rise', 0.5, 0.75) + '">' + rich(sc.sub) + '</div>' : '') +
        '</div>' +
        (sc.stamp ? '<div class="stamp" style="' + an('stamp', 0.5, 0.95) + '">' + esc(sc.stamp) + '</div>' : '');
    },
    points: function (sc, d) {
      var items = sc.items || [];
      var span = Math.max(0.6, (d - 1.4)), step = items.length > 1 ? Math.min(1.1, span / items.length) : 0;
      var rows = items.map(function (it, i) {
        return '<div class="pt" style="' + an('slideL', 0.5, 0.45 + i * step) + '"><span class="tick">' + esc(sc.icon || '✓') + '</span><span>' + rich(it) + '</span></div>';
      }).join('');
      return bgLayer(sc, d) +
        (photo(sc) ? '<div class="thumb" style="' + an('pop', 0.6, 0.1) + '"><img src="' + esc(photo(sc)) + '" style="' + an('kb', d, 0, 'linear') + '"></div>' : '') +
        '<div class="ptTitle fit" data-max="300" style="' + an('rise', 0.5, 0.05) + '">' + rich(sc.title || '') + '</div>' +
        '<div class="pts fit" data-max="470">' + rows + '</div>';
    },
    stat: function (sc, d) {
      return bgLayer(sc, d) +
        '<div class="statWrap" style="' + an('pop', 0.6, 0.1) + '">' +
        '<svg class="ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="track"/>' +
        '<circle cx="100" cy="100" r="88" class="arc" style="' + an('ring', 1.4, 0.2, 'cubic-bezier(.3,.7,.2,1)') + '"/></svg>' +
        '<div class="statNum" data-count="' + (+sc.value || 0) + '" data-dec="' + (sc.decimals || 0) + '" data-pre="' + esc(sc.prefix || '') + '" data-suf="' + esc(sc.suffix || '') + '">0</div></div>' +
        '<div class="statLabel fit" data-max="300" style="' + an('rise', 0.5, 0.9) + '">' + rich(sc.label || sc.title || '') + '</div>' +
        (sc.source ? '<div class="statSrc" style="' + an('rise', 0.5, 1.2) + '">' + esc(sc.source) + '</div>' : '');
    },
    quote: function (sc, d) {
      var n = Math.max(0, Math.min(5, sc.stars == null ? 5 : +sc.stars));
      var stars = ''; for (var i = 0; i < n; i++) stars += '<span style="' + an('pop', 0.35, 0.35 + i * 0.1) + '">★</span>';
      return bgLayer(sc, d) + card(sc, d, 'quoteCard', 0) +
        '<div class="quoteBox" style="' + an('rise', 0.55, 0.15) + '">' +
        '<div class="stars">' + stars + '</div>' +
        '<div class="quoteText fit" data-max="420">“' + rich(sc.text || '') + '”</div>' +
        (sc.author ? '<div class="quoteBy">' + esc(sc.author) + '</div>' : '') + '</div>';
    },
    compare: function (sc, d) {
      var L = sc.left || {}, R = sc.right || {};
      var n = Math.max((L.items || []).length, (R.items || []).length);
      var rows = '';
      for (var i = 0; i < n; i++) {
        rows += '<div class="cRow" style="' + an('slideL', 0.45, 0.6 + i * 0.45) + '">' +
          '<div class="cCell bad">✕ ' + rich((L.items || [])[i] || '') + '</div>' +
          '<div class="cCell good">✓ ' + rich((R.items || [])[i] || '') + '</div></div>';
      }
      return bgLayer(sc, d) +
        (photo(sc) ? '<div class="thumb" style="' + an('pop', 0.6, 0.1) + '"><img src="' + esc(photo(sc)) + '" style="' + an('kb', d, 0, 'linear') + '"></div>' : '') +
        '<div class="ptTitle fit" data-max="260" style="' + an('rise', 0.5, 0.05) + '">' + rich(sc.title || '') + '</div>' +
        '<div class="cHead" style="' + an('rise', 0.5, 0.3) + '"><div>' + esc(L.title || 'Others') + '</div><div class="good">' + esc(R.title || brand.name || 'Ours') + '</div></div>' +
        '<div class="cRows">' + rows + '</div>';
    },
    cta: function (sc, d) {
      return bgLayer(sc, d) + card(sc, d, 'ctaCard', 0) +
        '<div class="ctaTitle fit" data-max="260">' + popWords(sc.title || 'Get yours', 0.15, 0.1) + '</div>' +
        '<div class="ctaUrl" style="' + an('pop', 0.55, 0.6) + '"><span>' + esc(sc.url || brand.url || '') + '</span>' +
        '<span class="arrow" style="' + an('nudge', 0.8, 1.1, 'ease-in-out', 'infinite') + '">→</span></div>' +
        (sc.button ? '<div class="ctaBtn" style="' + an('rise', 0.5, 0.9) + '">' + esc(sc.button) + '</div>' : '');
    },
    custom: function (sc, d) { return (sc.background === false ? '' : bgLayer(sc, d)) + (sc.html || ''); }
  };

  // ---------- styles ----------
  var css = [
    '*{box-sizing:border-box;margin:0;padding:0}',
    '*,*::before,*::after{animation-play-state:paused!important}',
    'html,body{width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:' + C.bg + '}',
    'body{font-family:' + (S.font || '"Avenir Next","Segoe UI","Helvetica Neue",Arial,sans-serif') + ';color:' + C.text + ';-webkit-font-smoothing:antialiased}',
    '#stage{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;background:' + C.bg + '}',
    '.scene{position:absolute;inset:0;overflow:hidden;visibility:hidden;background:' + C.bg + '}',
    '.acc{color:' + C.accent + '}',
    '.bg{position:absolute;inset:-60px;overflow:hidden}.bg img{width:100%;height:100%;object-fit:cover;filter:blur(38px) saturate(1.2) brightness(.55)}',
    '.bg.grad{background:radial-gradient(120% 80% at 50% 20%,' + C.accent + '33,' + C.bg + ' 70%)}',
    '.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.05) 40%,rgba(0,0,0,.45))}',
    '.card{position:absolute;overflow:hidden;border-radius:56px;box-shadow:0 40px 90px rgba(0,0,0,.55);background:#000}',
    '.card img{width:100%;height:100%;display:block}',
    '.w{display:inline-block}',
    // hook
    '.hookText{position:absolute;left:70px;right:70px;top:190px;font-size:104px;line-height:1.02;font-weight:900;text-transform:uppercase;letter-spacing:-1px;text-shadow:0 8px 30px rgba(0,0,0,.6)}',
    '.hookCard{left:150px;right:150px;top:760px;height:930px}',
    '.sticker{position:absolute;right:92px;top:690px;width:190px;height:190px;border-radius:50%;background:' + C.accent + ';color:' + C.ink + ';font-size:130px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 50px rgba(0,0,0,.5)}',
    // answer
    '.answerCard{left:70px;right:70px;top:170px;height:1060px}',
    '.answerBox{position:absolute;left:70px;right:70px;top:1000px;background:' + C.accent + ';color:' + C.ink + ';border-radius:40px;padding:44px 52px;box-shadow:0 30px 70px rgba(0,0,0,.5)}',
    '.answerBox .acc{color:' + C.bg + '}',
    '.answerTitle{font-size:96px;line-height:1.02;font-weight:900;letter-spacing:-1px}',
    '.answerSub{font-size:46px;line-height:1.2;font-weight:700;margin-top:16px;opacity:.85}',
    '.stamp{position:absolute;right:60px;top:110px;padding:22px 34px;border:8px solid #fff;border-radius:26px;font-size:62px;font-weight:900;color:#fff;background:rgba(0,0,0,.35);text-transform:uppercase}',
    // points + compare
    '.thumb{position:absolute;right:-90px;top:110px;width:520px;height:520px;border-radius:50%;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5)}.thumb img{width:100%;height:100%;object-fit:cover}',
    '.ptTitle{position:absolute;left:70px;right:70px;top:640px;font-size:92px;line-height:1.03;font-weight:900;letter-spacing:-1px;text-shadow:0 8px 30px rgba(0,0,0,.6)}',
    '.pts{position:absolute;left:70px;right:70px;top:910px;display:flex;flex-direction:column;gap:.5em;font-size:54px}',
    '.pt{display:flex;align-items:center;gap:.55em;background:rgba(255,255,255,.95);color:' + C.ink + ';border-radius:.62em;padding:.5em .7em;font-size:1em;font-weight:800;line-height:1.1;box-shadow:0 20px 50px rgba(0,0,0,.35)}',
    '.pt .acc{color:inherit;text-decoration:underline;text-decoration-color:' + C.accent + ';text-decoration-thickness:10px;text-underline-offset:6px}',
    '.tick{flex:0 0 1.4em;height:1.4em;border-radius:50%;background:' + C.accent + ';color:' + C.ink + ';display:flex;align-items:center;justify-content:center;font-size:1em;font-weight:900}',
    '.cHead{position:absolute;left:70px;right:70px;top:930px;display:grid;grid-template-columns:1fr 1fr;gap:24px;font-size:46px;font-weight:900;text-transform:uppercase;text-align:center}',
    '.cHead .good{color:' + C.accent + '}',
    '.cRows{position:absolute;left:70px;right:70px;top:1010px;display:flex;flex-direction:column;gap:20px}',
    '.cRow{display:grid;grid-template-columns:1fr 1fr;gap:24px}',
    '.cCell{border-radius:28px;padding:26px 28px;font-size:42px;font-weight:800;line-height:1.1}',
    '.cCell.bad{background:rgba(255,255,255,.14);color:rgba(255,255,255,.75)}',
    '.cCell.good{background:' + C.accent + ';color:' + C.ink + '}.cCell.good .acc{color:inherit}',
    // stat
    '.statWrap{position:absolute;left:50%;top:250px;width:760px;height:760px;margin-left:-380px}',
    '.ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}',
    '.ring circle{fill:none;stroke-width:14}.ring .track{stroke:rgba(255,255,255,.15)}',
    '.ring .arc{stroke:' + C.accent + ';stroke-linecap:round;stroke-dasharray:553;stroke-dashoffset:553}',
    '.statNum{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:190px;font-weight:900;letter-spacing:-4px;font-variant-numeric:tabular-nums}',
    '.statLabel{position:absolute;left:80px;right:80px;top:1060px;text-align:center;font-size:76px;line-height:1.08;font-weight:900;text-shadow:0 8px 30px rgba(0,0,0,.6)}',
    '.statSrc{position:absolute;left:80px;right:80px;top:1250px;text-align:center;font-size:34px;font-weight:600;opacity:.75}',
    // quote
    '.quoteCard{left:170px;right:170px;top:150px;height:700px}',
    '.quoteBox{position:absolute;left:70px;right:70px;top:800px;background:#fff;color:' + C.ink + ';border-radius:44px;padding:46px 54px;box-shadow:0 30px 70px rgba(0,0,0,.5)}',
    '.stars{font-size:70px;color:#F5A623;letter-spacing:6px}.stars span{display:inline-block}',
    '.quoteText{font-size:60px;line-height:1.14;font-weight:800;margin-top:10px}',
    '.quoteText .acc{background:' + C.accent + ';color:' + C.ink + ';padding:0 8px;border-radius:8px}',
    '.quoteBy{font-size:38px;font-weight:600;opacity:.6;margin-top:22px}',
    // cta
    '.ctaCard{left:170px;right:170px;top:150px;height:860px}',
    '.ctaTitle{position:absolute;left:70px;right:70px;top:1050px;text-align:center;font-size:110px;line-height:1;font-weight:900;text-transform:uppercase;letter-spacing:-1px;text-shadow:0 8px 30px rgba(0,0,0,.6)}',
    '.ctaUrl{position:absolute;left:50%;top:1200px;transform-origin:center;white-space:nowrap;translate:-50% 0;background:' + C.accent + ';color:' + C.ink + ';border-radius:999px;padding:30px 54px;font-size:60px;font-weight:900;display:flex;gap:24px;align-items:center;box-shadow:0 24px 60px rgba(0,0,0,.5)}',
    '.arrow{display:inline-block}',
    '.ctaBtn{position:absolute;left:0;right:0;top:1350px;text-align:center;font-size:42px;font-weight:800;opacity:.9}',
    // chrome: brand chip, progress, captions
    '#chip{position:absolute;left:60px;top:70px;z-index:50;display:flex;align-items:center;gap:16px;background:rgba(0,0,0,.45);padding:14px 26px;border-radius:999px;font-size:34px;font-weight:800;letter-spacing:2px;text-transform:uppercase}',
    '#chip i{width:20px;height:20px;border-radius:50%;background:' + C.accent + ';display:block}',
    '#bar{position:absolute;left:0;top:0;height:10px;background:' + C.accent + ';z-index:50}',
    '#cap{position:absolute;left:60px;right:60px;top:' + (S.captionsTop || 1440) + 'px;z-index:60;text-align:center;font-size:78px;line-height:1.05;font-weight:900;text-transform:uppercase;color:#fff;paint-order:stroke fill;-webkit-text-stroke:14px #000;letter-spacing:-.5px}',
    '#cap .on{color:' + C.accent + '}',
    '@keyframes slam{0%{opacity:0;transform:scale(1.9) rotate(-4deg)}55%{opacity:1;transform:scale(.94)}100%{opacity:1;transform:none}}',
    '@keyframes rise{0%{opacity:0;transform:translateY(90px)}100%{opacity:1;transform:none}}',
    '@keyframes pop{0%{opacity:0;transform:scale(.3)}70%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:none}}',
    '@keyframes slideL{0%{opacity:0;transform:translateX(-140px)}100%{opacity:1;transform:none}}',
    '@keyframes stamp{0%{opacity:0;transform:scale(2.6) rotate(-20deg)}60%{opacity:1;transform:scale(.9) rotate(-10deg)}100%{opacity:1;transform:rotate(-10deg)}}',
    '@keyframes kb{from{transform:scale(1.02)}to{transform:scale(1.16)}}',
    '@keyframes kbBg{from{transform:scale(1.1)}to{transform:scale(1.25)}}',
    '@keyframes ring{to{stroke-dashoffset:0}}',
    '@keyframes nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(16px)}}',
    '@keyframes enter{0%{opacity:0;transform:scale(1.07)}100%{opacity:1;transform:none}}',
    '@keyframes enterUp{0%{transform:translateY(100%)}100%{transform:none}}',
    '@keyframes enterLeft{0%{transform:translateX(100%)}100%{transform:none}}'
  ].join('\n');

  // ---------- build ----------
  var style = document.createElement('style'); style.textContent = css + '\n' + scenes.map(function (s) { return s.css || ''; }).join('\n');
  document.head.appendChild(style);
  var stage = document.getElementById('stage') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'stage' }));
  var els = scenes.map(function (sc, i) {
    var d = tl[i].dur, el = document.createElement('div');
    var tr = sc.transition || (i === 0 ? 'none' : 'enter');
    el.className = 'scene scene-' + (sc.type || 'custom');
    if (tr !== 'none') el.setAttribute('style', an(tr === 'up' ? 'enterUp' : tr === 'left' ? 'enterLeft' : 'enter', 0.35, 0, 'cubic-bezier(.2,.8,.2,1)'));
    el.innerHTML = (B[sc.type] || B.custom)(sc, d);
    el.style.zIndex = String(i + 1);
    stage.appendChild(el);
    return el;
  });
  if (brand.name && S.chip !== false) {
    var chip = document.createElement('div'); chip.id = 'chip'; chip.innerHTML = '<i></i>' + esc(brand.name); stage.appendChild(chip);
  }
  var bar = document.createElement('div'); bar.id = 'bar'; if (S.progress !== false) stage.appendChild(bar);
  var cap = document.createElement('div'); cap.id = 'cap'; stage.appendChild(cap);

  // shrink text that doesn't fit its box
  function fitAll() {
    els.forEach(function (el) { el.style.visibility = 'visible'; });
    document.querySelectorAll('.fit').forEach(function (f) {
      var max = +f.getAttribute('data-max') || 400, fs = parseFloat(getComputedStyle(f).fontSize), guard = 0;
      while ((f.scrollHeight > max || f.scrollWidth > f.clientWidth + 2) && fs > 30 && guard++ < 60) { fs -= 4; f.style.fontSize = fs + 'px'; }
    });
    els.forEach(function (el) { el.style.visibility = ''; });
  }

  // caption groups: up to 3 words / ~16 characters, broken at punctuation
  var groups = [];
  (function () {
    var g = null;
    WORDS.forEach(function (w, i) {
      if (!g || g.words.length >= 3 || (g.text + ' ' + w.w).length > 16 || /[.,!?;:]$/.test(g.words[g.words.length - 1].w) || w.scene !== g.scene) {
        g = { words: [], text: '', scene: w.scene, s: w.s }; groups.push(g);
      }
      g.words.push(w); g.text = (g.text ? g.text + ' ' : '') + w.w; g.e = w.e;
    });
    groups.forEach(function (g, i) { var nx = groups[i + 1]; g.until = nx && nx.scene === g.scene ? nx.s : g.e + 0.35; });
  })();
  function captionAt(t) {
    if (S.captions === false) return '';
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (t >= g.s - 0.02 && t < g.until) {
        var sc = scenes[g.scene] || {};
        if (sc.captions === false || (sc.type === 'hook' && sc.captions !== true)) return '';
        var cur = 0;
        g.words.forEach(function (w, k) { if (t >= w.s - 0.02) cur = k; });
        return g.words.map(function (w, k) { return '<span class="' + (k === cur ? 'on' : '') + '">' + esc(w.w) + '</span>'; }).join(' ');
      }
    }
    return '';
  }

  var lastCap = null;
  function seek(t) {
    t = Math.max(0, Math.min(t, TOTAL - 1e-6));
    els.forEach(function (el, i) {
      var st = tl[i].start, en = st + tl[i].dur, nxt = els[i + 1] ? 0.35 : 0;
      var on = t >= st && t < en + nxt;
      el.style.visibility = on ? 'visible' : 'hidden';
      if (!on) return;
      var local = Math.max(0, t - st) * 1000;
      el.getAnimations({ subtree: true }).forEach(function (a) { a.pause(); a.currentTime = local; });
      el.querySelectorAll('[data-count]').forEach(function (n) {
        var p = Math.max(0, Math.min(1, (t - st - 0.2) / 1.3)); p = 1 - Math.pow(1 - p, 3);
        var v = (+n.getAttribute('data-count')) * p, dec = +n.getAttribute('data-dec');
        n.textContent = n.getAttribute('data-pre') + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + n.getAttribute('data-suf');
      });
    });
    bar.style.width = (t / TOTAL * 100).toFixed(3) + '%';
    var c = captionAt(t);
    if (c !== lastCap) { cap.innerHTML = c; lastCap = c; }
  }

  function loaded() {
    var imgs = Array.prototype.slice.call(document.images).map(function (im) {
      return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
    });
    return Promise.all(imgs.concat([document.fonts ? document.fonts.ready : Promise.resolve()])).then(function () { fitAll(); seek(0); return TOTAL; });
  }

  window.TOTAL = TOTAL;
  window.seek = seek;
  // for render.js: show frame t and wait until the browser has painted it
  window.seekPaint = function (t) {
    seek(t);
    return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
  };
  window.__ready = loaded();

  // opened in a browser (not by render.js): play in a loop, with the voiceover if there is one
  if (!window.__RENDER) {
    window.__ready.then(function () {
      var audio = S.audioSrc ? new Audio(S.audioSrc) : null, t0 = null;
      function frame(now) {
        if (t0 === null) { t0 = now; if (audio) { audio.currentTime = 0; audio.play().catch(function () {}); } }
        var t = (now - t0) / 1000;
        if (t >= TOTAL + 0.8) { t0 = now; t = 0; if (audio) { audio.currentTime = 0; audio.play().catch(function () {}); } }
        seek(t); requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }
})();
