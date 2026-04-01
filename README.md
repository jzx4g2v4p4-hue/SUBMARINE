# Subliminal MP3 Maker

Upload a song, add affirmations, and export a subliminal audio track — entirely in the browser. No accounts, no servers, no internet required after the page loads.

![Subliminal MP3 Maker](https://img.shields.io/badge/version-1.0.0-9b6dff?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square) ![Offline](https://img.shields.io/badge/works-100%25%20offline-2dd4bf?style=flat-square)

---

## What it does

1. **Upload** any audio file — MP3, WAV, OGG, M4A, FLAC
2. **Add affirmations** — type or paste, one per line, or load a preset
3. **Choose a goal** — Focus, Confidence, Fitness, Sleep, Abundance, or Custom
4. **Auto-optimize** — the app normalises your music, synthesises the voice layer, and blends everything automatically
5. **Preview** — compare original vs enhanced, adjust balance and repetition
6. **Export** — downloads a high-quality WAV file

---

## Features

- **3 subliminal modes** — Hidden, Barely Audible, Hybrid (recommended default)
- **Smart goal presets** — each goal auto-tunes pacing, repetition density, and voice/music balance
- **Real audio processing** — Web Audio API normalisation, formant-based voice synthesis, tanh soft limiting
- **Waveform visualiser** — shows your track after upload
- **Fine-tune sliders** — intensity, voice/music balance, repetition density
- **Advanced settings** — fade in/out, stereo spread, soft limiter toggle
- **WAV export** — 16-bit PCM, full quality
- **100% private** — nothing leaves your device
- **iPhone / Safari friendly** — works in mobile browsers

---

## Project Structure

```
subliminal-mp3-maker/
├── index.html          # App shell and all screen HTML
├── css/
│   └── style.css       # Full design system and layout
├── js/
│   ├── presets.js      # Affirmation presets and goal configs
│   ├── audio.js        # Web Audio API engine (waveform, mix, WAV encode)
│   └── app.js          # UI state, navigation, event handling
└── README.md
```

---

## How to run

### Option A — Open locally
Just open `index.html` in any modern browser. No build step needed.

```bash
git clone https://github.com/YOUR_USERNAME/subliminal-mp3-maker.git
cd subliminal-mp3-maker
open index.html   # macOS
# or double-click index.html on Windows/Linux
```

### Option B — Local dev server (recommended for iOS testing)
```bash
# Python 3
python3 -m http.server 8080

# Node (npx)
npx serve .
```
Then open `http://localhost:8080` in your browser.

### Option C — Deploy to GitHub Pages
1. Push to GitHub
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Your app will be live at `https://YOUR_USERNAME.github.io/subliminal-mp3-maker`

---

## How to push to GitHub

```bash
# 1. Create a new repo on github.com (no README, no .gitignore)

# 2. In your project folder:
git init
git add .
git commit -m "Initial release — Subliminal MP3 Maker v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/subliminal-mp3-maker.git
git push -u origin main
```

---

## Browser support

| Browser         | Status |
|-----------------|--------|
| Safari (iOS 15+)| ✅ Full support |
| Chrome          | ✅ Full support |
| Firefox         | ✅ Full support |
| Edge            | ✅ Full support |
| Safari (macOS)  | ✅ Full support |

> **iPhone note:** iOS requires a user gesture before audio playback can start. Tap any button on the page first and playback will work normally.

---

## Audio engine notes

The voice layer uses a formant-synthesis approach — three oscillators tuned to approximate human speech frequency bands (200 Hz, 900 Hz, 2400 Hz), modulated with word-rhythm timing derived from your affirmation text. This works entirely offline with no TTS API.

**Voice gain by mode:**
| Mode          | Voice gain (relative to music) |
|---------------|-------------------------------|
| Hidden        | ~3% |
| Hybrid        | ~14% |
| Barely Audible| ~8% |

The final mix runs through a tanh soft limiter (threshold 0.88) to prevent any clipping.

---

## Roadmap

- [ ] Real TTS via Web Speech API + MediaRecorder capture
- [ ] ElevenLabs voice option (optional API key)
- [ ] Multiple export formats (MP3 via LAME WASM)
- [ ] Saved presets / session storage
- [ ] Pomodoro / work-break session builder
- [ ] Binaural beat optional layer
- [ ] Batch export

---

## License

MIT — use it however you like.
