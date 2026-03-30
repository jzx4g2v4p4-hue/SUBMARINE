/* ════════════════════════════════════════════════════════
   SUBLIMINAL FORGE v2 — script.js
   Multi-layer subliminal mixer · Web Audio API
   Static · No backend · No fakes
   ════════════════════════════════════════════════════════ */
'use strict';

/* ── PRESET PACKS ──────────────────────────────────────── */
const PRESET_PACKS = {
  focus: [
    'I am deeply focused and present in this moment',
    'My concentration is sharp and effortless',
    'I enter flow states with ease',
    'Distractions dissolve the instant they appear',
    'My mind locks on to what matters',
    'I think clearly and act decisively',
    'Every minute of focused work compounds',
    'I complete what I start without exception',
    'My attention is my greatest asset',
    'I am fully in the zone',
  ],
  confidence: [
    'I am completely confident in who I am',
    'My presence fills every room I enter',
    'I believe in my abilities without reservation',
    'I speak and others naturally listen',
    'I deserve success and I claim it now',
    'My confidence grows stronger every day',
    'I handle challenges with grace and certainty',
    'I trust my instincts completely',
    'I am worthy of everything I desire',
    'Confidence is my natural state',
  ],
  discipline: [
    'I do what must be done regardless of how I feel',
    'Discipline is my identity not just a habit',
    'I show up every single day without exception',
    'I keep every promise I make to myself',
    'My consistency produces extraordinary results',
    'I delay gratification for greater long-term reward',
    'Hard work is my default and my standard',
    'I follow through completely every single time',
    'I am the most disciplined version of myself',
    'Resistance makes me stronger not weaker',
  ],
  recovery: [
    'My body heals with remarkable speed',
    'Every breath restores my energy completely',
    'I release tension and welcome deep peace',
    'Rest is productive and I embrace it fully',
    'My nervous system is calm and perfectly balanced',
    'Sleep regenerates me at a cellular level',
    'I recover stronger after every challenge',
    'My body knows exactly how to heal itself',
    'I deserve rest and I receive it without guilt',
    'Every moment of stillness accelerates my recovery',
  ],
  gym: [
    'I am built for peak physical performance',
    'Every rep builds the body I have envisioned',
    'My body is capable of things that amaze me',
    'I push through limits that others accept',
    'I am relentless and unstoppable in training',
    'My muscles grow stronger and more capable daily',
    'Pain is just weakness leaving my body',
    'I finish every session stronger than I started',
    'I am proud of the work I put in every day',
    'My body responds powerfully to consistent training',
  ],
  study: [
    'Information flows into my mind and stays',
    'I absorb and retain knowledge effortlessly',
    'My memory is sharp clear and reliable',
    'I understand complex material with ease',
    'Every study session builds my expertise',
    'I make connections between ideas instantly',
    'Focus comes naturally when I open my books',
    'I enjoy the process of learning and growing',
    'My mind is a powerful and precise instrument',
    'I recall everything I need exactly when I need it',
  ],
};

const EXAMPLE_SETS = {
  focus: [
    [
      'I stay locked in and focused no matter what',
      'My mind is clear and under control',
      'I follow through with everything I start',
      'Discipline is natural to me',
      'I execute without overthinking',
    ],
    [
      'My focus is strong and steady',
      'I ignore distractions easily',
      'I stay engaged with my work',
      'I complete tasks efficiently',
      'I lock in quickly and naturally',
    ],
    [
      'I stay calm and composed',
      'I trust myself completely',
      'I move with clarity and control',
    ],
  ],
  gym: [
    [
      'I stay disciplined every day',
      'I push through resistance every time',
      'I finish what I start',
      'I move with strength and purpose',
    ],
    [
      'I move forward without hesitation',
      'I am relentless in pursuit of my goals',
      'I channel intensity into action',
    ],
    [
      'I trust my power',
      'I stay composed under pressure',
    ],
  ],
  chill: [
    [
      'My mind is calm and steady',
      'I feel grounded and at ease',
      'I release tension easily',
    ],
    [
      'I trust myself completely',
      'I move with clarity and control',
      'I remain steady under pressure',
    ],
    [
      'I relax deeply',
      'I feel safe and calm',
    ],
  ],
};

/* ── BINAURAL / FOCUS PRESETS ─────────────────────────── */
const FOCUS_PRESETS = {
  focus:  { carrier: 200, beat: 40,  label: 'Gamma — focus, cognition, attention' },
  calm:   { carrier: 180, beat: 10,  label: 'Alpha — calm, relaxed awareness' },
  sleep:  { carrier: 160, beat: 4,   label: 'Theta — deep relaxation, subconscious absorption' },
  deep:   { carrier: 140, beat: 2,   label: 'Delta — deep sleep, restoration' },
  high:   { carrier: 220, beat: 60,  label: 'High Gamma — high alert, peak performance' },
};

/* ── LAYER STATE (3 layers) ───────────────────────────── */
const NUM_LAYERS = 3;
const defaultLayer = (i) => ({
  enabled:     i === 0,
  text:        '',
  vol:         [30, 20, 15][i],
  speed:       [100, 130, 170][i],
  density:     [5,  8,  12][i],
  spacing:     [300, 150, 80][i],
  texture:     ['tone', 'whisper', 'deep'][i],
  mode:        i === 0 ? 'low' : 'silent',
  affirmations: [],
});

const APP = {
  /* Audio context & nodes */
  ctx:          null,
  masterGain:   null,
  musicGain:    null,
  subBusGain:   null,
  layerGains:   [],
  focusGain:    null,
  analyserMus:  null,
  analyserSub:  null,
  limiter:      null,

  /* Playback sources */
  musicSrc:     null,
  subSrcs:      [],
  focusSrcs:    [],

  /* Buffers */
  musicBuffer:  null,
  subBuffers:   [],

  /* Transport state */
  isPlaying:    false,
  isPaused:     false,
  pauseOffset:  0,
  startTime:    0,
  animFrame:    null,
  musicLoop:    true,

  /* Per-layer state */
  layers: [defaultLayer(0), defaultLayer(1), defaultLayer(2)],

  /* Global */
  musicVol:     0.80,
  subMixVol:    0.28,
  masterVol:    0.88,
  playSpeed:    1.0,
  focusEnabled: false,
  focusVol:     0.15,
  focusPreset:  'sleep',   // FIX 2: Default to Theta (4Hz) — best for subconscious absorption
  exportFilename: 'subliminal_mix',
  exportFormat: 'wav',
  lameLoader:   null,
  activeLayer:  0,
};

/* ── DOM SHORTCUTS ───────────────────────────────────── */
const $  = id => document.getElementById(id);
const $$ = s  => document.querySelectorAll(s);

/* ── STATUS ─────────────────────────────────────────── */
const STATUSES = ['ready','playing','paused','stopped','rendering','done','error'];
function setStatus(s, label) {
  const pill = $('statusPill');
  pill.classList.remove(...STATUSES);
  pill.classList.add(s);
  $('statusLabel').textContent = label || (s[0].toUpperCase() + s.slice(1));
}

/* ── EXPORT LOG ─────────────────────────────────────── */
function log(msg, type = '') {
  const el = $('exportLog');
  const d = document.createElement('div');
  d.className = 'log-line' + (type ? ' log-' + type : '');
  d.textContent = '› ' + msg;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

/* ── NOTICE ──────────────────────────────────────────── */
function notice(type, msg) {
  const el = $('exportNotice');
  el.className = 'export-notice ' + type;
  el.textContent = msg;
}

/* ── AUDIO CONTEXT INIT ──────────────────────────────── */
function ensureCtx() {
  if (APP.ctx) {
    if (APP.ctx.state === 'suspended') APP.ctx.resume();
    return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) { notice('error', '✗ Web Audio API not supported in this browser.'); return; }

  APP.ctx = new Ctx();

  APP.masterGain = APP.ctx.createGain();
  APP.masterGain.gain.value = APP.masterVol;
  APP.masterGain.connect(APP.ctx.destination);

  APP.limiter = APP.ctx.createDynamicsCompressor();
  APP.limiter.threshold.value = -3;
  APP.limiter.knee.value = 3;
  APP.limiter.ratio.value = 20;
  APP.limiter.attack.value = 0.001;
  APP.limiter.release.value = 0.05;
  APP.limiter.connect(APP.masterGain);

  APP.musicGain = APP.ctx.createGain();
  APP.musicGain.gain.value = APP.musicVol;
  APP.musicGain.connect(APP.limiter);

  APP.subBusGain = APP.ctx.createGain();
  APP.subBusGain.gain.value = APP.subMixVol;
  APP.subBusGain.connect(APP.limiter);

  APP.focusGain = APP.ctx.createGain();
  APP.focusGain.gain.value = APP.focusVol;
  APP.focusGain.connect(APP.limiter);

  for (let i = 0; i < NUM_LAYERS; i++) {
    const g = APP.ctx.createGain();
    g.gain.value = APP.layers[i].vol / 100;
    g.connect(APP.subBusGain);
    APP.layerGains.push(g);
  }

  APP.analyserMus = APP.ctx.createAnalyser(); APP.analyserMus.fftSize = 256;
  APP.musicGain.connect(APP.analyserMus);
  APP.analyserSub = APP.ctx.createAnalyser(); APP.analyserSub.fftSize = 256;
  APP.subBusGain.connect(APP.analyserSub);

  log('AudioContext ready @ ' + APP.ctx.sampleRate + ' Hz', 'info');
}

/* ── FILE UPLOAD ─────────────────────────────────────── */
function initUpload() {
  const zone  = $('uploadZone');
  const input = $('audioFile');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  $('btnChangeFile').addEventListener('click', e => { e.stopPropagation(); input.click(); });

  input.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  ['dragleave','dragend'].forEach(ev => zone.addEventListener(ev, () => zone.classList.remove('drag-over')));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });
}

function loadFile(file) {
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)) {
    notice('warn', 'Please select an audio file (MP3 or WAV).'); return;
  }
  $('uzFilename').textContent = file.name;
  $('uzMeta').textContent = 'Decoding…';
  $('uzIdle').classList.add('hidden');
  $('uzLoaded').classList.remove('hidden');
  $('trackBadge').textContent = file.name.split('.').pop().toUpperCase();
  setStatus('ready', 'Loading…');
  stopAll(false);

  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const tmp = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await tmp.decodeAudioData(ev.target.result.slice(0));
      await tmp.close();
      APP.musicBuffer = buf;
      const d = buf.duration;
      $('uzMeta').textContent = fmtTime(d) + ' · ' + buf.numberOfChannels + 'ch · ' + buf.sampleRate + 'Hz';
      $('tTotal').textContent = fmtTime(d);
      $('seekBar').value = 0; $('tCurrent').textContent = '0:00';
      setStatus('ready', 'Ready');
      log('Loaded: ' + file.name + ' (' + fmtTime(d) + ')', 'ok');
      notice('info', '✓ Track loaded. Add affirmations to at least one layer, then play or export.');
    } catch(err) {
      console.error(err);
      $('uzMeta').textContent = 'Decode error';
      setStatus('error', 'Error');
      log('Decode failed: ' + err.message, 'err');
      notice('error', '✗ Could not decode audio. Try a different MP3 or WAV.');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ── TRANSPORT ───────────────────────────────────────── */
function initTransport() {
  $('btnPlay').addEventListener('click',  () => playAudio());
  $('btnPause').addEventListener('click', pauseAudio);
  $('btnStop').addEventListener('click',  () => stopAll(true));
  $('toggleMusicLoop').addEventListener('change', e => { APP.musicLoop = e.target.checked; });

  const sb = $('seekBar');
  sb.addEventListener('input', () => {
    if (!APP.musicBuffer) return;
    const t = (sb.value / 1000) * APP.musicBuffer.duration;
    $('tCurrent').textContent = fmtTime(t);
    if (APP.isPlaying) { stopAll(false); setTimeout(() => playAudio(t), 40); }
    else { APP.pauseOffset = t; }
  });
}

function playAudio(seekOffset) {
  if (!APP.musicBuffer) {
    notice('warn', 'Upload a track before playing.'); return;
  }
  ensureCtx();
  if (APP.isPlaying) stopAll(false);

  const offset = typeof seekOffset === 'number' ? seekOffset : APP.pauseOffset;

  APP.musicSrc = APP.ctx.createBufferSource();
  APP.musicSrc.buffer = APP.musicBuffer;
  APP.musicSrc.loop = APP.musicLoop;
  APP.musicSrc.playbackRate.value = APP.playSpeed;
  APP.musicSrc.connect(APP.musicGain);
  APP.musicGain.gain.value = APP.musicVol;
  APP.musicSrc.start(0, offset % APP.musicBuffer.duration);

  APP.subSrcs = [];
  for (let i = 0; i < NUM_LAYERS; i++) {
    const layer = APP.layers[i];
    if (!layer.enabled) { APP.subSrcs.push(null); continue; }
    const aff = layer.affirmations.length > 0 ? layer.affirmations : getLines(i);
    if (aff.length === 0) { APP.subSrcs.push(null); continue; }
    const dur = APP.musicBuffer.duration;
    const buf = generateSubBuffer(APP.ctx, dur > 0 ? dur : 60, layer, aff);
    const src = APP.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = 1;
    src.connect(APP.layerGains[i]);
    APP.layerGains[i].gain.value = layer.vol / 100;
    src.start(0);
    APP.subSrcs.push(src);
  }

  startFocusLayer();

  APP.subBusGain.gain.value = APP.subMixVol;
  APP.masterGain.gain.value = APP.masterVol;
  APP.startTime = APP.ctx.currentTime - offset;
  APP.isPlaying = true;
  APP.isPaused  = false;
  APP.pauseOffset = 0;
  APP.musicSrc.onended = () => { if (!APP.musicLoop && APP.isPlaying) stopAll(true); };

  setStatus('playing', 'Playing');
  startLoop();
  log('Playing from ' + fmtTime(offset), 'ok');
}

function pauseAudio() {
  if (!APP.isPlaying || !APP.ctx) return;
  APP.pauseOffset = APP.ctx.currentTime - APP.startTime;
  stopSources();
  APP.isPlaying = false;
  APP.isPaused  = true;
  cancelAnimationFrame(APP.animFrame);
  setStatus('paused', 'Paused');
  log('Paused at ' + fmtTime(APP.pauseOffset));
}

function stopAll(updateStatus = true) {
  stopSources();
  APP.isPlaying = false; APP.isPaused = false; APP.pauseOffset = 0;
  cancelAnimationFrame(APP.animFrame);
  $('seekBar').value = 0; $('tCurrent').textContent = '0:00';
  resetVU();
  if (updateStatus) { setStatus('stopped', 'Stopped'); }
}

function stopSources() {
  try { APP.musicSrc && APP.musicSrc.stop(); } catch(e) {}
  APP.subSrcs.forEach(s => { try { s && s.stop(); } catch(e){} });
  APP.subSrcs = [];
  stopFocusLayer();
  APP.musicSrc = null;
}

/* ── PROGRESS LOOP ───────────────────────────────────── */
function startLoop() {
  function tick() {
    if (!APP.isPlaying || !APP.ctx || !APP.musicBuffer) return;
    const elapsed = APP.ctx.currentTime - APP.startTime;
    const dur = APP.musicBuffer.duration;
    $('seekBar').value = Math.round(Math.min(elapsed / dur, 1) * 1000);
    $('tCurrent').textContent = fmtTime(Math.min(elapsed, dur));
    updateVU();
    APP.animFrame = requestAnimationFrame(tick);
  }
  APP.animFrame = requestAnimationFrame(tick);
}

function updateVU() {
  if (APP.analyserMus) {
    const d = new Uint8Array(APP.analyserMus.frequencyBinCount);
    APP.analyserMus.getByteFrequencyData(d);
    const avg = d.reduce((a,b) => a+b, 0) / d.length;
    $('vuMusic').style.width = Math.min(100, avg / 128 * 130 * APP.musicVol) + '%';
  }
  if (APP.analyserSub) {
    const d = new Uint8Array(APP.analyserSub.frequencyBinCount);
    APP.analyserSub.getByteFrequencyData(d);
    const avg = d.reduce((a,b) => a+b, 0) / d.length;
    $('vuSub').style.width = Math.min(100, avg / 128 * 150) + '%';
  }
  const mw = parseFloat($('vuMusic').style.width) || 0;
  const sw = parseFloat($('vuSub').style.width)  || 0;
  $('vuMaster').style.width = Math.min(100, (mw * 0.7 + sw * 0.3) * APP.masterVol) + '%';
}

function resetVU() {
  ['vuMusic','vuSub','vuMaster'].forEach(id => $(id).style.width = '0%');
}

/* ── SUBLIMINAL BUFFER GENERATOR ─────────────────────── */
function generateSubBuffer(ctx, durationSec, layer, affirmations) {
  const sr = ctx.sampleRate;
  const total = Math.max(1, Math.ceil(durationSec * sr));
  const buf = ctx.createBuffer(2, total, sr);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);

  const density = layer.density;
  const spacing = layer.spacing / 1000;
  const speedMult = layer.speed / 100;
  const texture = layer.texture;

  let t = 0;
  let affIdx = 0;

  // FIX 4: Calculate maxIter from actual duration — prevents early exit on long tracks
  const maxIter = Math.ceil(durationSec / Math.max(0.01, spacing)) + affirmations.length * 2;
  let iterations = 0;

  while (t < durationSec && iterations < maxIter) {
    const aff = affirmations[affIdx % affirmations.length];
    const words = aff.trim().split(/\s+/).filter(Boolean);
    const wordDur = (0.07 / Math.max(0.5, speedMult));

    for (let w = 0; w < words.length; w++) {
      const wt = t + w * wordDur;
      if (wt >= durationSec) break;
      const s0 = Math.floor(wt * sr);
      const s1 = Math.min(total, Math.floor((wt + wordDur * 0.75) * sr));
      if (s1 <= s0) continue;
      const wLen = s1 - s0;

      const hash = words[w].split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

      switch (texture) {
        case 'tone':    writeToneBurst(L, R, s0, wLen, sr, hash, affIdx); break;
        case 'whisper': writeWhisper(L, R, s0, wLen, sr, hash, affIdx);   break;
        case 'deep':    writeDeepMask(L, R, s0, wLen, sr, hash, affIdx);  break;
        case 'hiss':    writeHiss(L, R, s0, wLen, sr, hash, affIdx);      break;
        case 'pulse':   writePulse(L, R, s0, wLen, sr, hash, affIdx);     break;
        default:        writeToneBurst(L, R, s0, wLen, sr, hash, affIdx);
      }
    }

    t += words.length * wordDur + spacing;
    affIdx++;
    iterations++;
  }

  softClip(L); softClip(R);
  return buf;
}

function env(i, len) {
  return 0.5 * (1 - Math.cos(2 * Math.PI * i / len));
}

function writeToneBurst(L, R, s0, len, sr, hash, affIdx) {
  const freq = 300 + (hash % 900);
  const mod  = 5 + (hash % 20);
  const pan  = (affIdx % 2 === 0) ? 0.7 : -0.7;
  const vol  = 0.18;
  for (let i = 0; i < len; i++) {
    const lt = i / sr;
    const e = env(i, len);
    const s = Math.sin(2*Math.PI*(freq + mod*Math.sin(2*Math.PI*mod*lt))*lt) * vol * e;
    L[s0+i] = (L[s0+i]||0) + s * (1 - pan * 0.5);
    R[s0+i] = (R[s0+i]||0) + s * (1 + pan * 0.5);
  }
}

function writeWhisper(L, R, s0, len, sr, hash, affIdx) {
  const fc  = 2000 + (hash % 2000);
  const bw  = 400 + (hash % 600);
  const vol = 0.14;
  let prev = 0;
  const alpha = (2*Math.PI*(bw/2)/sr) / (1 + 2*Math.PI*(bw/2)/sr);
  for (let i = 0; i < len; i++) {
    const noise = (Math.random() * 2 - 1);
    const bp = prev + alpha * (noise - prev);
    prev = bp;
    const e = env(i, len);
    const toneHint = Math.sin(2*Math.PI*fc*(i/sr)) * 0.15;
    const s = (bp * 0.85 + toneHint) * vol * e;
    const pan = (affIdx % 3 - 1) * 0.4;
    L[s0+i] = (L[s0+i]||0) + s * (1 - pan);
    R[s0+i] = (R[s0+i]||0) + s * (1 + pan);
  }
}

function writeDeepMask(L, R, s0, len, sr, hash, affIdx) {
  const freq = 60 + (hash % 80);
  const amFreq = 1 + (hash % 5);
  const vol  = 0.22;
  for (let i = 0; i < len; i++) {
    const lt = i / sr;
    const e  = env(i, len);
    const am = 0.5 + 0.5*Math.sin(2*Math.PI*amFreq*lt);
    const s  = Math.sin(2*Math.PI*freq*lt) * am * vol * e;
    L[s0+i] = (L[s0+i]||0) + s;
    R[s0+i] = (R[s0+i]||0) + s * (0.8 + (hash%3)*0.07);
  }
}

function writeHiss(L, R, s0, len, sr, hash, affIdx) {
  const vol = 0.10;
  let x1=0, x2=0, y1l=0, y2l=0;
  const fc = 4000 + (hash % 4000);
  const omega = 2*Math.PI*fc/sr;
  const sinO = Math.sin(omega), cosO = Math.cos(omega);
  const alpha = sinO / (2 * 0.707);
  const b0 =  (1+cosO)/2, b1 = -(1+cosO), b2 = (1+cosO)/2;
  const a0 = 1+alpha,     a1 = -2*cosO,   a2 = 1-alpha;

  for (let i = 0; i < len; i++) {
    const n = Math.random()*2-1;
    const e = env(i, len);
    const panSweep = Math.sin(2*Math.PI*0.5*(i/sr) + affIdx);
    const outL = (b0/a0)*n + (b1/a0)*x1 + (b2/a0)*x2 - (a1/a0)*y1l - (a2/a0)*y2l;
    x2=x1; x1=n; y2l=y1l; y1l=outL;
    const outR = outL * (0.9 + 0.1*panSweep);
    L[s0+i] = (L[s0+i]||0) + outL * vol * e * (1 - panSweep*0.4);
    R[s0+i] = (R[s0+i]||0) + outR * vol * e * (1 + panSweep*0.4);
  }
}

function writePulse(L, R, s0, len, sr, hash, affIdx) {
  const freq = 200 + (hash % 400);
  const pulseRate = 4 + (hash % 8);
  const vol = 0.16;
  for (let i = 0; i < len; i++) {
    const lt = i/sr;
    const e  = env(i, len);
    const pulse = Math.max(0, Math.sin(2*Math.PI*pulseRate*lt));
    const s = Math.sin(2*Math.PI*freq*lt) * pulse * vol * e;
    const pan = (hash % 2 === 0) ? 0.5 : -0.5;
    L[s0+i] = (L[s0+i]||0) + s * (1 - pan*0.5);
    R[s0+i] = (R[s0+i]||0) + s * (1 + pan*0.5);
  }
}

function softClip(data) {
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.tanh(data[i]);
  }
}

/* ── FOCUS / BINAURAL LAYER ──────────────────────────── */
function startFocusLayer() {
  if (!APP.focusEnabled || !APP.ctx) return;
  stopFocusLayer();
  const p = FOCUS_PRESETS[APP.focusPreset] || FOCUS_PRESETS.sleep;
  const carrierL = p.carrier;
  const carrierR = p.carrier + p.beat;

  const oscL = APP.ctx.createOscillator();
  const oscR = APP.ctx.createOscillator();
  const panL = APP.ctx.createStereoPanner ? APP.ctx.createStereoPanner() : null;
  const panR = APP.ctx.createStereoPanner ? APP.ctx.createStereoPanner() : null;
  const gL   = APP.ctx.createGain();
  const gR   = APP.ctx.createGain();

  oscL.type = 'sine'; oscL.frequency.value = carrierL;
  oscR.type = 'sine'; oscR.frequency.value = carrierR;
  gL.gain.value = APP.focusVol * 0.5;
  gR.gain.value = APP.focusVol * 0.5;

  if (panL && panR) {
    panL.pan.value = -1; panR.pan.value = 1;
    oscL.connect(gL); gL.connect(panL); panL.connect(APP.focusGain);
    oscR.connect(gR); gR.connect(panR); panR.connect(APP.focusGain);
  } else {
    oscL.connect(gL); gL.connect(APP.focusGain);
    oscR.connect(gR); gR.connect(APP.focusGain);
  }

  oscL.start(); oscR.start();
  APP.focusSrcs = [oscL, oscR, gL, gR];
  APP.focusGain.gain.value = APP.focusVol;
}

function stopFocusLayer() {
  APP.focusSrcs.forEach(n => { try { if (n.stop) n.stop(); else if (n.disconnect) n.disconnect(); } catch(e){} });
  APP.focusSrcs = [];
}

function updateFocusInfo() {
  const p = FOCUS_PRESETS[APP.focusPreset] || FOCUS_PRESETS.sleep;
  $('focusInfo').textContent =
    'Carrier: ' + p.carrier + ' Hz L / ' + (p.carrier + p.beat) + ' Hz R · Beat: ' + p.beat + ' Hz (' + p.label + ')';
}

/* ── LAYER UI WIRING ──────────────────────────────────── */

// FIX 3: Affirmation validator — warns on weak phrasing before lines are returned
function getLines(layerIdx) {
  const all = Array.from(document.querySelectorAll('.l-text[data-layer="' + layerIdx + '"]'));
  const ta = all.find(el => el.id === 'myLayer' + (layerIdx + 1)) || all[0];
  if (!ta) return [];
  const lines = ta.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Warn on weak future/conditional phrasing
  const weakPattern = /\b(will|want|try|hope|wish|going to|need to|should|would|could|might)\b/i;
  const weakLines = lines.filter(l => weakPattern.test(l));
  if (weakLines.length > 0) {
    notice('warn',
      '⚠ ' + weakLines.length + ' affirmation(s) use weak phrasing ("will", "want", "try" etc). ' +
      'For best results use present tense: "I am…", "I have…", "I do…"'
    );
  }

  return lines;
}

function setLines(layerIdx, lines) {
  document.querySelectorAll('.l-text[data-layer="' + layerIdx + '"]').forEach(ta => {
    ta.value = lines.join('\n');
  });
  updateLayerCount(layerIdx);
}

function updateLayerCount(i) {
  const lines = getLines(i);
  APP.layers[i].affirmations = lines;
  const el = document.querySelector('.l-count[data-layer="' + i + '"]');
  if (el) el.textContent = lines.length;
  updateIntensity(i);
}

function updateIntensity(i) {
  const L = APP.layers[i];
  const raw = ((L.density/20)*0.45) + ((L.vol/100)*0.35) + ((L.speed/300)*0.20);
  const pct = Math.min(100, Math.round(raw * 100));
  const bar = document.querySelector('.l-intensity[data-layer="' + i + '"]');
  if (bar) bar.style.width = pct + '%';
}

function initLayerUI() {
  $$('.ltab').forEach(tab => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.dataset.layer);
      APP.activeLayer = idx;
      $$('.ltab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      for (let i = 0; i < NUM_LAYERS; i++) {
        const p = $('lp' + i);
        if (p) p.classList.toggle('hidden', i !== idx);
      }
    });
  });

  $$('.l-enabled').forEach(cb => {
    cb.addEventListener('change', e => {
      const i = parseInt(e.target.dataset.layer);
      APP.layers[i].enabled = e.target.checked;
      syncTogglePills();
    });
  });

  $$('.l-texture').forEach(sel => {
    sel.addEventListener('change', e => {
      const i = parseInt(e.target.dataset.layer);
      APP.layers[i].texture = e.target.value;
    });
  });

  $$('.l-mode-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.layer);
      const m = btn.dataset.mode;
      APP.layers[i].mode = m;
      $$('.l-mode-chip[data-layer="' + i + '"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyModeToLayer(i, m);
    });
  });

  $$('.l-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.layer);
      const key = btn.dataset.preset;
      if (PRESET_PACKS[key]) setLines(i, PRESET_PACKS[key]);
      log('Loaded ' + key + ' pack → Layer ' + (i+1), 'ok');
    });
  });

  $$('.l-text').forEach(ta => {
    ta.addEventListener('input', () => {
      const idx = parseInt(ta.dataset.layer);
      document.querySelectorAll('.l-text[data-layer="' + idx + '"]').forEach(other => {
        if (other !== ta) other.value = ta.value;
      });
      updateLayerCount(idx);
    });
  });

  const actions = {
    'l-clear':     (i) => setLines(i, []),
    'l-shuffle':   (i) => { const l = getLines(i); shuffle(l); setLines(i, l); },
    'l-normalize': (i) => {
      const raw = document.querySelector('.l-text[data-layer="' + i + '"]').value;
      const lines = raw.split(/[.\n!?]+/).map(s => s.trim()).filter(s => s.length > 3)
        .map(s => s[0].toUpperCase() + s.slice(1));
      setLines(i, lines);
    },
    'l-dup':  (i) => { const l = getLines(i); setLines(i, [...l, ...l]); },
    'l-r2':   (i) => { const l = getLines(i); setLines(i, [...l,...l]); },
    'l-r4':   (i) => { const l = getLines(i); setLines(i, [...l,...l,...l,...l]); },
  };

  Object.entries(actions).forEach(([cls, fn]) => {
    $$('.' + cls).forEach(btn => {
      btn.addEventListener('click', () => fn(parseInt(btn.dataset.layer)));
    });
  });

  $$('.l-vol').forEach(sl => {
    sl.addEventListener('input', () => {
      const i = parseInt(sl.dataset.layer);
      APP.layers[i].vol = parseInt(sl.value);
      const el = document.querySelector('.l-vol-val[data-layer="' + i + '"]');
      if (el) el.textContent = sl.value + '%';
      if (APP.layerGains[i]) APP.layerGains[i].gain.value = parseInt(sl.value)/100;
      updateIntensity(i);
    });
  });
  $$('.l-speed').forEach(sl => {
    sl.addEventListener('input', () => {
      const i = parseInt(sl.dataset.layer);
      APP.layers[i].speed = parseInt(sl.value);
      const el = document.querySelector('.l-speed-val[data-layer="' + i + '"]');
      if (el) el.textContent = (parseInt(sl.value)/100).toFixed(2) + '×';
      updateIntensity(i);
    });
  });
  $$('.l-density').forEach(sl => {
    sl.addEventListener('input', () => {
      const i = parseInt(sl.dataset.layer);
      APP.layers[i].density = parseInt(sl.value);
      const el = document.querySelector('.l-density-val[data-layer="' + i + '"]');
      if (el) el.textContent = sl.value;
      updateIntensity(i);
    });
  });
  $$('.l-spacing').forEach(sl => {
    sl.addEventListener('input', () => {
      const i = parseInt(sl.dataset.layer);
      APP.layers[i].spacing = parseInt(sl.value);
      const el = document.querySelector('.l-spacing-val[data-layer="' + i + '"]');
      if (el) el.textContent = sl.value + 'ms';
    });
  });
}

function applyModeToLayer(i, mode) {
  const vol     = {audible:55, low:18, silent:6}[mode] || 18;
  const speed   = {audible:85, low:120, silent:200}[mode] || 120;
  const density = {audible:3,  low:7,  silent:16}[mode]  || 7;
  APP.layers[i].vol     = vol;
  APP.layers[i].speed   = speed;
  APP.layers[i].density = density;

  const vSlider = document.querySelector('.l-vol[data-layer="' + i + '"]');
  const sSlider = document.querySelector('.l-speed[data-layer="' + i + '"]');
  const dSlider = document.querySelector('.l-density[data-layer="' + i + '"]');
  if (vSlider) { vSlider.value = vol; document.querySelector('.l-vol-val[data-layer="' + i + '"]').textContent = vol + '%'; }
  if (sSlider) { sSlider.value = speed; document.querySelector('.l-speed-val[data-layer="' + i + '"]').textContent = (speed/100).toFixed(2) + '×'; }
  if (dSlider) { dSlider.value = density; document.querySelector('.l-density-val[data-layer="' + i + '"]').textContent = density; }
  if (APP.layerGains[i]) APP.layerGains[i].gain.value = vol/100;
  updateIntensity(i);
}

const MY_AFF_KEY = 'sf_v2_my_affirmations';

function initSimpleWorkflowUI() {
  const byId = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };

  byId('btnClearAllAff', () => {
    for (let i = 0; i < NUM_LAYERS; i++) setLines(i, []);
    notice('info', 'All affirmation layers cleared.');
  });
  byId('btnLoadExFocus', () => loadExampleSet('focus'));
  byId('btnLoadExGym',   () => loadExampleSet('gym'));
  byId('btnLoadExChill', () => loadExampleSet('chill'));
  byId('btnSaveMyAff',   saveMyAffirmations);

  byId('btnModeFocus', () => applyMainMode('focus'));
  byId('btnModeGym',   () => applyMainMode('gym'));
  byId('btnModeChill', () => applyMainMode('chill'));
  byId('btnAdvSave',   () => $('btnSaveSession').click());
  byId('btnAdvLoad',   () => $('btnLoadSession').click());
  byId('btnAdvReset',  () => $('btnResetSession').click());

  byId('btnToggleAdvanced', () => {
    const willShow = $('secMixer').classList.contains('hidden');
    ['secMixer', 'secLayers', 'secFocus'].forEach(id => $(id).classList.toggle('hidden', !willShow));
    $('btnToggleAdvanced').textContent = willShow ? 'Hide Advanced Settings' : 'Show Advanced Settings';
  });

  loadMyAffirmations();
  applyMainMode('focus');
}

function saveMyAffirmations() {
  try {
    const payload = { version: 1, layers: [0, 1, 2].map(i => getLines(i)) };
    localStorage.setItem(MY_AFF_KEY, JSON.stringify(payload));
    notice('ok', '✓ My affirmations saved locally on this device.');
  } catch (e) {
    notice('warn', '⚠ Could not save affirmations: ' + e.message);
  }
}

function loadMyAffirmations() {
  try {
    const raw = localStorage.getItem(MY_AFF_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.layers)) return;
    data.layers.forEach((lines, i) => { if (Array.isArray(lines)) setLines(i, lines); });
    notice('info', 'Loaded your saved affirmations.');
  } catch (e) {
    console.warn('Affirmation load failed:', e);
  }
}

function loadExampleSet(key) {
  const set = EXAMPLE_SETS[key];
  if (!set) return;
  for (let i = 0; i < NUM_LAYERS; i++) setLines(i, set[i] || []);
  notice('ok', 'Loaded example ' + key + ' affirmations.');
}

function setSliderValue(id, value, textId, text) {
  if ($(id)) $(id).value = value;
  if (textId && $(textId)) $(textId).textContent = text;
}

function applyMainMode(mode) {
  const cfg = {
    // FIX 2: Focus mode now uses Theta (4Hz) by default — ideal for subconscious absorption
    focus: { music:85, sub:22, master:85, speed:105, density:[6,8,10], spacing:[260,170,120], focusOn:true,  focusPreset:'sleep', focusVol:12, label:'Focus Mode Active' },
    gym:   { music:85, sub:25, master:88, speed:110, density:[7,10,12], spacing:[220,140,90],  focusOn:false, focusPreset:'high',  focusVol:5,  label:'Gym Mode Active' },
    chill: { music:85, sub:18, master:80, speed:100, density:[4,6,8],   spacing:[380,260,180], focusOn:true,  focusPreset:'calm',  focusVol:10, label:'Chill Mode Active' },
  }[mode];
  if (!cfg) return;

  APP.musicVol    = cfg.music / 100;
  APP.subMixVol   = cfg.sub / 100;
  APP.masterVol   = cfg.master / 100;
  APP.playSpeed   = cfg.speed / 100;
  APP.focusEnabled= cfg.focusOn;
  APP.focusPreset = cfg.focusPreset;
  APP.focusVol    = cfg.focusVol / 100;

  setSliderValue('slMusicVol', cfg.music,    'vMusicVol',  cfg.music + '%');
  setSliderValue('slSubMix',   cfg.sub,      'vSubMix',    cfg.sub + '%');
  setSliderValue('slMasterVol',cfg.master,   'vMasterVol', cfg.master + '%');
  setSliderValue('slSpeed',    cfg.speed,    'vSpeed',     (cfg.speed / 100).toFixed(2) + '×');
  setSliderValue('slFocusVol', cfg.focusVol, 'vFocusVol',  cfg.focusVol + '%');
  if ($('toggleFocus')) $('toggleFocus').checked = cfg.focusOn;
  updateFocusInfo();
  $$('.focus-preset').forEach(b => b.classList.toggle('active', b.dataset.fp === cfg.focusPreset));

  for (let i = 0; i < NUM_LAYERS; i++) {
    APP.layers[i].enabled = true;
    APP.layers[i].mode    = 'low';
    APP.layers[i].density = cfg.density[i];
    APP.layers[i].spacing = cfg.spacing[i];
    const cb    = document.querySelector('.l-enabled[data-layer="' + i + '"]');  if (cb)    cb.checked = true;
    const den   = document.querySelector('.l-density[data-layer="' + i + '"]');  if (den)   den.value  = cfg.density[i];
    const sp    = document.querySelector('.l-spacing[data-layer="' + i + '"]');  if (sp)    sp.value   = cfg.spacing[i];
    const denV  = document.querySelector('.l-density-val[data-layer="' + i + '"]'); if (denV) denV.textContent = cfg.density[i];
    const spV   = document.querySelector('.l-spacing-val[data-layer="' + i + '"]'); if (spV)  spV.textContent  = cfg.spacing[i] + 'ms';
    $$('.l-mode-chip[data-layer="' + i + '"]').forEach(b => b.classList.toggle('active', b.dataset.mode === 'low'));
    updateIntensity(i);
  }
  syncTogglePills();

  if ($('modeActiveLabel')) $('modeActiveLabel').textContent = cfg.label;
  $$('.mode-btn').forEach(b => b.classList.remove('active'));
  if (mode === 'focus' && $('btnModeFocus')) $('btnModeFocus').classList.add('active');
  if (mode === 'gym'   && $('btnModeGym'))   $('btnModeGym').classList.add('active');
  if (mode === 'chill' && $('btnModeChill')) $('btnModeChill').classList.add('active');
  notice('info', cfg.label + ' (audio settings applied; your affirmations were not changed).');
}

/* ── GLOBAL MIXER WIRING ─────────────────────────────── */
function initMixer() {
  $('slMusicVol').addEventListener('input', e => {
    APP.musicVol = parseInt(e.target.value)/100;
    $('vMusicVol').textContent = e.target.value + '%';
    if (APP.musicGain) APP.musicGain.gain.value = APP.musicVol;
  });
  $('slSubMix').addEventListener('input', e => {
    APP.subMixVol = parseInt(e.target.value)/100;
    $('vSubMix').textContent = e.target.value + '%';
    if (APP.subBusGain) APP.subBusGain.gain.value = APP.subMixVol;
  });
  $('slMasterVol').addEventListener('input', e => {
    APP.masterVol = parseInt(e.target.value)/100;
    $('vMasterVol').textContent = e.target.value + '%';
    if (APP.masterGain) APP.masterGain.gain.value = APP.masterVol;
  });
  $('slSpeed').addEventListener('input', e => {
    APP.playSpeed = parseInt(e.target.value)/100;
    $('vSpeed').textContent = APP.playSpeed.toFixed(2) + '×';
    if (APP.musicSrc) APP.musicSrc.playbackRate.value = APP.playSpeed;
  });
}

/* ── FOCUS LAYER WIRING ───────────────────────────────── */
function initFocusLayer() {
  $('toggleFocus').addEventListener('change', e => {
    APP.focusEnabled = e.target.checked;
    syncTogglePills();
    if (APP.isPlaying) {
      stopFocusLayer();
      if (APP.focusEnabled) startFocusLayer();
    }
  });
  $('slFocusVol').addEventListener('input', e => {
    APP.focusVol = parseInt(e.target.value)/100;
    $('vFocusVol').textContent = e.target.value + '%';
    if (APP.focusGain) APP.focusGain.gain.value = APP.focusVol;
  });
  $$('.focus-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.focus-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      APP.focusPreset = btn.dataset.fp;
      updateFocusInfo();
      if (APP.isPlaying && APP.focusEnabled) { stopFocusLayer(); startFocusLayer(); }
    });
  });
  updateFocusInfo();
}

/* ── TOGGLE PILL SYNC ─────────────────────────────────── */
function syncTogglePills() {
  $$('.toggle-pill').forEach(pill => {
    const cb = pill.querySelector('input[type="checkbox"]');
    if (cb) pill.classList.toggle('checked', cb.checked);
  });
}

/* ── SESSION SAVE / LOAD / RESET ──────────────────────── */
const SESSION_KEY = 'sf_v2_session';

function saveSession() {
  const data = {
    version: 2,
    saved: new Date().toISOString(),
    layers: APP.layers.map((l, i) => ({
      enabled:  l.enabled,
      text:     (document.querySelector('.l-text[data-layer="' + i + '"]') || {}).value || '',
      vol:      l.vol,
      speed:    l.speed,
      density:  l.density,
      spacing:  l.spacing,
      texture:  l.texture,
      mode:     l.mode,
    })),
    musicVol:     parseInt($('slMusicVol').value),
    subMixVol:    parseInt($('slSubMix').value),
    masterVol:    parseInt($('slMasterVol').value),
    playSpeed:    parseInt($('slSpeed').value),
    focusEnabled: APP.focusEnabled,
    focusVol:     parseInt($('slFocusVol').value),
    focusPreset:  APP.focusPreset,
    exportFilename: $('exportFilename').value,
    exportFormat: $('exportFormat').value,
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    notice('ok', '✓ Session saved. Settings, affirmations, and mixer values stored. Note: uploaded audio is NOT saved.');
    log('Session saved (' + new Date().toLocaleTimeString() + ')', 'ok');
  } catch(e) {
    notice('warn', '⚠ Could not save session: ' + e.message);
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { notice('warn', '⚠ No saved session found.'); return; }
    const data = JSON.parse(raw);
    if (!data || data.version !== 2) { notice('warn', '⚠ Session format mismatch. Reset and try again.'); return; }

    data.layers.forEach((ld, i) => {
      if (i >= NUM_LAYERS) return;
      APP.layers[i].enabled  = ld.enabled;
      APP.layers[i].vol      = ld.vol;
      APP.layers[i].speed    = ld.speed;
      APP.layers[i].density  = ld.density;
      APP.layers[i].spacing  = ld.spacing;
      APP.layers[i].texture  = ld.texture || 'tone';
      APP.layers[i].mode     = ld.mode || 'low';

      const ta = document.querySelector('.l-text[data-layer="' + i + '"]');
      if (ta) { ta.value = ld.text || ''; }

      const cb = document.querySelector('.l-enabled[data-layer="' + i + '"]');
      if (cb) cb.checked = ld.enabled;

      const texSel = document.querySelector('.l-texture[data-layer="' + i + '"]');
      if (texSel) texSel.value = ld.texture || 'tone';

      const fields = ['vol','speed','density','spacing'];
      fields.forEach(f => {
        const sl = document.querySelector('.l-' + f + '[data-layer="' + i + '"]');
        if (sl) sl.value = ld[f];
        const vEl = document.querySelector('.l-' + f + '-val[data-layer="' + i + '"]');
        if (vEl) {
          if (f==='vol')     vEl.textContent = ld[f] + '%';
          if (f==='speed')   vEl.textContent = (ld[f]/100).toFixed(2) + '×';
          if (f==='density') vEl.textContent = ld[f];
          if (f==='spacing') vEl.textContent = ld[f] + 'ms';
        }
      });

      $$('.l-mode-chip[data-layer="' + i + '"]').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === ld.mode);
      });

      updateLayerCount(i);
    });

    $('slMusicVol').value = data.musicVol;    $('vMusicVol').textContent  = data.musicVol + '%';
    $('slSubMix').value   = data.subMixVol;   $('vSubMix').textContent    = data.subMixVol + '%';
    $('slMasterVol').value= data.masterVol;   $('vMasterVol').textContent = data.masterVol + '%';
    $('slSpeed').value    = data.playSpeed;   $('vSpeed').textContent     = (data.playSpeed/100).toFixed(2) + '×';
    APP.musicVol   = data.musicVol/100;
    APP.subMixVol  = data.subMixVol/100;
    APP.masterVol  = data.masterVol/100;
    APP.playSpeed  = data.playSpeed/100;

    $('toggleFocus').checked = data.focusEnabled;
    APP.focusEnabled = data.focusEnabled;
    $('slFocusVol').value = data.focusVol;
    $('vFocusVol').textContent = data.focusVol + '%';
    APP.focusVol = data.focusVol/100;
    APP.focusPreset = data.focusPreset || 'sleep';
    $$('.focus-preset').forEach(b => b.classList.toggle('active', b.dataset.fp === APP.focusPreset));
    updateFocusInfo();

    $('exportFilename').value = data.exportFilename || 'subliminal_mix';
    APP.exportFormat = data.exportFormat === 'mp3' ? 'mp3' : 'wav';
    $('exportFormat').value = APP.exportFormat;
    updateExportUI();

    syncTogglePills();
    notice('ok', '✓ Session loaded from ' + new Date(data.saved).toLocaleString() + '. Note: audio file must be re-uploaded.');
    log('Session loaded', 'ok');
  } catch(e) {
    notice('error', '✗ Failed to load session: ' + e.message);
    log('Load error: ' + e.message, 'err');
  }
}

function resetSession() {
  if (!confirm('Reset all settings and affirmations? (Your uploaded audio is not affected.)')) return;
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
  stopAll(true);
  for (let i = 0; i < NUM_LAYERS; i++) {
    APP.layers[i] = defaultLayer(i);
    const ta = document.querySelector('.l-text[data-layer="' + i + '"]');
    if (ta) ta.value = '';
    updateLayerCount(i);
    const defaults = { vol: [30,20,15][i], speed: [100,130,170][i], density: [5,8,12][i], spacing: [300,150,80][i] };
    Object.entries(defaults).forEach(([f, v]) => {
      const sl = document.querySelector('.l-' + f + '[data-layer="' + i + '"]');
      if (sl) sl.value = v;
      const vEl = document.querySelector('.l-' + f + '-val[data-layer="' + i + '"]');
      if (vEl) {
        if (f==='vol')     vEl.textContent = v + '%';
        if (f==='speed')   vEl.textContent = (v/100).toFixed(2) + '×';
        if (f==='density') vEl.textContent = v;
        if (f==='spacing') vEl.textContent = v + 'ms';
      }
    });
  }
  $('slMusicVol').value = 80;   $('vMusicVol').textContent  = '80%';
  $('slSubMix').value   = 28;   $('vSubMix').textContent    = '28%';
  $('slMasterVol').value= 88;   $('vMasterVol').textContent = '88%';
  $('slSpeed').value    = 100;  $('vSpeed').textContent     = '1.00×';
  $('exportFilename').value = 'subliminal_mix';
  $('exportFormat').value = 'wav';
  APP.musicVol=0.80; APP.subMixVol=0.28; APP.masterVol=0.88; APP.playSpeed=1.0;
  APP.exportFormat='wav';
  updateExportUI();
  notice('info', 'Session reset. All affirmations and settings cleared.');
  log('Session reset', 'ok');
}

/* ── EXPORT ENGINE ───────────────────────────────────── */
function initExport() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) {
    notice('error',
      '✗ OfflineAudioContext not available in this browser. WAV export requires Chrome, Firefox, or Safari 14.5+. ' +
      'Live preview still works.'
    );
    $('btnExport').disabled = true;
  } else {
    notice('info',
      '✓ Export ready. WAV is lossless; MP3 uses 320 kbps CBR for smaller files. ' +
      'The subliminal layers are tone/noise-based (not TTS voice).'
    );
  }

  $('exportFormat').addEventListener('change', e => {
    APP.exportFormat = e.target.value === 'mp3' ? 'mp3' : 'wav';
    updateExportUI();
  });
  updateExportUI();
  $('btnExport').addEventListener('click', doExport);
  $('btnPreview').addEventListener('click', () => {
    if (APP.isPlaying) { pauseAudio(); $('btnPreview').textContent = '▶ Preview Mix'; }
    else { playAudio(); $('btnPreview').textContent = '⏸ Stop Preview'; if (!APP.musicBuffer) $('btnPreview').textContent = '▶ Preview Mix'; }
  });
}

async function doExport() {
  if (!APP.musicBuffer) { notice('warn', '⚠ Upload a track before exporting.'); return; }
  const activeLayers = APP.layers.filter((l,i) => l.enabled && getLines(i).length > 0);
  if (activeLayers.length === 0) {
    notice('warn', '⚠ Enable at least one layer with affirmations before exporting.'); return;
  }

  $('btnExport').disabled = true;
  $('renderProgress').classList.remove('hidden');
  $('exportLog').textContent = '';
  setStatus('rendering', 'Rendering…');
  log('Starting export…', 'info');

  try {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const dur = APP.musicBuffer.duration;
    const sr  = APP.musicBuffer.sampleRate;
    const ch  = APP.musicBuffer.numberOfChannels;
    const off = new OAC(ch, Math.ceil(dur * sr), sr);

    log('Offline context: ' + sr + 'Hz · ' + ch + 'ch · ' + dur.toFixed(1) + 's');

    const masterG = off.createGain();
    masterG.gain.value = Math.min(APP.masterVol, 0.96);
    masterG.connect(off.destination);

    const lim = off.createDynamicsCompressor();
    lim.threshold.value = -2; lim.knee.value = 3;
    lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.05;
    lim.connect(masterG);

    const ws = off.createWaveShaper();
    ws.curve = softClipCurve(512); ws.oversample = '4x';
    ws.connect(lim);

    const musG = off.createGain();
    musG.gain.value = APP.musicVol;
    musG.connect(ws);
    const musS = off.createBufferSource();
    musS.buffer = APP.musicBuffer;
    musS.playbackRate.value = APP.playSpeed;
    musS.connect(musG);
    musS.start(0);
    log('Music scheduled');
    setRPct(15);

    const subBus = off.createGain();
    subBus.gain.value = APP.subMixVol;
    subBus.connect(ws);

    let layersDone = 0;
    for (let i = 0; i < NUM_LAYERS; i++) {
      const layer = APP.layers[i];
      if (!layer.enabled) continue;
      const aff = getLines(i);
      if (aff.length === 0) { log('Layer ' + (i+1) + ': skipped (no affirmations)', 'warn'); continue; }
      const lBuf = generateSubBuffer(off, dur, layer, aff);
      const lG   = off.createGain();
      lG.gain.value = layer.vol / 100;
      lG.connect(subBus);
      const lS = off.createBufferSource();
      lS.buffer = lBuf;
      lS.loop = false;
      lS.connect(lG);
      lS.start(0);
      layersDone++;
      log('Layer ' + (i+1) + ': ' + aff.length + ' affirmations · ' + layer.texture + ' · ' + layer.mode, 'ok');
      setRPct(15 + layersDone * 15);
    }

    if (APP.focusEnabled) {
      const fp = FOCUS_PRESETS[APP.focusPreset] || FOCUS_PRESETS.sleep;
      const fG = off.createGain(); fG.gain.value = APP.focusVol * 0.5; fG.connect(ws);
      const oL = off.createOscillator(); oL.frequency.value = fp.carrier; oL.type = 'sine';
      const oR = off.createOscillator(); oR.frequency.value = fp.carrier + fp.beat; oR.type = 'sine';
      const panL = off.createStereoPanner ? off.createStereoPanner() : null;
      const panR = off.createStereoPanner ? off.createStereoPanner() : null;
      if (panL && panR) {
        panL.pan.value = -1; panR.pan.value = 1;
        oL.connect(panL); panL.connect(fG);
        oR.connect(panR); panR.connect(fG);
      } else { oL.connect(fG); oR.connect(fG); }
      oL.start(); oR.start();
      log('Focus layer: ' + fp.carrier + 'Hz / ' + (fp.carrier+fp.beat) + 'Hz · ' + fp.beat + 'Hz beat', 'ok');
    }

    setRPct(65);
    log('Rendering… (offline)');

    const rendered = await off.startRendering();
    setRPct(85);
    log('Render complete · normalizing…');

    normalize(rendered);
    setRPct(92);
    const baseName = $('exportFilename').value.trim() || 'subliminal_mix';
    const format = APP.exportFormat === 'mp3' ? 'mp3' : 'wav';
    let fname = baseName + '.wav';
    let blob = null;
    if (format === 'mp3') {
      log('Preparing iPhone-compatible MP3 render (44.1kHz stereo)…');
      const mp3Ready = await prepareBufferForMP3(rendered, 44100);
      log('Encoding MP3 @ 320 kbps…');
      const mp3Buf = await encodeMP3(mp3Ready, 320);
      setRPct(98);
      fname = baseName + '.mp3';
      blob = new Blob([mp3Buf], { type: 'audio/mpeg' });
    } else {
      log('Encoding WAV…');
      const wavBuf = encodeWAV(rendered);
      setRPct(98);
      fname = baseName + '.wav';
      blob = new Blob([wavBuf], { type: 'audio/wav' });
    }
    downloadBlob(blob, fname);

    setRPct(100);
    setStatus('done', 'Done');
    log('✓ Exported: ' + fname + ' (' + rendered.numberOfChannels + 'ch · ' + rendered.sampleRate + 'Hz · ' + rendered.duration.toFixed(1) + 's)', 'ok');
    notice('ok', '✓ Export complete: ' + fname + '. Check your Downloads / Files app.');

  } catch(err) {
    console.error(err);
    setStatus('error', 'Export Error');
    log('Export failed: ' + err.message, 'err');
    notice('error', '✗ Export failed: ' + err.message);
  } finally {
    $('btnExport').disabled = false;
    setTimeout(() => $('renderProgress').classList.add('hidden'), 4000);
  }
}

function updateExportUI() {
  const isMp3 = APP.exportFormat === 'mp3';
  $('exportSuffix').textContent = isMp3 ? '.mp3' : '.wav';
  $('btnExport').textContent = isMp3 ? '⤓ Export MP3 (320k)' : '⤓ Export WAV';
}

function setRPct(p) {
  $('rPct').textContent = p + '%';
  $('rFill').style.width = p + '%';
}

/* ── PEAK NORMALIZER ─────────────────────────────────── */
function normalize(audioBuffer) {
  let peak = 0;
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
  }
  if (peak < 0.001 || peak >= 0.98) return;
  const gain = 0.95 / peak;
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) data[i] *= gain;
  }
}

/* ── WAV ENCODER ─────────────────────────────────────── */
function encodeWAV(buf) {
  const nCh = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
  const bps = 2, bAlign = nCh * bps, bRate = sr * bAlign, dSize = n * bAlign;
  const ab = new ArrayBuffer(44 + dSize);
  const v  = new DataView(ab);
  const w  = (o, s) => { for (let i=0;i<s.length;i++) v.setUint8(o+i, s.charCodeAt(i)); };
  w(0,'RIFF'); v.setUint32(4, 36+dSize, true); w(8,'WAVE'); w(12,'fmt ');
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,nCh,true);
  v.setUint32(24,sr,true); v.setUint32(28,bRate,true); v.setUint16(32,bAlign,true);
  v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,dSize,true);
  let off = 44;
  for (let i=0; i<n; i++) {
    for (let c=0; c<nCh; c++) {
      const s = Math.max(-1,Math.min(1, buf.getChannelData(c)[i]));
      v.setInt16(off, s<0 ? s*0x8000 : s*0x7FFF, true); off+=2;
    }
  }
  return ab;
}

async function ensureLame() {
  if (window.lamejs) return window.lamejs;
  if (APP.lameLoader) return APP.lameLoader;

  APP.lameLoader = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
    s.async = true;
    s.onload = () => window.lamejs ? resolve(window.lamejs) : reject(new Error('lamejs failed to initialize.'));
    s.onerror = () => reject(new Error('Could not load MP3 encoder. Check internet connection and retry.'));
    document.head.appendChild(s);
  });
  return APP.lameLoader;
}

async function encodeMP3(audioBuffer, kbps = 320) {
  const lame = await ensureLame();
  const nCh = Math.min(2, audioBuffer.numberOfChannels);
  const sr = audioBuffer.sampleRate;
  const enc = new lame.Mp3Encoder(nCh, sr, kbps);
  const blockSize = 1152;
  const total = audioBuffer.length;
  const chunks = [];

  if (nCh === 1) {
    const mono = floatTo16(audioBuffer.getChannelData(0));
    for (let i = 0; i < total; i += blockSize) {
      const mp3 = enc.encodeBuffer(mono.subarray(i, i + blockSize));
      if (mp3.length) chunks.push(new Uint8Array(mp3));
    }
  } else {
    const left  = floatTo16(audioBuffer.getChannelData(0));
    const right = floatTo16(audioBuffer.getChannelData(1));
    for (let i = 0; i < total; i += blockSize) {
      const mp3 = enc.encodeBuffer(left.subarray(i, i + blockSize), right.subarray(i, i + blockSize));
      if (mp3.length) chunks.push(new Uint8Array(mp3));
    }
  }

  const end = enc.flush();
  if (end.length) chunks.push(new Uint8Array(end));

  let size = 0;
  chunks.forEach(c => size += c.length);
  const out = new Uint8Array(size);
  let off = 0;
  chunks.forEach(c => { out.set(c, off); off += c.length; });
  return out;
}

async function prepareBufferForMP3(audioBuffer, targetSampleRate = 44100) {
  const supportedRates = [32000, 44100, 48000];
  const sr = supportedRates.includes(targetSampleRate) ? targetSampleRate : 44100;
  const ch = Math.min(2, audioBuffer.numberOfChannels);
  const needsResample = audioBuffer.sampleRate !== sr || audioBuffer.numberOfChannels !== ch;
  if (!needsResample) return audioBuffer;

  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const frames = Math.ceil(audioBuffer.duration * sr);
  const off = new OAC(ch, frames, sr);
  const src = off.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(off.destination);
  src.start(0);
  return off.startRendering();
}

function floatTo16(float32Array) {
  const out = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return out;
}

function softClipCurve(n) {
  const c = new Float32Array(n);
  for (let i=0; i<n; i++) { const x=(i*2/n)-1; c[i]=Math.tanh(x*2)/Math.tanh(2); }
  return c;
}

/* ── UTILS ───────────────────────────────────────────── */
function fmtTime(s) {
  if (!isFinite(s)) return '0:00';
  return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
}

function shuffle(arr) {
  for (let i=arr.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1200);
}

/* ── SERVICE WORKER ──────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('[SF] SW registered'))
      .catch(e => console.warn('[SF] SW failed:', e));
  });
}

/* ── INIT ────────────────────────────────────────────── */
(function init() {
  initUpload();
  initTransport();
  initLayerUI();
  initMixer();
  initFocusLayer();
  initExport();
  initSimpleWorkflowUI();
  syncTogglePills();
  setStatus('ready', 'Ready');

  $('btnSaveSession').addEventListener('click', saveSession);
  $('btnLoadSession').addEventListener('click', loadSession);
  $('btnResetSession').addEventListener('click', resetSession);

  document.addEventListener('touchstart', () => {
    if (APP.ctx && APP.ctx.state === 'suspended') APP.ctx.resume();
  }, { passive: true });
  document.addEventListener('click', () => {
    if (APP.ctx && APP.ctx.state === 'suspended') APP.ctx.resume();
  }, { once: false });

  try {
    if (localStorage.getItem(SESSION_KEY)) {
      log('Previous session found. Tap "Load" to restore.', 'info');
    }
  } catch(e) {}

  log('Subliminal Forge v2 ready · ' + (window.AudioContext ? 'AudioContext OK' : 'webkitAudioContext') + ' · ' + navigator.userAgent.substring(0,40), 'info');
})();
