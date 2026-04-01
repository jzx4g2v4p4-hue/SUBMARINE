// ── Audio Engine ──────────────────────────────────────────
// Handles all Web Audio API processing:
// normalisation, voice synthesis, blending, limiting, WAV export

function initAudioContext() {
  if (!App.ac) {
    App.ac = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// ── Waveform Visualiser ───────────────────────────────────
function drawWaveform(buffer) {
  const canvas = document.getElementById('wvCanvas');
  const div    = canvas.parentElement;
  canvas.width  = div.offsetWidth * 2;
  canvas.height = 104;
  canvas.style.width  = '100%';
  canvas.style.height = '52px';

  const ctx  = canvas.getContext('2d');
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / (canvas.width / 2));
  const amp  = canvas.height / 2;

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0,   'rgba(155,109,255,0.55)');
  grad.addColorStop(0.5, 'rgba(180,153,255,0.80)');
  grad.addColorStop(1,   'rgba(45,212,191,0.55)');
  ctx.fillStyle = grad;

  for (let i = 0; i < canvas.width / 2; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const v = Math.abs(data[i * step + j] || 0);
      if (v > max) max = v;
    }
    const h = max * amp * 1.85;
    ctx.fillRect(i * 2, amp - h, 1.5, h * 2);
  }
}

// ── Main Mix Builder ──────────────────────────────────────
async function buildMix() {
  initAudioContext();
  const ac  = App.ac;
  const src = App.audioBuf;
  if (!src) return;

  const sr           = src.sampleRate;
  const totalSamples = src.length;
  const out          = ac.createBuffer(2, totalSamples, sr);

  // 1. Copy source channels to stereo output with loudness normalisation
  let peak = 0;
  for (let c = 0; c < src.numberOfChannels; c++) {
    const ch = src.getChannelData(c);
    for (let i = 0; i < ch.length; i++) {
      if (Math.abs(ch[i]) > peak) peak = Math.abs(ch[i]);
    }
  }
  const musicGain = peak > 0 ? Math.min(0.82 / peak, 1.4) : 1;

  for (let c = 0; c < 2; c++) {
    const inCh  = src.getChannelData(Math.min(c, src.numberOfChannels - 1));
    const outCh = out.getChannelData(c);
    for (let i = 0; i < inCh.length; i++) {
      outCh[i] = inCh[i] * musicGain;
    }
  }

  // 2. Determine voice gain from mode + balance slider
  const baseGain = { hidden: 0.032, barely: 0.075, hybrid: 0.14 }[App.mode] || 0.12;
  const finalVoiceGain = baseGain * (App.balance / 25);

  // 3. Calculate repetitions from density setting
  const densityReps = { 1: 1, 2: 2, 3: 3 }[App.density] || 2;
  const affs        = App.affirmations;
  const totalSlots  = affs.length * densityReps;
  const slotSize    = Math.floor(totalSamples / (totalSlots + 1));

  // 4. Place each affirmation across the track
  for (let rep = 0; rep < densityReps; rep++) {
    for (let a = 0; a < affs.length; a++) {
      const slot        = rep * affs.length + a;
      const startSample = Math.floor((slot + 1) * slotSize);
      embedAffirmation(out, affs[a], startSample, sr, finalVoiceGain, slotSize);
    }
  }

  // 5. Fade in / out
  if (App.fade) {
    const fadeLen = Math.min(Math.floor(sr * 2.5), Math.floor(totalSamples * 0.04));
    for (let c = 0; c < 2; c++) {
      const ch = out.getChannelData(c);
      for (let i = 0; i < fadeLen; i++) ch[i] *= i / fadeLen;
      for (let i = 0; i < fadeLen; i++) ch[totalSamples - 1 - i] *= i / fadeLen;
    }
  }

  // 6. Soft tanh limiter — prevents clipping
  if (App.limit) {
    const thr = 0.88;
    for (let c = 0; c < 2; c++) {
      const ch = out.getChannelData(c);
      for (let i = 0; i < ch.length; i++) {
        if (Math.abs(ch[i]) > thr) {
          ch[i] = Math.tanh(ch[i]) * thr;
        }
      }
    }
  }

  App.outBuf    = out;
  App.processed = true;
}

// ── Affirmation Embedder ──────────────────────────────────
// Synthesises a voice-frequency signal shaped to word rhythm.
// This is the browser-native fallback that works 100% offline.
// To upgrade: swap this for a decoded TTS audio buffer.
function embedAffirmation(outBuf, text, startSample, sr, voiceGain, maxLen) {
  const words      = text.trim().split(/\s+/);
  const wordCount  = words.length;
  const phraseDur  = Math.min(
    Math.floor(sr * (wordCount * 0.45 + 0.5)),
    maxLen - Math.floor(sr * 0.3)
  );

  for (let c = 0; c < 2; c++) {
    const outCh  = outBuf.getChannelData(c);
    const panOff = App.stereo
      ? (c === 0 ? 1 : -1) * 0.07 * (0.8 + Math.random() * 0.4)
      : 0;
    const chGain = voiceGain * (1 + panOff);
    const wDur   = Math.floor(phraseDur / Math.max(wordCount, 1));

    for (let w = 0; w < wordCount; w++) {
      const wStart = startSample + w * wDur;
      const wEnd   = Math.min(wStart + wDur, outBuf.length);
      const gap    = Math.floor(wDur * 0.15);

      for (let i = wStart + gap; i < wEnd - gap; i++) {
        if (i >= outBuf.length) break;
        const t   = (i - wStart - gap) / (wDur - 2 * gap);
        const env = t < 0.1 ? t / 0.1 : t > 0.75 ? (1 - t) / 0.25 : 1;

        // Three formant frequencies approximate human speech bands
        const f1  = 200 + 80  * Math.sin(i * 0.0007);
        const f2  = 900 + 120 * Math.sin(i * 0.0013 + 1.2);
        const f3  = 2400 + 200 * Math.cos(i * 0.0009);
        const sig = (
          Math.sin(2 * Math.PI * f1 * i / sr) * 0.55 +
          Math.sin(2 * Math.PI * f2 * i / sr) * 0.30 +
          Math.sin(2 * Math.PI * f3 * i / sr) * 0.10 +
          (Math.random() - 0.5) * 0.05
        );

        outCh[i] += sig * env * chGain * 0.45;
      }
    }
  }
}

// ── WAV Encoder ───────────────────────────────────────────
// Encodes an AudioBuffer to a 16-bit PCM WAV ArrayBuffer.
function encodeWAV(buffer) {
  const numCh    = buffer.numberOfChannels;
  const sr       = buffer.sampleRate;
  const len      = buffer.length;
  const dataLen  = len * numCh * 2; // 16-bit = 2 bytes per sample
  const ab       = new ArrayBuffer(44 + dataLen);
  const view     = new DataView(ab);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4,  36 + dataLen, true);
  writeStr(8,  'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);         // PCM chunk size
  view.setUint16(20, 1,  true);         // PCM format
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);         // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataLen, true);

  let offset = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }

  return ab;
}

// ── Playback Helpers ──────────────────────────────────────
function stopPlayback() {
  if (App.playSrc) {
    try { App.playSrc.stop(); } catch (e) { /* already stopped */ }
    App.playSrc = null;
  }
  if (App.ticker) {
    clearInterval(App.ticker);
    App.ticker = null;
  }
  App.isPlaying = false;

  const ico = document.getElementById('playIco');
  if (ico) {
    ico.outerHTML = '<svg id="playIco" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }
  const btn = document.getElementById('playBtn');
  if (btn) btn.classList.remove('paused');
}

function startPlayback(buffer, offsetSeconds) {
  initAudioContext();
  const ac  = App.ac;
  const src = ac.createBufferSource();
  src.buffer = buffer;

  const gainNode = ac.createGain();
  gainNode.gain.value = document.getElementById('volSlider').value / 100;
  src.connect(gainNode);
  gainNode.connect(ac.destination);

  src.start(0, offsetSeconds || 0);
  App.playSrc   = src;
  App.startedAt = ac.currentTime - (offsetSeconds || 0);
  App.isPlaying = true;

  // Swap play icon to pause
  const ico = document.getElementById('playIco');
  ico.outerHTML = '<svg id="playIco" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  document.getElementById('playBtn').classList.add('paused');

  // Progress ticker
  App.ticker = setInterval(() => {
    const elapsed = ac.currentTime - App.startedAt;
    const dur     = buffer.duration;
    document.getElementById('plFill').style.width = Math.min(elapsed / dur * 100, 100) + '%';
    const mm = Math.floor(elapsed / 60);
    const ss = Math.floor(elapsed % 60).toString().padStart(2, '0');
    document.getElementById('plCur').textContent = `${mm}:${ss}`;
  }, 120);

  src.onended = () => {
    if (App.isPlaying) {
      App.pausedAt = 0;
      stopPlayback();
      document.getElementById('plFill').style.width = '0';
      document.getElementById('plCur').textContent  = '0:00';
    }
  };
}
