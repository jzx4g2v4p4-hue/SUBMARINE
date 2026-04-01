// ── App State ─────────────────────────────────────────────
const App = {
  step:        1,
  audioFile:   null,
  audioBuf:    null,
  ac:          null,
  duration:    0,
  affirmations:[],
  goal:        'focus',
  mode:        'hybrid',
  intensity:   2,
  balance:     25,
  density:     2,
  fade:        true,
  stereo:      true,
  limit:       true,
  outBuf:      null,
  processed:   false,
  isPlaying:   false,
  playSrc:     null,
  playOrig:    false,
  startedAt:   0,
  pausedAt:    0,
  ticker:      null
};

// ── Step Definitions ──────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Affirm' },
  { n: 3, label: 'Goal'   },
  { n: 4, label: 'Optimize'},
  { n: 5, label: 'Preview' },
  { n: 6, label: 'Export'  }
];

// ── Navigation ────────────────────────────────────────────
function renderSteps() {
  document.getElementById('stepsBar').innerHTML = STEPS.map((s, i) => {
    const cls = s.n === App.step ? 'active' : s.n < App.step ? 'done' : '';
    const ico = s.n < App.step ? '✓' : s.n;
    const line = i < STEPS.length - 1 ? '<div class="s-line"></div>' : '';
    return `
      <div class="s-item">
        <div class="s-dot ${cls}">
          <div class="s-num">${ico}</div>
          <div class="s-lbl">${s.label}</div>
        </div>
        ${line}
      </div>`;
  }).join('');
}

function go(n) {
  stopPlayback();
  App.step = n;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + n).classList.add('active');
  renderSteps();
  if (n === 4) fillOptSummary();
  if (n === 5) initPreview();
  if (n === 6) initExport();
}

// ── Screen 1: Upload ──────────────────────────────────────
const dropzone    = document.getElementById('dropzone');
const audioInput  = document.getElementById('audioFile');

['dragover', 'dragenter'].forEach(e =>
  dropzone.addEventListener(e, ev => { ev.preventDefault(); dropzone.classList.add('over'); })
);
['dragleave', 'drop'].forEach(e =>
  dropzone.addEventListener(e, ev => { ev.preventDefault(); dropzone.classList.remove('over'); })
);

dropzone.addEventListener('drop', ev => {
  const f = ev.dataTransfer.files[0];
  if (f) loadAudioFile(f);
});

audioInput.addEventListener('change', ev => {
  if (ev.target.files[0]) loadAudioFile(ev.target.files[0]);
});

document.getElementById('rmFile').addEventListener('click', ev => {
  ev.stopPropagation();
  App.audioFile = null;
  App.audioBuf  = null;
  document.getElementById('fcard').style.display    = 'none';
  dropzone.style.display                            = '';
  document.getElementById('s1next').disabled        = true;
  audioInput.value = '';
});

function loadAudioFile(file) {
  App.audioFile = file;
  document.getElementById('fname').textContent = file.name;
  document.getElementById('fmeta').textContent = 'Decoding…';
  dropzone.style.display                       = 'none';
  document.getElementById('fcard').style.display = 'block';

  initAudioContext();
  const reader = new FileReader();

  reader.onload = e => {
    // .slice(0) forces a copy — required on some browsers
    App.ac.decodeAudioData(e.target.result.slice(0))
      .then(buf => {
        App.audioBuf = buf;
        App.duration = buf.duration;
        const m = Math.floor(buf.duration / 60);
        const s = Math.round(buf.duration % 60).toString().padStart(2, '0');
        document.getElementById('fmeta').textContent =
          `${m}:${s} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
        drawWaveform(buf);
        document.getElementById('s1next').disabled = false;
      })
      .catch(() => {
        document.getElementById('fmeta').textContent = '⚠ Could not decode — try MP3 or WAV.';
      });
  };

  reader.readAsArrayBuffer(file);
}

document.getElementById('s1next').addEventListener('click', () => go(2));

// ── Screen 2: Affirmations ────────────────────────────────
const affTA = document.getElementById('affTA');

function updateAffCount() {
  const lines = affTA.value.split('\n').filter(l => l.trim().length > 0);
  App.affirmations = lines;
  document.getElementById('affN').textContent = lines.length;
  document.getElementById('affC').textContent = affTA.value.length;
  document.getElementById('s2next').disabled  = lines.length === 0;
}

affTA.addEventListener('input', updateAffCount);

document.querySelectorAll('.preset-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    affTA.value = (PRESETS[btn.dataset.p] || []).join('\n');
    updateAffCount();
  });
});

document.getElementById('s2back').addEventListener('click', () => go(1));
document.getElementById('s2next').addEventListener('click', () => go(3));

// ── Screen 3: Goal + Mode ─────────────────────────────────
document.querySelectorAll('.goal-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('sel'));
    card.classList.add('sel');
    App.goal = card.dataset.g;
    const cfg = GOAL_CFG[App.goal] || GOAL_CFG.custom;
    App.density = cfg.density;
    App.balance  = cfg.balance;
  });
});

document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('sel'));
    card.classList.add('sel');
    App.mode = card.dataset.m;
  });
});

document.getElementById('s3back').addEventListener('click', () => go(2));
document.getElementById('s3next').addEventListener('click', () => go(4));

// ── Screen 4: Optimize ────────────────────────────────────
function fillOptSummary() {
  const m = Math.floor(App.duration / 60);
  const s = Math.round(App.duration % 60).toString().padStart(2, '0');
  document.getElementById('sTrack').textContent = `${m}:${s}`;
  document.getElementById('sAff').textContent   = `${App.affirmations.length} lines`;
  document.getElementById('sGoal').textContent  = App.goal.charAt(0).toUpperCase() + App.goal.slice(1);
  document.getElementById('sMode').textContent  = App.mode.charAt(0).toUpperCase() + App.mode.slice(1);
}

document.getElementById('s4back').addEventListener('click', () => go(3));
document.getElementById('optBtn').addEventListener('click', startOptimize);
document.getElementById('s4next').addEventListener('click', () => go(5));

function startOptimize() {
  document.getElementById('optReady').style.display   = 'none';
  document.getElementById('optRunning').style.display = 'block';
  document.getElementById('s4back').style.display     = 'none';

  // Build progress step UI
  const stepsDiv = document.getElementById('progSteps');
  stepsDiv.innerHTML = PROCESS_STEPS.map((ps, i) => `
    <div class="prog-step">
      <div class="ps-ico wait" id="pi${i}">○</div>
      <div class="ps-lbl"      id="pl${i}">${ps.label}</div>
    </div>`).join('');

  const total = STEP_DURATIONS.reduce((a, b) => a + b, 0);
  let elapsed = 0;
  let idx     = 0;

  function tick() {
    if (idx >= PROCESS_STEPS.length) {
      setTimeout(finishOptimize, 300);
      return;
    }
    document.getElementById('progLabel').textContent = PROCESS_STEPS[idx].label + '…';
    document.getElementById(`pi${idx}`).className   = 'ps-ico active';
    document.getElementById(`pi${idx}`).textContent = '◉';
    document.getElementById(`pl${idx}`).className   = 'ps-lbl active';

    setTimeout(() => {
      elapsed += STEP_DURATIONS[idx];
      const pct = Math.round(elapsed / total * 100);
      document.getElementById('progFill').style.width    = pct + '%';
      document.getElementById('progPct').textContent     = pct + '%';
      document.getElementById(`pi${idx}`).className      = 'ps-ico done';
      document.getElementById(`pi${idx}`).textContent    = '✓';
      document.getElementById(`pl${idx}`).className      = 'ps-lbl';
      idx++;
      tick();
    }, STEP_DURATIONS[idx]);
  }

  tick();
  buildMix(); // runs the real audio processing in parallel
}

function finishOptimize() {
  document.getElementById('optRunning').style.display = 'none';
  document.getElementById('optDone').style.display    = 'block';
  const dLbl = ['', 'sparse', 'medium', 'dense'][App.density] || 'medium';
  document.getElementById('doneNote').textContent =
    `${App.affirmations.length} affirmations blended · ${App.mode} mode · ${dLbl} repetition`;
}

// ── Screen 5: Preview ─────────────────────────────────────
function initPreview() {
  stopPlayback();
  App.pausedAt = 0;
  const m = Math.floor(App.duration / 60);
  const s = Math.round(App.duration % 60).toString().padStart(2, '0');
  document.getElementById('plTot').textContent = `${m}:${s}`;
  document.getElementById('plCur').textContent = '0:00';
  document.getElementById('plFill').style.width = '0';
  syncSliders();
}

function syncSliders() {
  document.getElementById('intensitySlider').value = App.intensity;
  document.getElementById('balanceSlider').value   = App.balance;
  document.getElementById('densitySlider').value   = App.density;
  updateIntLabel();
  updateBalLabel();
  updateDenLabel();
}

// Compare tabs
document.getElementById('tabEnh').addEventListener('click', () => {
  document.querySelectorAll('.cmp-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tabEnh').classList.add('active');
  App.playOrig = false;
  App.pausedAt = 0;
  stopPlayback();
  document.getElementById('plTitle').textContent = 'Enhanced Subliminal Track';
});

document.getElementById('tabOrig').addEventListener('click', () => {
  document.querySelectorAll('.cmp-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tabOrig').classList.add('active');
  App.playOrig = true;
  App.pausedAt = 0;
  stopPlayback();
  document.getElementById('plTitle').textContent = 'Original Song';
});

// Play / pause
document.getElementById('playBtn').addEventListener('click', () => {
  if (App.isPlaying) {
    App.pausedAt = App.ac.currentTime - App.startedAt;
    stopPlayback();
    return;
  }
  const buf = App.playOrig ? App.audioBuf : (App.outBuf || App.audioBuf);
  if (!buf) return;
  startPlayback(buf, App.pausedAt || 0);
});

// Seek by clicking the track bar
document.getElementById('plTrack').addEventListener('click', ev => {
  const rect = ev.currentTarget.getBoundingClientRect();
  const pct  = (ev.clientX - rect.left) / rect.width;
  const buf  = App.playOrig ? App.audioBuf : (App.outBuf || App.audioBuf);
  if (!buf) return;
  App.pausedAt = pct * buf.duration;
  document.getElementById('plFill').style.width = (pct * 100) + '%';
  if (App.isPlaying) {
    stopPlayback();
    setTimeout(() => document.getElementById('playBtn').click(), 40);
  }
});

// Slider label helpers
function updateIntLabel() {
  const v = +document.getElementById('intensitySlider').value;
  document.getElementById('intensityLbl').textContent = ['', 'Hidden', 'Hybrid', 'Barely Audible'][v] || 'Hybrid';
  App.intensity = v;
}
function updateBalLabel() {
  const v = +document.getElementById('balanceSlider').value;
  document.getElementById('balanceLbl').textContent = v + '%';
  App.balance = v;
}
function updateDenLabel() {
  const v = +document.getElementById('densitySlider').value;
  document.getElementById('densityLbl').textContent = ['', 'Sparse', 'Medium', 'Dense'][v] || 'Medium';
  App.density = v;
}

document.getElementById('intensitySlider').addEventListener('input', updateIntLabel);
document.getElementById('balanceSlider').addEventListener('input', updateBalLabel);
document.getElementById('densitySlider').addEventListener('input', updateDenLabel);

// Advanced settings panel
document.getElementById('advBtn').addEventListener('click', () => {
  document.getElementById('advBtn').classList.toggle('open');
  document.getElementById('advBody').classList.toggle('open');
});

document.getElementById('togFade').addEventListener('change',   ev => { App.fade   = ev.target.checked; });
document.getElementById('togStereo').addEventListener('change', ev => { App.stereo = ev.target.checked; });
document.getElementById('togLimit').addEventListener('change',  ev => { App.limit  = ev.target.checked; });

document.getElementById('s5back').addEventListener('click', () => { stopPlayback(); go(4); });
document.getElementById('s5next').addEventListener('click', () => { stopPlayback(); go(6); });

// ── Screen 6: Export ──────────────────────────────────────
function initExport() {
  const modeLabels = { hybrid: 'Hybrid (Recommended)', barely: 'Barely Audible', hidden: 'Hidden' };
  const denLabels  = ['', 'Sparse', 'Medium', 'Dense'];
  const m = Math.floor(App.duration / 60);
  const s = Math.round(App.duration % 60).toString().padStart(2, '0');

  document.getElementById('expSum').innerHTML = `
    <div class="sum-item"><div class="sum-k">Duration</div><div class="sum-v">${m}:${s}</div></div>
    <div class="sum-item"><div class="sum-k">Mode</div><div class="sum-v">${modeLabels[App.mode] || App.mode}</div></div>
    <div class="sum-item"><div class="sum-k">Goal</div><div class="sum-v">${App.goal.charAt(0).toUpperCase() + App.goal.slice(1)}</div></div>
    <div class="sum-item"><div class="sum-k">Affirmations</div><div class="sum-v">${App.affirmations.length} lines</div></div>
    <div class="sum-item"><div class="sum-k">Repetitions</div><div class="sum-v">${denLabels[App.density]}</div></div>
    <div class="sum-item"><div class="sum-k">Format</div><div class="sum-v">WAV · 16-bit</div></div>`;

  document.getElementById('expWin').style.display  = 'none';
  document.getElementById('expArea').style.display = 'block';
}

document.getElementById('dlBtn').addEventListener('click', doExport);

async function doExport() {
  const btn = document.getElementById('dlBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Rendering…';

  // Re-render with the latest slider values before download
  await buildMix();

  setTimeout(() => {
    const buf = App.outBuf || App.audioBuf;
    if (!buf) {
      btn.disabled = false;
      btn.textContent = '↓ Download Track';
      return;
    }

    const wav  = encodeWAV(buf);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const base = (App.audioFile?.name || 'track').replace(/\.[^.]+$/, '');
    a.href     = url;
    a.download = `${base}_subliminal_${App.goal}.wav`;
    a.click();
    URL.revokeObjectURL(url);

    btn.disabled    = false;
    btn.textContent = '↓ Download Track';
    document.getElementById('expArea').style.display = 'none';
    document.getElementById('expWin').style.display  = 'block';

    const dur = `${Math.floor(App.duration / 60)}:${Math.round(App.duration % 60).toString().padStart(2, '0')}`;
    document.getElementById('winMsg').textContent =
      `${base}_subliminal_${App.goal}.wav saved — ${App.affirmations.length} affirmations across ${dur} of music.`;
  }, 600);
}

// Start Over
document.getElementById('s6back').addEventListener('click', () => go(5));
document.getElementById('s6new').addEventListener('click', resetApp);

function resetApp() {
  stopPlayback();
  Object.assign(App, {
    audioFile: null, audioBuf: null, outBuf: null,
    processed: false, affirmations: [], duration: 0,
    pausedAt: 0, goal: 'focus', mode: 'hybrid',
    intensity: 2, balance: 25, density: 2
  });
  audioInput.value = '';
  document.getElementById('fcard').style.display    = 'none';
  dropzone.style.display                            = '';
  document.getElementById('s1next').disabled        = true;
  affTA.value = '';
  updateAffCount();

  document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('sel'));
  document.querySelector('[data-g="focus"]').classList.add('sel');
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('sel'));
  document.querySelector('[data-m="hybrid"]').classList.add('sel');

  document.getElementById('optReady').style.display   = 'block';
  document.getElementById('optRunning').style.display = 'none';
  document.getElementById('optDone').style.display    = 'none';
  document.getElementById('s4back').style.display     = '';

  go(1);
}

// ── Boot ──────────────────────────────────────────────────
renderSteps();
