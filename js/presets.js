// ══════════════════════════════════════════════
// PRESETS.JS — All static config data
// ══════════════════════════════════════════════

// ── Affirmation Presets ───────────────────────
const AFFIRM_PRESETS = {
  focus: [
    "I am focused and fully present",
    "My mind is sharp and clear",
    "I complete every task with ease",
    "Deep concentration comes naturally to me",
    "I am in control of my attention",
    "I work with calm, precise efficiency"
  ],
  confidence: [
    "I am confident in who I am",
    "I speak with clarity and power",
    "I believe in my abilities completely",
    "I radiate confidence in every situation",
    "I deserve and attract great things",
    "I am worthy of success and abundance"
  ],
  fitness: [
    "I am strong and capable",
    "My body is healthy and powerful",
    "I love pushing past my limits",
    "Every rep makes me stronger",
    "I am fully committed to my health",
    "I have endless energy and drive"
  ],
  sleep: [
    "I release all tension from today",
    "My mind is beautifully calm and still",
    "I drift into deep and restful sleep",
    "I wake feeling completely refreshed",
    "Peace flows gently through my body",
    "I deserve deep, healing rest"
  ],
  wealth: [
    "I attract abundance into my life",
    "I make smart confident decisions",
    "I am worthy of financial freedom",
    "Opportunities find me effortlessly",
    "I create value and am rewarded well",
    "Prosperity flows naturally to me"
  ],
  relax: [
    "I release all stress and tension",
    "My body softens and relaxes completely",
    "I am at peace with this moment",
    "I breathe slowly and deeply",
    "Calm washes over me completely",
    "I let go of everything I cannot control"
  ]
};

// ── Goal Presets (audio settings per goal) ────
const GOAL_PRESETS = {
  focus:      { mode: 'barely', balance: 20, density: 2, binaural: 'focus',  modeLabel: 'Barely Audible' },
  relax:      { mode: 'hybrid', balance: 18, density: 1, binaural: 'relax',  modeLabel: 'Hybrid' },
  energy:     { mode: 'barely', balance: 28, density: 3, binaural: 'energy', modeLabel: 'Barely Audible' },
  sleep:      { mode: 'hidden', balance: 12, density: 1, binaural: 'sleep',  modeLabel: 'Hidden' },
  confidence: { mode: 'hybrid', balance: 24, density: 2, binaural: 'focus',  modeLabel: 'Hybrid' },
  custom:     { mode: 'hybrid', balance: 25, density: 2, binaural: null,     modeLabel: 'Hybrid' }
};

// ── Binaural Presets ──────────────────────────
// carrier: base frequency in Hz
// beat: the binaural beat frequency difference in Hz
const BINAURAL_PRESETS = {
  focus:  { label: '10 Hz alpha — focus & concentration',   carrier: 200, beat: 10 },
  relax:  { label: '5 Hz theta — deep relaxation',          carrier: 200, beat: 5  },
  energy: { label: '16 Hz low beta — energy & alertness',   carrier: 200, beat: 16 },
  sleep:  { label: '2 Hz delta — deep sleep & restoration', carrier: 200, beat: 2  }
};

// ── Subliminal mode voice gain multipliers ─────
const MODE_GAINS = {
  hidden: 0.028,
  hybrid: 0.12,
  barely: 0.075
};

// ── Goal → binaural auto-select ───────────────
const GOAL_BINAURAL_MAP = {
  focus:      'focus',
  relax:      'relax',
  energy:     'energy',
  sleep:      'sleep',
  confidence: 'focus',
  custom:     null
};

// ── Processing step definitions ───────────────
const PROC_STEPS = [
  { id: 'analyze',   label: 'Analyzing audio track',           ms: 500  },
  { id: 'normalize', label: 'Normalizing loudness',            ms: 350  },
  { id: 'tts',       label: 'Synthesizing voice affirmations', ms: 1200 },
  { id: 'timing',    label: 'Calculating timing & spacing',    ms: 350  },
  { id: 'binaural',  label: 'Generating binaural layer',       ms: 600  },
  { id: 'blend',     label: 'Blending subliminal layer',       ms: 700  },
  { id: 'master',    label: 'Applying mastering & limiting',   ms: 550  },
  { id: 'render',    label: 'Rendering final mix',             ms: 700  }
];

// ── Pomodoro session presets ──────────────────
const POM_PRESETS = {
  '30min': { work: 30, brk: 0,  cycles: 1,  label: '30-min focus block' },
  '25-5':  { work: 25, brk: 5,  cycles: 4,  label: '25/5 Classic Pomodoro' },
  '50-10': { work: 50, brk: 10, cycles: 3,  label: '50/10 Extended Focus' },
  '90-20': { work: 90, brk: 20, cycles: 2,  label: '90/20 Deep Work' },
  'custom': null
};
