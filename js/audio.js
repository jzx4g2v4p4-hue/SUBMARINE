// ══════════════════════════════════════════════
// AUDIO.JS — Complete Audio Engine
//
// Handles:
//  1. AudioContext init & file decoding
//  2. Waveform visualisation
//  3. Music normalisation
//  4. Voice synthesis (formant-based, offline)
//  5. Binaural beat generation (proper L/R sine tones)
//  6. Intelligent mixing with anti-clipping
//  7. Soft tanh limiter
//  8. Fade in/out
//  9. WAV encoder (16-bit PCM)
// 10. Playback helpers
// ══════════════════════════════════════════════

// ── AudioContext ──────────────────────────────
function getAC() {
  if (!State.ac) {
    State.ac = new (window.AudioContext || window.webkitAudioContext)();
  }
  return State.ac;
}

// ── Waveform Visualiser ───────────────────────
function drawWaveform(buffer, canvasId) {
  const canvas = document.getElementById(canvasId || 'waveformCanvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = canvas.offsetWidth  * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  const ctx  = canvas.getContext('2d');
  const data = buffer.getChannelData(0);
  const W    = canvas.width;
  const H    = canvas.height;
  const step = Math.ceil(data.length / (W / 2));
  const amp  = H / 2;

  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0,   'rgba(200,169,110,0.5)');
  grad.addColorStop(0.5, 'rgba(200,169,110,0.9)');
  grad.addColorStop(1,   'rgba(85,104,212,0.5)');
  ctx.fillStyle = grad;

  for (let i = 0; i < W / 2; i++) {
    let max = 0;
    for (let j = 0; j < step; j++) {
      const v = Math.abs(data[i * step + j] || 0);
      if (v > max) max = v;
    }
    const h = max * amp * 1.9;
    ctx.fillRect(i * 2, amp - h, 1.5, h * 2);
  }
}

// ── Main Mix Builder ──────────────────────────
// Takes current State and builds the full output AudioBuffer.
// Called both during optimize and on export (to re-render with latest settings).
async function buildMix(customDuration) {
  const ac  = getAC();
  const src = State.audioBuf;
  if (!src) return null;

  const sr           = src.sampleRate;
  const totalSamples = src.length;
  const out          = ac.createBuffer(2, totalSamples, sr);

  // ── 1. Copy + Normalize music ──────────────
  let peak = 0;
  for (let c = 0; c < src.numberOfChannels; c++) {
    const ch = src.getChannelData(c);
    for (let i = 0; i < ch.length; i++) {
      if (Math.abs(ch[i]) > peak) peak = Math.abs(ch[i]);
    }
  }
  const musicGain = peak > 0 ? Math.min(0.80 / peak, 1.35) : 1;

  for (let c = 0; c < 2; c++) {
    const inCh  = src.getChannelData(Math.min(c, src.numberOfChannels - 1));
    const outCh = out.getChannelData(c);
    for (let i = 0; i < inCh.length; i++) {
      outCh[i] = inCh[i] * musicGain;
    }
  }

  // ── 2. Voice gain from mode ────────────────
  const modeKey = State.mode || 'hybrid';
  const baseVoiceGain = MODE_GAINS[modeKey] || MODE_GAINS.hybrid;
  const balanceMult   = (State.balance || 25) / 25;
  const voiceGain     = baseVoiceGain * balanceMult;

  // ── 3. Embed affirmations ──────────────────
  const affs        = State.affirmations || [];
  const densityReps = [1, 1, 2, 3][State.density || 2] || 2;
  if (affs.length > 0) {
    embedAffirmationLayer(out, affs, densityReps, voiceGain, sr);
  }

  // ── 4. Binaural beats ─────────────────────
  if (State.binauralOn && State.binauralPreset) {
    const preset  = BINAURAL_PRESETS[State.binauralPreset];
    const carrier = State.binauralCarrier || preset.carrier;
    const beat    = preset.beat;
    const level   = State.binauralLevel || 0.04;
    mixBinauralLayer(out, carrier, beat, level, sr);
  }

  // ── 5. Fade in / out ──────────────────────
  if (State.fade !== false) {
    applyFade(out, sr, 2.5);
  }

  // ── 6. Soft limiter ───────────────────────
  if (State.limit !== false) {
    applySoftLimit(out, 0.88);
  }

  return out;
}

// ── Embed affirmations across the timeline ────
function embedAffirmationLayer(outBuf, affs, densityReps, voiceGain, sr) {
  const totalSamples = outBuf.length;
  const totalSlots   = affs.length * densityReps;
  const slotSize     = Math.floor(totalSamples / (totalSlots + 1));
  const stereoOn     = State.stereo !== false;

  for (let rep = 0; rep < densityReps; rep++) {
    for (let a = 0; a < affs.length; a++) {
      const slot        = rep * affs.length + a;
      const startSample = Math.floor((slot + 1) * slotSize);
      embedPhrase(outBuf, affs[a], startSample, sr, voiceGain, slotSize, stereoOn);
    }
  }
}

// ── Embed a single affirmation phrase ─────────
// Uses three-formant additive synthesis shaped to word rhythm.
// This works 100% offline. Architecture is designed so this
// function can be swapped for a decoded TTS AudioBuffer later.
function embedPhrase(outBuf, text, startSample, sr, voiceGain, maxLen, stereoOn) {
  const words     = text.trim().split(/\s+/);
  const wCount    = words.length;
  const ttsSpeed  = State.ttsSpeed || 1.0;
  const phraseDur = Math.min(
    Math.floor(sr * (wCount * (0.42 / ttsSpeed) + 0.4)),
    maxLen - Math.floor(sr * 0.25)
  );

  for (let c = 0; c < 2; c++) {
    const outCh  = outBuf.getChannelData(c);
    const panOff = stereoOn
      ? (c === 0 ? 1 : -1) * 0.06 * (0.7 + Math.random() * 0.6)
      : 0;
    const chGain  = voiceGain * (1 + panOff);
    const wDur    = Math.floor(phraseDur / Math.max(wCount, 1));

    for (let w = 0; w < wCount; w++) {
      const wStart = startSample + w * wDur;
      const wEnd   = Math.min(wStart + wDur, outBuf.length);
      const gap    = Math.floor(wDur * 0.12);

      for (let i = wStart + gap; i < wEnd - gap; i++) {
        if (i >= outBuf.length) break;
        const t   = (i - wStart - gap) / Math.max(wDur - 2 * gap, 1);
        // Smooth ADSR-like envelope per word
        const env = t < 0.08 ? t / 0.08
                  : t > 0.78 ? (1 - t) / 0.22
                  : 1;

        // Three formants: F1 (vowel body), F2 (vowel clarity), F3 (consonant presence)
        const f1  = 190 + 90 * Math.sin(i * 0.00065 + w * 0.8);
        const f2  = 880 + 140 * Math.sin(i * 0.0012 + 1.1);
        const f3  = 2350 + 180 * Math.cos(i * 0.00085);
        const sig = (
          Math.sin(2 * Math.PI * f1 * i / sr) * 0.55 +
          Math.sin(2 * Math.PI * f2 * i / sr) * 0.30 +
          Math.sin(2 * Math.PI * f3 * i / sr) * 0.10 +
          (Math.random() - 0.5) * 0.05 // breath noise
        );

        outCh[i] += sig * env * chGain * 0.42;
      }
    }
  }
}

// ── Binaural Beat Generator ───────────────────
// Generates proper stereo binaural beats:
//   Left channel:  carrier Hz (e.g. 200)
//   Right channel: carrier + beat Hz (e.g. 210 for 10Hz alpha)
// The brain perceives the difference as a binaural beat.
// Carrier frequency is kept below 1500 Hz for best effect.
function mixBinauralLayer(outBuf, carrierHz, beatHz, level, sr) {
  const leftFreq  = carrierHz;
  const rightFreq = carrierHz + beatHz;
  const totalSamples = outBuf.length;

  const leftCh  = outBuf.getChannelData(0);
  const rightCh = outBuf.getChannelData(1);

  // Gentle fade in/out for binaural layer (4 seconds)
  const binFadeLen = Math.min(Math.floor(sr * 4), Math.floor(totalSamples * 0.05));

  for (let i = 0; i < totalSamples; i++) {
    // Envelope: fade in and out smoothly
    let env = 1;
    if (i < binFadeLen)                  env = i / binFadeLen;
    if (i > totalSamples - binFadeLen)   env = (totalSamples - i) / binFadeLen;

    const t = i / sr;
    leftCh[i]  += Math.sin(2 * Math.PI * leftFreq  * t) * level * env;
    rightCh[i] += Math.sin(2 * Math.PI * rightFreq * t) * level * env;
  }
}

// ── Binaural for a specific time window ──────
// Used by Pomodoro to blend binaural into a segment
function mixBinauralSegment(outBuf, startSample, endSample, carrierHz, beatHz, level, sr) {
  const leftCh  = outBuf.getChannelData(0);
  const rightCh = outBuf.getChannelData(1);
  const segLen  = endSample - startSample;
  const fadeLen = Math.min(Math.floor(sr * 3), Math.floor(segLen * 0.05));

  for (let i = startSample; i < endSample && i < outBuf.length; i++) {
    const pos = i - startSample;
    let env = 1;
    if (pos < fadeLen)           env = pos / fadeLen;
    if (pos > segLen - fadeLen)  env = (segLen - pos) / fadeLen;

    const t = i / sr;
    leftCh[i]  += Math.sin(2 * Math.PI * carrierHz          * t) * level * env;
    rightCh[i] += Math.sin(2 * Math.PI * (carrierHz + beatHz) * t) * level * env;
  }
}

// ── Fade In / Out ─────────────────────────────
function applyFade(outBuf, sr, durationSecs) {
  const totalSamples = outBuf.length;
  const fadeLen = Math.min(
    Math.floor(sr * durationSecs),
    Math.floor(totalSamples * 0.04)
  );
  for (let c = 0; c < 2; c++) {
    const ch = outBuf.getChannelData(c);
    for (let i = 0; i < fadeLen; i++)                  ch[i]                  *= i / fadeLen;
    for (let i = 0; i < fadeLen; i++)                  ch[totalSamples - 1 - i] *= i / fadeLen;
  }
}

// ── Soft Tanh Limiter ─────────────────────────
// Prevents any hard clipping. Uses tanh for musical saturation.
// threshold: peak ceiling before saturation kicks in (0.0–1.0)
function applySoftLimit(outBuf, threshold) {
  threshold = threshold || 0.88;
  for (let c = 0; c < 2; c++) {
    const ch = outBuf.getChannelData(c);
    for (let i = 0; i < ch.length; i++) {
      if (Math.abs(ch[i]) > threshold) {
        ch[i] = Math.tanh(ch[i] * 0.92) * threshold;
      }
    }
  }
}

// ── WAV Encoder ───────────────────────────────
// Encodes AudioBuffer → 16-bit PCM WAV ArrayBuffer.
// High quality: no compression, full sample depth.
function encodeWAV(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate  = buffer.sampleRate;
  const numSamples  = buffer.length;
  const bitsPerSamp = 16;
  const blockAlign  = numChannels * (bitsPerSamp / 8);
  const byteRate    = sampleRate * blockAlign;
  const dataSize    = numSamples * blockAlign;
  const ab          = new ArrayBuffer(44 + dataSize);
  const view        = new DataView(ab);

  const ws = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  ws(0, 'RIFF');
  view.setUint32(4,  36 + dataSize, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  view.setUint32(16, 16,           true);  // PCM chunk
  view.setUint16(20, 1,            true);  // PCM format
  view.setUint16(22, numChannels,  true);
  view.setUint32(24, sampleRate,   true);
  view.setUint32(28, byteRate,     true);
  view.setUint16(32, blockAlign,   true);
  view.setUint16(34, bitsPerSamp,  true);
  ws(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return ab;
}

// ── Download helper ───────────────────────────
function downloadBuffer(audioBuffer, filename) {
  const wav  = encodeWAV(audioBuffer);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename || 'subliminal_track.wav';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Playback ──────────────────────────────────
function stopPlayback() {
  if (State.playSrc) {
    try { State.playSrc.stop(); } catch(e) {}
    State.playSrc = null;
  }
  if (State.playTicker) {
    clearInterval(State.playTicker);
    State.playTicker = null;
  }
  State.isPlaying = false;
  const ico = document.getElementById('playIco');
  if (ico) ico.outerHTML = '<svg id="playIco" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
  const btn = document.getElementById('playBtn');
  if (btn) btn.classList.remove('paused');
}

function startPlayback(buffer, offsetSecs) {
  const ac = getAC();
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = (State.volume || 80) / 100;
  src.connect(gain);
  gain.connect(ac.destination);
  src.start(0, offsetSecs || 0);
  State.playSrc   = src;
  State.startedAt = ac.currentTime - (offsetSecs || 0);
  State.isPlaying = true;

  const ico = document.getElementById('playIco');
  if (ico) ico.outerHTML = '<svg id="playIco" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  const btn = document.getElementById('playBtn');
  if (btn) btn.classList.add('paused');

  State.playTicker = setInterval(() => {
    const elapsed = ac.currentTime - State.startedAt;
    const dur     = buffer.duration;
    const pct     = Math.min(elapsed / dur * 100, 100);
    const fill    = document.getElementById('progFill');
    const cur     = document.getElementById('curTime');
    if (fill) fill.style.width = pct + '%';
    if (cur)  cur.textContent  = fmtTime(elapsed);
  }, 100);

  src.onended = () => {
    if (State.isPlaying) {
      State.pausedAt = 0;
      stopPlayback();
      const fill = document.getElementById('progFill');
      const cur  = document.getElementById('curTime');
      if (fill) fill.style.width = '0';
      if (cur)  cur.textContent  = '0:00';
    }
  };
}

// ── Helpers ───────────────────────────────────
function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? s + 's' : ''}`.trim();
  return `${s}s`;
}

// ── Decode file to AudioBuffer ─────────────────
function decodeAudioFile(file, callback) {
  const ac     = getAC();
  const reader = new FileReader();
  reader.onload = e => {
    ac.decodeAudioData(e.target.result.slice(0))
      .then(buf => callback(null, buf))
      .catch(err => callback(err, null));
  };
  reader.readAsArrayBuffer(file);
}

// ── Create silent AudioBuffer ──────────────────
function createSilence(durationSecs, sr) {
  const ac = getAC();
  sr = sr || 44100;
  return ac.createBuffer(2, Math.floor(durationSecs * sr), sr);
}

// ── Concatenate multiple AudioBuffers ─────────
// Used by Pomodoro to stitch work and break blocks together.
function concatenateBuffers(buffers) {
  if (!buffers || buffers.length === 0) return null;
  const ac = getAC();
  const sr = buffers[0].sampleRate;
  const totalLen = buffers.reduce((sum, b) => sum + b.length, 0);
  const out = ac.createBuffer(2, totalLen, sr);

  let offset = 0;
  for (const buf of buffers) {
    for (let c = 0; c < 2; c++) {
      const outCh = out.getChannelData(c);
      const inCh  = buf.getChannelData(Math.min(c, buf.numberOfChannels - 1));
      outCh.set(inCh, offset);
    }
    offset += buf.length;
  }
  return out;
}

// ── Loop / tile a buffer to a target length ───
function loopBufferToLength(buf, targetSamples) {
  const ac = getAC();
  const out = ac.createBuffer(2, targetSamples, buf.sampleRate);
  for (let c = 0; c < 2; c++) {
    const inCh  = buf.getChannelData(Math.min(c, buf.numberOfChannels - 1));
    const outCh = out.getChannelData(c);
    let pos = 0;
    while (pos < targetSamples) {
      const copyLen = Math.min(inCh.length, targetSamples - pos);
      outCh.set(inCh.subarray(0, copyLen), pos);
      pos += copyLen;
    }
  }
  return out;
}
