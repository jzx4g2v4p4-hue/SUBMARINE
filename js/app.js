// ══════════════════════════════════════════════
// APP.JS — UI Controller
// ══════════════════════════════════════════════

// ── Global State ──────────────────────────────
const State = {
  // Audio
  ac:          null,
  audioFile:   null,
  audioBuf:    null,
  duration:    0,
  outBuf:      null,
  // Settings
  affirmations: [],
  goal:        'focus',
  mode:        'hybrid',
  balance:     25,
  density:     2,
  binauralOn:  false,
  binauralPreset: 'focus',
  binauralCarrier: 200,
  binauralLevel: 0.04,
  fade:        true,
  stereo:      true,
  limit:       true,
  ttsSpeed:    1.0,
  volume:      80,
  // Playback
  isPlaying:   false,
  playSrc:     null,
  playTicker:  null,
  playingOrig: false,
  startedAt:   0,
  pausedAt:    0,
  // App mode
  appMode:     'standard',
  // Steps
  currentStep: 1
};

let pomPreviewUrl = null;
let affPreviewActiveBtn = null;

// ── Standard Mode Steps ───────────────────────
const STD_STEPS = [
  { n: 1, label: 'Upload',    screen: 's-upload'   },
  { n: 2, label: 'Affirm',   screen: 's-affirm'   },
  { n: 3, label: 'Goal',     screen: 's-goal'     },
  { n: 4, label: 'Optimize', screen: 's-optimize' },
  { n: 5, label: 'Preview',  screen: 's-preview'  },
  { n: 6, label: 'Export',   screen: 's-export'   }
];

const POM_STEPS = [
  { n: 1, label: 'Build',   screen: 'p-session'  },
  { n: 2, label: 'Render',  screen: 'p-optimize' }
];

// ── Render Step Bar ───────────────────────────
function renderStepBar() {
  const steps = State.appMode === 'pomodoro' ? POM_STEPS : STD_STEPS;
  const bar   = document.getElementById('stepbar');
  bar.innerHTML = steps.map((s, i) => {
    const cls  = s.n === State.currentStep ? 'active' : s.n < State.currentStep ? 'done' : '';
    const icon = s.n < State.currentStep ? '✓' : s.n;
    const line = i < steps.length - 1 ? '<div class="step-line"></div>' : '';
    return `<div class="step-item">
      <div class="step-dot ${cls}">
        <div class="step-num">${icon}</div>
        <div class="step-label">${s.label}</div>
      </div>${line}
    </div>`;
  }).join('');
}

// ── Navigate to step ──────────────────────────
function goStep(n) {
  stopPlayback();
  stopAffirmationPreview();
  State.currentStep = n;
  const steps = State.appMode === 'pomodoro' ? POM_STEPS : STD_STEPS;
  const step  = steps.find(s => s.n === n);
  if (!step) return;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(step.screen);
  if (el) el.classList.add('active');
  renderStepBar();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (n === 4 && State.appMode === 'standard') fillOptimizeSummary();
  if (n === 5) initPreviewScreen();
  if (n === 6) initExportScreen();
}

// ── Mode Switcher ─────────────────────────────
document.getElementById('modeStandard').addEventListener('click', () => switchAppMode('standard'));
document.getElementById('modePomodoro').addEventListener('click', () => switchAppMode('pomodoro'));

function switchAppMode(mode) {
  stopAffirmationPreview();
  State.appMode     = mode;
  State.currentStep = 1;
  document.getElementById('standardMode').style.display = mode === 'standard' ? '' : 'none';
  document.getElementById('pomodoroMode').style.display = mode === 'pomodoro' ? '' : 'none';
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(mode === 'standard' ? 'modeStandard' : 'modePomodoro').classList.add('active');
  // Reset active screen
  if (mode === 'standard') {
    document.querySelectorAll('#standardMode .screen').forEach(s => s.classList.remove('active'));
    document.getElementById('s-upload').classList.add('active');
  } else {
    document.querySelectorAll('#pomodoroMode .screen').forEach(s => s.classList.remove('active'));
    document.getElementById('p-session').classList.add('active');
    renderTimeline();
  }
  renderStepBar();
}

// ══════════════════════════════════════════════
// SCREEN 1: UPLOAD
// ══════════════════════════════════════════════
const dropzone  = document.getElementById('dropzone');
const audioInp  = document.getElementById('audioInput');

['dragover','dragenter'].forEach(e =>
  dropzone.addEventListener(e, ev => { ev.preventDefault(); dropzone.classList.add('over'); })
);
['dragleave','drop'].forEach(e =>
  dropzone.addEventListener(e, ev => { ev.preventDefault(); dropzone.classList.remove('over'); })
);
dropzone.addEventListener('drop', ev => {
  const f = ev.dataTransfer.files[0];
  if (f) handleAudioFile(f, 'standard');
});
audioInp.addEventListener('change', ev => {
  if (ev.target.files[0]) handleAudioFile(ev.target.files[0], 'standard');
});

document.getElementById('fileRemove').addEventListener('click', ev => {
  ev.stopPropagation();
  State.audioFile = null; State.audioBuf = null;
  document.getElementById('fileLoaded').style.display = 'none';
  dropzone.style.display = '';
  document.getElementById('uploadNext').disabled = true;
  audioInp.value = '';
});

function handleAudioFile(file, target) {
  if (target === 'standard') {
    State.audioFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileMeta').textContent = 'Decoding…';
    dropzone.style.display = 'none';
    document.getElementById('fileLoaded').style.display = 'block';
    decodeAudioFile(file, (err, buf) => {
      if (err) {
        document.getElementById('fileMeta').textContent = '⚠ Could not decode — try MP3 or WAV.';
        return;
      }
      State.audioBuf = buf;
      State.duration = buf.duration;
      const m = Math.floor(buf.duration / 60);
      const s = Math.round(buf.duration % 60).toString().padStart(2, '0');
      document.getElementById('fileMeta').textContent =
        `${m}:${s} · ${(file.size/1024/1024).toFixed(1)} MB`;
      setTimeout(() => drawWaveform(buf, 'waveformCanvas'), 50);
      document.getElementById('uploadNext').disabled = false;
    });
  } else {
    // Pomodoro upload (single-file fallback path)
    PomState.audioBufs = [];
    const label = document.getElementById('pomUploadLabel');
    const list  = document.getElementById('pomTrackList');
    if (list) list.innerHTML = '';
    label.textContent = 'Decoding…';
    decodeAudioFile(file, (err, buf) => {
      if (err) { label.textContent = '⚠ Error — try MP3 or WAV.'; return; }
      PomState.audioBufs = [buf];
      const m = Math.floor(buf.duration / 60);
      const s = Math.round(buf.duration % 60).toString().padStart(2, '0');
      label.textContent = `✓ ${file.name} (${m}:${s})`;
      if (list) list.innerHTML = `<div class="pom-track-item">1. ${file.name} · ${m}:${s}</div>`;
    });
  }
}

document.getElementById('uploadNext').addEventListener('click', () => goStep(2));

// ══════════════════════════════════════════════
// SCREEN 2: AFFIRMATIONS
// ══════════════════════════════════════════════
const affTA = document.getElementById('affirmTA');

function updateAffCount() {
  const lines = affTA.value.split('\n').filter(l => l.trim().length > 0);
  State.affirmations = lines;
  document.getElementById('affCount').textContent = lines.length;
  document.getElementById('affNext').disabled = lines.length === 0;
}

affTA.addEventListener('input', updateAffCount);

// Preset chips for standard mode
document.querySelectorAll('#affPresetChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const preset = chip.dataset.preset;
    affTA.value = (AFFIRM_PRESETS[preset] || []).join('\n');
    updateAffCount();
  });
});

document.getElementById('affBack').addEventListener('click', () => goStep(1));
document.getElementById('affNext').addEventListener('click', () => goStep(3));
setupAffirmationPreviewButton('previewAffBtn', () => State.affirmations);

// ══════════════════════════════════════════════
// SCREEN 3: GOAL + MODE
// ══════════════════════════════════════════════
document.querySelectorAll('.goal-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('sel'));
    card.classList.add('sel');
    State.goal = card.dataset.goal;
    applyGoalPreset(State.goal);
  });
});

function applyGoalPreset(goal) {
  const preset = GOAL_PRESETS[goal];
  if (!preset) return;
  State.mode    = preset.mode;
  State.balance = preset.balance;
  State.density = preset.density;

  // Auto-select mode
  document.querySelectorAll('.mode-row').forEach(r => r.classList.remove('sel'));
  const modeEl = document.querySelector(`[data-mode="${preset.mode}"]`);
  if (modeEl) modeEl.classList.add('sel');

  // Auto-select binaural preset
  if (preset.binaural && BINAURAL_PRESETS[preset.binaural]) {
    State.binauralPreset = preset.binaural;
    const bp = BINAURAL_PRESETS[preset.binaural];
    document.getElementById('binauralDesc').textContent = bp.label;
    document.querySelectorAll('.bp-chip').forEach(c => c.classList.remove('sel'));
    const bpChip = document.querySelector(`[data-bp="${preset.binaural}"]`);
    if (bpChip) bpChip.classList.add('sel');
  }
}

document.querySelectorAll('.mode-row').forEach(row => {
  row.addEventListener('click', () => {
    document.querySelectorAll('.mode-row').forEach(r => r.classList.remove('sel'));
    row.classList.add('sel');
    State.mode = row.dataset.mode;
  });
});

// Binaural toggle
document.getElementById('binauralToggle').addEventListener('change', ev => {
  State.binauralOn = ev.target.checked;
  document.getElementById('binauralPresets').style.display = ev.target.checked ? 'flex' : 'none';
  document.getElementById('prevBinToggle').checked = ev.target.checked;
});

// Binaural preset chips
document.querySelectorAll('.bp-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.bp-chip').forEach(c => c.classList.remove('sel'));
    chip.classList.add('sel');
    State.binauralPreset = chip.dataset.bp;
    const bp = BINAURAL_PRESETS[State.binauralPreset];
    if (bp) document.getElementById('binauralDesc').textContent = bp.label;
  });
});

document.getElementById('goalBack').addEventListener('click', () => goStep(2));
document.getElementById('goalNext').addEventListener('click', () => goStep(4));

// ══════════════════════════════════════════════
// SCREEN 4: OPTIMIZE
// ══════════════════════════════════════════════
function fillOptimizeSummary() {
  const m = Math.floor(State.duration / 60);
  const s = Math.round(State.duration % 60).toString().padStart(2, '0');
  document.getElementById('rsSong').textContent  = State.audioFile?.name?.replace(/\.[^.]+$/, '') || '—';
  document.getElementById('rsAff').textContent   = `${State.affirmations.length} affirmations`;
  document.getElementById('rsGoal').textContent  = State.goal.charAt(0).toUpperCase() + State.goal.slice(1);
  document.getElementById('rsMode').textContent  = State.mode.charAt(0).toUpperCase() + State.mode.slice(1);
  document.getElementById('rsBin').textContent   = State.binauralOn
    ? (BINAURAL_PRESETS[State.binauralPreset]?.label || 'On') : 'Off';
  document.getElementById('rsDur').textContent   = `${m}:${s}`;
}

document.getElementById('optBack').addEventListener('click', () => goStep(3));
document.getElementById('optBtn').addEventListener('click', startOptimize);
document.getElementById('optToPreview').addEventListener('click', () => goStep(5));

function startOptimize() {
  document.getElementById('readySummary').style.display = 'none';
  document.getElementById('optRunning').style.display   = 'block';
  document.getElementById('optBack').style.display      = 'none';

  const stepsEl = document.getElementById('optSteps');
  stepsEl.innerHTML = PROC_STEPS.map((s, i) => `
    <div class="opt-step-row">
      <div class="osi wait" id="osi${i}">○</div>
      <div class="osl"      id="osl${i}">${s.label}</div>
    </div>`).join('');

  const total = PROC_STEPS.reduce((sum, s) => sum + s.ms, 0);
  let elapsed = 0, idx = 0;

  function tick() {
    if (idx >= PROC_STEPS.length) {
      buildMix().then(buf => {
        State.outBuf = buf;
        setTimeout(finishOptimize, 300);
      });
      return;
    }
    document.getElementById('optProgLabel').textContent = PROC_STEPS[idx].label + '…';
    const osi = document.getElementById(`osi${idx}`);
    const osl = document.getElementById(`osl${idx}`);
    osi.className = 'osi active';
    osi.textContent = '◉';
    osl.className   = 'osl active';

    setTimeout(() => {
      elapsed += PROC_STEPS[idx].ms;
      const pct = Math.round(elapsed / total * 100);
      document.getElementById('optBarFill').style.width = pct + '%';
      document.getElementById('optProgPct').textContent = pct + '%';
      osi.className   = 'osi done';
      osi.textContent = '✓';
      osl.className   = 'osl';
      idx++;
      tick();
    }, PROC_STEPS[idx].ms);
  }
  tick();
}

function finishOptimize() {
  document.getElementById('optRunning').style.display = 'none';
  document.getElementById('optDone').style.display    = 'block';
  const dLbl = ['','sparse','medium','dense'][State.density] || 'medium';
  document.getElementById('doneSub').textContent =
    `${State.affirmations.length} affirmations · ${State.mode} mode · ${dLbl} density${State.binauralOn ? ' · binaural on' : ''}`;
}

// ══════════════════════════════════════════════
// SCREEN 5: PREVIEW
// ══════════════════════════════════════════════
function initPreviewScreen() {
  stopPlayback();
  State.pausedAt = 0;
  State.playingOrig = false;

  const buf = State.outBuf || State.audioBuf;
  if (buf) {
    document.getElementById('totTime').textContent = fmtTime(buf.duration);
  }
  document.getElementById('curTime').textContent  = '0:00';
  document.getElementById('progFill').style.width = '0';

  // Sync sliders to state
  document.getElementById('intensityRange').value = State.mode === 'hidden' ? 1 : State.mode === 'hybrid' ? 2 : 3;
  document.getElementById('balanceRange').value   = State.balance;
  document.getElementById('densityRange').value   = State.density;
  document.getElementById('prevBinToggle').checked = State.binauralOn;
  updateIntensityLabel();
  updateBalanceLabel();
  updateDensityLabel();
}

// Compare tabs
document.getElementById('ctabEnh').addEventListener('click', () => {
  document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
  document.getElementById('ctabEnh').classList.add('active');
  State.playingOrig = false;
  State.pausedAt = 0;
  stopPlayback();
  document.getElementById('playerTitle').textContent = 'Enhanced Subliminal Track';
});
document.getElementById('ctabOrig').addEventListener('click', () => {
  document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'));
  document.getElementById('ctabOrig').classList.add('active');
  State.playingOrig = true;
  State.pausedAt = 0;
  stopPlayback();
  document.getElementById('playerTitle').textContent = 'Original Song';
});

// Play button
document.getElementById('playBtn').addEventListener('click', () => {
  if (State.isPlaying) {
    State.pausedAt = (State.ac?.currentTime || 0) - State.startedAt;
    stopPlayback();
    return;
  }
  const buf = State.playingOrig ? State.audioBuf : (State.outBuf || State.audioBuf);
  if (!buf) return;
  startPlayback(buf, State.pausedAt || 0);
});

// Seek
document.getElementById('progTrack').addEventListener('click', ev => {
  const rect = ev.currentTarget.getBoundingClientRect();
  const pct  = (ev.clientX - rect.left) / rect.width;
  const buf  = State.playingOrig ? State.audioBuf : (State.outBuf || State.audioBuf);
  if (!buf) return;
  State.pausedAt = pct * buf.duration;
  document.getElementById('progFill').style.width = (pct * 100) + '%';
  if (State.isPlaying) { stopPlayback(); setTimeout(() => document.getElementById('playBtn').click(), 50); }
});

// Volume
document.getElementById('volRange').addEventListener('input', ev => {
  State.volume = +ev.target.value;
});

// Slider labels
function updateIntensityLabel() {
  const v = +document.getElementById('intensityRange').value;
  const labels = ['','Hidden','Hybrid','Barely Audible'];
  document.getElementById('intensityVal').textContent = labels[v] || 'Hybrid';
  State.mode = v === 1 ? 'hidden' : v === 2 ? 'hybrid' : 'barely';
}
function updateBalanceLabel() {
  const v = +document.getElementById('balanceRange').value;
  document.getElementById('balanceVal').textContent = v + '%';
  State.balance = v;
}
function updateDensityLabel() {
  const v = +document.getElementById('densityRange').value;
  document.getElementById('densityVal').textContent = ['','Sparse','Medium','Dense'][v] || 'Medium';
  State.density = v;
}

document.getElementById('intensityRange').addEventListener('input', updateIntensityLabel);
document.getElementById('balanceRange').addEventListener('input',   updateBalanceLabel);
document.getElementById('densityRange').addEventListener('input',   updateDensityLabel);

// Binaural preview toggle
document.getElementById('prevBinToggle').addEventListener('change', ev => {
  State.binauralOn = ev.target.checked;
  document.getElementById('binauralToggle').checked = ev.target.checked;
});

// Advanced panel
document.getElementById('advBtn').addEventListener('click', () => {
  const btn   = document.getElementById('advBtn');
  const panel = document.getElementById('advPanel');
  btn.classList.toggle('open');
  panel.classList.toggle('open');
});

// Advanced sliders
document.getElementById('ttsSpeedRange').addEventListener('input', ev => {
  const v = parseFloat(ev.target.value).toFixed(2);
  document.getElementById('ttsSpeedVal').textContent = v + '×';
  State.ttsSpeed = +v;
});
document.getElementById('binLevelRange').addEventListener('input', ev => {
  const v = parseFloat(ev.target.value);
  document.getElementById('binLevelVal').textContent = Math.round(v * 100) + '%';
  State.binauralLevel = v;
});
document.getElementById('carrierRange').addEventListener('input', ev => {
  document.getElementById('carrierVal').textContent = ev.target.value + 'Hz';
  State.binauralCarrier = +ev.target.value;
});
document.getElementById('togFade').addEventListener('change',   ev => { State.fade   = ev.target.checked; });
document.getElementById('togStereo').addEventListener('change', ev => { State.stereo = ev.target.checked; });
document.getElementById('togLimit').addEventListener('change',  ev => { State.limit  = ev.target.checked; });

document.getElementById('prevBack').addEventListener('click', () => { stopPlayback(); goStep(4); });
document.getElementById('prevNext').addEventListener('click', () => { stopPlayback(); goStep(6); });

// ══════════════════════════════════════════════
// SCREEN 6: EXPORT
// ══════════════════════════════════════════════
function initExportScreen() {
  const mLbl = { hybrid: 'Hybrid (Rec.)', barely: 'Barely Audible', hidden: 'Hidden' };
  const dLbl = ['','Sparse','Medium','Dense'];
  const m = Math.floor(State.duration / 60);
  const s = Math.round(State.duration % 60).toString().padStart(2, '0');

  document.getElementById('exportGrid').innerHTML = `
    <div class="rs-item"><div class="rs-k">Duration</div><div class="rs-v">${m}:${s}</div></div>
    <div class="rs-item"><div class="rs-k">Mode</div><div class="rs-v">${mLbl[State.mode] || State.mode}</div></div>
    <div class="rs-item"><div class="rs-k">Goal</div><div class="rs-v">${State.goal.charAt(0).toUpperCase() + State.goal.slice(1)}</div></div>
    <div class="rs-item"><div class="rs-k">Affirmations</div><div class="rs-v">${State.affirmations.length}</div></div>
    <div class="rs-item"><div class="rs-k">Density</div><div class="rs-v">${dLbl[State.density]}</div></div>
    <div class="rs-item"><div class="rs-k">Binaural</div><div class="rs-v">${State.binauralOn ? BINAURAL_PRESETS[State.binauralPreset]?.label?.split('—')[0].trim() || 'On' : 'Off'}</div></div>
  `;

  document.getElementById('exportWin').style.display  = 'none';
  document.getElementById('exportArea').style.display = 'block';
}

document.getElementById('exportBtn').addEventListener('click', doExport);

async function doExport() {
  const btn = document.getElementById('exportBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Rendering…';

  try {
    // Re-render with latest settings
    const rendered = await buildMix();
    State.outBuf = rendered || State.outBuf;

    setTimeout(() => {
      const buf = State.outBuf || State.audioBuf;
      if (!buf) {
        btn.disabled = false;
        btn.textContent = '↓ Download Track';
        return;
      }

      const base = (State.audioFile?.name || 'track').replace(/\.[^.]+$/, '');
      downloadBuffer(buf, `${base}_subliminal_${State.goal}.wav`);

      btn.disabled = false;
      btn.textContent = '↓ Download Track';
      document.getElementById('exportArea').style.display = 'none';
      document.getElementById('exportWin').style.display  = 'block';

      const dur = fmtTime(buf.duration);
      document.getElementById('winSub').textContent =
        `${base}_subliminal_${State.goal}.wav · ${State.affirmations.length} affirmations across ${dur}.`;
    }, 700);
  } catch (err) {
    console.error('Export failed:', err);
    btn.disabled = false;
    btn.textContent = '↓ Download Track';
    alert('Export failed while rendering. Please try again or go back to Preview and reduce advanced effects.');
  }
}

document.getElementById('expBack').addEventListener('click', () => goStep(5));
document.getElementById('expNew').addEventListener('click',  resetApp);

function resetApp() {
  stopPlayback();
  Object.assign(State, {
    audioFile: null, audioBuf: null, outBuf: null,
    affirmations: [], duration: 0, pausedAt: 0,
    goal: 'focus', mode: 'hybrid', balance: 25, density: 2,
    binauralOn: false, binauralPreset: 'focus'
  });
  audioInp.value = '';
  document.getElementById('fileLoaded').style.display = 'none';
  dropzone.style.display = '';
  document.getElementById('uploadNext').disabled = true;
  affTA.value = '';
  updateAffCount();
  document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('sel'));
  document.querySelector('[data-goal="focus"]').classList.add('sel');
  document.querySelectorAll('.mode-row').forEach(c => c.classList.remove('sel'));
  document.querySelector('[data-mode="hybrid"]').classList.add('sel');
  document.getElementById('readySummary').style.display = 'block';
  document.getElementById('optRunning').style.display   = 'none';
  document.getElementById('optDone').style.display      = 'none';
  document.getElementById('optBack').style.display      = '';
  goStep(1);
}

// ══════════════════════════════════════════════
// POMODORO MODE
// ══════════════════════════════════════════════

// Preset selection
document.querySelectorAll('.pom-preset-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.pom-preset-card').forEach(c => c.classList.remove('sel'));
    card.classList.add('sel');
    PomState.preset = card.dataset.preset;
    const preset = POM_PRESETS[PomState.preset];
    if (preset) {
      PomState.workMins  = preset.work;
      PomState.breakMins = preset.brk;
      PomState.cycles    = preset.cycles;
      document.getElementById('workMins').value  = preset.work;
      document.getElementById('breakMins').value = preset.brk;
      document.getElementById('cycles').value    = preset.cycles;
    }
    const isCustom = PomState.preset === 'custom';
    document.getElementById('customPom').style.display = isCustom ? 'block' : 'none';
    renderTimeline();
  });
});

// Custom inputs
['workMins','breakMins','cycles'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    PomState.workMins  = +document.getElementById('workMins').value  || 25;
    PomState.breakMins = +document.getElementById('breakMins').value || 0;
    PomState.cycles    = +document.getElementById('cycles').value    || 1;
    renderTimeline();
  });
});

// Pomodoro audio upload
document.getElementById('pomAudioInput').addEventListener('change', ev => {
  const files = Array.from(ev.target.files || []);
  if (files.length === 0) return;
  decodePomodoroFiles(files);
});

function decodePomodoroFiles(files) {
  PomState.audioBufs = [];
  const label = document.getElementById('pomUploadLabel');
  const list  = document.getElementById('pomTrackList');
  if (list) list.innerHTML = '';
  label.textContent = `Decoding ${files.length} track${files.length > 1 ? 's' : ''}…`;

  const decodedMeta = [];
  let idx = 0;

  const decodeNext = () => {
    if (idx >= files.length) {
      const totalSecs = decodedMeta.reduce((sum, t) => sum + t.duration, 0);
      const mins = Math.floor(totalSecs / 60);
      const secs = Math.round(totalSecs % 60).toString().padStart(2, '0');
      label.textContent = `✓ ${decodedMeta.length} track${decodedMeta.length > 1 ? 's' : ''} loaded (${mins}:${secs} total)`;
      if (list) {
        list.innerHTML = decodedMeta.map((t, i) =>
          `<div class="pom-track-item">${i + 1}. ${t.name} · ${t.pretty}</div>`
        ).join('');
      }
      return;
    }

    const file = files[idx];
    decodeAudioFile(file, (err, buf) => {
      if (!err && buf) {
        PomState.audioBufs.push(buf);
        const m = Math.floor(buf.duration / 60);
        const s = Math.round(buf.duration % 60).toString().padStart(2, '0');
        decodedMeta.push({ name: file.name, duration: buf.duration, pretty: `${m}:${s}` });
      }
      idx++;
      decodeNext();
    });
  };

  decodeNext();
}

// Pomodoro affirmation preset chips
document.querySelectorAll('#pomWorkChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const preset = chip.dataset.preset;
    document.getElementById('pomWorkAff').value = (AFFIRM_PRESETS[preset] || []).join('\n');
    PomState.workAffs = AFFIRM_PRESETS[preset] || [];
  });
});

document.querySelectorAll('[data-ta="pomBreakAff"]').forEach(chip => {
  chip.addEventListener('click', () => {
    const preset = chip.dataset.preset;
    document.getElementById('pomBreakAff').value = (AFFIRM_PRESETS[preset] || []).join('\n');
    PomState.breakAffs = AFFIRM_PRESETS[preset] || [];
  });
});

document.getElementById('pomWorkAff').addEventListener('input', ev => {
  PomState.workAffs = ev.target.value.split('\n').filter(l => l.trim().length > 0);
});
document.getElementById('pomBreakAff').addEventListener('input', ev => {
  PomState.breakAffs = ev.target.value.split('\n').filter(l => l.trim().length > 0);
});
setupAffirmationPreviewButton('previewPomWorkAffBtn', () => {
  const lines = document.getElementById('pomWorkAff').value.split('\n').filter(l => l.trim().length > 0);
  PomState.workAffs = lines;
  return lines;
});
setupAffirmationPreviewButton('previewPomBreakAffBtn', () => {
  const lines = document.getElementById('pomBreakAff').value.split('\n').filter(l => l.trim().length > 0);
  PomState.breakAffs = lines;
  return lines;
});

document.getElementById('workBinaural').addEventListener('change', ev => {
  PomState.workBinaural = ev.target.value;
});
document.getElementById('breakBinaural').addEventListener('change', ev => {
  PomState.breakBinaural = ev.target.value;
});

// Build session button
document.getElementById('pomBuild').addEventListener('click', () => {
  PomState.workAffs  = document.getElementById('pomWorkAff').value.split('\n').filter(l => l.trim());
  PomState.breakAffs = document.getElementById('pomBreakAff').value.split('\n').filter(l => l.trim());
  if (PomState.workAffs.length === 0) {
    alert('Please add at least one work affirmation before building the session.');
    return;
  }
  State.currentStep = 2;
  document.querySelectorAll('#pomodoroMode .screen').forEach(s => s.classList.remove('active'));
  document.getElementById('p-optimize').classList.add('active');
  renderStepBar();
  renderSessionSpec();
});

document.getElementById('pomBack').addEventListener('click', () => {
  State.currentStep = 1;
  document.querySelectorAll('#pomodoroMode .screen').forEach(s => s.classList.remove('active'));
  document.getElementById('p-session').classList.add('active');
  renderStepBar();
});

// Render session
document.getElementById('pomRenderBtn').addEventListener('click', startPomodoroRender);
document.getElementById('pomExportBtn').addEventListener('click', exportPomodoro);

function startPomodoroRender() {
  const previewWrap = document.getElementById('pomPreviewWrap');
  const previewAudio = document.getElementById('pomPreviewAudio');
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
    previewAudio.removeAttribute('src');
    previewAudio.load();
  }
  if (previewWrap) previewWrap.style.display = 'none';
  if (pomPreviewUrl) {
    URL.revokeObjectURL(pomPreviewUrl);
    pomPreviewUrl = null;
  }

  document.getElementById('sessionStartArea').style.display = 'none';
  document.getElementById('pomRunning').style.display       = 'block';
  document.getElementById('pomBack').style.display          = 'none';

  const { blocks } = getSessionConfig();
  const steps      = getPomSteps(blocks);
  const stepsEl    = document.getElementById('pomSteps');
  stepsEl.innerHTML = steps.map((s, i) => `
    <div class="opt-step-row">
      <div class="osi wait" id="psi${i}">○</div>
      <div class="osl"      id="psl${i}">${s.label}</div>
    </div>`).join('');

  const total   = steps.reduce((sum, s) => sum + s.ms, 0);
  let elapsed   = 0, idx = 0;

  function tick() {
    if (idx >= steps.length) {
      // Run real render
      renderPomodoroSession((pct, msg) => {
        document.getElementById('pomBarFill').style.width = (pct * 100) + '%';
        document.getElementById('pomProgPct').textContent = Math.round(pct * 100) + '%';
      }).then(() => {
        setTimeout(finishPomodoroRender, 400);
      });
      return;
    }
    document.getElementById('pomProgLabel').textContent = steps[idx].label + '…';
    const osi = document.getElementById(`psi${idx}`);
    const osl = document.getElementById(`psl${idx}`);
    osi.className = 'osi active'; osi.textContent = '◉';
    osl.className = 'osl active';

    setTimeout(() => {
      elapsed += steps[idx].ms;
      const pct = Math.round(elapsed / total * 100);
      document.getElementById('pomBarFill').style.width = pct + '%';
      document.getElementById('pomProgPct').textContent = pct + '%';
      osi.className = 'osi done'; osi.textContent = '✓';
      osl.className = 'osl';
      idx++;
      tick();
    }, steps[idx].ms);
  }
  tick();
}

function finishPomodoroRender() {
  document.getElementById('pomRunning').style.display = 'none';
  document.getElementById('pomDone').style.display    = 'block';
  const { totalMins } = getSessionConfig();
  document.getElementById('pomDoneSub').textContent =
    `${totalMins}-minute session · ${PomState.cycles} cycle${PomState.cycles > 1 ? 's' : ''} · ready to download`;
  setupPomodoroPreview(PomState.outBuf);
}

async function exportPomodoro() {
  const btn = document.getElementById('pomExportBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Preparing download…';

  setTimeout(() => {
    const buf = PomState.outBuf;
    if (!buf) { btn.disabled = false; btn.textContent = '↓ Download Session'; return; }

    const { totalMins } = getSessionConfig();
    const presetLabel   = getPomPresetLabel().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadBuffer(buf, `pomodoro_${presetLabel}_${totalMins}min.wav`);

    btn.disabled = false;
    btn.textContent = '↓ Download Session';
    document.getElementById('pomExportWin').style.display = 'block';
    document.getElementById('pomWinSub').textContent =
      `pomodoro_${presetLabel}_${totalMins}min.wav · ${fmtDuration(buf.duration)} of subliminal audio.`;
  }, 600);
}

function setupPomodoroPreview(buf) {
  const wrap = document.getElementById('pomPreviewWrap');
  const audio = document.getElementById('pomPreviewAudio');
  if (!wrap || !audio || !buf) return;

  if (pomPreviewUrl) URL.revokeObjectURL(pomPreviewUrl);
  const wav = encodeWAV(buf);
  const blob = new Blob([wav], { type: 'audio/wav' });
  pomPreviewUrl = URL.createObjectURL(blob);
  audio.src = pomPreviewUrl;
  audio.currentTime = 0;
  wrap.style.display = 'block';
}

function setupAffirmationPreviewButton(btnId, getLines) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (affPreviewActiveBtn === btn) {
      stopAffirmationPreview();
      return;
    }
    const lines = (getLines?.() || []).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('Add at least one affirmation to preview.');
      return;
    }
    speakAffirmations(lines, btn);
  });
}

function speakAffirmations(lines, btn) {
  if (!window.speechSynthesis) {
    alert('Affirmation preview is not supported in this browser.');
    return;
  }
  stopAffirmationPreview();
  const utterance = new SpeechSynthesisUtterance(lines.join('. '));
  utterance.rate = Math.max(0.6, Math.min(1.4, State.ttsSpeed || 1.0));
  utterance.pitch = 1.0;
  utterance.onend = stopAffirmationPreview;
  utterance.onerror = stopAffirmationPreview;

  affPreviewActiveBtn = btn;
  affPreviewActiveBtn.textContent = '■ Stop preview';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function stopAffirmationPreview() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (affPreviewActiveBtn) affPreviewActiveBtn.textContent = '🔊 Preview affirmations';
  const workBtn = document.getElementById('previewPomWorkAffBtn');
  const breakBtn = document.getElementById('previewPomBreakAffBtn');
  if (workBtn) workBtn.textContent = '🔊 Preview work affirmations';
  if (breakBtn) breakBtn.textContent = '🔊 Preview break affirmations';
  affPreviewActiveBtn = null;
}

// ══════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════
renderStepBar();
renderTimeline();

// Set default goal
applyGoalPreset('focus');

// Init affirm count
updateAffCount();
