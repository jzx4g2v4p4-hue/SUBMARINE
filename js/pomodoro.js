// ══════════════════════════════════════════════
// POMODORO.JS — Session Builder Engine
//
// Builds long-form Pomodoro subliminal sessions:
//  1. Reads session config (work/break/cycles)
//  2. For each block, loops music and applies
//     the correct affirmations + binaural
//  3. Concatenates all blocks into one long export
// ══════════════════════════════════════════════

// ── Session Config ────────────────────────────
const PomState = {
  preset:       '25-5',
  workMins:     25,
  breakMins:    5,
  cycles:       4,
  workAffs:     [],
  breakAffs:    [],
  workBinaural: 'focus',
  breakBinaural:'off',
  audioBufs:    [],
  outBuf:       null
};

// ── Compute session from PomState ─────────────
function getSessionConfig() {
  const cfg = PomState;
  const blocks = [];
  for (let i = 0; i < cfg.cycles; i++) {
    blocks.push({ type: 'work', mins: cfg.workMins });
    if (cfg.breakMins > 0) {
      blocks.push({ type: 'break', mins: cfg.breakMins });
    }
  }
  const totalMins = blocks.reduce((sum, b) => sum + b.mins, 0);
  return { blocks, totalMins };
}

// ── Render timeline visualisation ─────────────
function renderTimeline() {
  const timelineEl = document.getElementById('sessionTimeline');
  if (!timelineEl) return;
  const { blocks, totalMins } = getSessionConfig();
  if (blocks.length === 0) { timelineEl.innerHTML = ''; return; }

  let html = '<div class="timeline-label">Session Timeline</div><div class="timeline-blocks">';
  for (const b of blocks) {
    const pct  = (b.mins / totalMins * 100).toFixed(1);
    const lbl  = b.type === 'work' ? 'W' : 'B';
    const cls  = b.type === 'work' ? 'work' : 'brk';
    html += `<div class="tblock ${cls}" style="width:${pct}%" title="${b.mins} min ${b.type}">${lbl}</div>`;
  }
  html += '</div>';

  const workBlocks  = blocks.filter(b => b.type === 'work');
  const breakBlocks = blocks.filter(b => b.type === 'break');
  const totalWork   = workBlocks.reduce((s, b) => s + b.mins, 0);
  const totalBreak  = breakBlocks.reduce((s, b) => s + b.mins, 0);

  html += `<div class="timeline-meta">
    <div class="tm-item">Total <strong>${totalMins} min</strong></div>
    <div class="tm-item">Work <strong>${totalWork} min</strong></div>
    ${totalBreak > 0 ? `<div class="tm-item">Break <strong>${totalBreak} min</strong></div>` : ''}
    <div class="tm-item">Cycles <strong>${PomState.cycles}</strong></div>
  </div>`;

  timelineEl.innerHTML = html;
}

// ── Render session spec for optimize screen ───
function renderSessionSpec() {
  const specEl = document.getElementById('sessionSpec');
  if (!specEl) return;
  const { blocks, totalMins } = getSessionConfig();
  const workBin  = PomState.workBinaural  !== 'off' ? BINAURAL_PRESETS[PomState.workBinaural]?.label  || '—' : 'Off';
  const breakBin = PomState.breakBinaural !== 'off' ? BINAURAL_PRESETS[PomState.breakBinaural]?.label || '—' : 'Off';

  specEl.innerHTML = `
    <div class="spec-row"><span class="spec-k">Preset</span><span class="spec-v">${getPomPresetLabel()}</span></div>
    <div class="spec-row"><span class="spec-k">Total Duration</span><span class="spec-v">${totalMins} minutes</span></div>
    <div class="spec-row"><span class="spec-k">Blocks</span><span class="spec-v">${blocks.length} (${PomState.cycles} cycle${PomState.cycles > 1 ? 's' : ''})</span></div>
    <div class="spec-row"><span class="spec-k">Work Affirmations</span><span class="spec-v">${PomState.workAffs.length} lines</span></div>
    <div class="spec-row"><span class="spec-k">Break Affirmations</span><span class="spec-v">${PomState.breakAffs.length > 0 ? PomState.breakAffs.length + ' lines' : 'None'}</span></div>
    <div class="spec-row"><span class="spec-k">Work Binaural</span><span class="spec-v">${workBin}</span></div>
    <div class="spec-row"><span class="spec-k">Break Binaural</span><span class="spec-v">${breakBin}</span></div>
  `;
}

function getPomPresetLabel() {
  if (PomState.preset === 'custom') {
    return `Custom ${PomState.workMins}/${PomState.breakMins} × ${PomState.cycles}`;
  }
  return POM_PRESETS[PomState.preset]?.label || PomState.preset;
}

// ── Main Pomodoro Renderer ─────────────────────
// Builds each block as an AudioBuffer, then concatenates them.
async function renderPomodoroSession(onProgress) {
  const { blocks, totalMins } = getSessionConfig();
  const ac  = getAC();
  const srcList = PomState.audioBufs || [];
  const src = srcList[0] || null;
  const sr  = src ? src.sampleRate : 44100;

  const segmentBuffers = [];
  const totalBlocks    = blocks.length;

  for (let i = 0; i < totalBlocks; i++) {
    const block    = blocks[i];
    const isWork   = block.type === 'work';
    const durationSecs = block.mins * 60;
    const numSamples   = Math.floor(durationSecs * sr);

    if (onProgress) onProgress(i / totalBlocks, `Rendering ${isWork ? 'work' : 'break'} block ${i + 1}…`);

    // ── Loop or create music for this block ──
    let blockBuf;
    if (srcList.length > 0) {
      blockBuf = buildPomodoroMusicBed(srcList, numSamples, sr);
    } else {
      blockBuf = createSilence(durationSecs, sr);
    }

    // ── Normalize music ──────────────────────
    let peak = 0;
    for (let c = 0; c < blockBuf.numberOfChannels; c++) {
      const ch = blockBuf.getChannelData(c);
      for (let s = 0; s < ch.length; s++) {
        if (Math.abs(ch[s]) > peak) peak = Math.abs(ch[s]);
      }
    }
    const mGain = peak > 0 ? Math.min(0.78 / peak, 1.3) : 1;
    for (let c = 0; c < 2; c++) {
      const ch = blockBuf.getChannelData(c);
      for (let s = 0; s < ch.length; s++) ch[s] *= mGain;
    }

    // ── Select affirmations and settings ─────
    const affs  = isWork ? PomState.workAffs  : (PomState.breakAffs.length > 0 ? PomState.breakAffs : PomState.workAffs);
    const binKey = isWork ? PomState.workBinaural : PomState.breakBinaural;

    // Subliminal mode for work vs break
    const voiceGain = isWork ? MODE_GAINS.barely * 0.9 : MODE_GAINS.hybrid * 0.7;
    const density   = isWork ? 2 : 1;
    const densityReps = [1, 1, 2, 3][density] || 2;

    // ── Embed affirmations ───────────────────
    if (affs && affs.length > 0) {
      embedAffirmationLayer(blockBuf, affs, densityReps, voiceGain, sr);
    }

    // ── Binaural for this block ──────────────
    if (binKey && binKey !== 'off' && BINAURAL_PRESETS[binKey]) {
      const bp      = BINAURAL_PRESETS[binKey];
      const carrier = bp.carrier;
      const beat    = bp.beat;
      const level   = 0.04;
      mixBinauralLayer(blockBuf, carrier, beat, level, sr);
    }

    // ── Fade in/out at block boundaries ──────
    applyFade(blockBuf, sr, 2.0);

    // ── Soft limit ───────────────────────────
    applySoftLimit(blockBuf, 0.86);

    segmentBuffers.push(blockBuf);
  }

  if (onProgress) onProgress(0.9, 'Stitching session blocks together…');

  // ── Concatenate all blocks ────────────────
  const fullSession = concatenateBuffers(segmentBuffers);

  // ── Final fade & limit on complete session ─
  if (fullSession) {
    applyFade(fullSession, sr, 3.0);
    applySoftLimit(fullSession, 0.88);
  }

  if (onProgress) onProgress(1.0, 'Session complete');

  PomState.outBuf = fullSession;
  return fullSession;
}

function buildPomodoroMusicBed(srcList, numSamples, sr) {
  const ac = getAC();
  const out = ac.createBuffer(2, numSamples, sr);
  const outL = out.getChannelData(0);
  const outR = out.getChannelData(1);
  let writePos = 0;
  let trackIdx = 0;

  while (writePos < numSamples) {
    const src = srcList[trackIdx % srcList.length];
    const srcL = src.getChannelData(0);
    const srcR = src.getChannelData(Math.min(1, src.numberOfChannels - 1));
    const copyLen = Math.min(src.length, numSamples - writePos);
    outL.set(srcL.subarray(0, copyLen), writePos);
    outR.set(srcR.subarray(0, copyLen), writePos);
    writePos += copyLen;
    trackIdx++;
  }

  return out;
}

// ── Pomodoro progress steps ───────────────────
function getPomSteps(blocks) {
  const steps = [
    { label: 'Analyzing session config',   ms: 300 }
  ];
  for (let i = 0; i < Math.min(blocks.length, 6); i++) {
    const b = blocks[i];
    steps.push({
      label: `Rendering ${b.type} block ${i + 1} (${b.mins} min)`,
      ms: Math.max(600, b.mins * 40)
    });
  }
  if (blocks.length > 6) {
    steps.push({ label: `Rendering remaining ${blocks.length - 6} blocks…`, ms: 1200 });
  }
  steps.push({ label: 'Stitching session timeline',  ms: 500 });
  steps.push({ label: 'Applying final mastering',    ms: 400 });
  return steps;
}
