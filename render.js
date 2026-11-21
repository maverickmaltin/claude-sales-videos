#!/usr/bin/env node
/* AI Video Editor: turns a reel spec (reels/reel-01.json) into a vertical MP4 with a voiceover, animated scenes and
 * captions.
 *
 *   node render.js --check                       what this computer has, and what to install
 *   node render.js reels/reel-01.json            render one reel   -> out/reel-01.mp4
 *   node render.js reels/reel-01.json --sheet    a contact sheet of every scene -> out/reel-01-sheet.png (quick look)
 *   node render.js reels/reel-01.json --still 3  the frame at 3 s   -> out/reel-01-3s.png
 *   node render.js reels/reel-01.json --html     a page that plays the reel in any browser -> out/reel-01.html
 *   node render.js --all                         render every reels/*.json that has no up-to-date MP4 yet
 *   options: --out FILE  --no-voice  --fps 30  --force (with --all: render them all again)
 *
 * Needs Node 18+, ffmpeg, and Playwright with a browser (Google Chrome or Edge is used when installed):
 *   npm install playwright-core            (in this folder)
 *   npx playwright-core install chromium   (only if you have neither Chrome nor Edge)
 * The voiceover uses your computer's built-in voice, or ElevenLabs when ELEVENLABS_API_KEY is set (here or in .env).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const HERE = __dirname;
const SCENES_JS = path.join(HERE, 'scenes.js');

function die(msg) { console.error('render.js: ' + msg); process.exit(1); }
function log(...a) { console.log(...a); }

// ---------------------------------------------------------------- tools
function loadEnv() {
  const f = path.join(HERE, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

function findFfmpeg() {
  const p = which('ffmpeg');
  if (p) return p;
  try { const s = require('ffmpeg-static'); if (s && fs.existsSync(s)) return s; } catch (e) { /* not installed */ }
  return null;
}

function loadPlaywright() {
  for (const name of ['playwright-core', 'playwright']) {
    try { return require(require.resolve(name, { paths: [HERE, process.cwd()] })); } catch (e) { /* next */ }
  }
  return null;
}

async function launchBrowser(pw) {
  const args = ['--force-color-profile=srgb', '--font-render-hinting=none', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required'];
  const errs = [];
  for (const opt of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
    try { return { browser: await pw.chromium.launch({ headless: true, args, ...opt }), name: opt.channel || 'chromium' }; }
    catch (e) { errs.push(String(e.message || e).split('\n')[0].slice(0, 160)); }
  }
  throw new Error('no browser found. Install Google Chrome, or run: npx playwright-core install chromium\n  ' + errs.join('\n  '));
}

function systemVoice() {
  if (process.platform === 'darwin' && which('say')) return 'say';
  if (process.platform === 'win32') return 'sapi';
  if (which('espeak-ng')) return 'espeak-ng';
  if (which('espeak')) return 'espeak';
  return null;
}

async function check() {
  loadEnv();
  const info = { node: process.version, playwright: false, browser: null, ffmpeg: findFfmpeg(), voice: null };
  const pw = loadPlaywright();
  if (pw) {
    info.playwright = true;
    try { const b = await launchBrowser(pw); info.browser = b.name; await b.browser.close(); } catch (e) { /* none */ }
  }
  if (process.env.ELEVENLABS_API_KEY) info.voice = 'ElevenLabs (key found)';
  else if (systemVoice()) info.voice = 'built-in computer voice (works now; add an ElevenLabs key for a more natural voice)';
  else info.voice = 'none found (videos get captions without a voiceover until you add an ElevenLabs key)';
  const major = +process.version.slice(1).split('.')[0];
  info.ready = major >= 18 && info.playwright && !!info.browser && !!info.ffmpeg;
  const fix = [];
  if (major < 18) fix.push('Install Node.js 18 or newer from https://nodejs.org (or: brew install node)');
  if (!info.playwright) fix.push('npm install playwright-core   (run in this folder)');
  if (info.playwright && !info.browser) fix.push('npx playwright-core install chromium   (or install Google Chrome)');
  if (!info.ffmpeg) fix.push(process.platform === 'darwin' && which('brew') ? 'brew install ffmpeg   (or: npm install ffmpeg-static)' : 'npm install ffmpeg-static   (run in this folder)');
  if (fix.length) info.fix = fix;
  log(JSON.stringify(info, null, 1));
  return info.ready ? 0 : 1;
}

// ---------------------------------------------------------------- spec
const FILE_KEYS = new Set(['photo', 'logo', 'image', 'music']);

function mimeOf(p) {
  const ext = path.extname(p).toLowerCase();
  return { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif' }[ext] || 'application/octet-stream';
}

function resolveFile(v, base) {
  if (!v || /^(data:|https?:)/.test(v)) return v;
  const tries = [path.isAbsolute(v) ? v : path.join(base, v), path.join(HERE, v), path.resolve(v)];
  for (const p of tries) if (fs.existsSync(p)) return p;
  die('file not found: ' + v);
}

function loadSpec(file) {
  let spec;
  try { spec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { die('could not read ' + file + ': ' + e.message); }
  if (!Array.isArray(spec.scenes) || !spec.scenes.length) die(file + ' has no "scenes"');
  const base = path.dirname(path.resolve(file));
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') for (const k of Object.keys(o)) {
      if (FILE_KEYS.has(k) && typeof o[k] === 'string') o[k] = resolveFile(o[k], base);
      else walk(o[k]);
    }
  };
  walk(spec);
  return spec;
}

function embedImages(spec) {
  const cache = new Map();
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') for (const k of Object.keys(o)) {
      if ((k === 'photo' || k === 'logo' || k === 'image') && typeof o[k] === 'string' && !/^(data:|https?:)/.test(o[k])) {
        if (!cache.has(o[k])) cache.set(o[k], 'data:' + mimeOf(o[k]) + ';base64,' + fs.readFileSync(o[k]).toString('base64'));
        o[k] = cache.get(o[k]);
      } else walk(o[k]);
    }
  };
  walk(spec);
}

// ---------------------------------------------------------------- audio
function duration(ff, file) {
  const r = spawnSync(ff, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) die('could not read the length of ' + file);
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
}

function estimateWords(text, dur, lead) {
  // spread the words over the clip by length (the built-in voices don't report word times)
  const words = String(text).split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.replace(/[^\w']/g, '').length + 2 + (/[.,!?;:]$/.test(w) ? 3 : 0));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const speak = Math.max(0.3, dur - lead - 0.1);
  let at = lead; const out = [];
  words.forEach((w, i) => { const d = speak * weights[i] / total; out.push({ w, s: at, e: at + d * 0.92 }); at += d; });
  return out;
}

function wordsFromAlignment(al) {
  const out = []; let cur = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = null; } return; }
    if (!cur) cur = { w: '', s: al.character_start_times_seconds[i], e: 0 };
    cur.w += ch; cur.e = al.character_end_times_seconds[i];
  });
  if (cur) out.push(cur);
  return out;
}

async function speak(text, voice, cacheDir, ff) {
  const engine = voice.engine;
  const key = crypto.createHash('sha1').update(JSON.stringify([engine, voice.id || voice.name || '', voice.rate || '', voice.model || '', text])).digest('hex').slice(0, 16);
  const meta = path.join(cacheDir, key + '.json');
  if (fs.existsSync(meta)) { const m = JSON.parse(fs.readFileSync(meta, 'utf8')); if (fs.existsSync(m.file)) return m; }
  fs.mkdirSync(cacheDir, { recursive: true });
  let file, words = null;

  if (engine === 'elevenlabs') {
    const id = voice.id || 'EXAVITQu4vr4xnSDxMaL';
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(id) + '/with-timestamps?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: voice.model || 'eleven_multilingual_v2' })
    });
    if (!res.ok) die('ElevenLabs said ' + res.status + ': ' + (await res.text()).slice(0, 300));
    const j = await res.json();
    file = path.join(cacheDir, key + '.mp3');
    fs.writeFileSync(file, Buffer.from(j.audio_base64, 'base64'));
    const al = j.alignment || j.normalized_alignment;
    if (al && al.characters) words = wordsFromAlignment(al);
  } else {
    const sys = systemVoice();
    if (!sys) die('no built-in voice on this computer. Add an ElevenLabs key, or set "voice": {"engine": "none"}');
    const txt = path.join(cacheDir, key + '.txt');
    fs.writeFileSync(txt, text);
    if (sys === 'say') {
      file = path.join(cacheDir, key + '.aiff');
      const a = ['-f', txt, '-o', file];
      if (voice.name) a.push('-v', voice.name);
      if (voice.rate) a.push('-r', String(voice.rate));
      const r = spawnSync('say', a, { encoding: 'utf8' });
      if (r.status !== 0) die('the built-in voice failed: ' + (r.stderr || '').trim());
    } else if (sys === 'sapi') {
      file = path.join(cacheDir, key + '.wav');
      const ps = 'Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
        (voice.name ? '$s.SelectVoice(\'' + String(voice.name).replace(/'/g, "''") + '\'); ' : '') +
        (voice.rate ? '$s.Rate = ' + Math.round((voice.rate - 180) / 18) + '; ' : '') +
        '$s.SetOutputToWaveFile(\'' + file.replace(/'/g, "''") + '\'); $s.Speak([IO.File]::ReadAllText(\'' + txt.replace(/'/g, "''") + '\')); $s.Dispose()';
      const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
      if (r.status !== 0) die('the built-in voice failed: ' + (r.stderr || '').trim());
    } else {
      file = path.join(cacheDir, key + '.wav');
      const r = spawnSync(sys, ['-f', txt, '-w', file].concat(voice.rate ? ['-s', String(voice.rate)] : []), { encoding: 'utf8' });
      if (r.status !== 0) die('the built-in voice failed: ' + (r.stderr || '').trim());
    }
    fs.unlinkSync(txt);
  }
  const dur = duration(ff, file);
  if (!words) words = estimateWords(text, dur, 0.05);
  const m = { file, dur, words };
  fs.writeFileSync(meta, JSON.stringify(m));
  return m;
}

// ---------------------------------------------------------------- timing
async function plan(spec, opts, ff, name) {
  loadEnv();
  const v = Object.assign({}, spec.voice || {});
  if (opts.noVoice) v.engine = 'none';
  if (!v.engine || v.engine === 'auto') v.engine = process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : (systemVoice() ? 'system' : 'none');
  if (v.engine === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY) die('"engine": "elevenlabs" needs ELEVENLABS_API_KEY (in your environment or in .env in this folder)');
  const cacheDir = path.join(HERE, 'out', '.voice');
  const timeline = [], words = [], clips = [];
  let at = 0;
  for (let i = 0; i < spec.scenes.length; i++) {
    const sc = spec.scenes[i];
    const lead = sc.voiceAt != null ? +sc.voiceAt : (i === 0 ? 0.1 : 0.3);
    let clip = null;
    if (sc.voice && v.engine !== 'none') clip = await speak(sc.voice, v, cacheDir, ff);
    let dur;
    if (sc.duration) dur = +sc.duration;
    else if (clip) dur = lead + clip.dur + (sc.hold != null ? +sc.hold : 0.35);
    else {
      const n = String(sc.voice || sc.title || sc.text || '').split(/\s+/).filter(Boolean).length;
      dur = Math.max(2.2, n / 2.7 + 0.8);
    }
    dur = Math.max(dur, 1.2);
    timeline.push({ start: at, dur });
    if (clip) {
      clips.push({ file: clip.file, at: at + lead, dur: clip.dur });
      clip.words.forEach((w) => words.push({ w: w.w, s: at + lead + w.s, e: at + lead + w.e, scene: i }));
    } else if (sc.voice && spec.captions !== false) {
      estimateWords(sc.voice, dur - lead, 0).forEach((w) => words.push({ w: w.w, s: at + lead + w.s, e: at + lead + w.e, scene: i }));
    }
    at += dur;
  }
  return { timeline, words, clips, total: at, engine: v.engine };
}

function buildAudio(ff, p, music, outFile) {
  // one track: each voice clip placed at its time, padded to the full length, plus optional music underneath
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  const parts = [];
  p.clips.forEach((c) => args.push('-i', c.file));
  if (music) args.push('-stream_loop', '-1', '-i', music.file);
  let filter = 'anullsrc=r=44100:cl=stereo,atrim=0:' + p.total.toFixed(3) + '[base];';
  p.clips.forEach((c, i) => {
    const ms = Math.round(c.at * 1000);
    filter += '[' + i + ':a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=' + ms + '|' + ms + ',apad,atrim=0:' + p.total.toFixed(3) + '[v' + i + '];';
    parts.push('[v' + i + ']');
  });
  const n = parts.length + 1;
  filter += '[base]' + parts.join('') + 'amix=inputs=' + n + ':duration=first:dropout_transition=0,volume=' + n + ',alimiter=limit=0.95[voice];';
  if (music) {
    const mi = p.clips.length;
    filter += '[' + mi + ':a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=0:' + p.total.toFixed(3) + ',volume=' + (music.volume != null ? music.volume : 0.12) +
      ',afade=t=out:st=' + Math.max(0, p.total - 1).toFixed(3) + ':d=1[mus];[voice][mus]amix=inputs=2:duration=first:dropout_transition=0,volume=2,alimiter=limit=0.95[out]';
  } else filter += '[voice]anull[out]';
  args.push('-filter_complex', filter, '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', outFile);
  const r = spawnSync(ff, args, { encoding: 'utf8' });
  if (r.status !== 0) die('could not build the audio: ' + (r.stderr || '').slice(0, 500));
}

// ---------------------------------------------------------------- page
function pageHtml(spec, rendering) {
  const blob = JSON.stringify(spec).replace(/</g, '\\u003c');
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + String((spec.brand && spec.brand.name) || 'Reel').replace(/</g, '') +
    '</title><style>html,body{margin:0;background:#000}</style></head><body><div id="stage"></div><script>' + (rendering ? 'window.__RENDER=true;' : '') + 'window.SPEC=' + blob +
    ';</script><script>' + fs.readFileSync(SCENES_JS, 'utf8') + '</script></body></html>';
}

function sizeOf(spec) {
  const m = String(spec.size || '1080x1920').split('x').map((x) => Math.round(+x));
  return { w: (m[0] || 1080) - ((m[0] || 1080) % 2), h: (m[1] || 1920) - ((m[1] || 1920) % 2) };
}

// ---------------------------------------------------------------- render one
async function renderOne(file, opts) {
  const ff = findFfmpeg();
  if (!ff) die('ffmpeg not found. Run: node render.js --check');
  const name = path.basename(file, path.extname(file));
  const outDir = path.join(HERE, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const spec = loadSpec(file);
  const fps = opts.fps || +spec.fps || 30;
  const { w, h } = sizeOf(spec);
  spec.size = w + 'x' + h;

  const p = await plan(spec, opts, ff, name);
  spec.timeline = p.timeline; spec.words = p.words;
  const music = spec.music ? { file: typeof spec.music === 'string' ? spec.music : spec.music.file, volume: spec.music.volume } : null;
  log(name + ': ' + spec.scenes.length + ' scenes, ' + p.total.toFixed(1) + ' s, voice: ' + p.engine);

  if (opts.html) {
    const pageFile = opts.out && opts.out.endsWith('.html') ? path.resolve(opts.out) : path.join(outDir, name + '.html');
    if (p.clips.length) { const a = pageFile.replace(/\.html$/, '-voice.m4a'); buildAudio(ff, p, music, a); spec.audioSrc = path.basename(a); }
    const copy = JSON.parse(JSON.stringify(spec)); embedImages(copy);
    fs.writeFileSync(pageFile, pageHtml(copy));
    log('page: ' + pageFile);
    return pageFile;
  }

  embedImages(spec);
  const pw = loadPlaywright();
  if (!pw) die('Playwright is missing. Run: node render.js --check');
  const { browser } = await launchBrowser(pw);
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(pageHtml(spec, true), { waitUntil: 'load' });
    await page.evaluate(() => window.__ready);
    if (errors.length) die('the page has an error: ' + errors[0]);
    const total = p.total;

    if (opts.still != null) {
      const t = opts.still === 'end' ? total - 0.05 : Math.min(+opts.still, total - 0.05);
      await page.evaluate((x) => window.seekPaint(x), t);
      const out = opts.out ? path.resolve(opts.out) : path.join(outDir, name + '-' + String(opts.still).replace('.', '_') + 's.png');
      await page.screenshot({ path: out, type: 'png' });
      log('still: ' + out);
      return out;
    }

    if (opts.sheet) {
      // one frame near the end of each scene's animation, side by side
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-sheet-'));
      const shots = [];
      for (let i = 0; i < p.timeline.length; i++) {
        const sc = p.timeline[i];
        const t = sc.start + Math.min(sc.dur * 0.8, 2.4);
        await page.evaluate((x) => window.seekPaint(x), t);
        const f = path.join(tmp, 's' + i + '.png');
        await page.screenshot({ path: f, type: 'png' });
        shots.push(f);
      }
      const out = opts.out ? path.resolve(opts.out) : path.join(outDir, name + '-sheet.png');
      const a = ['-y', '-hide_banner', '-loglevel', 'error'];
      shots.forEach((f) => a.push('-i', f));
      const fl = shots.map((f, i) => '[' + i + ':v]scale=360:-2,pad=iw+12:ih:0:0:black[s' + i + ']').join(';') + ';' + shots.map((f, i) => '[s' + i + ']').join('') + 'hstack=inputs=' + shots.length + '[o]';
      const r = spawnSync(ff, a.concat(shots.length > 1 ? ['-filter_complex', fl, '-map', '[o]'] : ['-vf', 'scale=360:-2']).concat(['-frames:v', '1', out]), { encoding: 'utf8' });
      fs.rmSync(tmp, { recursive: true, force: true });
      if (r.status !== 0) die('could not make the sheet: ' + (r.stderr || '').slice(0, 300));
      log('sheet: ' + out);
      return out;
    }

    const out = opts.out ? path.resolve(opts.out) : path.join(outDir, name + '.mp4');
    const audio = p.clips.length || music ? path.join(outDir, '.' + name + '-audio.m4a') : null;
    if (audio) buildAudio(ff, p, music, audio);
    const frames = Math.round(total * fps);
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
    if (audio) args.push('-i', audio);
    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps));
    if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    args.push('-movflags', '+faststart', out);
    const enc = spawn(ff, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let encErr = '';
    enc.stderr.on('data', (d) => { encErr += d; });
    const done = new Promise((res) => enc.on('close', res));
    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      await page.evaluate((x) => window.seekPaint(x), f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
      if (f % (fps * 5) === 0 && f) log('  ' + Math.round(f / frames * 100) + '%');
    }
    enc.stdin.end();
    const code = await done;
    if (audio) fs.rmSync(audio, { force: true });
    if (code !== 0) die('ffmpeg failed: ' + encErr.slice(0, 500));
    log('video: ' + out + '  (' + total.toFixed(1) + ' s, ' + frames + ' frames in ' + Math.round((Date.now() - t0) / 1000) + ' s)');
    return out;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------- main
async function main() {
  const argv = process.argv.slice(2);
  const opts = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') opts.check = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--sheet') opts.sheet = true;
    else if (a === '--html') opts.html = true;
    else if (a === '--no-voice') opts.noVoice = true;
    else if (a === '--still') opts.still = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--fps') opts.fps = +argv[++i];
    else if (a === '-h' || a === '--help') { log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); return; }
    else if (a.startsWith('--')) die('unknown option ' + a);
    else opts.files.push(a);
  }
  if (opts.check) process.exit(await check());
  if (opts.all) {
    const dir = path.join(HERE, 'reels');
    const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
    if (!list.length) die('no reel specs in reels/');
    for (const f of list) {
      const spec = path.join(dir, f), mp4 = path.join(HERE, 'out', f.replace(/\.json$/, '.mp4'));
      if (!opts.force && fs.existsSync(mp4) && fs.statSync(mp4).mtimeMs > fs.statSync(spec).mtimeMs) { log(f + ': up to date'); continue; }
      await renderOne(spec, Object.assign({}, opts, { out: null }));
    }
    return;
  }
  if (!opts.files.length) die('give a reel spec, e.g. node render.js reels/reel-01.json (or --check, --all)');
  for (const f of opts.files) await renderOne(f, opts);
}

main().catch((e) => die(e && e.message ? e.message : String(e)));
