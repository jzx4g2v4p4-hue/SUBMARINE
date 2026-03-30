# Subliminal Forge v2

A multi-layer subliminal affirmation music mixer that runs entirely in your browser. No cloud. No backend. No data leaves your device.

## Files

| File | Description |
|------|-------------|
| `index.html` | App structure and UI |
| `styles.css` | All visual styling |
| `script.js` | Audio engine, mixer, export logic |
| `manifest.webmanifest` | PWA manifest (if using) |
| `service-worker.js` | Offline caching (if using) |

## Features

- 3 independent subliminal audio layers
- 5 synthesis textures: Tone Burst, Soft Whisper, Deep Mask, Airy Hiss, Pulse Bed
- Real binaural beat generation (requires headphones)
- WAV (lossless) and MP3 (320kbps) export
- Session save/load via localStorage
- Works offline as a PWA

## Fixes Applied (v2.1)

### Fix 1 — Header buttons visible on desktop
- **Bug:** `.header-btn { display: none; }` was set globally, hiding Save/Load/Reset buttons on all screen sizes.
- **Fix:** Removed the global rule. Buttons now only hide inside the `@media (max-width: 480px)` block.

### Fix 2 — Focus preset defaults to Theta (4 Hz)
- **Bug:** Focus Mode defaulted to 40 Hz Gamma — good for alertness but not optimal for subconscious absorption.
- **Fix:** Focus Mode now defaults to `sleep` preset (4 Hz Theta) — the brain state most receptive to subliminal input.
- Chill Mode uses 10 Hz Alpha. Gym Mode uses 60 Hz High Gamma. These are unchanged.

### Fix 3 — Affirmation phrasing validator
- **Added:** `getLines()` now checks for weak future/conditional language ("will", "want", "try", "hope", "wish", "going to", "need to", "should", "would", "could", "might") and shows a warning notice.
- Best practice: Use present tense — "I am…", "I have…", "I do…"

### Fix 4 — Sub buffer early-exit bug on long tracks
- **Bug:** `maxIter = affirmations.length * density * 4` — this caused the while-loop to exit far too early on long tracks (30–60 min exports), leaving large silent gaps in the subliminal layer.
- **Fix:** `maxIter = Math.ceil(durationSec / Math.max(0.01, spacing)) + affirmations.length * 2` — now calculated from actual track duration so long exports are fully populated.

### Fix 5 — Export form row spacing
- **Bug:** Filename and Format rows in the export section had no gap between them.
- **Fix:** `.export-form` now uses `display: flex; flex-direction: column; gap: 12px` for proper spacing.

## How to Use

1. Upload an MP3 or WAV background track
2. Type your affirmations in the "My Affirmations" section (one per line)
3. Choose a Mode (Focus / Gym / Chill) or customize in Advanced Settings
4. Click **▶ Preview Mix** to hear the result
5. Click **⤓ Export WAV** or **Export MP3** to download your file

## Affirmation Best Practices

- Use **present tense**: "I am confident" not "I will be confident"
- Use **identity statements**: "I am…", "I have…", "I do…"
- Keep them **positive** — no negations ("I am not anxious" → "I am calm")
- **Repetition matters** — listen daily for at least 3–4 weeks

## Binaural Beat Frequencies

| Preset | Frequency | Best For |
|--------|-----------|----------|
| Theta ★ | 4 Hz | Subliminal absorption (default) |
| Alpha | 10 Hz | Calm, relaxed awareness |
| Gamma | 40 Hz | Focus, cognition |
| Delta | 2 Hz | Deep sleep, restoration |
| High Gamma | 60 Hz | High alert, gym sessions |

> **Headphones required** for binaural beats to work. Speaker playback removes the effect.

## Deploying to GitHub Pages

1. Push all files to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, root folder
4. Your app will be live at `https://yourusername.github.io/your-repo-name`

No build step required — this is pure HTML/CSS/JS.

## Tech Stack

- Web Audio API (synthesis, mixing, export)
- OfflineAudioContext (offline rendering for export)
- lamejs (MP3 encoding, loaded on demand from CDN)
- localStorage (session persistence)
- No frameworks, no dependencies, no bundler
