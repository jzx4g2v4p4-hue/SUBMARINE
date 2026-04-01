# Subliminal Studio v2

Upload a track, add affirmations, add binaural beats, build Pomodoro sessions — export polished subliminal MP3s. 100% offline, no accounts, nothing leaves your device.

![Version](https://img.shields.io/badge/version-2.0.0-c8a96e?style=flat-square) ![Offline](https://img.shields.io/badge/works-100%25%20offline-34d399?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-60a5fa?style=flat-square)

---

## Features

### Standard Mode
1. **Upload** any audio file (MP3, WAV, OGG, M4A, FLAC)
2. **Add affirmations** — paste or load presets (Focus, Confidence, Fitness, Sleep, Abundance)
3. **Choose a goal** — auto-tunes mode, balance, density, binaural preset
4. **Auto-optimize** — one tap, everything handled automatically
5. **Preview** — compare original vs enhanced, adjust with 3 sliders
6. **Export** — high-quality WAV download

### Pomodoro Mode
- Build long-form sessions: 30min, 25/5, 50/10, 90/20, or fully custom
- Separate affirmations for work and break blocks
- Separate binaural presets for work and break blocks
- Full session rendered as one continuous WAV export
- Supports sessions of any length

### Audio Engine
- Music normalisation (prevent pumping/distortion)
- Voice synthesis (formant-based, 3-oscillator, word-rhythm timing)
- Binaural beats (correct L/R sine tone generation)
  - Focus: 200Hz left / 210Hz right → 10Hz alpha
  - Relax:  200Hz left / 205Hz right → 5Hz theta
  - Energy: 200Hz left / 216Hz right → 16Hz beta
  - Sleep:  200Hz left / 202Hz right → 2Hz delta
- Intelligent phrase spacing across the timeline
- Soft tanh limiter (no hard clipping)
- Fade in/out
- Stereo spread variation
- 16-bit PCM WAV export

### Subliminal Modes
| Mode | Voice Gain | Use Case |
|------|-----------|----------|
| Hidden | ~3% | Sleep, maximum discretion |
| Hybrid | ~12% | General daily use (default) |
| Barely Audible | ~8% | Focus sessions |

---

## File Structure

```
subliminal-studio/
├── index.html        ← Full app shell with all screens
├── css/
│   └── style.css     ← Complete design system (dark gold theme)
├── js/
│   ├── presets.js    ← All static config (affirmations, goals, binaural, Pomodoro)
│   ├── audio.js      ← Web Audio API engine
│   ├── pomodoro.js   ← Pomodoro session builder & renderer
│   └── app.js        ← All UI logic, state management, event handling
└── README.md
```

---

## How to Run

### Locally
```bash
git clone https://github.com/YOUR_USERNAME/subliminal-studio.git
cd subliminal-studio
open index.html        # macOS
# double-click index.html on Windows/Linux
```

### With a local server (recommended for iOS testing)
```bash
python3 -m http.server 8080
# or
npx serve .
```

### Deploy to GitHub Pages (free hosting)
1. Push to GitHub
2. Go to **Settings → Pages → Source: main / root**
3. Live at: `https://YOUR_USERNAME.github.io/subliminal-studio`

### Push commands
```bash
git init
git add .
git commit -m "Subliminal Studio v2 — Standard + Pomodoro modes"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/subliminal-studio.git
git push -u origin main
```

---

## iPhone / Safari Notes
- Works fully in Safari on iOS 15+
- iOS requires one user tap before audio playback begins (browser requirement)
- Files download to your Files app — share to Music or use directly
- Add to home screen for an app-like experience: Share → Add to Home Screen

---

## Binaural Beat Implementation

Binaural beats require stereo headphones. The engine generates:
- **Left channel**: carrier frequency (default 200Hz)
- **Right channel**: carrier + beat frequency

The brain perceives the difference as a rhythmic pulse.

| Preset | Left | Right | Beat | State |
|--------|------|-------|------|-------|
| Focus  | 200Hz | 210Hz | 10Hz | Alpha |
| Relax  | 200Hz | 205Hz | 5Hz  | Theta |
| Energy | 200Hz | 216Hz | 16Hz | Beta  |
| Sleep  | 200Hz | 202Hz | 2Hz  | Delta |

Carrier frequency is configurable in Advanced Settings (100–400Hz).

> **Note**: Binaural beats are presented as optional state-based presets, not miracle cures. Best experienced with headphones. Results vary by individual.

---

## Pomodoro Session Examples

| Preset | Structure | Total Time |
|--------|-----------|-----------|
| 30min  | 1 × 30min work | 30 min |
| 25/5   | 4 × (25min work + 5min break) | 2 hours |
| 50/10  | 3 × (50min work + 10min break) | 3 hours |
| 90/20  | 2 × (90min work + 20min break) | 3h 40min |
| Custom | Any combination | Variable |

---

## Browser Support

| Browser | Status |
|---------|--------|
| Safari iOS 15+ | ✅ Full |
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Edge | ✅ Full |
| Safari macOS | ✅ Full |

---

## Roadmap

- [ ] Real TTS via Web Speech API + MediaRecorder capture
- [ ] ElevenLabs / OpenAI TTS integration (optional API key)
- [ ] True MP3 export via LAME WASM
- [ ] Saved session presets (localStorage)
- [ ] Recorded voice input
- [ ] Pink / brown noise ambient layer
- [ ] Export summary PDF
- [ ] Cloud save
- [ ] Native desktop app (Tauri or Electron)

---

## License
MIT
