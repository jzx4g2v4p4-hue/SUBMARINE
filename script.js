'use strict';

const NUM_LAYERS = 3;
const AFF_KEY = 'sf_my_affirmations_v3';
const SESSIONS_KEY = 'sf_recent_sessions_v3';

const EXAMPLES = {
  focus: [
    ['I focus deeply for long stretches', 'I finish important tasks quickly'],
    ['I ignore distractions easily', 'My attention stays sharp'],
    ['I am calm and locked in']
  ],
  gym: [
    ['I train hard and consistently', 'I finish every rep strong'],
    ['My energy is high and controlled', 'I execute with power'],
    ['I am disciplined daily']
  ],
  chill: [
    ['I relax deeply and naturally', 'I feel grounded and calm'],
    ['I release tension smoothly'],
    ['I trust life and stay steady']
  ]
};

const APP = {
  ctx: null, masterGain: null, musicGain: null, subGain: null, focusGain: null,
  musicBuffer: null, musicSrc: null, subSrcs: [], focusNodes: [],
  layers: [0, 1, 2].map(i => ({ enabled: true, vol: [30,20,15][i], speed: [105,110,100][i], density:[6,8,10][i], spacing:[260,170,120][i] })),
  mode: 'focus', musicVol: 0.85, subMix: 0.22, masterVol: 0.88, playSpeed: 1.05, focusBeat: 40, focusVol: 0.12,
  isPlaying: false, timer: null, pomodoro: null, lastSummary: null
};

const $ = id => document.getElementById(id);
const lines = i => ($('myLayer' + (i + 1)).value || '').split('\n').map(s => s.trim()).filter(Boolean);
const setStatus = s => $('statusLabel').textContent = s;
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function ensureCtx() {
  if (APP.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  APP.ctx = new AC();
  APP.masterGain = APP.ctx.createGain(); APP.masterGain.gain.value = APP.masterVol; APP.masterGain.connect(APP.ctx.destination);
  APP.musicGain = APP.ctx.createGain(); APP.musicGain.gain.value = APP.musicVol; APP.musicGain.connect(APP.masterGain);
  APP.subGain = APP.ctx.createGain(); APP.subGain.gain.value = APP.subMix; APP.subGain.connect(APP.masterGain);
  APP.focusGain = APP.ctx.createGain(); APP.focusGain.gain.value = APP.focusVol; APP.focusGain.connect(APP.masterGain);
}

async function loadFile(file) {
  const arr = await file.arrayBuffer();
  const tmp = new (window.AudioContext || window.webkitAudioContext)();
  APP.musicBuffer = await tmp.decodeAudioData(arr.slice(0));
  await tmp.close();
  $('trackMeta').textContent = `${file.name} · ${fmt(Math.round(APP.musicBuffer.duration))}`;
  setStatus('Track loaded');
}

function generateSubBuffer(ctx, duration, layer, aff) {
  const sr = ctx.sampleRate, frames = Math.ceil(duration * sr);
  const b = ctx.createBuffer(2, frames, sr);
  const l = b.getChannelData(0), r = b.getChannelData(1);
  const wordDur = 0.06 / (layer.speed / 100);
  let t = 0;
  while (t < duration) {
    const a = aff[Math.floor(Math.random() * aff.length)] || '';
    const words = a.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const start = Math.floor((t + i * wordDur) * sr), end = Math.min(frames, start + Math.floor(wordDur * sr));
      const f = 200 + (words[i].charCodeAt(0) || 0) * 3;
      for (let n = start; n < end; n++) {
        const tt = n / sr; const env = Math.sin(((n - start) / (end - start)) * Math.PI);
        const s = Math.sin(2 * Math.PI * f * tt) * 0.12 * env;
        l[n] += s; r[n] += s * 0.95;
      }
    }
    t += words.length * wordDur + (layer.spacing / 1000) / Math.max(1, layer.density / 4);
  }
  return b;
}

function startFocus() {
  stopFocus();
  if (APP.focusBeat <= 0 || APP.focusVol <= 0) return;
  const oL = APP.ctx.createOscillator(), oR = APP.ctx.createOscillator();
  const g = APP.ctx.createGain(); g.gain.value = APP.focusVol;
  const pL = APP.ctx.createStereoPanner(), pR = APP.ctx.createStereoPanner(); pL.pan.value = -1; pR.pan.value = 1;
  oL.frequency.value = 180; oR.frequency.value = 180 + APP.focusBeat; oL.connect(pL).connect(g); oR.connect(pR).connect(g); g.connect(APP.focusGain);
  oL.start(); oR.start(); APP.focusNodes = [oL, oR, g];
}
function stopFocus() { APP.focusNodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch(e){} }); APP.focusNodes = []; }

function playAudio() {
  if (!APP.musicBuffer) return $('exportNotice').textContent = 'Upload a track first.';
  ensureCtx();
  stopAudio();
  APP.musicSrc = APP.ctx.createBufferSource(); APP.musicSrc.buffer = APP.musicBuffer; APP.musicSrc.loop = $('toggleMusicLoop').checked; APP.musicSrc.playbackRate.value = APP.playSpeed;
  APP.musicSrc.connect(APP.musicGain); APP.musicSrc.start();
  APP.subSrcs = [];
  for (let i = 0; i < NUM_LAYERS; i++) {
    const aff = lines(i); if (!aff.length) continue;
    const src = APP.ctx.createBufferSource(); src.buffer = generateSubBuffer(APP.ctx, APP.musicBuffer.duration, APP.layers[i], aff); src.loop = true;
    const g = APP.ctx.createGain(); g.gain.value = APP.layers[i].vol / 100; src.connect(g).connect(APP.subGain); src.start(); APP.subSrcs.push(src);
  }
  startFocus(); APP.isPlaying = true; setStatus('Playing');
}
function pauseAudio() { APP.ctx?.suspend(); setStatus('Paused'); }
function stopAudio() {
  try { APP.musicSrc?.stop(); } catch(e){}
  APP.subSrcs.forEach(s => { try { s.stop(); } catch(e){} }); APP.subSrcs = []; APP.musicSrc = null; stopFocus(); APP.ctx?.resume(); APP.isPlaying = false; setStatus('Stopped');
}

function applyMode(mode) {
  const cfg = {
    focus: { music:85, sub:22, speed:105, density:[6,8,10], beat:40, bVol:12 },
    gym: { music:85, sub:28, speed:110, density:[10,12,14], beat:2, bVol:3 },
    chill: { music:85, sub:18, speed:100, density:[3,4,5], beat:10, bVol:10 }
  }[mode];
  APP.mode = mode; APP.musicVol = cfg.music/100; APP.subMix = cfg.sub/100; APP.playSpeed = cfg.speed/100; APP.focusBeat = cfg.beat; APP.focusVol = cfg.bVol/100;
  APP.layers.forEach((l, i) => l.density = cfg.density[i]);
  $('slMusicVol').value = cfg.music; $('slSubMix').value = cfg.sub; $('slSpeed').value = cfg.speed; $('slBinauralBeat').value = cfg.beat; $('slFocusVol').value = cfg.bVol;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active')); $('btnMode' + mode[0].toUpperCase() + mode.slice(1)).classList.add('active');
  $('modeActiveLabel').textContent = `${mode[0].toUpperCase() + mode.slice(1)} Mode active (affirmations unchanged)`;
}

function saveAffirmations() {
  localStorage.setItem(AFF_KEY, JSON.stringify([lines(0), lines(1), lines(2)]));
  $('exportNotice').textContent = 'Affirmations saved locally.';
}
function loadAffirmations() {
  const raw = localStorage.getItem(AFF_KEY); if (!raw) return;
  const arr = JSON.parse(raw); if (!Array.isArray(arr)) return;
  arr.forEach((v, i) => $('myLayer' + (i + 1)).value = (v || []).join('\n'));
}
function loadExample(key) { EXAMPLES[key].forEach((arr, i) => $('myLayer' + (i + 1)).value = arr.join('\n')); }

function sessionConfig() {
  return {
    title: $('sessionTitle').value || 'Subliminal Session',
    workMin: Number($('workMin').value || 25),
    breakMin: Number($('breakMin').value || 5),
    sessions: Number($('sessionCount').value || 4),
    breakBehavior: $('breakBehavior').value
  };
}

function startPomodoro() {
  const cfg = sessionConfig();
  const totalMin = (cfg.workMin + cfg.breakMin) * cfg.sessions;
  if (totalMin > 240) $('sessionWarning').textContent = 'Warning: very long session may be heavy on mobile export.'; else $('sessionWarning').textContent = '';
  APP.pomodoro = { ...cfg, current: 1, phase: 'work', remaining: cfg.workMin * 60, running: true, startedAt: new Date().toISOString() };
  if (!APP.isPlaying) playAudio();
  tickPomodoro(); clearInterval(APP.timer); APP.timer = setInterval(tickPomodoro, 1000);
}
function tickPomodoro() {
  const p = APP.pomodoro; if (!p || !p.running) return;
  $('timerPhase').textContent = `Phase: ${p.phase === 'work' ? 'Work' : 'Break'}`;
  $('timerDisplay').textContent = fmt(p.remaining);
  $('timerSession').textContent = `Session ${p.current}/${p.sessions}`;
  const phaseDur = (p.phase === 'work' ? p.workMin : p.breakMin) * 60;
  $('timerProgress').style.width = `${((phaseDur - p.remaining) / phaseDur) * 100}%`;
  p.remaining -= 1;
  if (p.remaining >= 0) return;
  if (p.phase === 'work') { p.phase = 'break'; p.remaining = p.breakMin * 60; applyBreakBehavior(); return; }
  if (p.current >= p.sessions) { endPomodoro(); return; }
  p.current += 1; p.phase = 'work'; p.remaining = p.workMin * 60; restoreFromBreak();
}
function applyBreakBehavior() {
  if (!APP.ctx) return;
  if (APP.pomodoro.breakBehavior === 'music') APP.subGain.gain.value = 0;
  else if (APP.pomodoro.breakBehavior === 'reduce') APP.subGain.gain.value = APP.subMix * 0.35;
}
function restoreFromBreak() { if (APP.subGain) APP.subGain.gain.value = APP.subMix; }
function pausePomodoro() { if (APP.pomodoro) APP.pomodoro.running = false; }
function resumePomodoro() { if (APP.pomodoro) APP.pomodoro.running = true; }
function stopPomodoro() { clearInterval(APP.timer); APP.timer = null; APP.pomodoro = null; $('timerPhase').textContent = 'Phase: Stopped'; }

function endPomodoro() {
  clearInterval(APP.timer);
  APP.pomodoro.running = false;
  const summary = buildSummary();
  APP.lastSummary = summary;
  saveRecent(summary);
  renderRecent();
  $('exportNotice').textContent = 'Session finished. Download a summary from Export.';
}

function buildSummary() {
  const p = APP.pomodoro || sessionConfig();
  return {
    sessionTitle: p.title,
    dateTime: new Date().toISOString(),
    mode: APP.mode,
    pomodoro: { workMin: p.workMin, breakMin: p.breakMin, sessions: p.sessions },
    sessionsCompleted: p.current || p.sessions,
    activeLayers: [0,1,2].filter(i => lines(i).length > 0).map(i => i + 1),
    affirmations: { layer1: lines(0), layer2: lines(1), layer3: lines(2) },
    audioSettings: { musicVol: APP.musicVol, subMix: APP.subMix, speed: APP.playSpeed, binauralBeat: APP.focusBeat, binauralAmount: APP.focusVol },
    breakBehavior: p.breakBehavior
  };
}
function saveRecent(summary) {
  const list = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  list.unshift(summary); localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, 10)));
}
function renderRecent() {
  const list = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]').slice(0, 5);
  $('recentSessions').innerHTML = '<strong>Recent sessions:</strong><br>' + (list.map(s => `${new Date(s.dateTime).toLocaleString()} — ${s.sessionTitle} (${s.mode})`).join('<br>') || 'None yet');
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
      'The subliminal layers are tone/noise-based (not TTS voice). ' +
      'For best MP3 reliability, host vendor/lame.min.js in this repo.'
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
function escapeHtml(s) { return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

function updateProgress(pct, msg) { $('renderProgress').style.width = `${pct}%`; $('exportLog').textContent = msg; }

async function exportAudio(format) {
  if (!APP.musicBuffer) return $('exportNotice').textContent = 'Upload a track first.';
  const p = APP.pomodoro || sessionConfig();
  const duration = (p.workMin + p.breakMin) * p.sessions * 60;
  if (duration > 60 * 60 * 2) $('exportNotice').textContent = 'Warning: long export may fail on mobile.';

  try {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) throw new Error('OfflineAudioContext unavailable');
    updateProgress(10, 'Rendering...');
    const sr = APP.musicBuffer.sampleRate;
    const off = new OAC(2, Math.ceil(duration * sr), sr);

    const master = off.createGain(); master.gain.value = APP.masterVol; master.connect(off.destination);
    const musicG = off.createGain(); musicG.gain.value = APP.musicVol; musicG.connect(master);
    const subG = off.createGain(); subG.gain.value = APP.subMix; subG.connect(master);

    for (let t = 0; t < duration; t += APP.musicBuffer.duration / APP.playSpeed) {
      const m = off.createBufferSource(); m.buffer = APP.musicBuffer; m.playbackRate.value = APP.playSpeed; m.connect(musicG); m.start(t);
    }

    const phaseDur = (p.workMin + p.breakMin) * 60;
    for (let i = 0; i < NUM_LAYERS; i++) {
      const aff = lines(i); if (!aff.length) continue;
      const layer = APP.layers[i];
      for (let s = 0; s < p.sessions; s++) {
        const workStart = s * phaseDur;
        const workBuf = generateSubBuffer(off, p.workMin * 60, layer, aff);
        const srcW = off.createBufferSource(); const gW = off.createGain(); gW.gain.value = layer.vol / 100; srcW.buffer = workBuf; srcW.connect(gW).connect(subG); srcW.start(workStart);
        const breakStart = workStart + p.workMin * 60;
        const breakBuf = generateSubBuffer(off, p.breakMin * 60, layer, aff);
        const srcB = off.createBufferSource(); const gB = off.createGain();
        gB.gain.value = p.breakBehavior === 'music' ? 0 : (p.breakBehavior === 'reduce' ? (layer.vol/100) * 0.35 : layer.vol/100);
        srcB.buffer = breakBuf; srcB.connect(gB).connect(subG); srcB.start(breakStart);
      }
    }

    if (APP.focusBeat > 0 && APP.focusVol > 0) {
      const oL = off.createOscillator(), oR = off.createOscillator(), g = off.createGain(), pL = off.createStereoPanner(), pR = off.createStereoPanner();
      pL.pan.value = -1; pR.pan.value = 1; g.gain.value = APP.focusVol; oL.frequency.value = 180; oR.frequency.value = 180 + APP.focusBeat;
      oL.connect(pL).connect(g); oR.connect(pR).connect(g); g.connect(master); oL.start(0); oR.start(0); oL.stop(duration); oR.stop(duration);
    }

    const rendered = await off.startRendering();
    updateProgress(70, 'Encoding...');
    const base = $('exportFilename').value || 'subliminal_session';
    if (format === 'wav') {
      downloadBlob(new Blob([encodeWAV(rendered)], { type: 'audio/wav' }), `${base}.wav`);
    } else {
      const q = Number($('mp3Quality').value || 320);
      const ready = await prepareBufferForMP3(rendered, 44100);
      const bytes = await encodeMP3(ready, q);
      downloadBlob(new Blob([bytes], { type: 'audio/mpeg' }), `${base}_${q}.mp3`);
    }
    updateProgress(100, 'Ready'); setStatus('Export ready');
  } catch (e) {
    $('exportNotice').textContent = `Export failed: ${e.message}`;
    updateProgress(0, 'Error');
  }
}

function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function encodeWAV(buf) {
  const nCh = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length, dSize = n * nCh * 2;
  const ab = new ArrayBuffer(44 + dSize), v = new DataView(ab), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + dSize, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * nCh * 2, true); v.setUint16(32, nCh * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, dSize, true);
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < nCh; c++) { const s = Math.max(-1, Math.min(1, buf.getChannelData(c)[i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return ab;
}
async function ensureLame() {
  if (window.lamejs) return window.lamejs;
  if (APP.lameLoader) return APP.lameLoader;

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => window.lamejs ? resolve(window.lamejs) : reject(new Error('lamejs loaded but did not initialize: ' + src));
    s.onerror = () => reject(new Error('failed to load: ' + src));
    document.head.appendChild(s);
  });

  APP.lameLoader = (async () => {
    const sources = [
      './vendor/lame.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js',
      'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js',
    ];
    let lastErr = null;
    for (const src of sources) {
      try {
        const lame = await loadScript(src);
        if (lame) return lame;
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(
      'Could not load MP3 encoder from local or CDN sources. ' +
      'Try again online, or add vendor/lame.min.js for offline reliability. ' +
      (lastErr ? '(' + lastErr.message + ')' : '')
    );
  })();

  return APP.lameLoader;
}
async function encodeMP3(buf, kbps) {
  const lame = await ensureLame();
  const enc = new lame.Mp3Encoder(Math.min(2, buf.numberOfChannels), buf.sampleRate, kbps);
  const left = floatTo16(buf.getChannelData(0)), right = buf.numberOfChannels > 1 ? floatTo16(buf.getChannelData(1)) : null, bs = 1152, out = [];
  for (let i = 0; i < buf.length; i += bs) {
    const chunk = right ? enc.encodeBuffer(left.subarray(i, i + bs), right.subarray(i, i + bs)) : enc.encodeBuffer(left.subarray(i, i + bs));
    if (chunk.length) out.push(new Uint8Array(chunk));
  }
  const end = enc.flush(); if (end.length) out.push(new Uint8Array(end));
  const size = out.reduce((a, b) => a + b.length, 0), bytes = new Uint8Array(size); let off = 0; out.forEach(c => { bytes.set(c, off); off += c.length; }); return bytes;
}
async function prepareBufferForMP3(audioBuffer, targetSampleRate = 44100) {
  if (audioBuffer.sampleRate === targetSampleRate && audioBuffer.numberOfChannels <= 2) return audioBuffer;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const off = new OAC(Math.min(2, audioBuffer.numberOfChannels), Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate);
  const src = off.createBufferSource(); src.buffer = audioBuffer; src.connect(off.destination); src.start(0);
  return off.startRendering();
}
function floatTo16(arr) { const out = new Int16Array(arr.length); for (let i = 0; i < arr.length; i++) { const s = Math.max(-1, Math.min(1, arr[i])); out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; } return out; }

function bind() {
  $('uploadZone').addEventListener('click', () => $('audioFile').click());
  $('audioFile').addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));

  $('btnPlay').addEventListener('click', playAudio); $('btnPause').addEventListener('click', pauseAudio); $('btnStop').addEventListener('click', stopAudio);
  $('btnModeFocus').addEventListener('click', () => applyMode('focus')); $('btnModeGym').addEventListener('click', () => applyMode('gym')); $('btnModeChill').addEventListener('click', () => applyMode('chill'));
  $('btnClearAllAff').addEventListener('click', () => [1,2,3].forEach(i => $('myLayer' + i).value = ''));
  $('btnSaveMyAff').addEventListener('click', saveAffirmations);
  $('btnLoadExFocus').addEventListener('click', () => loadExample('focus')); $('btnLoadExGym').addEventListener('click', () => loadExample('gym')); $('btnLoadExChill').addEventListener('click', () => loadExample('chill'));

  document.querySelectorAll('.preset-btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.custom) return;
    $('workMin').value = b.dataset.work; $('breakMin').value = b.dataset.break;
  }));
  $('btnPomStart').addEventListener('click', startPomodoro); $('btnPomPause').addEventListener('click', pausePomodoro); $('btnPomResume').addEventListener('click', resumePomodoro); $('btnPomStop').addEventListener('click', stopPomodoro);

  $('btnExportWav').addEventListener('click', () => exportAudio('wav')); $('btnExportMp3').addEventListener('click', () => exportAudio('mp3'));
  $('btnSummaryTxt').addEventListener('click', () => downloadSummary('txt')); $('btnSummaryJson').addEventListener('click', () => downloadSummary('json')); $('btnSummaryHtml').addEventListener('click', () => downloadSummary('html'));

  $('slMusicVol').addEventListener('input', e => { APP.musicVol = Number(e.target.value)/100; if (APP.musicGain) APP.musicGain.gain.value = APP.musicVol; });
  $('slSubMix').addEventListener('input', e => { APP.subMix = Number(e.target.value)/100; if (APP.subGain) APP.subGain.gain.value = APP.subMix; });
  $('slMasterVol').addEventListener('input', e => { APP.masterVol = Number(e.target.value)/100; if (APP.masterGain) APP.masterGain.gain.value = APP.masterVol; });
  $('slSpeed').addEventListener('input', e => APP.playSpeed = Number(e.target.value)/100);
  $('slBinauralBeat').addEventListener('input', e => APP.focusBeat = Number(e.target.value));
  $('slFocusVol').addEventListener('input', e => { APP.focusVol = Number(e.target.value)/100; if (APP.focusGain) APP.focusGain.gain.value = APP.focusVol; });
  document.querySelectorAll('.l-vol').forEach(sl => sl.addEventListener('input', e => APP.layers[Number(e.target.dataset.layer)].vol = Number(e.target.value)));
  document.querySelectorAll('.l-density').forEach(sl => sl.addEventListener('input', e => APP.layers[Number(e.target.dataset.layer)].density = Number(e.target.value)));
  document.querySelectorAll('.l-spacing').forEach(sl => sl.addEventListener('input', e => APP.layers[Number(e.target.dataset.layer)].spacing = Number(e.target.value)));
}

bind();
loadAffirmations();
renderRecent();
applyMode('focus');

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
