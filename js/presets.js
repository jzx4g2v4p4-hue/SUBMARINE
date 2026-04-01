// ── Affirmation Presets ───────────────────────────────────
const PRESETS = {
  focus: [
    "I am focused and fully present",
    "My mind is sharp and clear",
    "I complete tasks with ease and confidence",
    "Deep concentration comes naturally to me",
    "I am in control of my attention"
  ],
  confidence: [
    "I am confident in who I am",
    "I speak with clarity and power",
    "I believe in my abilities completely",
    "I radiate confidence in every situation",
    "I deserve and attract great things"
  ],
  fitness: [
    "I am strong and capable",
    "My body is healthy and powerful",
    "I love pushing past my limits",
    "Every session makes me stronger",
    "I am fully committed to my health"
  ],
  sleep: [
    "I release all tension from today",
    "My mind is beautifully calm and still",
    "I drift into deep and restful sleep",
    "I wake up feeling completely refreshed",
    "Peace flows gently through my body"
  ],
  wealth: [
    "I attract abundance into my life",
    "Money flows to me easily and often",
    "I make smart confident decisions",
    "I am worthy of financial freedom",
    "Opportunities find me effortlessly"
  ]
};

// ── Goal Configuration ────────────────────────────────────
// Each goal sets smart defaults for density and voice/music balance
const GOAL_CFG = {
  focus:      { density: 2, balance: 22 },
  confidence: { density: 2, balance: 28 },
  fitness:    { density: 3, balance: 30 },
  sleep:      { density: 1, balance: 16 },
  wealth:     { density: 2, balance: 24 },
  custom:     { density: 2, balance: 25 }
};

// ── Processing Step Labels ────────────────────────────────
const PROCESS_STEPS = [
  { label: 'Analyzing your track' },
  { label: 'Normalizing loudness' },
  { label: 'Generating voice affirmations' },
  { label: 'Calculating timing & spacing' },
  { label: 'Blending subliminal layer' },
  { label: 'Applying masking & limiting' },
  { label: 'Rendering final mix' }
];

// Approximate processing durations in ms (for UI animation)
const STEP_DURATIONS = [500, 350, 1400, 350, 700, 550, 700];
